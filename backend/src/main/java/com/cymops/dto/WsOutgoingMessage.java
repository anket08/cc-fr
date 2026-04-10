package com.cymops.dto;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WsOutgoingMessage {
    private String type;
    private String roomId;
    private String content;
    private String sender;
    private java.util.List<String> targetEmails;
}
