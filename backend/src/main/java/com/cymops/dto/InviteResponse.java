package com.cymops.dto;

import com.cymops.model.enums.InviteStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InviteResponse {
    private Long id;
    private Long projectId;
    private String projectName;
    private String email;
    private InviteStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;
}
