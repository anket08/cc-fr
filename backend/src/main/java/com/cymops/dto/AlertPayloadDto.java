package com.cymops.dto;

import lombok.Data;
import java.util.Map;

@Data
public class AlertPayloadDto {
    private String source; // e.g., "prometheus", "datadog", "grafana"
    private String title;
    private String description;
    private String severity; // "critical", "warning", etc.
    private Map<String, Object> labels;
}
