package com.cymops.observability.pipeline;

import org.springframework.stereotype.Component;

@Component
public class TempoTracesAdapter implements TelemetryAdapter {
    @Override
    public String backendName() {
        return "tempo";
    }

    @Override
    public void ingest(TelemetryEnvelope envelope) {
        // Scaffold: convert trace envelopes into OTLP exports for Tempo.
        // Real implementation should batch spans and propagate tenant/project labels.
    }
}
