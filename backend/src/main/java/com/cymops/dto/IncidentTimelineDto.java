package com.cymops.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentTimelineDto {
    private Long id;
    private Long roomId;
    private String eventType;
    private String content;
    private String metadata;
    private LocalDateTime createdAt;
}
