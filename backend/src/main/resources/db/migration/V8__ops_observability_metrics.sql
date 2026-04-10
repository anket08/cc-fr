alter table github_repo_snapshots add column total_workflow_runs integer not null default 0;
alter table github_repo_snapshots add column deployments_last_7d integer not null default 0;
alter table github_repo_snapshots add column open_code_scanning_alerts integer not null default 0;
