package com.cymops.observability.pipeline;

import org.springframework.stereotype.Component;

@Component
public class PrometheusMetricsAdapter implements TelemetryAdapter {
    @Override
    public String backendName() {
        return "prometheus";
    }

    @Override
    public void ingest(TelemetryEnvelope envelope) {
        // Scaffold: translate metrics envelopes into Prometheus remote_write payloads.
        // Real implementation should batch samples, apply tenant labels, and POST to remote_write.
    }
}
