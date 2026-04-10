package com.cymops.observability.pipeline;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryEnvelope {
    private Long projectId;
    private String tenant;
    private String environment;
    private String service;
    private String signalType;
    private Instant timestamp;
    private Map<String, Object> payload;
}
