package com.cymops.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "issue_activities")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @Column(name = "actor_email", nullable = false)
    private String actorEmail;

    /** e.g. CREATED, STATUS_CHANGED, ASSIGNEE_CHANGED, PRIORITY_CHANGED, COMMENT_ADDED, ATTACHMENT_ADDED */
    @Column(nullable = false, length = 100)
    private String action;

    /** Which field changed (nullable for CREATED/COMMENT_ADDED) */
    @Column(length = 100)
    private String field;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
