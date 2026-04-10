package com.cymops.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserActivityService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String KEY_PREFIX = "user:";
    private static final String KEY_SUFFIX = ":lastSeen";

    public void updateLastSeen(String email) {
        String key = KEY_PREFIX + email + KEY_SUFFIX;
        // Store current epoch milli - Extended to 7 days for history
        redisTemplate.opsForValue().set(key, System.currentTimeMillis(), 7, TimeUnit.DAYS);
    }
    
    public void updateLastSeenByUserId(UUID userId) {
        String key = KEY_PREFIX + userId.toString() + KEY_SUFFIX;
        redisTemplate.opsForValue().set(key, System.currentTimeMillis(), 7, TimeUnit.DAYS);
    }
    
    public void updateLastSeen(UUID userId) {
        updateLastSeenByUserId(userId);
    }

    public Long getLastSeen(String email) {
        String key = KEY_PREFIX + email + KEY_SUFFIX;
        Object val = redisTemplate.opsForValue().get(key);
        if (val instanceof Number) {
            return ((Number) val).longValue();
        }
        return null;
    }
    
    public Long getLastSeenByUserId(UUID userId) {
        String key = KEY_PREFIX + userId.toString() + KEY_SUFFIX;
        Object val = redisTemplate.opsForValue().get(key);
        if (val instanceof Number) {
            return ((Number) val).longValue();
        }
        return null;
    }

    public String getUserStatus(UUID userId) {
        Long lastSeen = getLastSeenByUserId(userId);
        if (lastSeen == null) {
            return "OFFLINE";
        }
        
        long diffInMilli = System.currentTimeMillis() - lastSeen;
        if (diffInMilli < 300_000) { // 5 mins
            return "ONLINE";
        }
        return "OFFLINE";
    }
}
