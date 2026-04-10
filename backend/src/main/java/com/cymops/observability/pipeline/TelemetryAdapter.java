package com.cymops.observability.pipeline;

public interface TelemetryAdapter {
    String backendName();
    void ingest(TelemetryEnvelope envelope);
}
