package com.cymops.dto;

import lombok.Data;

import java.util.Map;

@Data
public class TelemetryIngestRequestDto {
    private String source;
    private Map<String, Object> payload;
}
