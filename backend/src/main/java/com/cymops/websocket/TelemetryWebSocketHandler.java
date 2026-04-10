package com.cymops.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.cymops.service.RealtimeTelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
@RequiredArgsConstructor
public class TelemetryWebSocketHandler extends TextWebSocketHandler {

    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RealtimeTelemetryService realtimeTelemetryService;
    private volatile long lastBroadcastDurationMs = 0;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long projectId = extractProjectId(session);
        if (projectId != null) {
            sessions.add(session);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) {
        sessions.remove(session);
    }

    @Scheduled(fixedRate = 2500) // Fast 2.5s updates for Pro-Level real-time feel
    public void broadcastTelemetry() {
        if (sessions.isEmpty()) return;

        try {
            long startedAt = System.nanoTime();
            Map<Long, TextMessage> payloadsByProject = new HashMap<>();
            for (WebSocketSession session : sessions) {
                if (!session.isOpen()) {
                    continue;
                }
                Long projectId = extractProjectId(session);
                if (projectId == null) {
                    continue;
                }

                TextMessage message = payloadsByProject.computeIfAbsent(projectId, id -> {
                    try {
                        Map<String, Object> data = realtimeTelemetryService.buildSnapshot(lastBroadcastDurationMs, id);
                        String payload = objectMapper.writeValueAsString(data);
                        return new TextMessage(payload);
                    } catch (Exception ex) {
                        return null;
                    }
                });

                if (message != null) {
                    session.sendMessage(message);
                }
            }
            lastBroadcastDurationMs = Math.max(1, Math.round((System.nanoTime() - startedAt) / 1_000_000.0));
        } catch (Exception e) {
            // ignore
        }
    }

    private Long extractProjectId(WebSocketSession session) {
        Object raw = session.getAttributes().get("projectId");
        if (raw instanceof Long value) {
            return value;
        }
        if (raw instanceof Number number) {
            return number.longValue();
        }
        if (raw instanceof String text) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
