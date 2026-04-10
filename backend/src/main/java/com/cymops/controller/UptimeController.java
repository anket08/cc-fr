package com.cymops.controller;

import com.cymops.model.entity.UptimeCheck;
import com.cymops.model.entity.UptimeMonitor;
import com.cymops.service.UptimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/uptime")
@RequiredArgsConstructor
public class UptimeController {

    private final UptimeService uptimeService;

    @PostMapping("/monitors")
    public ResponseEntity<UptimeMonitor> createMonitor(
            @RequestParam Long projectId,
            @RequestBody UptimeMonitor monitor,
            Authentication auth) {
        return ResponseEntity.ok(uptimeService.createMonitor(projectId, monitor, auth.getName()));
    }

    @GetMapping("/monitors")
    public ResponseEntity<List<UptimeMonitor>> getAllMonitors(Authentication auth) {
        return ResponseEntity.ok(uptimeService.getAllMonitorsForUser(auth.getName()));
    }

    @GetMapping("/monitors/project/{projectId}")
    public ResponseEntity<List<UptimeMonitor>> getByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(uptimeService.getMonitorsByProject(projectId));
    }

    @GetMapping("/monitors/{id}")
    public ResponseEntity<UptimeMonitor> getMonitor(@PathVariable Long id) {
        return ResponseEntity.ok(uptimeService.getMonitor(id));
    }

    @PutMapping("/monitors/{id}")
    public ResponseEntity<UptimeMonitor> updateMonitor(@PathVariable Long id, @RequestBody UptimeMonitor updates) {
        return ResponseEntity.ok(uptimeService.updateMonitor(id, updates));
    }

    @DeleteMapping("/monitors/{id}")
    public ResponseEntity<Void> deleteMonitor(@PathVariable Long id) {
        uptimeService.deleteMonitor(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/monitors/{id}/toggle")
    public ResponseEntity<UptimeMonitor> togglePause(@PathVariable Long id) {
        return ResponseEntity.ok(uptimeService.togglePause(id));
    }

    @GetMapping("/monitors/{id}/checks")
    public ResponseEntity<List<UptimeCheck>> getChecks(
            @PathVariable Long id,
            @RequestParam(defaultValue = "24") int hours) {
        return ResponseEntity.ok(uptimeService.getRecentChecks(id, hours));
    }

    @GetMapping("/monitors/{id}/stats")
    public ResponseEntity<Map<String, Object>> getStats(@PathVariable Long id) {
        return ResponseEntity.ok(uptimeService.getMonitorStats(id));
    }

    @PostMapping("/monitors/{id}/check-now")
    public ResponseEntity<UptimeCheck> checkNow(@PathVariable Long id) {
        UptimeMonitor monitor = uptimeService.getMonitor(id);
        return ResponseEntity.ok(uptimeService.performCheck(monitor));
    }
}
