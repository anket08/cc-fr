import React, { useEffect, useState } from 'react';
import {
    X, MessageSquare, Calendar, Tag, Save, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { TYPE_ICONS, PRIORITY_LABELS } from './IssueCard';
import type { IssueData } from './IssueCard';

interface Comment {
    id: number;
    authorEmail: string;
    body: string;
    createdAt: string;
}

interface Props {
    issue: IssueData;
    sprints: any[];
    members: any[];
    isAdmin: boolean;
    userEmail: string;
    onClose: () => void;
    onUpdated: () => void;
    onDeleted: () => void;
}

const IssueDetailModal: React.FC<Props> = ({
    issue: initialIssue, sprints, members, isAdmin, userEmail, onClose, onUpdated, onDeleted
}) => {
    const [issue, setIssue] = useState(initialIssue);
    const [title, setTitle] = useState(initialIssue.title);
    const [description, setDescription] = useState(initialIssue.description || '');
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [titleEditing, setTitleEditing] = useState(false);

    useEffect(() => {
        loadComments();
    }, [issue.id]);

    const loadComments = async () => {
        try {
            const res = await api.get(`/issues/${issue.id}/comments`);
            setComments(res.data);
        } catch (e) {}
    };

    const handleFieldUpdate = async (patch: Partial<IssueData>) => {
        try {
            const res = await api.put(`/issues/${issue.id}`, { ...patch });
            setIssue(res.data);
            onUpdated();
        } catch (e) {}
    };

    const handleSaveTitle = async () => {
        if (title.trim() === issue.title) {
            setTitleEditing(false);
            return;
        }
        setSaving(true);
        try {
            const res = await api.put(`/issues/${issue.id}`, { title: title.trim() });
            setIssue(res.data);
            onUpdated();
        } catch (e) {}
        setSaving(false);
        setTitleEditing(false);
    };

    const handleSaveDescription = async () => {
        setSaving(true);
        try {
            const res = await api.put(`/issues/${issue.id}`, { description });
            setIssue(res.data);
            onUpdated();
        } catch (e) {}
        setSaving(false);
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await api.post(`/issues/${issue.id}/comments`, { body: newComment.trim() });
            setNewComment('');
            loadComments();
        } catch (e) {}
    };

    const handleDelete = async () => {
        if (!confirm(`Delete issue "#${issue.id} — ${issue.title}"?`)) return;
        try {
            await api.delete(`/issues/${issue.id}`);
            toast.success('Issue deleted');
            onDeleted();
            onClose();
        } catch (e) { toast.error('Failed to delete issue'); }
    };

    const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="issue-drawer-overlay" onClick={onClose}>
            <div className="issue-drawer" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="issue-drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`type-icon-${issue.type}`}>{TYPE_ICONS[issue.type]}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            #{issue.id} · {issue.projectName}
                        </span>
                        <span className={`badge badge-purple`}>{issue.type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {isAdmin && (
                            <button onClick={handleDelete} className="btn-ghost" style={{ color: 'var(--danger)', padding: '5px' }}>
                                <Trash2 size={15} />
                            </button>
                        )}
                        <button onClick={onClose} className="btn-ghost" style={{ padding: '5px' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="issue-drawer-body">

                    {/* Main */}
                    <div className="issue-drawer-main">
                        {/* Title */}
                        <div>
                            {titleEditing ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <input
                                        className="input-modern"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        onBlur={handleSaveTitle}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                                        autoFocus
                                        style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1 }}
                                    />
                                    <button className="btn-pill" style={{ padding: '6px 12px' }} onClick={handleSaveTitle} disabled={saving}>
                                        <Save size={14} />
                                    </button>
                                </div>
                            ) : (
                                <h2
                                    onClick={() => setTitleEditing(true)}
                                    style={{
                                        fontSize: '1.1rem', fontWeight: 700, margin: 0, cursor: 'text',
                                        padding: '4px 6px', borderRadius: 'var(--radius-sm)',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    title="Click to edit"
                                >
                                    {issue.title}
                                </h2>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <p className="drawer-field-label">Description</p>
                            <textarea
                                className="input-modern"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                onBlur={handleSaveDescription}
                                rows={5}
                                placeholder="Add a description..."
                                style={{ resize: 'vertical', fontSize: '0.85rem' }}
                            />
                        </div>

                        {/* Metadata pills */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className={`priority-dot priority-${issue.priority}`} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {PRIORITY_LABELS[issue.priority]}
                            </span>
                            {issue.dueDate && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    <Calendar size={12} /> Due {issue.dueDate}
                                </span>
                            )}
                            {issue.storyPoints != null && (
                                <span className="sp-badge">{issue.storyPoints} SP</span>
                            )}
                            {issue.labels && issue.labels.split(',').filter(Boolean).map(l => (
                                <span key={l} className="label-chip">
                                    <Tag size={9} style={{ marginRight: '3px' }} />{l}
                                </span>
                            ))}
                        </div>

                        {/* Reporter + created */}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>
                            Reported by <strong style={{ color: 'var(--text-secondary)' }}>{issue.reporterEmail}</strong>
                            {' · '}Created {fmtDate(issue.createdAt)}
                        </p>

                        {/* Comments */}
                        <div>
                            <p className="drawer-field-label" style={{ marginBottom: '12px' }}>
                                <MessageSquare size={12} style={{ display: 'inline', marginRight: '5px' }} />
                                Comments ({comments.length})
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                {comments.map(c => (
                                    <div key={c.id} style={{
                                        background: 'var(--bg-root)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '10px 14px',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                                                {c.authorEmail}
                                            </strong>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                                {fmtDate(c.createdAt)}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                            {c.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px' }}>
                                    <span className="avatar-chip" style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}>
                                        {userEmail[0]?.toUpperCase()}
                                    </span>
                                </div>
                                <input
                                    className="input-modern"
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    style={{ flex: 1, fontSize: '0.83rem' }}
                                />
                                <button type="submit" className="btn-pill" style={{ padding: '7px 14px', flexShrink: 0 }} disabled={!newComment.trim()}>
                                    Post
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="issue-drawer-sidebar">
                        <div>
                            <p className="drawer-field-label">Status</p>
                            <select
                                className="drawer-select"
                                value={issue.status}
                                onChange={e => handleFieldUpdate({ status: e.target.value as any })}
                            >
                                <option value="TODO">To Do</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="IN_REVIEW">In Review</option>
                                <option value="QA">QA</option>
                                <option value="DONE">Done</option>
                            </select>
                        </div>

                        <div>
                            <p className="drawer-field-label">Priority</p>
                            <select
                                className="drawer-select"
                                value={issue.priority}
                                onChange={e => handleFieldUpdate({ priority: e.target.value as any })}
                            >
                                <option value="HIGHEST">↑↑ Highest</option>
                                <option value="HIGH">↑ High</option>
                                <option value="MEDIUM">— Medium</option>
                                <option value="LOW">↓ Low</option>
                                <option value="LOWEST">↓↓ Lowest</option>
                            </select>
                        </div>

                        <div>
                            <p className="drawer-field-label">Type</p>
                            <select
                                className="drawer-select"
                                value={issue.type}
                                onChange={e => handleFieldUpdate({ type: e.target.value as any })}
                            >
                                <option value="TASK">📋 Task</option>
                                <option value="BUG">🐛 Bug</option>
                                <option value="STORY">📖 Story</option>
                                <option value="EPIC">⚡ Epic</option>
                            </select>
                        </div>

                        <div>
                            <p className="drawer-field-label">Assignee</p>
                            <select
                                className="drawer-select"
                                value={issue.assigneeEmail || ''}
                                onChange={e => handleFieldUpdate({ assigneeEmail: e.target.value || null } as any)}
                            >
                                <option value="">Unassigned</option>
                                {members.map((m: any) => (
                                    <option key={m.email} value={m.email}>{m.email}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <p className="drawer-field-label">Sprint</p>
                            <select
                                className="drawer-select"
                                value={issue.sprintId?.toString() || ''}
                                onChange={e => handleFieldUpdate({ sprintId: e.target.value ? Number(e.target.value) : -1 } as any)}
                            >
                                <option value="">Backlog</option>
                                {sprints.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <p className="drawer-field-label">Story Points</p>
                            <input
                                className="drawer-select"
                                type="number"
                                min="0"
                                max="100"
                                value={issue.storyPoints ?? ''}
                                onChange={e => handleFieldUpdate({ storyPoints: e.target.value ? Number(e.target.value) : null } as any)}
                                style={{ padding: '5px 8px' }}
                            />
                        </div>

                        <div>
                            <p className="drawer-field-label">Due Date</p>
                            <input
                                className="drawer-select"
                                type="date"
                                value={issue.dueDate || ''}
                                onChange={e => handleFieldUpdate({ dueDate: e.target.value || null } as any)}
                                style={{ padding: '5px 8px' }}
                            />
                        </div>

                        <div>
                            <p className="drawer-field-label">Labels</p>
                            <input
                                className="drawer-select"
                                placeholder="label1,label2"
                                defaultValue={issue.labels || ''}
                                onBlur={e => handleFieldUpdate({ labels: e.target.value || null } as any)}
                                style={{ padding: '5px 8px' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IssueDetailModal;
