package com.cymops.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueCommentDto {
    private Long id;
    private Long issueId;
    private String authorEmail;
    private String body;
    private LocalDateTime createdAt;
}
