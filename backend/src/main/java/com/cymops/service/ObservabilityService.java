package com.cymops.service;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class ObservabilityService {

    private final MeterRegistry meterRegistry;

    @Value("${observability.alerts.latency-p95-ms:800}")
    private double latencyP95ThresholdMs;

    @Value("${observability.alerts.error-rate-percent:3}")
    private double errorRateThresholdPercent;

    @Value("${observability.alerts.cpu-utilization-percent:85}")
    private double cpuThresholdPercent;

    @Value("${observability.alerts.memory-utilization-percent:90}")
    private double memoryThresholdPercent;

    @Value("${observability.alerts.db-connection-utilization-percent:85}")
    private double dbConnectionThresholdPercent;

    public Map<String, Object> buildGoldenSignals() {
        return buildGoldenSignals(null);
    }

    public Map<String, Object> buildGoldenSignals(Long projectId) {
        TimerSummary httpSummary = summarizeHttpServerMetrics();

        double cpuUsagePercent = gaugeValue("system.cpu.usage") * 100.0;
        double memoryUsed = gaugeValue("jvm.memory.used");
        double memoryMax = gaugeValue("jvm.memory.max");
        double memoryUsagePercent = memoryMax > 0 ? (memoryUsed / memoryMax) * 100.0 : 0.0;

        double dbActive = gaugeValue("hikaricp.connections.active");
        double dbMax = gaugeValue("hikaricp.connections.max");
        double dbConnectionUtilizationPercent = dbMax > 0 ? (dbActive / dbMax) * 100.0 : 0.0;

        List<String> alerts = new ArrayList<>();
        if (httpSummary.latencyP95Ms > latencyP95ThresholdMs) {
            alerts.add("Latency p95 exceeded threshold");
        }
        if (httpSummary.errorRatePercent > errorRateThresholdPercent) {
            alerts.add("Error rate exceeded threshold");
        }
        if (cpuUsagePercent > cpuThresholdPercent) {
            alerts.add("CPU utilization exceeded threshold");
        }
        if (memoryUsagePercent > memoryThresholdPercent) {
            alerts.add("JVM memory utilization exceeded threshold");
        }
        if (dbConnectionUtilizationPercent > dbConnectionThresholdPercent) {
            alerts.add("DB connection pool utilization exceeded threshold");
        }

        Map<String, Object> latency = new LinkedHashMap<>();
        latency.put("httpP95Ms", round(httpSummary.latencyP95Ms));
        latency.put("thresholdMs", latencyP95ThresholdMs);

        Map<String, Object> traffic = new LinkedHashMap<>();
        traffic.put("requestCount", httpSummary.requestCount);
        traffic.put("requestsPerMinute", round(httpSummary.requestsPerMinute));

        Map<String, Object> errors = new LinkedHashMap<>();
        errors.put("errorCount", httpSummary.errorCount);
        errors.put("errorRatePercent", round(httpSummary.errorRatePercent));
        errors.put("thresholdPercent", errorRateThresholdPercent);

        Map<String, Object> saturation = new LinkedHashMap<>();
        saturation.put("cpuUtilizationPercent", round(cpuUsagePercent));
        saturation.put("memoryUtilizationPercent", round(memoryUsagePercent));
        saturation.put("dbConnectionUtilizationPercent", round(dbConnectionUtilizationPercent));
        saturation.put("cpuThresholdPercent", cpuThresholdPercent);
        saturation.put("memoryThresholdPercent", memoryThresholdPercent);
        saturation.put("dbConnectionThresholdPercent", dbConnectionThresholdPercent);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("latency", latency);
        payload.put("traffic", traffic);
        payload.put("errors", errors);
        payload.put("saturation", saturation);
        payload.put("alerts", alerts);
        payload.put("status", alerts.isEmpty() ? "HEALTHY" : "ATTENTION_REQUIRED");
        payload.put("scope", "project");
        payload.put("projectId", projectId);
        return payload;
    }

    private TimerSummary summarizeHttpServerMetrics() {
        Collection<Timer> timers = meterRegistry.find("http.server.requests").timers();
        long count = 0;
        long errorCount = 0;
        double latencyP95Ms = 0;

        for (Timer timer : timers) {
            count += timer.count();
            String statusTag = timer.getId().getTag("status");
            if (statusTag != null && statusTag.startsWith("5")) {
                errorCount += timer.count();
            }

            double candidateP95 = timer.percentile(0.95, TimeUnit.MILLISECONDS);
            if (Double.isNaN(candidateP95) || candidateP95 <= 0) {
                candidateP95 = timer.mean(TimeUnit.MILLISECONDS);
            }
            latencyP95Ms = Math.max(latencyP95Ms, candidateP95);
        }

        double uptimeSeconds = gaugeValue("process.uptime");
        double requestsPerMinute = uptimeSeconds > 0 ? (count / uptimeSeconds) * 60.0 : 0.0;
        double errorRatePercent = count > 0 ? ((double) errorCount / (double) count) * 100.0 : 0.0;

        return new TimerSummary(count, errorCount, requestsPerMinute, errorRatePercent, latencyP95Ms);
    }

    private double gaugeValue(String name) {
        Gauge gauge = meterRegistry.find(name).gauge();
        if (gauge == null) {
            return 0.0;
        }
        Double value = gauge.value();
        return value == null ? 0.0 : value;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record TimerSummary(long requestCount,
                                long errorCount,
                                double requestsPerMinute,
                                double errorRatePercent,
                                double latencyP95Ms) {
    }
}
