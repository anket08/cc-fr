package com.cymops.controller;

import com.cymops.dto.InviteRequest;
import com.cymops.dto.InviteResponse;
import com.cymops.service.InviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    @PostMapping("/projects/{id}/invite")
    public ResponseEntity<InviteResponse> inviteToProject(
            @PathVariable Long id,
            @Valid @RequestBody InviteRequest request) {
        return ResponseEntity.ok(inviteService.inviteUserToProject(id, request));
    }

    @GetMapping("/invites/me")
    public ResponseEntity<List<InviteResponse>> getMyInvites(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(inviteService.getMyPendingInvites(email));
    }

    @PostMapping("/invites/{id}/accept")
    public ResponseEntity<InviteResponse> acceptInvite(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(inviteService.respondToInvite(id, email, true));
    }

    @PostMapping("/invites/{id}/reject")
    public ResponseEntity<InviteResponse> rejectInvite(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(inviteService.respondToInvite(id, email, false));
    }
}
