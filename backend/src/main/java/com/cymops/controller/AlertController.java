package com.cymops.controller;

import com.cymops.dto.AlertPayloadDto;
import com.cymops.model.entity.IncidentRoom;
import com.cymops.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @PostMapping("/alerts/{projectId}")
    public ResponseEntity<IncidentRoom> handleAlert(
            @PathVariable Long projectId,
            @RequestBody AlertPayloadDto payload) {
        return ResponseEntity.ok(alertService.processAlert(projectId, payload));
    }
}
