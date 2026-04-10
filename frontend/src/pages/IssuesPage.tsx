import React, { useEffect, useState, useCallback } from 'react';
import {
    LayoutGrid, List, Zap, Plus, ChevronDown, FolderOpen
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { IssueData } from '../components/IssueCard';
import KanbanBoard from '../components/KanbanBoard';
import BacklogView from '../components/BacklogView';
import SprintPanel from '../components/SprintPanel';
import CreateIssueModal from '../components/CreateIssueModal';
import IssueDetailModal from '../components/IssueDetailModal';

type Tab = 'board' | 'backlog' | 'sprints';

const IssuesPage: React.FC = () => {
    const { token } = useAuth();

    // ── User info ──────────────────────────────────────────────────────────
    const [userEmail, setUserEmail] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    // ── Projects ───────────────────────────────────────────────────────────
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    // ── Data ───────────────────────────────────────────────────────────────
    const [issues, setIssues] = useState<IssueData[]>([]);
    const [sprints, setSprints] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // ── UI state ───────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<Tab>('board');
    const [selectedIssue, setSelectedIssue] = useState<IssueData | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [createDefaultStatus, setCreateDefaultStatus] = useState('TODO');

    // ── Filters ────────────────────────────────────────────────────────────
    const [filterPriority, setFilterPriority] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [searchText, setSearchText] = useState('');

    // ── Init ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserEmail(payload.sub || '');
                const role = (payload.role || '').replace('ROLE_', '');
                setIsAdmin(role === 'ADMIN');
            } catch {}
        }
        loadProjects();
    }, [token]);

    useEffect(() => {
        if (selectedProjectId) {
            loadAll(selectedProjectId);
        }
    }, [selectedProjectId]);

    const loadProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
            if (res.data.length > 0 && !selectedProjectId) {
                setSelectedProjectId(res.data[0].id);
            }
        } catch {}
    };

    const loadAll = useCallback(async (pid: number) => {
        setLoading(true);
        try {
            const [issuesRes, sprintsRes, membersRes] = await Promise.all([
                api.get(`/issues?projectId=${pid}`),
                api.get(`/sprints?projectId=${pid}`),
                api.get(`/projects/${pid}/members`),
            ]);
            setIssues(issuesRes.data);
            setSprints(sprintsRes.data);
            setMembers(membersRes.data);
        } catch (e) {
            console.error('Failed to load issues data', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = () => {
        if (selectedProjectId) loadAll(selectedProjectId);
    };

    // ── Active sprint ───────────────────────────────────────────────────────
    const activeSprint = sprints.find((s: any) => s.status === 'ACTIVE') ?? null;

    // ── Filtered issues (backlog + sprint panel use all issues) ────────────
    const filteredIssues = issues.filter(i => {
        if (filterPriority && i.priority !== filterPriority) return false;
        if (filterType && i.type !== filterType) return false;
        if (filterAssignee && i.assigneeEmail !== filterAssignee) return false;
        if (searchText && !i.title.toLowerCase().includes(searchText.toLowerCase())) return false;
        return true;
    });

    // ── Board issues ────────────────────────────────────────────────────────
    // Shows: (1) active-sprint issues, and (2) backlog issues that are NOT DONE.
    // On sprint complete, DONE tickets go to sprint_id=null but the !DONE filter
    // keeps them off the board → DONE column empties as expected.
    const boardIssues = filteredIssues.filter(i => {
        if (activeSprint && i.sprintId === activeSprint.id) return true;   // on active sprint
        if (!i.sprintId && i.status !== 'DONE') return true;               // backlog, not done
        return false;
    });

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    const openAddToColumn = (status: string) => {
        setCreateDefaultStatus(status);
        setShowCreate(true);
    };

    // ── Empty state ────────────────────────────────────────────────────────
    if (projects.length === 0) {
        return (
            <div className="animate-entrance" style={{ textAlign: 'center', paddingTop: '80px' }}>
                <FolderOpen size={40} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No Projects</h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                    You need to be part of a project to track issues. Ask your admin to add you.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-entrance" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>

            {/* ── Top Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '16px', flexShrink: 0, flexWrap: 'wrap', gap: '10px',
            }}>
                {/* Left: project picker + tab bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Project dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            className="btn-pill-dark"
                            style={{ gap: '8px', fontWeight: 700 }}
                            onClick={() => setShowProjectPicker(!showProjectPicker)}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '3px',
                                background: `hsl(${((selectedProjectId ?? 1) * 67) % 360}, 50%, 40%)`,
                                flexShrink: 0,
                            }} />
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedProject?.name ?? 'Select Project'}
                            </span>
                            <ChevronDown size={14} />
                        </button>
                        {showProjectPicker && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-md)', padding: '4px', zIndex: 50,
                                boxShadow: 'var(--shadow-dropdown)', minWidth: '220px',
                            }}>
                                {projects.map(p => (
                                    <div
                                        key={p.id}
                                        className="search-item"
                                        style={{
                                            padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            background: p.id === selectedProjectId ? 'var(--accent-subtle)' : 'transparent',
                                            color: p.id === selectedProjectId ? 'var(--accent)' : 'var(--text-primary)',
                                        }}
                                        onClick={() => { setSelectedProjectId(p.id); setShowProjectPicker(false); }}
                                    >
                                        <div style={{
                                            width: '14px', height: '14px', borderRadius: '3px',
                                            background: `hsl(${(p.id * 67) % 360}, 50%, 40%)`, flexShrink: 0,
                                        }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tab bar */}
                    <div className="tab-bar">
                        <button className={`tab-btn${activeTab === 'board' ? ' active' : ''}`} onClick={() => setActiveTab('board')}>
                            <LayoutGrid size={14} /> Board
                        </button>
                        <button className={`tab-btn${activeTab === 'backlog' ? ' active' : ''}`} onClick={() => setActiveTab('backlog')}>
                            <List size={14} /> Backlog
                        </button>
                        <button className={`tab-btn${activeTab === 'sprints' ? ' active' : ''}`} onClick={() => setActiveTab('sprints')}>
                            <Zap size={14} /> Sprints
                        </button>
                    </div>
                </div>

                {/* Right: filters + create */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <input
                        className="input-modern"
                        placeholder="Search issues..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: '180px', fontSize: '0.8rem', padding: '6px 10px' }}
                    />
                    {/* Priority filter */}
                    <select className="drawer-select" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="">All Priorities</option>
                        <option value="HIGHEST">Highest</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                        <option value="LOWEST">Lowest</option>
                    </select>
                    {/* Type filter */}
                    <select className="drawer-select" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="TASK">Task</option>
                        <option value="BUG">Bug</option>
                        <option value="STORY">Story</option>
                        <option value="EPIC">Epic</option>
                    </select>
                    {/* Assignee filter */}
                    {members.length > 0 && (
                        <select className="drawer-select" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                            <option value="">All Assignees</option>
                            {members.map((m: any) => (
                                <option key={m.email} value={m.email}>{m.email.split('@')[0]}</option>
                            ))}
                        </select>
                    )}
                    <button className="btn-pill" onClick={() => { setCreateDefaultStatus('TODO'); setShowCreate(true); }}>
                        <Plus size={14} /> Create Issue
                    </button>
                </div>
            </div>

            <div style={{
                display: 'flex', gap: '16px', marginBottom: '14px', flexShrink: 0,
                padding: '8px 12px', background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem', color: 'var(--text-secondary)',
            }}>
                {[
                    { label: 'Total',       count: filteredIssues.length,                                          color: 'var(--text-primary)' },
                    { label: 'To Do',       count: filteredIssues.filter(i => i.status === 'TODO').length,         color: 'var(--text-tertiary)' },
                    { label: 'On Hold',     count: filteredIssues.filter(i => i.status === 'ON_HOLD').length,      color: '#a855f7' },
                    { label: 'In Progress', count: filteredIssues.filter(i => i.status === 'IN_PROGRESS').length,  color: 'var(--accent)' },
                    { label: 'In Review',   count: filteredIssues.filter(i => i.status === 'IN_REVIEW').length,    color: 'var(--warning)' },
                    { label: 'QA',          count: filteredIssues.filter(i => i.status === 'QA').length,           color: '#06b6d4' },
                    { label: 'Done',        count: filteredIssues.filter(i => i.status === 'DONE').length,         color: 'var(--success)' },
                ].map(s => (
                    <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontWeight: 700, color: s.color }}>{s.count}</span>
                        <span>{s.label}</span>
                    </span>
                ))}
                {loading && <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>Loading...</span>}
                {activeSprint && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                        ⚡ {activeSprint.name} active
                    </span>
                )}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, minHeight: 0, overflow: activeTab === 'board' ? 'hidden' : 'auto' }}>
                {activeTab === 'board' && (
                    <KanbanBoard
                        issues={boardIssues}
                        onIssueClick={setSelectedIssue}
                        onAddToColumn={openAddToColumn}
                        onRefresh={refresh}
                    />
                )}

                {activeTab === 'backlog' && (
                    <BacklogView
                        issues={filteredIssues}
                        sprints={sprints}
                        onIssueClick={setSelectedIssue}
                        onCreateClick={() => setShowCreate(true)}
                    />
                )}

                {activeTab === 'sprints' && (
                    <SprintPanel
                        sprints={sprints}
                        projectId={selectedProjectId!}
                        isAdmin={isAdmin}
                        onRefresh={refresh}
                    />
                )}
            </div>

            {/* ── Modals ── */}
            {showCreate && selectedProjectId && (
                <CreateIssueModal
                    projectId={selectedProjectId}
                    sprints={sprints}
                    members={members}
                    defaultStatus={createDefaultStatus}
                    defaultSprintId={activeSprint?.id ?? null}
                    onCreated={refresh}
                    onClose={() => setShowCreate(false)}
                />
            )}

            {selectedIssue && (
                <IssueDetailModal
                    issue={selectedIssue}
                    sprints={sprints}
                    members={members}
                    isAdmin={isAdmin}
                    userEmail={userEmail}
                    onClose={() => setSelectedIssue(null)}
                    onUpdated={() => { refresh(); if (selectedIssue) { setSelectedIssue(null); } }}
                    onDeleted={refresh}
                />
            )}
        </div>
    );
};

export default IssuesPage;
