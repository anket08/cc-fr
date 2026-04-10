CREATE TABLE incident_timeline (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_timeline_room FOREIGN KEY (room_id) REFERENCES incident_rooms(id)
);

ALTER TABLE incident_rooms
    ADD COLUMN severity VARCHAR(50) NOT NULL DEFAULT 'SEV3',
    ADD COLUMN description TEXT,
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE alerts (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    source VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_project FOREIGN KEY (project_id) REFERENCES projects(id)
);
