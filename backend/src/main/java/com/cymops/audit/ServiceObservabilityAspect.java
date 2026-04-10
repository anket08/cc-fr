package com.cymops.audit;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class ServiceObservabilityAspect {

    private final MeterRegistry meterRegistry;

    @Around("execution(* com.cymops.service..*(..))")
    public Object observeServiceCalls(ProceedingJoinPoint joinPoint) throws Throwable {
        String service = joinPoint.getSignature().getDeclaringTypeName();
        String method = joinPoint.getSignature().getName();

        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            Object result = joinPoint.proceed();
            sample.stop(Timer.builder("cymops.service.latency")
                    .tag("service", service)
                    .tag("method", method)
                    .tag("outcome", "success")
                    .register(meterRegistry));
            meterRegistry.counter("cymops.service.calls", "service", service, "method", method, "outcome", "success").increment();
            return result;
        } catch (Throwable ex) {
            sample.stop(Timer.builder("cymops.service.latency")
                    .tag("service", service)
                    .tag("method", method)
                    .tag("outcome", "error")
                    .register(meterRegistry));
            meterRegistry.counter("cymops.service.calls", "service", service, "method", method, "outcome", "error").increment();
            throw ex;
        }
    }
}
