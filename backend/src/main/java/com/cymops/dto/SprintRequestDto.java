package com.cymops.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class SprintRequestDto {
    private Long projectId;
    private String name;
    private String goal;
    private LocalDate startDate;
    private LocalDate endDate;
}
