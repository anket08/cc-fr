package com.cymops.service;

import com.cymops.dto.CreateIngestKeyRequestDto;
import com.cymops.dto.CreateIngestKeyResponseDto;
import com.cymops.dto.TelemetryIngestRequestDto;
import com.cymops.dto.TelemetryIngestResponseDto;
import com.cymops.model.entity.Project;
import com.cymops.model.entity.TelemetryIngestKey;
import com.cymops.repository.ProjectRepository;
import com.cymops.repository.TelemetryIngestKeyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TelemetryIngestionService {

    private final ProjectAccessService projectAccessService;
    private final ProjectRepository projectRepository;
    private final TelemetryIngestQuotaService telemetryIngestQuotaService;
    private final TelemetryIngestQueueService telemetryIngestQueueService;
    private final TelemetryIngestKeyRepository telemetryIngestKeyRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public CreateIngestKeyResponseDto createIngestKey(String requestedByEmail, CreateIngestKeyRequestDto request) {
        if (request.getProjectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "projectId is required");
        }

        String label = request.getLabel();
        if (label == null || label.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "label is required");
        }

        projectAccessService.requireProjectAccess(requestedByEmail, request.getProjectId());

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        String rawKey = "cymops_ing_" + UUID.randomUUID().toString().replace("-", "");
        String keyHash = hash(rawKey);

        TelemetryIngestKey entity = TelemetryIngestKey.builder()
                .project(project)
                .label(label.trim())
                .keyHash(keyHash)
                .active(true)
                .createdAt(LocalDateTime.now())
                .build();

        TelemetryIngestKey saved = telemetryIngestKeyRepository.save(entity);
        return new CreateIngestKeyResponseDto(saved.getId(), project.getId(), saved.getLabel(), rawKey);
    }

    public List<Map<String, Object>> listKeys(String requestedByEmail, Long projectId) {
        projectAccessService.requireProjectAccess(requestedByEmail, projectId);
        List<TelemetryIngestKey> keys = telemetryIngestKeyRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (TelemetryIngestKey key : keys) {
            result.add(describeKey(key));
        }
        return result;
    }

    public Map<String, Object> projectUsage(String requestedByEmail, Long projectId) {
        projectAccessService.requireProjectAccess(requestedByEmail, projectId);
        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("metrics", telemetryIngestQuotaService.currentUsage(projectId, "metrics"));
        usage.put("logs", telemetryIngestQuotaService.currentUsage(projectId, "logs"));
        return usage;
    }

    @Transactional
    public Map<String, Object> revokeKey(String requestedByEmail, Long keyId) {
        TelemetryIngestKey key = telemetryIngestKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ingest key not found"));
        projectAccessService.requireProjectAccess(requestedByEmail, key.getProject().getId());
        key.setActive(false);
        telemetryIngestKeyRepository.save(key);
        return describeKey(key);
    }

    @Transactional
    public Map<String, Object> rotateKey(String requestedByEmail, Long keyId) {
        TelemetryIngestKey oldKey = telemetryIngestKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ingest key not found"));
        projectAccessService.requireProjectAccess(requestedByEmail, oldKey.getProject().getId());

        oldKey.setActive(false);
        telemetryIngestKeyRepository.save(oldKey);

        String rawKey = "cymops_ing_" + UUID.randomUUID().toString().replace("-", "");
        TelemetryIngestKey newKey = TelemetryIngestKey.builder()
                .project(oldKey.getProject())
                .label(oldKey.getLabel())
                .keyHash(hash(rawKey))
                .active(true)
                .createdAt(LocalDateTime.now())
                .build();
        TelemetryIngestKey saved = telemetryIngestKeyRepository.save(newKey);

        Map<String, Object> response = new LinkedHashMap<>(describeKey(saved));
        response.put("ingestKey", rawKey);
        response.put("rotatedFromKeyId", oldKey.getId());
        return response;
    }

    @Transactional
    public TelemetryIngestResponseDto ingest(String signalType, String ingestKey, TelemetryIngestRequestDto request) {
        if (ingestKey == null || ingestKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing ingest key");
        }
        if (request == null || request.getPayload() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "payload is required");
        }

        String keyHash = hash(ingestKey);
        TelemetryIngestKey key = telemetryIngestKeyRepository.findByKeyHashAndActiveTrue(keyHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid ingest key"));

        String source = (request.getSource() == null || request.getSource().isBlank())
                ? "external-agent"
                : request.getSource().trim();

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(request.getPayload());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "payload must be valid JSON object");
        }

        validateTelemetryPayload(request.getPayload());

        telemetryIngestQuotaService.enforce(
            key.getProject().getId(),
            key.getKeyHash(),
            signalType,
            payloadJson.getBytes(StandardCharsets.UTF_8).length
        );

        telemetryIngestQueueService.enqueue(key.getProject().getId(), source, signalType, payloadJson);

        key.setLastUsedAt(LocalDateTime.now());
        telemetryIngestKeyRepository.save(key);

        return new TelemetryIngestResponseDto("QUEUED", key.getProject().getId(), signalType);
    }

    private String hash(String rawKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawKey.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Unable to hash ingest key", ex);
        }
    }

    private Map<String, Object> describeKey(TelemetryIngestKey key) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", key.getId());
        row.put("projectId", key.getProject().getId());
        row.put("label", key.getLabel());
        row.put("active", key.isActive());
        row.put("createdAt", key.getCreatedAt());
        row.put("lastUsedAt", key.getLastUsedAt());
        return row;
    }

    private void validateTelemetryPayload(Map<String, Object> payload) {
        requirePresent(payload, "service");
        requirePresent(payload, "env");
        requirePresent(payload, "timestamp");
    }

    private void requirePresent(Map<String, Object> payload, String fieldName) {
        Object value = payload.get(fieldName);
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required in telemetry payload");
        }
        if (value instanceof String text && text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required in telemetry payload");
        }
    }

}
