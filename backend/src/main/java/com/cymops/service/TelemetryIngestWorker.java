package com.cymops.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelemetryIngestWorker {

    private final StringRedisTemplate stringRedisTemplate;
    private final TelemetryIngestPersistenceService telemetryIngestPersistenceService;

    @Value("${observability.ingest.queue.stream-key:cymops:ingest:events}")
    private String streamKey;

    @Value("${observability.ingest.queue.consumer-group:cymops-ingest-workers}")
    private String consumerGroup;

    @Value("${observability.ingest.queue.batch-size:100}")
    private int batchSize;

    private final String consumerName = "worker-" + UUID.randomUUID();

    @Scheduled(fixedDelayString = "${observability.ingest.queue.worker-fixed-delay-ms:500}")
    @SuppressWarnings("unchecked")
    public void drainQueue() {
        List<MapRecord<String, Object, Object>> records;
        try {
            records = stringRedisTemplate.opsForStream().read(
                    Consumer.from(consumerGroup, consumerName),
                    StreamReadOptions.empty().count(batchSize).block(Duration.ofMillis(100)),
                    StreamOffset.create(streamKey, ReadOffset.lastConsumed())
            );
        } catch (Exception ex) {
            log.warn("Telemetry ingest queue read failed: {}", ex.getMessage());
            return;
        }

        if (records == null || records.isEmpty()) {
            return;
        }

        for (MapRecord<String, Object, Object> record : records) {
            try {
                Map<Object, Object> value = record.getValue();
                Long projectId = Long.parseLong(String.valueOf(value.get("projectId")));
                String source = String.valueOf(value.get("source"));
                String signalType = String.valueOf(value.get("signalType"));
                String payloadJson = String.valueOf(value.get("payloadJson"));

                telemetryIngestPersistenceService.persist(projectId, source, signalType, payloadJson);

                stringRedisTemplate.opsForStream().acknowledge(consumerGroup, record);
                stringRedisTemplate.opsForStream().delete(streamKey, record.getId());
            } catch (Exception ex) {
                log.error("Failed to process telemetry ingest record {}: {}", record.getId(), ex.getMessage());
            }
        }
    }
}
