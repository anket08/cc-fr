package com.cymops.dto;
import lombok.Data;
import com.cymops.model.enums.Role;
@Data
public class RegisterRequestDto {
    private String email;
    private String password;
    private Role role;
}
