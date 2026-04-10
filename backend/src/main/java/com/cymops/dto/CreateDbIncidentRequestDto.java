package com.cymops.dto;

import lombok.Data;

@Data
public class CreateDbIncidentRequestDto {
    private String source;
    private String severity;
    private String title;
    private String details;
}
