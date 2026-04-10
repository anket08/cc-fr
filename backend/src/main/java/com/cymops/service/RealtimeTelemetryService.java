package com.cymops.service;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.distribution.ValueAtPercentile;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RealtimeTelemetryService {

    private final MeterRegistry meterRegistry;

    @Value("${observability.alerts.latency-p95-ms:800}")
    private double latencyP95ThresholdMs;

    @Value("${observability.alerts.error-rate-percent:3}")
    private double errorRateThresholdPercent;

    @Value("${observability.alerts.db-connection-utilization-percent:85}")
    private double dbConnectionThresholdPercent;

    public Map<String, Object> buildSnapshot(long wsBroadcastDurationMs) {
        return buildSnapshot(wsBroadcastDurationMs, null);
    }

    public Map<String, Object> buildSnapshot(long wsBroadcastDurationMs, Long projectId) {
        HttpSummary httpSummary = summarizeHttpServerMetrics();
        double dbLatencyMs = resolveDbLatencyMs();
        double dbConnectionUtilizationPercent = resolveDbConnectionUtilizationPercent();

        boolean ok = httpSummary.errorRatePercent <= errorRateThresholdPercent
                && httpSummary.backendP95Ms <= latencyP95ThresholdMs
                && dbConnectionUtilizationPercent <= dbConnectionThresholdPercent;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("backendLat", round(httpSummary.backendP95Ms));
        payload.put("dbLat", round(dbLatencyMs));
        payload.put("authLat", round(httpSummary.authP95Ms));
        payload.put("wsLat", wsBroadcastDurationMs);
        payload.put("ok", ok);
        payload.put("timestamp", System.currentTimeMillis());
        payload.put("scope", "project");
        payload.put("projectId", projectId);
        payload.put("endpoints", buildEndpointStats(httpSummary.endpointSummaries));
        return payload;
    }

    private HttpSummary summarizeHttpServerMetrics() {
        Collection<Timer> timers = meterRegistry.find("http.server.requests").timers();
        Map<String, EndpointSummary> endpointSummaries = new LinkedHashMap<>();

        double backendP95Ms = 0;
        double authP95Ms = 0;
        long requestCount = 0;
        long errorCount = 0;

        for (Timer timer : timers) {
            long count = timer.count();
            requestCount += count;

            String statusTag = defaultString(timer.getId().getTag("status"), "unknown");
            String uriTag = defaultString(timer.getId().getTag("uri"), "unknown");

            boolean isError = statusTag.startsWith("5");
            if (isError) {
                errorCount += count;
            }

            double meanMs = timer.mean(TimeUnit.MILLISECONDS);
            if (Double.isNaN(meanMs) || meanMs < 0) {
                meanMs = 0;
            }

            double p95Ms = resolveP95Ms(timer, meanMs);

            backendP95Ms = Math.max(backendP95Ms, p95Ms);
            if (uriTag.toLowerCase().contains("auth")) {
                authP95Ms = Math.max(authP95Ms, p95Ms);
            }

            EndpointSummary endpointSummary = endpointSummaries.computeIfAbsent(uriTag, key -> new EndpointSummary());
            endpointSummary.calls += count;
            endpointSummary.totalLatencyMs += meanMs * count;
            endpointSummary.p95Ms = Math.max(endpointSummary.p95Ms, p95Ms);
            if (isError) {
                endpointSummary.errors += count;
            }
        }

        if (authP95Ms <= 0) {
            authP95Ms = backendP95Ms;
        }

        double errorRatePercent = requestCount > 0 ? ((double) errorCount / requestCount) * 100.0 : 0.0;
        return new HttpSummary(backendP95Ms, authP95Ms, errorRatePercent, endpointSummaries);
    }

    private List<Map<String, Object>> buildEndpointStats(Map<String, EndpointSummary> endpointSummaries) {
        List<Map<String, Object>> rows = new ArrayList<>();
        endpointSummaries.entrySet().stream()
                .filter(entry -> !"unknown".equalsIgnoreCase(entry.getKey()))
                .sorted(Comparator.comparingLong((Map.Entry<String, EndpointSummary> e) -> e.getValue().calls).reversed())
                .limit(15)
                .forEach(entry -> {
                    EndpointSummary value = entry.getValue();
                    double avgLatency = value.calls > 0 ? (value.totalLatencyMs / value.calls) : 0;

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("endpoint", entry.getKey());
                    row.put("avgLatency", round(avgLatency));
                    row.put("p95", round(value.p95Ms));
                    row.put("calls", value.calls);
                    row.put("errors", value.errors);
                    rows.add(row);
                });
        return rows;
    }

    private double resolveDbLatencyMs() {
        Timer acquireTimer = meterRegistry.find("hikaricp.connections.acquire").timer();
        if (acquireTimer != null) {
            double latency = acquireTimer.mean(TimeUnit.MILLISECONDS);
            if (!Double.isNaN(latency) && latency >= 0) {
                return latency;
            }
        }
        return 0;
    }

    private double resolveDbConnectionUtilizationPercent() {
        double dbActive = gaugeValue("hikaricp.connections.active");
        double dbMax = gaugeValue("hikaricp.connections.max");
        if (dbMax <= 0) {
            return 0;
        }
        return (dbActive / dbMax) * 100.0;
    }

    private double gaugeValue(String name) {
        Gauge gauge = meterRegistry.find(name).gauge();
        if (gauge == null) {
            return 0.0;
        }
        Double value = gauge.value();
        return value == null ? 0.0 : value;
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private double resolveP95Ms(Timer timer, double fallbackMs) {
        ValueAtPercentile[] percentiles = timer.takeSnapshot().percentileValues();
        for (ValueAtPercentile percentile : percentiles) {
            if (Math.abs(percentile.percentile() - 0.95) < 0.0001) {
                double p95Ms = percentile.value(TimeUnit.MILLISECONDS);
                if (!Double.isNaN(p95Ms) && p95Ms > 0) {
                    return p95Ms;
                }
            }
        }
        return fallbackMs;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static class EndpointSummary {
        private long calls;
        private long errors;
        private double totalLatencyMs;
        private double p95Ms;
    }

    private record HttpSummary(double backendP95Ms,
                               double authP95Ms,
                               double errorRatePercent,
                               Map<String, EndpointSummary> endpointSummaries) {
    }
}
