package com.cymops.controller;

import com.cymops.dto.CreateIngestKeyRequestDto;
import com.cymops.dto.CreateIngestKeyResponseDto;
import com.cymops.dto.TelemetryIngestRequestDto;
import com.cymops.dto.TelemetryIngestResponseDto;
import com.cymops.service.TelemetryIngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ingest")
@RequiredArgsConstructor
public class TelemetryIngestController {

    private final TelemetryIngestionService telemetryIngestionService;

    @PostMapping("/metrics")
    public ResponseEntity<TelemetryIngestResponseDto> ingestMetrics(
            @RequestHeader("X-INGEST-KEY") String ingestKey,
            @RequestBody com.cymops.dto.TelemetryIngestRequestDto request) {
        return ResponseEntity.ok(telemetryIngestionService.ingest("metrics", ingestKey, request));
    }

    @PostMapping("/logs")
    public ResponseEntity<TelemetryIngestResponseDto> ingestLogs(
            @RequestHeader("X-INGEST-KEY") String ingestKey,
            @RequestBody com.cymops.dto.TelemetryIngestRequestDto request) {
        return ResponseEntity.ok(telemetryIngestionService.ingest("logs", ingestKey, request));
    }

    @GetMapping("/keys")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listKeys(@RequestParam Long projectId,
                                                              Authentication authentication) {
        return ResponseEntity.ok(telemetryIngestionService.listKeys(authentication.getName(), projectId));
    }

    @GetMapping("/usage")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> projectUsage(@RequestParam Long projectId,
                                                            Authentication authentication) {
        return ResponseEntity.ok(telemetryIngestionService.projectUsage(authentication.getName(), projectId));
    }

    @PostMapping("/keys/{id}/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> revokeKey(@PathVariable Long id,
                                                         Authentication authentication) {
        return ResponseEntity.ok(telemetryIngestionService.revokeKey(authentication.getName(), id));
    }

    @PostMapping("/keys/{id}/rotate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> rotateKey(@PathVariable Long id,
                                                        Authentication authentication) {
        return ResponseEntity.ok(telemetryIngestionService.rotateKey(authentication.getName(), id));
    }

    @PostMapping("/keys")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CreateIngestKeyResponseDto> createIngestKey(
            @RequestBody CreateIngestKeyRequestDto request,
            Authentication authentication) {
        return ResponseEntity.ok(telemetryIngestionService.createIngestKey(authentication.getName(), request));
    }
}
