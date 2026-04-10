package com.cymops.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CreateIngestKeyResponseDto {
    private Long id;
    private Long projectId;
    private String label;
    private String ingestKey;
}
