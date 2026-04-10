package com.cymops.observability.pipeline;

import org.springframework.stereotype.Component;

@Component
public class LokiLogsAdapter implements TelemetryAdapter {
    @Override
    public String backendName() {
        return "loki";
    }

    @Override
    public void ingest(TelemetryEnvelope envelope) {
        // Scaffold: convert log envelopes into Loki push requests.
        // Real implementation should map labels, stream keys, and payload timestamps.
    }
}
