package com.cymops.controller;

import com.cymops.model.entity.User;
import com.cymops.repository.UserRepository;
import com.cymops.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<User> updateUserProfile(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (body.containsKey("nickname")) user.setNickname(body.get("nickname"));
        if (body.containsKey("bio")) user.setBio(body.get("bio"));
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 4 characters");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<Map<String, String>> disableUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl adminDetails) {
        if (adminDetails.getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot disable yourself");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setDisabled(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User disabled"));
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<Map<String, String>> enableUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setDisabled(false);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User enabled"));
    }
}
