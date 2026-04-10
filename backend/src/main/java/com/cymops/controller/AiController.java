package com.cymops.controller;

import com.cymops.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @GetMapping("/rooms/{roomId}/summary")
    public ResponseEntity<Map<String, String>> generateSummary(@PathVariable Long roomId, Authentication authentication) {
        String summary = aiService.generateSummary(roomId, authentication.getName());
        return ResponseEntity.ok(Map.of("summary", summary));
    }

    @GetMapping("/rooms/{roomId}/postmortem")
    public ResponseEntity<Map<String, String>> generatePostmortem(@PathVariable Long roomId, Authentication authentication) {
        String postmortem = aiService.generatePostmortem(roomId, authentication.getName());
        return ResponseEntity.ok(Map.of("postmortem", postmortem));
    }

    @PostMapping("/rooms/{roomId}/ask")
    public ResponseEntity<Map<String, String>> askAi(@PathVariable Long roomId, @RequestBody Map<String, String> request, Authentication authentication) {
        String query = request.getOrDefault("query", "");
        String reply = aiService.askAi(roomId, query, authentication.getName());
        return ResponseEntity.ok(Map.of("reply", reply));
    }

    @GetMapping("/engineering-report/insights")
    public ResponseEntity<Map<String, String>> generateEngineeringInsights(
            @RequestParam(name = "refresh", defaultValue = "false") boolean refresh
    ) {
        String insights = aiService.generateEngineeringReportInsights(refresh);
        return ResponseEntity.ok(Map.of("insights", insights));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> aiHealth() {
        return ResponseEntity.ok(aiService.getHealthStatus());
    }
}
