-- Phase 3: Jira-style Issue Tracking

CREATE TYPE sprint_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED');
CREATE TYPE issue_type    AS ENUM ('TASK', 'BUG', 'STORY', 'EPIC');
CREATE TYPE issue_status  AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');
CREATE TYPE issue_priority AS ENUM ('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST');

CREATE TABLE sprints (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    name        VARCHAR(255) NOT NULL,
    goal        TEXT,
    status      VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    start_date  DATE,
    end_date    DATE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sprint_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE issues (
    id            BIGSERIAL PRIMARY KEY,
    project_id    BIGINT NOT NULL,
    sprint_id     BIGINT,
    title         VARCHAR(512) NOT NULL,
    description   TEXT,
    type          VARCHAR(50) NOT NULL DEFAULT 'TASK',
    status        VARCHAR(50) NOT NULL DEFAULT 'TODO',
    priority      VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    assignee_id   UUID,
    reporter_id   UUID NOT NULL,
    labels        TEXT,
    story_points  INT,
    position      INT NOT NULL DEFAULT 0,
    due_date      DATE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_issue_project  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_issue_sprint   FOREIGN KEY (sprint_id)   REFERENCES sprints(id)  ON DELETE SET NULL,
    CONSTRAINT fk_issue_assignee FOREIGN KEY (assignee_id) REFERENCES users(id)    ON DELETE SET NULL,
    CONSTRAINT fk_issue_reporter FOREIGN KEY (reporter_id) REFERENCES users(id)
);

CREATE INDEX idx_issues_project  ON issues(project_id);
CREATE INDEX idx_issues_sprint   ON issues(sprint_id);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
CREATE INDEX idx_issues_status   ON issues(project_id, status);

CREATE TABLE issue_comments (
    id         BIGSERIAL PRIMARY KEY,
    issue_id   BIGINT NOT NULL,
    author_id  UUID NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_issue  FOREIGN KEY (issue_id)  REFERENCES issues(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES users(id)
);
