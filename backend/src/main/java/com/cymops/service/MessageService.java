package com.cymops.service;

import com.cymops.dto.MessageDto;
import com.cymops.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final RoomService roomService;

    @Transactional(readOnly = true)
    public List<MessageDto> getMessagesByRoomId(Long roomId, String callerEmail) {
        // Check if user has access to the room
        roomService.getRoomById(roomId, callerEmail);
        
        return messageRepository.findByRoomIdOrderByCreatedAtAsc(roomId)
                .stream()
                .map(msg -> MessageDto.builder()
                        .id(msg.getId())
                        .content(msg.getContent())
                        .sender(msg.getSender() != null ? msg.getSender().getEmail() : "Unknown")
                        .roomId(String.valueOf(msg.getRoom() != null ? msg.getRoom().getId() : roomId))
                        .createdAt(msg.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }
}
