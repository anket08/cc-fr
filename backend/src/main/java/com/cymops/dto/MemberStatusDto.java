package com.cymops.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MemberStatusDto {
    private String email;
    private String role;
    private String status;
    private Long lastSeen;
}
