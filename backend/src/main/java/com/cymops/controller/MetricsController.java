package com.cymops.controller;

import com.cymops.repository.IncidentRoomRepository;
import com.cymops.repository.MessageRepository;
import com.cymops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
public class MetricsController {

    private final UserRepository userRepository;
    private final IncidentRoomRepository roomRepository;
    private final MessageRepository messageRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalUsers", userRepository.count());
        metrics.put("activeRooms", roomRepository.count());
        metrics.put("totalMessages", messageRepository.count());
        metrics.put("serverStatus", "UP");
        return ResponseEntity.ok(metrics);
    }
}
