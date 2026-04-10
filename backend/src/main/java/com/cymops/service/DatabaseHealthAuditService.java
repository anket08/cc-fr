package com.cymops.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class DatabaseHealthAuditService {

    private final JdbcTemplate jdbcTemplate;

    @Value("${observability.db-audit.capacity-threshold-percent:80}")
    private double capacityThresholdPercent;

    @Value("${observability.db-audit.connection-threshold-percent:85}")
    private double connectionThresholdPercent;

    private final AtomicReference<Map<String, Object>> latestAudit = new AtomicReference<>(Map.of(
            "status", "NOT_RUN_YET",
            "generatedAt", LocalDateTime.now()
    ));

    @Scheduled(cron = "${observability.db-audit.cron:0 0 2 * * *}")
    public void scheduledAudit() {
        latestAudit.set(runAudit());
    }

    public Map<String, Object> getLatestAudit() {
        return latestAudit.get();
    }

    public Map<String, Object> runAudit() {
        Map<String, Object> audit = new LinkedHashMap<>();
        audit.put("generatedAt", LocalDateTime.now());

        double dbSizeMb = queryDouble("select pg_database_size(current_database()) / 1024.0 / 1024.0");
        double maxDbSizeMb = queryDouble("select setting::numeric * 8 / 1024.0 from pg_settings where name = 'shared_buffers'");
        double capacityPercent = maxDbSizeMb > 0 ? (dbSizeMb / maxDbSizeMb) * 100.0 : 0.0;

        double activeConnections = queryDouble("select count(*)::numeric from pg_stat_activity where datname = current_database() and state = 'active'");
        double maxConnections = queryDouble("select setting::numeric from pg_settings where name = 'max_connections'");
        double connectionPercent = maxConnections > 0 ? (activeConnections / maxConnections) * 100.0 : 0.0;

        List<Map<String, Object>> topTablesBySize = jdbcTemplate.queryForList("""
                select relname as table_name,
                       round(pg_total_relation_size(relid) / 1024.0 / 1024.0, 2) as size_mb
                from pg_catalog.pg_statio_user_tables
                order by pg_total_relation_size(relid) desc
                limit 10
                """);

        List<Map<String, Object>> indexEfficiency = jdbcTemplate.queryForList("""
                select relname as table_name,
                       seq_scan,
                       idx_scan,
                       case when (seq_scan + idx_scan) > 0
                            then round((idx_scan::numeric / (seq_scan + idx_scan)) * 100, 2)
                            else 0 end as index_usage_percent
                from pg_stat_user_tables
                order by seq_scan desc
                limit 10
                """);

        List<String> actions = new java.util.ArrayList<>();
        if (capacityPercent > capacityThresholdPercent) {
            actions.add("Database capacity trending high; review table growth and retention policies");
        }
        if (connectionPercent > connectionThresholdPercent) {
            actions.add("Connection pressure high; inspect pool sizing and long-running queries");
        }

        Map<String, Object> capacity = new LinkedHashMap<>();
        capacity.put("databaseSizeMb", round(dbSizeMb));
        capacity.put("bufferCapacityMb", round(maxDbSizeMb));
        capacity.put("capacityPercent", round(capacityPercent));
        capacity.put("capacityThresholdPercent", capacityThresholdPercent);

        Map<String, Object> connections = new LinkedHashMap<>();
        connections.put("activeConnections", round(activeConnections));
        connections.put("maxConnections", round(maxConnections));
        connections.put("connectionUtilizationPercent", round(connectionPercent));
        connections.put("connectionThresholdPercent", connectionThresholdPercent);

        audit.put("capacity", capacity);
        audit.put("connections", connections);
        audit.put("topTablesBySize", topTablesBySize);
        audit.put("indexEfficiency", indexEfficiency);
        audit.put("actions", actions);
        audit.put("status", actions.isEmpty() ? "HEALTHY" : "ACTION_REQUIRED");

        return audit;
    }

    private double queryDouble(String sql) {
        try {
            Double value = jdbcTemplate.queryForObject(sql, Double.class);
            return value == null ? 0.0 : value;
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
