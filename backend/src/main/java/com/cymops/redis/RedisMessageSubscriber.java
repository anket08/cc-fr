package com.cymops.redis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.cymops.dto.WsOutgoingMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisMessageSubscriber {

    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public void onMessage(String message, String pattern) {
        try {
            WsOutgoingMessage chatMessage = objectMapper.readValue(message, WsOutgoingMessage.class);
            // Broadcast to the room topic (for users viewing the room)
            messagingTemplate.convertAndSend("/topic/rooms/" + chatMessage.getRoomId(), chatMessage);
            
            // Broadcast to individual user topics (for cross-app notifications)
            if (chatMessage.getTargetEmails() != null) {
                for (String email : chatMessage.getTargetEmails()) {
                    messagingTemplate.convertAndSend("/topic/users/" + email, chatMessage);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
