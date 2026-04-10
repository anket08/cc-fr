package com.cymops.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final String AI_REFRESH_PATH = "/api/ai/engineering-report/insights";

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();
    private final Map<String, Bucket> aiRefreshCache = new ConcurrentHashMap<>();

    private Bucket resolveBucket(String clientIp) {
        return cache.computeIfAbsent(clientIp, this::newBucket);
    }

    private Bucket resolveAiRefreshBucket(String clientKey) {
        return aiRefreshCache.computeIfAbsent(clientKey, this::newAiRefreshBucket);
    }

    private Bucket newBucket(String apiKey) {
        Bandwidth limit = Bandwidth.classic(50, Refill.greedy(50, Duration.ofMinutes(1)));
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    private Bucket newAiRefreshBucket(String key) {
        Bandwidth dailyLimit = Bandwidth.classic(1, Refill.intervally(1, Duration.ofDays(1)));
        return Bucket.builder()
                .addLimit(dailyLimit)
                .build();
    }

    private boolean isAiInsightsRefresh(HttpServletRequest request) {
        String path = request.getRequestURI();
        String refresh = request.getParameter("refresh");
        return "GET".equalsIgnoreCase(request.getMethod())
                && path != null
                && path.endsWith(AI_REFRESH_PATH)
                && "true".equalsIgnoreCase(refresh);
    }

    private String resolveClientKey(HttpServletRequest request) {
        if (request.getUserPrincipal() != null && request.getUserPrincipal().getName() != null) {
            return request.getUserPrincipal().getName();
        }
        return request.getRemoteAddr();
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (isAiInsightsRefresh(request)) {
            String clientKey = resolveClientKey(request);
            Bucket refreshBucket = resolveAiRefreshBucket(clientKey);
            if (!refreshBucket.tryConsume(1)) {
                response.sendError(HttpStatus.TOO_MANY_REQUESTS.value(), "Refresh analysis is limited to 1 request per day");
                return false;
            }
        }

        String clientIp = request.getRemoteAddr();
        Bucket tokenBucket = resolveBucket(clientIp);

        if (tokenBucket.tryConsume(1)) {
            return true;
        } else {
            response.sendError(HttpStatus.TOO_MANY_REQUESTS.value(), "Too Many Requests");
            return false;
        }
    }
}
