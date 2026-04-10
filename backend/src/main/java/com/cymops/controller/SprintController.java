package com.cymops.controller;

import com.cymops.dto.SprintDto;
import com.cymops.dto.SprintRequestDto;
import com.cymops.service.SprintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sprints")
@RequiredArgsConstructor
public class SprintController {

    private final SprintService sprintService;

    @GetMapping
    public ResponseEntity<List<SprintDto>> getSprints(@RequestParam Long projectId) {
        return ResponseEntity.ok(sprintService.getSprints(projectId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SprintDto> createSprint(@RequestBody SprintRequestDto dto) {
        return ResponseEntity.ok(sprintService.createSprint(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SprintDto> updateSprint(@PathVariable Long id,
                                                    @RequestBody SprintRequestDto dto) {
        return ResponseEntity.ok(sprintService.updateSprint(id, dto));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SprintDto> startSprint(@PathVariable Long id) {
        return ResponseEntity.ok(sprintService.startSprint(id));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SprintDto> completeSprint(@PathVariable Long id) {
        return ResponseEntity.ok(sprintService.completeSprint(id));
    }
}
