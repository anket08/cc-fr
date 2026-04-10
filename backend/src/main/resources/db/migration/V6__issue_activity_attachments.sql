-- ───────────────────────────────────────────────────────────
-- V6: Issue Activity History + Attachments
-- ───────────────────────────────────────────────────────────

-- Activity history (who changed what and when)
CREATE TABLE issue_activities (
    id          BIGSERIAL PRIMARY KEY,
    issue_id    BIGINT       NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    actor_email VARCHAR(255) NOT NULL,
    action      VARCHAR(100) NOT NULL,   -- e.g. STATUS_CHANGED, ASSIGNEE_CHANGED, CREATED
    field       VARCHAR(100),            -- which field changed
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_activities_issue_id ON issue_activities(issue_id);
CREATE INDEX idx_issue_activities_created_at ON issue_activities(created_at);

-- File attachments
CREATE TABLE issue_attachments (
    id            BIGSERIAL PRIMARY KEY,
    issue_id      BIGINT       NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    uploader_email VARCHAR(255) NOT NULL,
    filename      VARCHAR(500) NOT NULL,
    stored_path   VARCHAR(1000) NOT NULL,
    content_type  VARCHAR(255),
    file_size     BIGINT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_attachments_issue_id ON issue_attachments(issue_id);
