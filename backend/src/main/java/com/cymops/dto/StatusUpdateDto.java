package com.cymops.dto;

import lombok.Data;
import com.cymops.model.enums.RoomStatus;

@Data
public class StatusUpdateDto {
    private RoomStatus status;
}
