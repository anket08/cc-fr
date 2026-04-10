package com.cymops.controller;

import com.cymops.model.entity.GithubRepoSnapshot;
import com.cymops.service.EngineeringReportService;
import com.cymops.service.GithubIntegrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/integrations/github")
@RequiredArgsConstructor
public class GithubIntegrationController {

    private final GithubIntegrationService githubIntegrationService;
    private final EngineeringReportService engineeringReportService;

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, String>> webhook(
            @RequestHeader(value = "X-GitHub-Event", required = false) String eventType,
            @RequestHeader(value = "X-GitHub-Delivery", required = false) String deliveryId,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String payload
    ) {
        githubIntegrationService.handleWebhook(eventType, deliveryId, signature, payload);
        return ResponseEntity.ok(Map.of("status", "accepted"));
    }

    @PostMapping("/sync")
    public ResponseEntity<GithubRepoSnapshot> sync() {
        GithubRepoSnapshot snapshot = githubIntegrationService.collectAndStoreSnapshot();
        return ResponseEntity.ok(snapshot);
    }

    @GetMapping("/report")
    public ResponseEntity<Map<String, Object>> report(
            @RequestParam(name = "refresh", defaultValue = "false") boolean refresh
    ) {
        Map<String, Object> report = refresh
                ? engineeringReportService.generateReport(true)
                : engineeringReportService.getLatestReport();
        return ResponseEntity.ok(report);
    }
}
