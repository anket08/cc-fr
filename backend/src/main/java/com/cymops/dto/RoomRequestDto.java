package com.cymops.dto;
import lombok.Data;
import com.cymops.model.enums.RoomStatus;
import com.cymops.model.enums.RoomSeverity;
@Data
public class RoomRequestDto {
    private Long projectId;
    private String name;
    private RoomStatus status;
    private RoomSeverity severity;
    private String description;
}
