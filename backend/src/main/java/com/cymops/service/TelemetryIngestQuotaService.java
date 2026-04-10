package com.cymops.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class TelemetryIngestQuotaService {

    @Value("${observability.ingest.rate-limit.per-key-requests-per-minute:1000}")
    private long perKeyRequestsPerMinute;

    @Value("${observability.ingest.quota.metrics.per-project-requests-per-minute:1000}")
    private long metricsProjectRequestsPerMinute;

    @Value("${observability.ingest.quota.logs.per-project-requests-per-minute:1000}")
    private long logsProjectRequestsPerMinute;

    @Value("${observability.ingest.quota.metrics.per-project-bytes-per-second:10485760}")
    private long metricsProjectBytesPerSecond;

    @Value("${observability.ingest.quota.logs.per-project-bytes-per-second:10485760}")
    private long logsProjectBytesPerSecond;

    private final StringRedisTemplate stringRedisTemplate;

    public void enforce(long projectId, String ingestKeyHash, String signalType, int payloadBytes) {
        enforceRequestQuota(projectId, ingestKeyHash, signalType);
        enforceByteQuota(projectId, signalType, payloadBytes);
    }

    private void enforceRequestQuota(long projectId, String ingestKeyHash, String signalType) {
        long perProjectLimit = projectRequestLimit(signalType);

        long keyCount = incrementAndExpire(rateKey("ingest:req:key", ingestKeyHash), Duration.ofMinutes(1));
        if (keyCount > perKeyRequestsPerMinute) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Ingest key rate limit exceeded");
        }

        long projectCount = incrementAndExpire(rateKey("ingest:req:project", projectId + ":" + signalType), Duration.ofMinutes(1));
        if (projectCount > perProjectLimit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, signalType + " request quota exceeded");
        }
    }

    private void enforceByteQuota(long projectId, String signalType, int payloadBytes) {
        long byteLimit = projectByteLimit(signalType);
        long byteCount = incrementAndExpire(rateKey("ingest:bytes:project", projectId + ":" + signalType), Duration.ofSeconds(1), payloadBytes);
        if (byteCount > byteLimit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, signalType + " ingestion byte quota exceeded");
        }
    }

    public Map<String, Object> currentUsage(long projectId, String signalType) {
        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("projectRequestsCurrentMinute", currentValue(rateKey("ingest:req:project", projectId + ":" + signalType)));
        usage.put("projectRequestsLimitPerMinute", projectRequestLimit(signalType));
        usage.put("projectBytesCurrentSecond", currentValue(rateKey("ingest:bytes:project", projectId + ":" + signalType)));
        usage.put("projectBytesLimitPerSecond", projectByteLimit(signalType));
        usage.put("signalType", signalType);
        usage.put("keyRequestsLimitPerMinute", perKeyRequestsPerMinute);
        return usage;
    }

    private String rateKey(String prefix, String scope) {
        return "cymops:" + prefix + ":" + scope;
    }

    private long incrementAndExpire(String key, Duration ttl) {
        return incrementAndExpire(key, ttl, 1);
    }

    private long incrementAndExpire(String key, Duration ttl, long delta) {
        Long current = stringRedisTemplate.opsForValue().increment(key, delta);
        if (current == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Rate limiter unavailable");
        }
        stringRedisTemplate.expire(key, ttl.getSeconds(), TimeUnit.SECONDS);
        return current;
    }

    private long currentValue(String key) {
        String current = stringRedisTemplate.opsForValue().get(key);
        if (current == null || current.isBlank()) {
            return 0L;
        }
        try {
            return Long.parseLong(current);
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    private long projectRequestLimit(String signalType) {
        if ("logs".equalsIgnoreCase(signalType)) {
            return logsProjectRequestsPerMinute;
        }
        return metricsProjectRequestsPerMinute;
    }

    private long projectByteLimit(String signalType) {
        if ("logs".equalsIgnoreCase(signalType)) {
            return logsProjectBytesPerSecond;
        }
        return metricsProjectBytesPerSecond;
    }

}
