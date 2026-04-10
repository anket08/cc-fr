package com.cymops.controller;

import com.cymops.dto.WsIncomingMessage;
import com.cymops.dto.WsOutgoingMessage;
import com.cymops.model.entity.IncidentRoom;
import com.cymops.model.entity.IncidentTimeline;
import com.cymops.model.entity.Message;
import com.cymops.model.entity.User;
import com.cymops.redis.RedisMessagePublisher;
import com.cymops.repository.IncidentRoomRepository;
import com.cymops.repository.IncidentTimelineRepository;
import com.cymops.repository.MessageRepository;
import com.cymops.repository.ProjectMemberRepository;
import com.cymops.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final MessageRepository messageRepository;
    private final IncidentRoomRepository roomRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final RedisMessagePublisher redisPublisher;
    private final IncidentTimelineRepository timelineRepository;

    @MessageMapping("/chat.sendMessage")
    @Transactional
    public void sendMessage(@Payload WsIncomingMessage incomingMessage, Authentication authentication) {
        if ("SEND_MESSAGE".equals(incomingMessage.getType())) {
            
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long roomId = Long.parseLong(incomingMessage.getRoomId());
            
            IncidentRoom room = roomRepository.findById(roomId).orElseThrow();
            
            User sender = new User();
            sender.setId(userDetails.getId());

            Message dbMessage = Message.builder()
                .room(room)
                .sender(sender)
                .content(incomingMessage.getContent())
                .build();
                
            messageRepository.save(dbMessage);

            // Log message to timeline
            IncidentTimeline timelineEvent = IncidentTimeline.builder()
                    .room(room)
                    .eventType("MESSAGE")
                    .content(userDetails.getUsername() + ": " + incomingMessage.getContent())
                    .metadata("{\"sender\": \"" + userDetails.getUsername() + "\"}")
                    .build();
            timelineRepository.save(timelineEvent);

            // Fetch target emails for real-time notification
            List<String> targetEmails = projectMemberRepository.findByProjectId(room.getProject().getId())
                    .stream()
                    .map(pm -> pm.getUser().getEmail())
                    .collect(Collectors.toList());

            WsOutgoingMessage outgoingMessage = WsOutgoingMessage.builder()
                .type("NEW_MESSAGE")
                .roomId(incomingMessage.getRoomId())
                .content(incomingMessage.getContent())
                .sender(userDetails.getUsername())
                .targetEmails(targetEmails)
                .build();
                
            redisPublisher.publish(outgoingMessage);
        }
    }
}
