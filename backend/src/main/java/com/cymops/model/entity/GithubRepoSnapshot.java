package com.cymops.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "github_repo_snapshots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GithubRepoSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repository_full_name", nullable = false)
    private String repositoryFullName;

    @Column(name = "default_branch")
    private String defaultBranch;

    @Column(name = "open_pr_count", nullable = false)
    @Builder.Default
    private Integer openPrCount = 0;

    @Column(name = "failed_workflow_runs", nullable = false)
    @Builder.Default
    private Integer failedWorkflowRuns = 0;

    @Column(name = "total_workflow_runs", nullable = false)
    @Builder.Default
    private Integer totalWorkflowRuns = 0;

    @Column(name = "deployments_last_7d", nullable = false)
    @Builder.Default
    private Integer deploymentsLast7d = 0;

    @Column(name = "open_security_alerts", nullable = false)
    @Builder.Default
    private Integer openSecurityAlerts = 0;

    @Column(name = "open_code_scanning_alerts", nullable = false)
    @Builder.Default
    private Integer openCodeScanningAlerts = 0;

    @Column(name = "collected_at", nullable = false, updatable = false)
    private LocalDateTime collectedAt;

    @PrePersist
    protected void onCreate() {
        if (collectedAt == null) {
            collectedAt = LocalDateTime.now();
        }
    }
}
