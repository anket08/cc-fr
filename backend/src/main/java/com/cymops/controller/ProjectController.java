package com.cymops.controller;

import com.cymops.dto.ProjectRequestDto;
import com.cymops.dto.MemberStatusDto;
import com.cymops.model.entity.Project;
import com.cymops.model.entity.ProjectMember;
import com.cymops.service.ProjectService;
import com.cymops.service.UserActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final UserActivityService userActivityService;

    // Any authenticated user can create a project (needed for onboarding).
    // The creator is automatically added as a project OWNER by ProjectService.
    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody ProjectRequestDto request,
                                                 Authentication authentication) {
        return ResponseEntity.ok(projectService.createProject(request, authentication.getName()));
    }

    // Gap 1: Returns only projects the caller belongs to
    @GetMapping
    public ResponseEntity<List<Project>> getMyProjects(Authentication authentication) {
        return ResponseEntity.ok(projectService.getProjectsForUser(authentication.getName()));
    }

    // Gap 2: Only ADMINs can invite members — now takes email string, not UUID
    @PostMapping("/{id}/members")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectMember> addMember(@PathVariable Long id,
                                                   @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(projectService.addMember(id, body.get("email")));
    }

    // Gap 3: New — remove a member by email
    @DeleteMapping("/{id}/members")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeMember(@PathVariable Long id,
                                             @RequestBody Map<String, String> body) {
        projectService.removeMember(id, body.get("email"));
        return ResponseEntity.noContent().build();
    }

    // Gap 3: New — list members of a project
    @GetMapping("/{id}/members")
    public ResponseEntity<List<MemberStatusDto>> getMembers(@PathVariable Long id) {
        List<ProjectMember> members = projectService.getMembers(id);
        List<MemberStatusDto> memberDtos = members.stream().map(m -> {
            return MemberStatusDto.builder()
                    .email(m.getUser().getEmail())
                    .role(m.getUser().getRole().name())
                    .status(userActivityService.getUserStatus(m.getUser().getId()))
                    .lastSeen(userActivityService.getLastSeenByUserId(m.getUser().getId()))
                    .build();
        }).toList();
        return ResponseEntity.ok(memberDtos);
    }
}
