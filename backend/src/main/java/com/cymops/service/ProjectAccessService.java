package com.cymops.service;

import com.cymops.model.entity.User;
import com.cymops.repository.IncidentRoomRepository;
import com.cymops.repository.ProjectMemberRepository;
import com.cymops.repository.ProjectRepository;
import com.cymops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProjectAccessService {

    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final IncidentRoomRepository incidentRoomRepository;

    public User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    public void requireProjectAccess(String email, Long projectId) {
        User user = requireUser(email);
        boolean member = projectMemberRepository.findByUserIdAndProjectId(user.getId(), projectId).isPresent();
        boolean creator = projectRepository.existsByIdAndCreatedById(projectId, user.getId());
        if (!member && !creator) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied for project telemetry scope");
        }
    }

    public void requireRoomAccess(String email, Long roomId) {
        // Get the room and check access to its project
        var room = incidentRoomRepository.findById(roomId);
        if (room.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found");
        }
        requireProjectAccess(email, room.get().getProject().getId());
    }
}
