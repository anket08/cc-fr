package com.cymops.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueDto {
    private Long id;
    private Long projectId;
    private String projectName;
    private Long sprintId;
    private String sprintName;
    private String title;
    private String description;
    private String type;
    private String status;
    private String priority;
    private String assigneeEmail;
    private String reporterEmail;
    private String labels;
    private Integer storyPoints;
    private Integer position;
    private LocalDate dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int commentCount;
}
