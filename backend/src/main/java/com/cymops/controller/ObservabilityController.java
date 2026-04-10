package com.cymops.controller;

import com.cymops.service.DatabaseHealthAuditService;
import com.cymops.service.ObservabilityService;
import com.cymops.service.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.core.Authentication;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/observability")
@RequiredArgsConstructor
public class ObservabilityController {

    private final ObservabilityService observabilityService;
    private final DatabaseHealthAuditService databaseHealthAuditService;
    private final ProjectAccessService projectAccessService;

    @GetMapping("/golden-signals")
    public ResponseEntity<Map<String, Object>> goldenSignals(@RequestParam Long projectId,
                                                             Authentication authentication) {
        projectAccessService.requireProjectAccess(authentication.getName(), projectId);
        return ResponseEntity.ok(observabilityService.buildGoldenSignals(projectId));
    }

    @GetMapping("/db-audit")
    public ResponseEntity<Map<String, Object>> latestDbAudit(@RequestParam Long projectId,
                                                             Authentication authentication) {
        projectAccessService.requireProjectAccess(authentication.getName(), projectId);
        Map<String, Object> payload = new LinkedHashMap<>(databaseHealthAuditService.getLatestAudit());
        payload.put("scope", "project");
        payload.put("projectId", projectId);
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/db-audit/run")
    public ResponseEntity<Map<String, Object>> runDbAudit(@RequestParam Long projectId,
                                                          Authentication authentication) {
        projectAccessService.requireProjectAccess(authentication.getName(), projectId);
        Map<String, Object> payload = new LinkedHashMap<>(databaseHealthAuditService.runAudit());
        payload.put("scope", "project");
        payload.put("projectId", projectId);
        return ResponseEntity.ok(payload);
    }
}
