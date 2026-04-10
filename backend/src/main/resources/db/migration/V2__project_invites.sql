CREATE TABLE project_invites (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    responded_at TIMESTAMP,
    CONSTRAINT fk_invite_project FOREIGN KEY (project_id) REFERENCES projects(id)
);
