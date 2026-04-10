package com.cymops.controller;

import com.cymops.dto.IncidentTimelineDto;
import com.cymops.dto.RoomRequestDto;
import com.cymops.dto.StatusUpdateDto;
import com.cymops.model.entity.IncidentRoom;
import com.cymops.service.RoomService;
import com.cymops.service.TimelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final TimelineService timelineService;

    @PostMapping
    public ResponseEntity<IncidentRoom> createRoom(@RequestBody RoomRequestDto request,
                                                   Authentication authentication) {
        return ResponseEntity.ok(roomService.createRoom(request, authentication.getName()));
    }

    @GetMapping
    public ResponseEntity<List<IncidentRoom>> getAllRooms(Authentication authentication) {
        return ResponseEntity.ok(roomService.getAllRoomsForUser(authentication.getName()));
    }

    @GetMapping("/search")
    public ResponseEntity<List<IncidentRoom>> searchRooms(@RequestParam String q, Authentication authentication) {
        return ResponseEntity.ok(roomService.searchRooms(q, authentication.getName()));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<List<IncidentRoom>> getRoomsByProject(@PathVariable Long projectId,
                                                                Authentication authentication) {
        return ResponseEntity.ok(roomService.getRoomsByProjectId(projectId, authentication.getName()));
    }
    
    @GetMapping("/room/{roomId}")
    public ResponseEntity<IncidentRoom> getRoomById(@PathVariable Long roomId,
                                                    Authentication authentication) {
        return ResponseEntity.ok(roomService.getRoomById(roomId, authentication.getName()));
    }

    // Gap 3: New endpoint — resolve an incident room
    @PatchMapping("/{roomId}/resolve")
    public ResponseEntity<IncidentRoom> resolveRoom(@PathVariable Long roomId,
                                                    Authentication authentication) {
        return ResponseEntity.ok(roomService.resolveRoom(roomId, authentication.getName()));
    }

    @PatchMapping("/{roomId}/status")
    public ResponseEntity<IncidentRoom> updateStatus(@PathVariable Long roomId,
                                                     @RequestBody StatusUpdateDto request,
                                                     Authentication authentication) {
        return ResponseEntity.ok(roomService.updateRoomStatus(roomId, request.getStatus(), authentication.getName()));
    }

    @GetMapping("/{roomId}/timeline")
    public ResponseEntity<List<IncidentTimelineDto>> getTimeline(@PathVariable Long roomId,
                                                                 Authentication authentication) {
        roomService.getRoomById(roomId, authentication.getName());
        return ResponseEntity.ok(timelineService.getTimelineByRoomId(roomId));
    }
}