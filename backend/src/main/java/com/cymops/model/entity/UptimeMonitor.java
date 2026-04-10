package com.cymops.model.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

@Entity
@Table(name = "uptime_monitors")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UptimeMonitor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnoreProperties({"createdBy", "hibernateLazyInitializer", "handler"})
    private Project project;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(nullable = false)
    @Builder.Default
    private String method = "GET";

    @Column(name = "expected_status", nullable = false)
    @Builder.Default
    private Integer expectedStatus = 200;

    @Column(name = "interval_seconds", nullable = false)
    @Builder.Default
    private Integer intervalSeconds = 60;

    @Column(name = "timeout_ms", nullable = false)
    @Builder.Default
    private Integer timeoutMs = 5000;

    @Column(name = "headers_json", columnDefinition = "TEXT")
    private String headersJson;

    @Column(name = "body_json", columnDefinition = "TEXT")
    private String bodyJson;

    @Column(nullable = false)
    @Builder.Default
    private Boolean paused = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
