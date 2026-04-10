package com.cymops.service;

import com.cymops.dto.CreateDbIncidentRequestDto;
import com.cymops.model.entity.DbIncident;
import com.cymops.repository.DbIncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DbIncidentService {

    private final DbIncidentRepository dbIncidentRepository;

    @Transactional
    public DbIncident createIncident(CreateDbIncidentRequestDto request) {
        validateRequest(request);

        DbIncident incident = DbIncident.builder()
                .source(request.getSource().trim())
                .severity(request.getSeverity().trim().toUpperCase())
                .title(request.getTitle().trim())
                .details(request.getDetails())
                .status("OPEN")
                .startedAt(LocalDateTime.now())
                .build();

        return dbIncidentRepository.save(incident);
    }

    private void validateRequest(CreateDbIncidentRequestDto request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.getSource() == null || request.getSource().isBlank()) {
            throw new IllegalArgumentException("source is required");
        }
        if (request.getSeverity() == null || request.getSeverity().isBlank()) {
            throw new IllegalArgumentException("severity is required");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("title is required");
        }
    }
}
