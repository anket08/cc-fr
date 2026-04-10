package com.cymops.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryIngestQueueService {

    private final StringRedisTemplate stringRedisTemplate;

    @Value("${observability.ingest.queue.stream-key:cymops:ingest:events}")
    private String streamKey;

    @Value("${observability.ingest.queue.consumer-group:cymops-ingest-workers}")
    private String consumerGroup;

    @PostConstruct
    public void ensureConsumerGroup() {
        try {
            if (!Boolean.TRUE.equals(stringRedisTemplate.hasKey(streamKey))) {
                stringRedisTemplate.opsForStream().add(MapRecord.create(streamKey, Map.of("bootstrap", "true")));
            }
            stringRedisTemplate.opsForStream().createGroup(streamKey, ReadOffset.from("0-0"), consumerGroup);
            log.info("Created Redis stream consumer group '{}' for key '{}'.", consumerGroup, streamKey);
        } catch (Exception ex) {
            // BUSYGROUP means it already exists.
            if (ex.getMessage() != null && ex.getMessage().contains("BUSYGROUP")) {
                return;
            }
            log.warn("Unable to create stream consumer group for telemetry ingest queue: {}", ex.getMessage());
        }
    }

    public void enqueue(Long projectId, String source, String signalType, String payloadJson) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("projectId", String.valueOf(projectId));
        payload.put("source", source);
        payload.put("signalType", signalType);
        payload.put("payloadJson", payloadJson);
        payload.put("queuedAt", Instant.now().toString());

        try {
            stringRedisTemplate.opsForStream().add(MapRecord.create(streamKey, payload));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Ingestion queue unavailable");
        }
    }
}
