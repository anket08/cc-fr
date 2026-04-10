package com.cymops.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class IssueRequestDto {
    private Long projectId;
    private Long sprintId;
    private String title;
    private String description;
    private String type;       // TASK | BUG | STORY | EPIC
    private String status;     // TODO | IN_PROGRESS | IN_REVIEW | DONE
    private String priority;   // LOWEST | LOW | MEDIUM | HIGH | HIGHEST
    private String assigneeEmail;
    private String labels;
    private Integer storyPoints;
    private Integer position;
    private LocalDate dueDate;
}
