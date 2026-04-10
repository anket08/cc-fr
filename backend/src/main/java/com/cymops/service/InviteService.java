package com.cymops.service;

import com.cymops.dto.InviteRequest;
import com.cymops.dto.InviteResponse;
import com.cymops.model.entity.Project;
import com.cymops.model.entity.ProjectInvite;
import com.cymops.model.entity.ProjectMember;
import com.cymops.model.entity.User;
import com.cymops.model.enums.InviteStatus;
import com.cymops.repository.ProjectInviteRepository;
import com.cymops.repository.ProjectMemberRepository;
import com.cymops.repository.ProjectRepository;
import com.cymops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InviteService {

    private final ProjectInviteRepository projectInviteRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;

    @Transactional
    public InviteResponse inviteUserToProject(Long projectId, InviteRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        // Must be a registered user
        User targetUser = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("No such user exists. They must register first."));

        if (projectInviteRepository.existsByProject_IdAndEmailAndStatus(projectId, request.getEmail(), InviteStatus.PENDING)) {
            throw new IllegalArgumentException("User already has a pending invite for this project");
        }
        
        // Check if they are already a member
        if (projectMemberRepository.findByUserIdAndProjectId(targetUser.getId(), projectId).isPresent()) {
            throw new IllegalArgumentException("User is already a member of this project");
        }

        ProjectInvite invite = ProjectInvite.builder()
                .project(project)
                .email(request.getEmail())
                .status(InviteStatus.PENDING)
                .build();

        invite = projectInviteRepository.save(invite);

        return mapToResponse(invite);
    }

    public List<InviteResponse> getMyPendingInvites(String email) {
        return projectInviteRepository.findByEmailAndStatus(email, InviteStatus.PENDING)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public InviteResponse respondToInvite(Long inviteId, String email, boolean accept) {
        ProjectInvite invite = projectInviteRepository.findById(inviteId)
                .orElseThrow(() -> new IllegalArgumentException("Invite not found"));

        if (!invite.getEmail().equals(email)) {
            throw new IllegalArgumentException("You are not authorized to respond to this invite");
        }

        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new IllegalArgumentException("Invite has already been responded to");
        }

        invite.setStatus(accept ? InviteStatus.ACCEPTED : InviteStatus.REJECTED);
        invite.setRespondedAt(LocalDateTime.now());
        projectInviteRepository.save(invite);

        if (accept) {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("User must be registered before accepting an invite"));
            
            if (projectMemberRepository.findByUserIdAndProjectId(user.getId(), invite.getProject().getId()).isEmpty()) {
                ProjectMember member = ProjectMember.builder()
                        .project(invite.getProject())
                        .user(user)
                        .build();
                projectMemberRepository.save(member);
            }
        }

        return mapToResponse(invite);
    }

    private InviteResponse mapToResponse(ProjectInvite invite) {
        return InviteResponse.builder()
                .id(invite.getId())
                .projectId(invite.getProject().getId())
                .projectName(invite.getProject().getName())
                .email(invite.getEmail())
                .status(invite.getStatus())
                .createdAt(invite.getCreatedAt())
                .respondedAt(invite.getRespondedAt())
                .build();
    }
}
