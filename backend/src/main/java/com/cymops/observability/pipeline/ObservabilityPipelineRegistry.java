package com.cymops.observability.pipeline;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ObservabilityPipelineRegistry {

    private final List<TelemetryAdapter> adapters;

    public TelemetryAdapter resolve(String backendName) {
        return adapters.stream()
                .filter(adapter -> adapter.backendName().equalsIgnoreCase(backendName))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported observability backend: " + backendName));
    }
}
