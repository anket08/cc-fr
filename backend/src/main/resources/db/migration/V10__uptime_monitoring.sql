-- Uptime monitors: user-configured endpoints to watch
CREATE TABLE uptime_monitors (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    url             VARCHAR(2048) NOT NULL,
    method          VARCHAR(10) NOT NULL DEFAULT 'GET',
    expected_status INT NOT NULL DEFAULT 200,
    interval_seconds INT NOT NULL DEFAULT 60,
    timeout_ms      INT NOT NULL DEFAULT 5000,
    headers_json    TEXT,          -- optional JSON headers
    body_json       TEXT,          -- optional request body for POST
    paused          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Individual check results
CREATE TABLE uptime_checks (
    id              BIGSERIAL PRIMARY KEY,
    monitor_id      BIGINT NOT NULL REFERENCES uptime_monitors(id) ON DELETE CASCADE,
    status_code     INT,
    response_time_ms INT NOT NULL,
    is_up           BOOLEAN NOT NULL,
    error_message   TEXT,
    checked_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uptime_checks_monitor_id ON uptime_checks(monitor_id);
CREATE INDEX idx_uptime_checks_checked_at ON uptime_checks(checked_at DESC);
CREATE INDEX idx_uptime_monitors_project_id ON uptime_monitors(project_id);
