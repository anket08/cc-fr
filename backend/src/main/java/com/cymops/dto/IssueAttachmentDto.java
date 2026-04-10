package com.cymops.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class IssueAttachmentDto {
    private Long id;
    private Long issueId;
    private String uploaderEmail;
    private String filename;
    private String contentType;
    private Long fileSize;
    private String downloadUrl;
    private LocalDateTime createdAt;
}
