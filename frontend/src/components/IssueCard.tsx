import React from 'react';
import { CheckSquare, Bug, BookOpen, Zap } from 'lucide-react';

export interface IssueData {
    id: number;
    projectId: number;
    projectName: string;
    sprintId: number | null;
    sprintName: string | null;
    title: string;
    description: string | null;
    type: 'TASK' | 'BUG' | 'STORY' | 'EPIC';
    status: 'TODO' | 'ON_HOLD' | 'IN_PROGRESS' | 'IN_REVIEW' | 'QA' | 'DONE';
    priority: 'LOWEST' | 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
    assigneeEmail: string | null;
    reporterEmail: string;
    labels: string | null;
    storyPoints: number | null;
    position: number;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
    commentCount: number;
}

export const TYPE_ICONS: Record<string, React.ReactNode> = {
    TASK:  <CheckSquare size={13} />,
    BUG:   <Bug size={13} />,
    STORY: <BookOpen size={13} />,
    EPIC:  <Zap size={13} />,
};

export const PRIORITY_LABELS: Record<string, string> = {
    HIGHEST: '↑↑ Highest',
    HIGH:    '↑ High',
    MEDIUM:  '— Medium',
    LOW:     '↓ Low',
    LOWEST:  '↓↓ Lowest',
};

interface Props {
    issue: IssueData;
    onClick: () => void;
    dragging?: boolean;
}

const IssueCard: React.FC<Props> = ({ issue, onClick, dragging }) => {
    const labels = issue.labels ? issue.labels.split(',').filter(Boolean) : [];
    const initials = issue.assigneeEmail
        ? issue.assigneeEmail[0].toUpperCase()
        : null;

    return (
        <div
            className={`issue-card${dragging ? ' dragging' : ''}`}
            onClick={onClick}
        >
            <div className="issue-card-top">
                <span className={`priority-dot priority-${issue.priority}`} title={issue.priority} />
                <div>
                    <div className="issue-card-title">{issue.title}</div>
                    {labels.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {labels.slice(0, 3).map(l => (
                                <span key={l} className="label-chip">{l}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="issue-card-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`type-icon-${issue.type}`} title={issue.type}>
                        {TYPE_ICONS[issue.type]}
                    </span>
                    <span className="issue-card-id">#{issue.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {issue.storyPoints != null && (
                        <span className="sp-badge">{issue.storyPoints}</span>
                    )}
                    {initials && (
                        <span className="avatar-chip" title={issue.assigneeEmail!}>
                            {initials}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IssueCard;
