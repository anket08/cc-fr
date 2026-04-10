package com.cymops.dto;

import lombok.Data;

@Data
public class IssueMoveDto {
    private String status;   // target IssueStatus
    private int position;    // new 0-based position in that column
}
