package com.cymops.service;

import com.cymops.model.entity.UptimeCheck;
import com.cymops.model.entity.UptimeMonitor;
import com.cymops.model.entity.Project;
import com.cymops.repository.UptimeCheckRepository;
import com.cymops.repository.UptimeMonitorRepository;
import com.cymops.repository.ProjectRepository;
import com.cymops.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UptimeService {

    private final UptimeMonitorRepository monitorRepo;
    private final UptimeCheckRepository checkRepo;
    private final ProjectRepository projectRepo;
    private final ProjectMemberRepository memberRepo;
    private final SimpMessagingTemplate messagingTemplate;

    // ─── CRUD ──────────────────────────────

    public UptimeMonitor createMonitor(Long projectId, UptimeMonitor monitor, String callerEmail) {
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        monitor.setProject(project);
        return monitorRepo.save(monitor);
    }

    public List<UptimeMonitor> getMonitorsByProject(Long projectId) {
        return monitorRepo.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    public List<UptimeMonitor> getAllMonitorsForUser(String email) {
        return monitorRepo.findAll().stream()
                .sorted(Comparator.comparing(UptimeMonitor::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public UptimeMonitor getMonitor(Long monitorId) {
        return monitorRepo.findById(monitorId)
                .orElseThrow(() -> new RuntimeException("Monitor not found"));
    }

    public UptimeMonitor updateMonitor(Long monitorId, UptimeMonitor updates) {
        UptimeMonitor existing = getMonitor(monitorId);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getUrl() != null) existing.setUrl(updates.getUrl());
        if (updates.getMethod() != null) existing.setMethod(updates.getMethod());
        if (updates.getExpectedStatus() != null) existing.setExpectedStatus(updates.getExpectedStatus());
        if (updates.getIntervalSeconds() != null) existing.setIntervalSeconds(updates.getIntervalSeconds());
        if (updates.getTimeoutMs() != null) existing.setTimeoutMs(updates.getTimeoutMs());
        if (updates.getHeadersJson() != null) existing.setHeadersJson(updates.getHeadersJson());
        if (updates.getBodyJson() != null) existing.setBodyJson(updates.getBodyJson());
        if (updates.getPaused() != null) existing.setPaused(updates.getPaused());
        return monitorRepo.save(existing);
    }

    @Transactional
    public void deleteMonitor(Long monitorId) {
        checkRepo.deleteByMonitorId(monitorId);
        monitorRepo.deleteById(monitorId);
    }

    public UptimeMonitor togglePause(Long monitorId) {
        UptimeMonitor monitor = getMonitor(monitorId);
        monitor.setPaused(!monitor.getPaused());
        return monitorRepo.save(monitor);
    }

    // ─── Check Results & Stats ──────────────────

    public List<UptimeCheck> getRecentChecks(Long monitorId, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return checkRepo.findRecentChecks(monitorId, since);
    }

    public List<UptimeCheck> getLatestChecks(Long monitorId, int count) {
        return checkRepo.findLatestByMonitorId(monitorId, PageRequest.of(0, count));
    }

    public Map<String, Object> getMonitorStats(Long monitorId) {
        Map<String, Object> stats = new LinkedHashMap<>();
        LocalDateTime last24h = LocalDateTime.now().minusHours(24);
        LocalDateTime last7d = LocalDateTime.now().minusDays(7);
        LocalDateTime last30d = LocalDateTime.now().minusDays(30);

        long total24h = checkRepo.countTotalChecks(monitorId, last24h);
        long up24h = checkRepo.countUpChecks(monitorId, last24h);
        long total7d = checkRepo.countTotalChecks(monitorId, last7d);
        long up7d = checkRepo.countUpChecks(monitorId, last7d);
        long total30d = checkRepo.countTotalChecks(monitorId, last30d);
        long up30d = checkRepo.countUpChecks(monitorId, last30d);

        stats.put("uptime24h", total24h > 0 ? Math.round((double) up24h / total24h * 10000) / 100.0 : 100.0);
        stats.put("uptime7d", total7d > 0 ? Math.round((double) up7d / total7d * 10000) / 100.0 : 100.0);
        stats.put("uptime30d", total30d > 0 ? Math.round((double) up30d / total30d * 10000) / 100.0 : 100.0);
        stats.put("avgResponseTime24h", checkRepo.avgResponseTime(monitorId, last24h));
        stats.put("avgResponseTime7d", checkRepo.avgResponseTime(monitorId, last7d));
        stats.put("minResponseTime24h", checkRepo.minResponseTime(monitorId, last24h));
        stats.put("maxResponseTime24h", checkRepo.maxResponseTime(monitorId, last24h));
        stats.put("totalChecks", total30d);

        // Incident counts (down checks)
        long down24h = total24h - up24h;
        long down7d = total7d - up7d;
        long down30d = total30d - up30d;
        stats.put("incidents24h", down24h);
        stats.put("incidents7d", down7d);
        stats.put("incidents30d", down30d);

        // Get latest check
        List<UptimeCheck> latest = checkRepo.findLatestByMonitorId(monitorId, PageRequest.of(0, 1));
        if (!latest.isEmpty()) {
            UptimeCheck last = latest.get(0);
            stats.put("currentStatus", last.getIsUp() ? "UP" : "DOWN");
            stats.put("lastCheckedAt", last.getCheckedAt());
            stats.put("lastResponseTime", last.getResponseTimeMs());
            stats.put("lastStatusCode", last.getStatusCode());
        } else {
            stats.put("currentStatus", "PENDING");
        }

        return stats;
    }

    // ─── Scheduled Ping ──────────────────

    @Scheduled(fixedDelay = 15000) // Run every 15 seconds, pick monitors that are due
    public void scheduledPing() {
        List<UptimeMonitor> active = monitorRepo.findByPausedFalse();
        LocalDateTime now = LocalDateTime.now();

        for (UptimeMonitor monitor : active) {
            // Check if this monitor is due for a check
            List<UptimeCheck> latest = checkRepo.findLatestByMonitorId(monitor.getId(), PageRequest.of(0, 1));
            if (!latest.isEmpty()) {
                LocalDateTime lastCheck = latest.get(0).getCheckedAt();
                if (lastCheck.plusSeconds(monitor.getIntervalSeconds()).isAfter(now)) {
                    continue; // Not due yet
                }
            }

            try {
                performCheck(monitor);
            } catch (Exception e) {
                log.error("Failed to check monitor {}: {}", monitor.getId(), e.getMessage());
            }
        }
    }

    public UptimeCheck performCheck(UptimeMonitor monitor) {
        long start = System.currentTimeMillis();
        Integer statusCode = null;
        boolean isUp = false;
        String errorMessage = null;

        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(monitor.getTimeoutMs());
            factory.setReadTimeout(monitor.getTimeoutMs());
            RestTemplate restTemplate = new RestTemplate(factory);

            HttpHeaders headers = new HttpHeaders();
            // Parse custom headers if any
            if (monitor.getHeadersJson() != null && !monitor.getHeadersJson().isBlank()) {
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    Map<String, String> customHeaders = mapper.readValue(monitor.getHeadersJson(), Map.class);
                    customHeaders.forEach(headers::set);
                } catch (Exception e) {
                    log.warn("Failed to parse custom headers for monitor {}", monitor.getId());
                }
            }

            HttpEntity<String> entity = new HttpEntity<>(monitor.getBodyJson(), headers);
            HttpMethod httpMethod = HttpMethod.valueOf(monitor.getMethod().toUpperCase());

            ResponseEntity<String> response = restTemplate.exchange(
                    URI.create(monitor.getUrl()),
                    httpMethod,
                    entity,
                    String.class
            );

            statusCode = response.getStatusCode().value();
            isUp = statusCode.equals(monitor.getExpectedStatus());

        } catch (Exception e) {
            errorMessage = e.getClass().getSimpleName() + ": " + e.getMessage();
            isUp = false;
        }

        long elapsed = System.currentTimeMillis() - start;

        UptimeCheck check = UptimeCheck.builder()
                .monitor(monitor)
                .statusCode(statusCode)
                .responseTimeMs((int) elapsed)
                .isUp(isUp)
                .errorMessage(errorMessage)
                .checkedAt(LocalDateTime.now())
                .build();

        UptimeCheck saved = checkRepo.save(check);
        broadcastCheckResult(monitor, saved);
        return saved;
    }

    /**
     * Broadcast a real-time uptime check update via WebSocket/STOMP.
     */
    private void broadcastCheckResult(UptimeMonitor monitor, UptimeCheck check) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("type", "UPTIME_CHECK");
            payload.put("monitorId", monitor.getId());
            payload.put("monitorName", monitor.getName());
            payload.put("url", monitor.getUrl());
            payload.put("checkId", check.getId());
            payload.put("isUp", check.getIsUp());
            payload.put("statusCode", check.getStatusCode());
            payload.put("responseTimeMs", check.getResponseTimeMs());
            payload.put("errorMessage", check.getErrorMessage());
            payload.put("checkedAt", check.getCheckedAt().toString());

            // Send per-monitor update
            messagingTemplate.convertAndSend("/topic/uptime/" + monitor.getId(), payload);

            // Send global summary update
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("type", "UPTIME_SUMMARY");
            summary.put("monitorId", monitor.getId());
            summary.put("isUp", check.getIsUp());
            summary.put("responseTimeMs", check.getResponseTimeMs());
            summary.put("checkedAt", check.getCheckedAt().toString());
            messagingTemplate.convertAndSend("/topic/uptime/summary", summary);
        } catch (Exception e) {
            log.warn("Failed to broadcast uptime check for monitor {}: {}", monitor.getId(), e.getMessage());
        }
    }
}
