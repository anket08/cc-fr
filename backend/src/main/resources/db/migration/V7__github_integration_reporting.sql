-- V7: GitHub integration + engineering reports + DB incidents

CREATE TABLE github_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    delivery_id VARCHAR(255),
    payload_json TEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    received_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_github_webhook_events_event_type ON github_webhook_events(event_type);
CREATE INDEX idx_github_webhook_events_received_at ON github_webhook_events(received_at);

CREATE TABLE github_repo_snapshots (
    id BIGSERIAL PRIMARY KEY,
    repository_full_name VARCHAR(255) NOT NULL,
    default_branch VARCHAR(255),
    open_pr_count INTEGER NOT NULL DEFAULT 0,
    failed_workflow_runs INTEGER NOT NULL DEFAULT 0,
    open_security_alerts INTEGER NOT NULL DEFAULT 0,
    collected_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_github_repo_snapshots_repo_time ON github_repo_snapshots(repository_full_name, collected_at DESC);

CREATE TABLE db_incidents (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    started_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_db_incidents_status ON db_incidents(status);
CREATE INDEX idx_db_incidents_started_at ON db_incidents(started_at DESC);

CREATE TABLE engineering_report_snapshots (
    id BIGSERIAL PRIMARY KEY,
    repository_full_name VARCHAR(255) NOT NULL,
    report_json TEXT NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_engineering_report_snapshots_repo_time ON engineering_report_snapshots(repository_full_name, generated_at DESC);
