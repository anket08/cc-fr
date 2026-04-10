package com.cymops.websocket;

import com.cymops.repository.ProjectMemberRepository;
import com.cymops.repository.ProjectRepository;
import com.cymops.security.JwtUtil;
import com.cymops.security.UserDetailsImpl;
import com.cymops.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class TelemetryHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        String token = resolveToken(request.getURI());
        Long projectId = resolveProjectId(request.getURI());

        if (token == null || token.isBlank() || projectId == null) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        try {
            String email = jwtUtil.extractUsername(token);
            if (email == null || email.isBlank()) {
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService.loadUserByUsername(email);
            if (!jwtUtil.validateToken(token, userDetails)) {
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            boolean isMember = projectMemberRepository.findByUserIdAndProjectId(userDetails.getId(), projectId).isPresent();
            boolean isCreator = projectRepository.existsByIdAndCreatedById(projectId, userDetails.getId());
            if (!isMember && !isCreator) {
                response.setStatusCode(HttpStatus.FORBIDDEN);
                return false;
            }

            attributes.put("userId", userDetails.getId().toString());
            attributes.put("email", userDetails.getUsername());
            attributes.put("projectId", projectId);
            if (request instanceof ServletServerHttpRequest servletRequest) {
                attributes.put("remoteIp", servletRequest.getServletRequest().getRemoteAddr());
            }
            return true;
        } catch (Exception ex) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // no-op
    }

    private String resolveToken(URI uri) {
        return parseQuery(uri).get("token");
    }

    private Long resolveProjectId(URI uri) {
        String raw = parseQuery(uri).get("projectId");
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Map<String, String> parseQuery(URI uri) {
        Map<String, String> params = new HashMap<>();
        String query = uri.getRawQuery();
        if (query == null || query.isBlank()) {
            return params;
        }

        String[] pairs = query.split("&");
        for (String pair : pairs) {
            if (pair.isBlank()) {
                continue;
            }
            String[] kv = pair.split("=", 2);
            String key = decode(kv[0]);
            String value = kv.length > 1 ? decode(kv[1]) : "";
            params.put(key, value);
        }
        return params;
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
