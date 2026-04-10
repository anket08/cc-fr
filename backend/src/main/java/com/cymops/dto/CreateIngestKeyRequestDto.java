package com.cymops.dto;

import lombok.Data;

@Data
public class CreateIngestKeyRequestDto {
    private Long projectId;
    private String label;
}
