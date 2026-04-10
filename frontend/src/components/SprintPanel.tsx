import React, { useState } from 'react';
import { Plus, Play, CheckCircle2, Calendar, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';

interface SprintData {
    id: number;
    name: string;
    goal: string | null;
    status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
    startDate: string | null;
    endDate: string | null;
    issueCount: number;
    completedCount: number;
}

interface Props {
    sprints: SprintData[];
    projectId: number;
    isAdmin: boolean;
    onRefresh: () => void;
}

const SprintPanel: React.FC<Props> = ({ sprints, projectId, isAdmin, onRefresh }) => {
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set(sprints.filter(s => s.status === 'ACTIVE').map(s => s.id)));

    const toggle = (id: number) => setExpandedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/sprints', { projectId, name, goal: goal || null, startDate: startDate || null, endDate: endDate || null });
            setName(''); setGoal(''); setStartDate(''); setEndDate('');
            setShowCreate(false);
            toast.success('Sprint created successfully');
            onRefresh();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create sprint');
        } finally { setLoading(false); }
    };

    const handleStart = async (id: number) => {
        try {
            await api.post(`/sprints/${id}/start`);
            toast.success('Sprint started!');
            onRefresh();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to start sprint');
        }
    };

    const handleComplete = async (id: number) => {
        if (!confirm('Complete this sprint? Unfinished issues will return to backlog.')) return;
        try {
            await api.post(`/sprints/${id}/complete`);
            toast.success('Sprint completed successfully!');
            onRefresh();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to complete sprint');
        }
    };

    const statusColor: Record<string, string> = {
        PLANNING: 'var(--text-tertiary)',
        ACTIVE: 'var(--success)',
        COMPLETED: 'var(--accent)',
    };

    const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Sprints ({sprints.length})</h3>
                {isAdmin && (
                    <button className="btn-pill" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => setShowCreate(!showCreate)}>
                        <Plus size={14} /> New Sprint
                    </button>
                )}
            </div>

            {/* Create form */}
            {showCreate && (
                <div className="modern-card" style={{ padding: '16px' }}>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input className="input-modern" placeholder="Sprint name (e.g. Sprint 1)" value={name} onChange={e => setName(e.target.value)} required />
                        <input className="input-modern" placeholder="Sprint goal (optional)" value={goal} onChange={e => setGoal(e.target.value)} />
                        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="drawer-field-label">Start Date</label>
                                <input className="input-modern" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="drawer-field-label">End Date</label>
                                <input className="input-modern" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn-pill-dark" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button type="submit" className="btn-pill" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Sprint list */}
            {sprints.length === 0 && (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: '32px 0' }}>
                    No sprints yet. {isAdmin ? 'Create one above.' : 'Ask an admin to create a sprint.'}
                </p>
            )}

            {sprints.map(s => {
                const pct = s.issueCount > 0 ? Math.round((s.completedCount / s.issueCount) * 100) : 0;
                const expanded = expandedIds.has(s.id);
                return (
                    <div key={s.id} className="sprint-card">
                        <div className="sprint-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => toggle(s.id)}>
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</span>
                                        <span className="badge" style={{ background: 'transparent', border: `1px solid ${statusColor[s.status]}`, color: statusColor[s.status] }}>
                                            {s.status}
                                        </span>
                                    </div>
                                    {s.goal && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                            <Target size={11} /> {s.goal}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {s.completedCount}/{s.issueCount} done
                                </span>
                                {s.startDate && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                        <Calendar size={11} /> {fmtDate(s.startDate)} → {fmtDate(s.endDate)}
                                    </span>
                                )}
                                {isAdmin && s.status === 'PLANNING' && (
                                    <button className="btn-pill" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleStart(s.id)}>
                                        <Play size={12} /> Start
                                    </button>
                                )}
                                {isAdmin && s.status === 'ACTIVE' && (
                                    <button className="btn-pill" style={{ padding: '4px 12px', fontSize: '0.75rem', background: 'var(--success)' }} onClick={() => handleComplete(s.id)}>
                                        <CheckCircle2 size={12} /> Complete
                                    </button>
                                )}
                            </div>
                        </div>

                        {expanded && s.issueCount > 0 && (
                            <div style={{ padding: '8px 12px' }}>
                                <div className="sprint-progress-bar">
                                    <div className="sprint-progress-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>{pct}% complete</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default SprintPanel;
