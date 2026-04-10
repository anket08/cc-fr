package com.cymops.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class IssueActivityDto {
    private Long id;
    private Long issueId;
    private String actorEmail;
    private String action;
    private String field;
    private String oldValue;
    private String newValue;
    private LocalDateTime createdAt;
}
