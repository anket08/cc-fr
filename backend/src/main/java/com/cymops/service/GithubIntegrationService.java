package com.cymops.service;

import com.cymops.model.entity.GithubRepoSnapshot;
import com.cymops.model.entity.GithubWebhookEvent;
import com.cymops.repository.GithubRepoSnapshotRepository;
import com.cymops.repository.GithubWebhookEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GithubIntegrationService {

    private final GithubWebhookEventRepository githubWebhookEventRepository;
    private final GithubRepoSnapshotRepository githubRepoSnapshotRepository;

    @Value("${github.api.base-url:https://api.github.com}")
    private String githubApiBaseUrl;

    @Value("${github.api.token:}")
    private String githubToken;

    @Value("${github.repo.owner:}")
    private String repoOwner;

    @Value("${github.repo.name:}")
    private String repoName;

    @Value("${github.webhook.secret:}")
    private String webhookSecret;

    @Transactional
    public void handleWebhook(String eventType, String deliveryId, String signatureHeader, String payload) {
        if (!isValidWebhookSignature(payload, signatureHeader)) {
            throw new IllegalArgumentException("Invalid GitHub webhook signature");
        }

        GithubWebhookEvent event = GithubWebhookEvent.builder()
                .eventType(eventType == null ? "unknown" : eventType)
                .deliveryId(deliveryId)
                .payloadJson(payload)
                .processed(false)
                .build();

        githubWebhookEventRepository.save(event);
    }

    @Transactional
    public GithubRepoSnapshot collectAndStoreSnapshot() {
        ensureRepoConfigured();

        String fullName = repoOwner + "/" + repoName;
        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> repoResponse = getJson(restTemplate, githubApiBaseUrl + "/repos/" + fullName);
        String defaultBranch = String.valueOf(repoResponse.getOrDefault("default_branch", "main"));

        int openPrCount = getTotalCount(restTemplate, githubApiBaseUrl + "/search/issues?q=repo:" + fullName + "+type:pr+state:open");
        int failedWorkflowRuns = getTotalCount(restTemplate, githubApiBaseUrl + "/repos/" + fullName + "/actions/runs?status=failure");
        int totalWorkflowRuns = getTotalCount(restTemplate, githubApiBaseUrl + "/repos/" + fullName + "/actions/runs");
        int deploymentsLast7d = getDeploymentsLast7d(restTemplate, fullName);
        int openSecurityAlerts = getDependabotOpenCount(restTemplate, githubApiBaseUrl + "/repos/" + fullName + "/dependabot/alerts?state=open");
        int openCodeScanningAlerts = getListCount(restTemplate, githubApiBaseUrl + "/repos/" + fullName + "/code-scanning/alerts?state=open&per_page=100");

        GithubRepoSnapshot snapshot = GithubRepoSnapshot.builder()
                .repositoryFullName(fullName)
                .defaultBranch(defaultBranch)
                .openPrCount(Math.max(openPrCount, 0))
                .failedWorkflowRuns(Math.max(failedWorkflowRuns, 0))
            .totalWorkflowRuns(Math.max(totalWorkflowRuns, 0))
            .deploymentsLast7d(Math.max(deploymentsLast7d, 0))
                .openSecurityAlerts(Math.max(openSecurityAlerts, 0))
            .openCodeScanningAlerts(Math.max(openCodeScanningAlerts, 0))
                .build();

        return githubRepoSnapshotRepository.save(snapshot);
    }

    public String getRepositoryFullName() {
        ensureRepoConfigured();
        return repoOwner + "/" + repoName;
    }

    private Map<String, Object> getJson(RestTemplate restTemplate, String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        if (githubToken != null && !githubToken.isBlank()) {
            headers.setBearerAuth(githubToken);
        }

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
        return response.getBody();
    }

    private int getTotalCount(RestTemplate restTemplate, String url) {
        try {
            Map<String, Object> response = getJson(restTemplate, url);
            Object value = response.get("total_count");
            if (value instanceof Number number) {
                return number.intValue();
            }
            return 0;
        } catch (Exception e) {
            return 0;
        }
    }

    private int getDependabotOpenCount(RestTemplate restTemplate, String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.set("X-GitHub-Api-Version", "2022-11-28");
            if (githubToken != null && !githubToken.isBlank()) {
                headers.setBearerAuth(githubToken);
            }

            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, request, List.class);
            List body = response.getBody();
            return body == null ? 0 : body.size();
        } catch (Exception e) {
            return 0;
        }
    }

    private int getListCount(RestTemplate restTemplate, String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.set("X-GitHub-Api-Version", "2022-11-28");
            if (githubToken != null && !githubToken.isBlank()) {
                headers.setBearerAuth(githubToken);
            }

            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, request, List.class);
            List body = response.getBody();
            return body == null ? 0 : body.size();
        } catch (Exception e) {
            return 0;
        }
    }

    private int getDeploymentsLast7d(RestTemplate restTemplate, String fullName) {
        try {
            String url = githubApiBaseUrl + "/repos/" + fullName + "/deployments?per_page=100";
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.set("X-GitHub-Api-Version", "2022-11-28");
            if (githubToken != null && !githubToken.isBlank()) {
                headers.setBearerAuth(githubToken);
            }

            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, request, List.class);
            List body = response.getBody();
            if (body == null) {
                return 0;
            }

            OffsetDateTime cutoff = OffsetDateTime.now().minusDays(7);
            int count = 0;
            for (Object item : body) {
                if (!(item instanceof Map<?, ?> map)) {
                    continue;
                }
                Object createdAt = map.get("created_at");
                if (createdAt instanceof String createdAtValue) {
                    try {
                        OffsetDateTime created = OffsetDateTime.parse(createdAtValue);
                        if (created.isAfter(cutoff)) {
                            count++;
                        }
                    } catch (Exception ignored) {
                        // Skip malformed timestamps from upstream payloads.
                    }
                }
            }
            return count;
        } catch (Exception e) {
            return 0;
        }
    }

    private boolean isValidWebhookSignature(String payload, String signatureHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            return true;
        }

        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String digest = HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            String expected = "sha256=" + digest;
            return constantTimeEquals(expected, signatureHeader);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    private void ensureRepoConfigured() {
        if (repoOwner == null || repoOwner.isBlank() || repoName == null || repoName.isBlank()) {
            throw new IllegalArgumentException("Set github.repo.owner and github.repo.name before syncing");
        }
    }
}
