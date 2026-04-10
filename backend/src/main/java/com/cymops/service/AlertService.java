package com.cymops.service;

import com.cymops.dto.AlertPayloadDto;
import com.cymops.model.entity.IncidentRoom;
import com.cymops.model.entity.IncidentTimeline;
import com.cymops.model.entity.Project;
import com.cymops.model.enums.RoomSeverity;
import com.cymops.model.enums.RoomStatus;
import com.cymops.repository.IncidentRoomRepository;
import com.cymops.repository.IncidentTimelineRepository;
import com.cymops.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final ProjectRepository projectRepository;
    private final IncidentRoomRepository roomRepository;
    private final IncidentTimelineRepository timelineRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public IncidentRoom processAlert(Long projectId, AlertPayloadDto payload) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Map severity
        RoomSeverity severity = RoomSeverity.SEV3;
        if (payload.getSeverity() != null) {
            String lower = payload.getSeverity().toLowerCase();
            if (lower.contains("critical") || lower.contains("sev1") || lower.contains("high")) {
                severity = RoomSeverity.SEV1;
            } else if (lower.contains("warning") || lower.contains("sev2") || lower.contains("medium")) {
                severity = RoomSeverity.SEV2;
            }
        }

        // Create incident room automatically
        IncidentRoom room = IncidentRoom.builder()
                .project(project)
                .name("[ALERT - " + payload.getSource() + "] " + payload.getTitle())
                .status(RoomStatus.OPEN)
                .severity(severity)
                .description(payload.getDescription())
                .build();
        room = roomRepository.save(room);

        // Record the alert in timeline
        String metadataStr = "{}";
        try {
            metadataStr = objectMapper.writeValueAsString(payload.getLabels());
        } catch (JsonProcessingException ignored) {}

        IncidentTimeline timelineEvent = IncidentTimeline.builder()
                .room(room)
                .eventType("ALERT")
                .content("Incoming alert from " + payload.getSource() + ": " + payload.getTitle())
                .metadata(metadataStr)
                .build();
        timelineRepository.save(timelineEvent);

        return room;
    }
}
