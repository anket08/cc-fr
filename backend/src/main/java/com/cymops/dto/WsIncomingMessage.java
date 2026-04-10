package com.cymops.dto;
import lombok.Data;

@Data
public class WsIncomingMessage {
    private String type;
    private String roomId;
    private String content;
}
