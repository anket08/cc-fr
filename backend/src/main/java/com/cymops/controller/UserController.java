package com.cymops.controller;

import com.cymops.dto.UserProfileDto;
import com.cymops.model.entity.User;
import com.cymops.repository.UserRepository;
import com.cymops.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me/profile")
    public ResponseEntity<User> updateProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody UserProfileDto profileDto) {
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        user.setNickname(profileDto.getNickname());
        user.setBio(profileDto.getBio());
        return ResponseEntity.ok(userRepository.save(user));
    }
}
