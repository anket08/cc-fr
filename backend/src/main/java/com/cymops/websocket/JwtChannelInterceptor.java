package com.cymops.websocket;

import com.cymops.security.JwtUtil;
import com.cymops.security.UserDetailsServiceImpl;
import com.cymops.service.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final ProjectAccessService projectAccessService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            UsernamePasswordAuthenticationToken auth = resolveAuth(accessor);
            if (auth != null) {
                accessor.setUser(auth);
                if (accessor.getSessionAttributes() != null) {
                    accessor.getSessionAttributes().put("STOMP_USER", auth);
                }
            }
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            // Check authorization for room subscriptions
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/rooms/")) {
                String roomIdStr = destination.substring("/topic/rooms/".length());
                try {
                    Long roomId = Long.parseLong(roomIdStr);
                    // Get authenticated user
                    UsernamePasswordAuthenticationToken auth = getAuthenticatedUser(accessor);
                    if (auth == null) {
                        throw new RuntimeException("Authentication required for room subscription");
                    }
                    String email = auth.getName();
                    // Check if user has access to the room's project
                    projectAccessService.requireRoomAccess(email, roomId);
                } catch (NumberFormatException e) {
                    // Invalid room ID format
                    throw new RuntimeException("Invalid room ID in subscription");
                } catch (Exception e) {
                    throw new RuntimeException("Access denied to room: " + e.getMessage());
                }
            }
        } else {
            // Try session-cached user first
            boolean restored = false;
            if (accessor.getSessionAttributes() != null) {
                Object cached = accessor.getSessionAttributes().get("STOMP_USER");
                if (cached instanceof UsernamePasswordAuthenticationToken) {
                    accessor.setUser((UsernamePasswordAuthenticationToken) cached);
                    restored = true;
                }
            }
            // Fallback: re-validate token from headers on every frame
            if (!restored) {
                UsernamePasswordAuthenticationToken auth = resolveAuth(accessor);
                if (auth != null) {
                    accessor.setUser(auth);
                }
            }
        }

        return message;
    }

    private UsernamePasswordAuthenticationToken getAuthenticatedUser(StompHeaderAccessor accessor) {
        // Try session-cached user first
        if (accessor.getSessionAttributes() != null) {
            Object cached = accessor.getSessionAttributes().get("STOMP_USER");
            if (cached instanceof UsernamePasswordAuthenticationToken) {
                return (UsernamePasswordAuthenticationToken) cached;
            }
        }
        // Fallback: re-validate token from headers
        return resolveAuth(accessor);
    }

    private UsernamePasswordAuthenticationToken resolveAuth(StompHeaderAccessor accessor) {
        // Try native 'token' header first (our frontend sends this)
        String token = accessor.getFirstNativeHeader("token");

        // Fallback: Authorization: Bearer <token>
        if (token == null) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
        }

        if (token == null) return null;

        try {
            String email = jwtUtil.extractUsername(token);
            if (email == null) return null;
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            if (!jwtUtil.validateToken(token, userDetails)) return null;
            return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        } catch (Exception e) {
            return null;
        }
    }
}
