package com.cymops.service;

import com.cymops.dto.AuthRequestDto;
import com.cymops.dto.RefreshTokenRequestDto;
import com.cymops.dto.RegisterRequestDto;
import com.cymops.dto.TokenResponseDto;
import com.cymops.model.entity.RefreshToken;
import com.cymops.model.entity.User;
import com.cymops.repository.RefreshTokenRepository;
import com.cymops.repository.UserRepository;
import com.cymops.security.JwtUtil;
import com.cymops.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public User register(RegisterRequestDto request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already taken");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        return userRepository.save(user);
    }

    @Transactional
    public TokenResponseDto login(AuthRequestDto request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        String accessToken = jwtUtil.generateToken(userDetails);
        String refreshTokenString = jwtUtil.generateRefreshToken(userDetails);

        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        
        refreshTokenRepository.deleteByUser(user);
        
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenString)
                .expiry(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);

        return new TokenResponseDto(accessToken, refreshTokenString);
    }

    @Transactional
    public TokenResponseDto refresh(RefreshTokenRequestDto request) {
        RefreshToken token = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new RuntimeException("Refresh token not found"));

        if (token.isRevoked() || token.getExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Refresh token is expired or revoked");
        }

        User user = token.getUser();
        UserDetails userDetails = UserDetailsImpl.build(user);

        if (!jwtUtil.validateToken(token.getToken(), userDetails)) {
            throw new RuntimeException("Invalid refresh token");
        }

        String newAccessToken = jwtUtil.generateToken(userDetails);
        return new TokenResponseDto(newAccessToken, token.getToken());
    }

    @Transactional
    public void logout(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return;
        
        String jwt = authHeader.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            refreshTokenRepository.deleteByUser(user);
        }
    }
}
