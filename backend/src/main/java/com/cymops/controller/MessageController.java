package com.cymops.controller;

import com.cymops.dto.MessageDto;
import com.cymops.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/{roomId}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable Long roomId, Authentication authentication) {
        return ResponseEntity.ok(messageService.getMessagesByRoomId(roomId, authentication.getName()));
    }
}
