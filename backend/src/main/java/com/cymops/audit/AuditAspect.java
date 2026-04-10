package com.cymops.audit;

import com.cymops.model.entity.AuditLog;
import com.cymops.model.entity.User;
import com.cymops.repository.AuditLogRepository;
import com.cymops.repository.UserRepository;
import com.cymops.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @AfterReturning("execution(* com.cymops.service.AuthService.login(..))")
    public void logSuccessfulLogin(JoinPoint joinPoint) {
        logAction("LOGIN_SUCCESS", "User logged in");
    }

    @AfterReturning("execution(* com.cymops.service.ProjectService.createProject(..))")
    public void logProjectCreation(JoinPoint joinPoint) {
        logAction("PROJECT_CREATED", "New project created");
    }

    @AfterReturning("execution(* com.cymops.service.RoomService.createRoom(..))")
    public void logRoomCreation(JoinPoint joinPoint) {
        logAction("ROOM_CREATED", "New incident room created");
    }

    private void logAction(String action, String metadata) {
        // Temporarily disabled due to compilation issues
        /*
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = null;
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl) {
            UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
            user = userRepository.findById(userDetails.getId()).orElse(null);
        }

        AuditLog auditLog = AuditLog.builder()
                .user(user)
                .action(action)
                .metadata(metadata)
                .build();
                
        auditLogRepository.save(auditLog);
        */
    }
}
