package com.cymops.service;

import com.cymops.model.entity.DbIncident;
import com.cymops.model.entity.EngineeringReportSnapshot;
import com.cymops.model.entity.GithubRepoSnapshot;
import com.cymops.repository.DbIncidentRepository;
import com.cymops.repository.EngineeringReportSnapshotRepository;
import com.cymops.repository.GithubRepoSnapshotRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EngineeringReportService {

    private final GithubIntegrationService githubIntegrationService;
    private final GithubRepoSnapshotRepository githubRepoSnapshotRepository;
    private final DbIncidentRepository dbIncidentRepository;
    private final EngineeringReportSnapshotRepository engineeringReportSnapshotRepository;
    private final ObservabilityService observabilityService;
    private final ObjectMapper objectMapper;

    @Transactional
    public Map<String, Object> generateReport(boolean refreshGithubData) {
        String repoFullName = githubIntegrationService.getRepositoryFullName();

        GithubRepoSnapshot githubSnapshot = refreshGithubData
                ? githubIntegrationService.collectAndStoreSnapshot()
                : githubRepoSnapshotRepository.findTopByRepositoryFullNameOrderByCollectedAtDesc(repoFullName)
                .orElseGet(githubIntegrationService::collectAndStoreSnapshot);

        long openDbIncidents = dbIncidentRepository.countByStatus("OPEN");
        List<DbIncident> recentOpenIncidents = dbIncidentRepository.findByStatusOrderByStartedAtDesc("OPEN")
                .stream()
                .limit(5)
                .toList();

        LocalDateTime thirtyDaysAgo = LocalDate.now().minusDays(30).atStartOfDay();
        double mttrMinutesLast30d = dbIncidentRepository.findAverageMttrMinutesSince(thirtyDaysAgo);

        double changeFailureRatePercent = githubSnapshot.getTotalWorkflowRuns() > 0
            ? ((double) githubSnapshot.getFailedWorkflowRuns() / (double) githubSnapshot.getTotalWorkflowRuns()) * 100.0
            : 0.0;

        Map<String, Object> goldenSignals = observabilityService.buildGoldenSignals();
        Map<String, Object> saturation = (Map<String, Object>) goldenSignals.getOrDefault("saturation", Map.of());
        double cpuUtilizationPercent = toDouble(saturation.get("cpuUtilizationPercent"));
        double memoryUtilizationPercent = toDouble(saturation.get("memoryUtilizationPercent"));
        double dbConnectionUtilizationPercent = toDouble(saturation.get("dbConnectionUtilizationPercent"));

        int riskScore = calculateRiskScore(
            githubSnapshot,
            openDbIncidents,
            mttrMinutesLast30d,
            changeFailureRatePercent,
            cpuUtilizationPercent,
            memoryUtilizationPercent,
            dbConnectionUtilizationPercent
        );

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("generatedAt", LocalDateTime.now());
        report.put("repository", githubSnapshot.getRepositoryFullName());
        report.put("riskScore", riskScore);
        report.put("codebase", Map.of(
                "defaultBranch", githubSnapshot.getDefaultBranch(),
                "openPullRequests", githubSnapshot.getOpenPrCount(),
                "failedWorkflowRuns", githubSnapshot.getFailedWorkflowRuns(),
                "totalWorkflowRuns", githubSnapshot.getTotalWorkflowRuns(),
                "deploymentsLast7d", githubSnapshot.getDeploymentsLast7d(),
                "openSecurityAlerts", githubSnapshot.getOpenSecurityAlerts(),
                "openCodeScanningAlerts", githubSnapshot.getOpenCodeScanningAlerts(),
                "collectedAt", githubSnapshot.getCollectedAt()
        ));
        report.put("database", Map.of(
                "openIncidents", openDbIncidents,
                "mttrMinutesLast30d", round(mttrMinutesLast30d),
                "recentOpenIncidents", recentOpenIncidents
        ));
            report.put("operations", Map.of(
                "deploymentFrequencyPerWeek", githubSnapshot.getDeploymentsLast7d(),
                "changeFailureRatePercent", round(changeFailureRatePercent),
                "cpuUtilizationPercent", round(cpuUtilizationPercent),
                "memoryUtilizationPercent", round(memoryUtilizationPercent),
                "dbConnectionUtilizationPercent", round(dbConnectionUtilizationPercent),
                "goldenSignals", goldenSignals
            ));

        EngineeringReportSnapshot snapshot = EngineeringReportSnapshot.builder()
                .repositoryFullName(githubSnapshot.getRepositoryFullName())
                .reportJson(toJson(report))
                .build();
        engineeringReportSnapshotRepository.save(snapshot);

        return report;
    }

    public Map<String, Object> getLatestReport() {
        String repoFullName = githubIntegrationService.getRepositoryFullName();
        EngineeringReportSnapshot snapshot = engineeringReportSnapshotRepository
                .findTopByRepositoryFullNameOrderByGeneratedAtDesc(repoFullName)
                .orElseThrow(() -> new IllegalArgumentException("No report available yet. Trigger /api/integrations/github/report?refresh=true first."));

        try {
            return objectMapper.readValue(snapshot.getReportJson(), Map.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored report JSON is invalid", e);
        }
    }

    private int calculateRiskScore(
            GithubRepoSnapshot snapshot,
            long openDbIncidents,
            double mttrMinutes,
            double changeFailureRatePercent,
            double cpuUtilizationPercent,
            double memoryUtilizationPercent,
            double dbConnectionUtilizationPercent
    ) {
        int score = 0;

        // Vulnerability and static analysis risk
        score += Math.min(snapshot.getOpenSecurityAlerts() * 7, 25);
        score += Math.min(snapshot.getOpenCodeScanningAlerts() * 5, 20);

        // Change and release health
        if (snapshot.getDeploymentsLast7d() < 3) {
            score += 15;
        } else if (snapshot.getDeploymentsLast7d() < 7) {
            score += 8;
        }
        if (changeFailureRatePercent > 30) {
            score += 20;
        } else if (changeFailureRatePercent > 15) {
            score += 12;
        } else if (changeFailureRatePercent > 5) {
            score += 6;
        }

        // Recovery and reliability
        if (mttrMinutes > 240) {
            score += 20;
        } else if (mttrMinutes > 120) {
            score += 12;
        } else if (mttrMinutes > 60) {
            score += 6;
        }
        score += Math.min((int) openDbIncidents * 6, 18);

        // Saturation pressure
        if (cpuUtilizationPercent > 85) {
            score += 8;
        }
        if (memoryUtilizationPercent > 90) {
            score += 8;
        }
        if (dbConnectionUtilizationPercent > 85) {
            score += 8;
        }

        // Workflow instability signal
        score += Math.min(snapshot.getFailedWorkflowRuns() * 2, 12);

        return Math.min(score, 100);
    }

    private double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return 0.0;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String toJson(Map<String, Object> report) {
        try {
            return objectMapper.writeValueAsString(report);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize engineering report", e);
        }
    }
}
