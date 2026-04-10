package com.cymops.controller;

import com.cymops.dto.CreateDbIncidentRequestDto;
import com.cymops.model.entity.DbIncident;
import com.cymops.service.DbIncidentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents/db")
@RequiredArgsConstructor
public class DbIncidentController {

    private final DbIncidentService dbIncidentService;

    @PostMapping
    public ResponseEntity<DbIncident> createIncident(@RequestBody CreateDbIncidentRequestDto request) {
        DbIncident incident = dbIncidentService.createIncident(request);
        return ResponseEntity.ok(incident);
    }
}
