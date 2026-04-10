package com.cymops.service;

import com.cymops.model.entity.Project;
import com.cymops.model.entity.TelemetryIngestEvent;
import com.cymops.repository.ProjectRepository;
import com.cymops.repository.TelemetryIngestEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TelemetryIngestPersistenceService {

    private final ProjectRepository projectRepository;
    private final TelemetryIngestEventRepository telemetryIngestEventRepository;

    @Transactional
    public void persist(Long projectId, String source, String signalType, String payloadJson) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found for ingest event"));

        TelemetryIngestEvent event = TelemetryIngestEvent.builder()
                .project(project)
                .source(source)
                .signalType(signalType)
                .payloadJson(payloadJson)
                .receivedAt(LocalDateTime.now())
                .build();
        telemetryIngestEventRepository.save(event);
    }
}
