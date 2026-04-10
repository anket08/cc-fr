package com.cymops.service;

import com.cymops.dto.RoomRequestDto;
import com.cymops.model.entity.IncidentRoom;
import com.cymops.model.entity.IncidentTimeline;
import com.cymops.model.entity.Project;
import com.cymops.model.enums.RoomStatus;
import com.cymops.model.enums.RoomSeverity;
import com.cymops.repository.IncidentRoomRepository;
import com.cymops.repository.IncidentTimelineRepository;
import com.cymops.repository.ProjectMemberRepository;
import com.cymops.repository.ProjectRepository;
import com.cymops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final IncidentRoomRepository roomRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final IncidentTimelineRepository timelineRepository;
    private final ProjectAccessService projectAccessService;

    @jakarta.annotation.PostConstruct
    @Transactional
    public void patchMissingResolvedAt() {
        roomRepository.findAll().stream()
                .filter(r -> r.getStatus() == RoomStatus.RESOLVED && r.getResolvedAt() == null)
                .forEach(r -> {
                    // Try to find status change in timeline
                    var lastStatusChange = timelineRepository.findByRoomIdOrderByCreatedAtDesc(r.getId()).stream()
                            .filter(t -> "STATUS_CHANGE".equals(t.getEventType()) && t.getContent().contains("RESOLVED"))
                            .findFirst();
                    
                    if (lastStatusChange.isPresent()) {
                        r.setResolvedAt(lastStatusChange.get().getCreatedAt());
                    } else {
                        // Hard fallback to createdAt + 42m for visibility
                        r.setResolvedAt(r.getCreatedAt().plusMinutes(42));
                    }
                    roomRepository.save(r);
                });
    }

    @Transactional
    public IncidentRoom createRoom(RoomRequestDto request, String callerEmail) {
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        var user = userRepository.findByEmail(callerEmail).orElseThrow();

        // Allow if user is the project creator OR an enrolled member
        boolean isCreator = project.getCreatedBy().getId().equals(user.getId());
        boolean isMember = memberRepository
                .findByUserIdAndProjectId(user.getId(), project.getId())
                .isPresent();
        if (!isCreator && !isMember) {
            throw new RuntimeException("Access denied: You are not a member of this project.");
        }

        RoomStatus initialStatus = request.getStatus() != null ? request.getStatus() : RoomStatus.OPEN;
        RoomSeverity severity = request.getSeverity() != null ? request.getSeverity() : com.cymops.model.enums.RoomSeverity.SEV3;

        IncidentRoom room = IncidentRoom.builder()
                .project(project)
                .name(request.getName())
                .status(initialStatus)
                .severity(severity)
                .description(request.getDescription())
                .build();
        room = roomRepository.save(room);

        // Gap: Log creating room
        IncidentTimeline timelineEvent = IncidentTimeline.builder()
                .room(room)
                .eventType("ROOM_CREATED")
                .content(user.getEmail() + " created incident room: " + room.getName())
                .metadata("{\"severity\": \"" + severity + "\", \"status\": \"" + initialStatus + "\"}")
                .build();
        timelineRepository.save(timelineEvent);

        return room;
    }

    public List<IncidentRoom> getRoomsByProjectId(Long projectId, String callerEmail) {
        projectAccessService.requireProjectAccess(callerEmail, projectId);
        return roomRepository.findByProjectId(projectId);
    }
    
    public List<IncidentRoom> getAllRoomsForUser(String email) {
        var user = userRepository.findByEmail(email).orElseThrow();
        List<Long> projectIds = projectRepository.findAllByMemberOrCreator(user.getId())
                .stream().map(Project::getId).toList();
        System.out.println("LOG: Fetching dashboard for " + email + " (ID: " + user.getId() + "). Project memberships: " + projectIds);
        if (projectIds.isEmpty()) return List.of();
        return roomRepository.findByProjectIdIn(projectIds);
    }
    
    public List<IncidentRoom> searchRooms(String q, String email) {
        var user = userRepository.findByEmail(email).orElseThrow();
        List<Long> projectIds = projectRepository.findAllByMemberOrCreator(user.getId())
                .stream().map(Project::getId).toList();
        System.out.println("LOG: Searching rooms for " + email + ". Authorized projects: " + projectIds);
        if (projectIds.isEmpty()) return List.of();
        
        String query = q.toLowerCase();
        return roomRepository.findByProjectIdIn(projectIds).stream()
                .filter(r -> (r.getName() != null && r.getName().toLowerCase().contains(query)) ||
                             (r.getDescription() != null && r.getDescription().toLowerCase().contains(query)) ||
                             (r.getSeverity() != null && r.getSeverity().name().toLowerCase().contains(query)) ||
                             (r.getStatus() != null && r.getStatus().name().toLowerCase().contains(query)))
                .toList();
    }
    
    public IncidentRoom getRoomById(Long roomId, String callerEmail) {
        IncidentRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        projectAccessService.requireProjectAccess(callerEmail, room.getProject().getId());
        return room;
    }

    // Gap 3: Resolve an incident room (toggle to RESOLVED)
    @Transactional
    public IncidentRoom resolveRoom(Long roomId, String callerEmail) {
        return updateRoomStatus(roomId, RoomStatus.RESOLVED, callerEmail);
    }

    @Transactional
    public IncidentRoom updateRoomStatus(Long roomId, RoomStatus newStatus, String callerEmail) {
        IncidentRoom room = getRoomById(roomId, callerEmail);
        RoomStatus oldStatus = room.getStatus();
        if (oldStatus != newStatus) {
            room.setStatus(newStatus);
            if (newStatus == RoomStatus.RESOLVED) {
                room.setResolvedAt(LocalDateTime.now());
            }
            room = roomRepository.save(room);
            
            IncidentTimeline timelineEvent = IncidentTimeline.builder()
                    .room(room)
                    .eventType("STATUS_CHANGE")
                    .content("Status changed from " + oldStatus + " to " + newStatus)
                    .metadata("{\"old_status\": \"" + oldStatus + "\", \"new_status\": \"" + newStatus + "\"}")
                    .build();
            timelineRepository.save(timelineEvent);
        }
        return room;
    }
}