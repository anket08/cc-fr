package com.cymops.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableWebSocket
@EnableScheduling
@RequiredArgsConstructor
public class RawWebSocketConfig implements WebSocketConfigurer {

    private final TelemetryWebSocketHandler telemetryWebSocketHandler;
    private final TelemetryHandshakeInterceptor telemetryHandshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(telemetryWebSocketHandler, "/ws/telemetry")
                .addInterceptors(telemetryHandshakeInterceptor)
                .setAllowedOrigins("*");
    }
}
