import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';

interface Props {
    projectId: number;
    sprints: any[];
    members: any[];
    defaultStatus?: string;
    defaultSprintId?: number | null;
    onCreated: () => void;
    onClose: () => void;
}

const CreateIssueModal: React.FC<Props> = ({
    projectId, sprints, members, defaultStatus = 'TODO', defaultSprintId, onCreated, onClose
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('TASK');
    const [status, setStatus] = useState(defaultStatus);
    const [priority, setPriority] = useState('MEDIUM');
    const [assigneeEmail, setAssigneeEmail] = useState('');
    const [sprintId, setSprintId] = useState(defaultSprintId ? String(defaultSprintId) : '');
    const [labels, setLabels] = useState('');
    const [storyPoints, setStoryPoints] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        setError(null);
        try {
            await api.post('/issues', {
                projectId,
                title: title.trim(),
                description: description || null,
                type,
                status,
                priority,
                assigneeEmail: assigneeEmail || null,
                sprintId: sprintId ? Number(sprintId) : null,
                labels: labels.trim() || null,
                storyPoints: storyPoints ? Number(storyPoints) : null,
                dueDate: dueDate || null,
            });
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create issue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Create Issue</h3>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '4px' }}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: 0 }}>{error}</p>
                        )}

                        {/* Title */}
                        <div>
                            <label className="drawer-field-label">Title *</label>
                            <input
                                className="input-modern"
                                placeholder="Issue title..."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Type + Priority row */}
                        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="drawer-field-label">Type</label>
                                <select className="drawer-select input-modern" value={type} onChange={e => setType(e.target.value)}>
                                    <option value="TASK">📋 Task</option>
                                    <option value="BUG">🐛 Bug</option>
                                    <option value="STORY">📖 Story</option>
                                    <option value="EPIC">⚡ Epic</option>
                                </select>
                            </div>
                            <div>
                                <label className="drawer-field-label">Priority</label>
                                <select className="drawer-select input-modern" value={priority} onChange={e => setPriority(e.target.value)}>
                                    <option value="HIGHEST">↑↑ Highest</option>
                                    <option value="HIGH">↑ High</option>
                                    <option value="MEDIUM">— Medium</option>
                                    <option value="LOW">↓ Low</option>
                                    <option value="LOWEST">↓↓ Lowest</option>
                                </select>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="drawer-field-label">Status</label>
                            <select className="drawer-select input-modern" value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="TODO">To Do</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="IN_REVIEW">In Review</option>
                                <option value="QA">QA</option>
                                <option value="DONE">Done</option>
                            </select>
                        </div>

                        {/* Assignee */}
                        <div>
                            <label className="drawer-field-label">Assignee</label>
                            <select className="drawer-select input-modern" value={assigneeEmail} onChange={e => setAssigneeEmail(e.target.value)}>
                                <option value="">Unassigned</option>
                                {members.map((m: any) => (
                                    <option key={m.email} value={m.email}>{m.email}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sprint */}
                        {sprints.length > 0 && (
                            <div>
                                <label className="drawer-field-label">
                                    Sprint
                                    {defaultSprintId && (
                                        <span style={{ marginLeft: '6px', color: 'var(--success)', fontWeight: 600 }}>
                                            ⚡ active sprint pre-selected
                                        </span>
                                    )}
                                </label>
                                <select className="drawer-select input-modern" value={sprintId} onChange={e => setSprintId(e.target.value)}>
                                    <option value="">Backlog (not on board)</option>
                                    {sprints.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}{s.status === 'ACTIVE' ? ' ⚡' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label className="drawer-field-label">Description</label>
                            <textarea
                                className="input-modern"
                                placeholder="Add a description..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        {/* Labels + Story Points row */}
                        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="drawer-field-label">Labels (comma-separated)</label>
                                <input
                                    className="input-modern"
                                    placeholder="frontend, ux, critical"
                                    value={labels}
                                    onChange={e => setLabels(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="drawer-field-label">Story Points</label>
                                <input
                                    className="input-modern"
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="e.g. 3"
                                    value={storyPoints}
                                    onChange={e => setStoryPoints(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Due date */}
                        <div>
                            <label className="drawer-field-label">Due Date</label>
                            <input
                                className="input-modern"
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-pill-dark">Cancel</button>
                        <button type="submit" className="btn-pill" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Issue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateIssueModal;
