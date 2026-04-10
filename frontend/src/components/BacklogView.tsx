import React from 'react';
import { Plus } from 'lucide-react';
import { TYPE_ICONS, PRIORITY_LABELS } from './IssueCard';
import type { IssueData } from './IssueCard';

interface Props {
    issues: IssueData[];
    sprints: any[];
    onIssueClick: (issue: IssueData) => void;
    onCreateClick: () => void;
}

const BacklogView: React.FC<Props> = ({ issues, sprints, onIssueClick, onCreateClick }) => {
    const backlog = issues.filter(i => !i.sprintId);
    const grouped = sprints
        .map(s => ({
            sprint: s,
            issues: issues.filter(i => i.sprintId === s.id),
        }))
        .filter(g => g.issues.length > 0);

    const renderRow = (issue: IssueData) => (
        <div key={issue.id} className="backlog-issue-row" onClick={() => onIssueClick(issue)}>
            <span className={`priority-dot priority-${issue.priority}`} title={PRIORITY_LABELS[issue.priority]} />
            <span className={`type-icon-${issue.type}`}>{TYPE_ICONS[issue.type]}</span>
            <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {issue.title}
            </span>
            <span className="issue-card-id">#{issue.id}</span>
            <span className={`badge badge-${statusBadge(issue.status)}`} style={{ fontSize: '0.65rem' }}>
                {issue.status.replace('_', ' ')}
            </span>
            {issue.storyPoints != null && <span className="sp-badge">{issue.storyPoints}</span>}
            {issue.assigneeEmail && (
                <span className="avatar-chip" title={issue.assigneeEmail}>
                    {issue.assigneeEmail[0].toUpperCase()}
                </span>
            )}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                    Backlog ({issues.length} issues)
                </h3>
                <button className="btn-pill" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={onCreateClick}>
                    <Plus size={14} /> Create Issue
                </button>
            </div>

            {/* Sprint groups */}
            {grouped.map(({ sprint, issues: groupIssues }) => (
                <div key={sprint.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '0 4px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {sprint.name}
                        </span>
                        <span className="kanban-column-count">{groupIssues.length}</span>
                        <span className="badge" style={{
                            background: sprint.status === 'ACTIVE' ? 'var(--success-subtle)' : 'var(--bg-overlay)',
                            color: sprint.status === 'ACTIVE' ? 'var(--success)' : 'var(--text-tertiary)',
                        }}>
                            {sprint.status}
                        </span>
                    </div>
                    <div className="modern-card" style={{ overflow: 'hidden' }}>
                        {groupIssues.map(renderRow)}
                    </div>
                </div>
            ))}

            {/* Unassigned backlog */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '0 4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Backlog
                    </span>
                    <span className="kanban-column-count">{backlog.length}</span>
                </div>
                <div className="modern-card" style={{ overflow: 'hidden' }}>
                    {backlog.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', padding: '16px', margin: 0, textAlign: 'center' }}>
                            All issues are assigned to sprints 🎉
                        </p>
                    ) : backlog.map(renderRow)}
                </div>
            </div>
        </div>
    );
};

function statusBadge(status: string): string {
    const map: Record<string, string> = {
        TODO:        '',
        ON_HOLD:     'purple',
        IN_PROGRESS: 'primary',
        IN_REVIEW:   'orange',
        QA:          'cyan',
        DONE:        'green',
    };
    return map[status] ?? '';
}

export default BacklogView;
