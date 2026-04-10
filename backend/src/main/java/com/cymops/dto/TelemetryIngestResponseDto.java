package com.cymops.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TelemetryIngestResponseDto {
    private String status;
    private Long projectId;
    private String signalType;
}
