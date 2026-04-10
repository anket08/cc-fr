import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, ArrowUpRight, Search, Zap, TicketCheck, Clock } from 'lucide-react';
import api from '../api/axios';

import CreateProjectModal from '../components/CreateProjectModal';

const ProjectsPage: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [allIssues, setAllIssues] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);

    useEffect(() => {
        fetchProjects();
        fetchIncidents();
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const role = payload.role || '';
                setIsAdmin(role.includes('ADMIN'));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        if (projects.length > 0) {
            fetchAllIssues();
        }
    }, [projects]);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Failed to fetch projects');
        }
    };

    const fetchIncidents = async () => {
        try { const res = await api.get('/rooms'); setIncidents(Array.isArray(res.data) ? res.data : []); } catch {}
    };

    const fetchAllIssues = async () => {
        try {
            const results = await Promise.all(projects.map(p => api.get(`/issues?projectId=${p.id}`)));
            setAllIssues(results.flatMap(r => r.data));
        } catch {}
    };

    const handleCreateProject = () => {
        setShowCreateModal(true);
    };

    const filtered = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    // Color palette for project cards
    const projectColors = [
        { bg: 'rgba(108, 92, 231, 0.08)', accent: '#6c5ce7', iconBg: 'rgba(108, 92, 231, 0.15)' },
        { bg: 'rgba(0, 214, 143, 0.06)', accent: '#00d68f', iconBg: 'rgba(0, 214, 143, 0.12)' },
        { bg: 'rgba(77, 171, 247, 0.06)', accent: '#4dabf7', iconBg: 'rgba(77, 171, 247, 0.12)' },
        { bg: 'rgba(255, 107, 107, 0.06)', accent: '#ff6b6b', iconBg: 'rgba(255, 107, 107, 0.12)' },
        { bg: 'rgba(255, 192, 72, 0.06)', accent: '#ffc048', iconBg: 'rgba(255, 192, 72, 0.12)' },
        { bg: 'rgba(162, 155, 254, 0.06)', accent: '#a29bfe', iconBg: 'rgba(162, 155, 254, 0.12)' },
    ];

    return (
        <>
            {/* Modal */}
            {showCreateModal && (
                <CreateProjectModal 
                    onCreated={fetchProjects} 
                    onClose={() => setShowCreateModal(false)} 
                />
            )}

            <div className="animate-entrance" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, var(--text-primary) 60%, var(--accent-text))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Projects
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 500, marginTop: '6px', letterSpacing: '0.01em' }}>
                            Overview of all cybersecurity operations
                        </p>
                    </div>
                    {isAdmin && (
                        <button onClick={handleCreateProject} className="btn-pill" style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
                            <Plus size={16} /> New Project
                        </button>
                    )}
                </div>

                {/* Stats Row */}
                <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
                    <div className="modern-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(108, 92, 231, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FolderKanban size={18} color="#6c5ce7" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{projects.length}</p>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects</p>
                        </div>
                    </div>
                    <div className="modern-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 214, 143, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TicketCheck size={18} color="#00d68f" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{allIssues.length}</p>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Tickets</p>
                        </div>
                    </div>
                    <div className="modern-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255, 107, 107, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={18} color="#ff6b6b" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{incidents.length}</p>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Incidents</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '420px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    <input
                        className="input-modern"
                        placeholder="Search projects..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '42px' }}
                    />
                </div>

                {/* Projects Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {filtered.map((p, idx) => {
                        const color = projectColors[idx % projectColors.length];
                        const pIssues = allIssues.filter(i => i.projectId === p.id);
                        const pDone = pIssues.filter(i => i.status === 'DONE').length;
                        const pPct = pIssues.length > 0 ? Math.round((pDone / pIssues.length) * 100) : 0;
                        const pIncidents = incidents.filter(i => i.projectId === p.id).length;

                        return (
                            <div
                                key={p.id}
                                onClick={() => navigate(`/projects/${p.id}`)}
                                className="modern-card"
                                style={{
                                    padding: '24px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Top accent line */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color.accent}, transparent)` }} />
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '12px',
                                            background: color.iconBg,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: `0 4px 12px ${color.accent}15`,
                                        }}>
                                            <FolderKanban size={22} color={color.accent} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <h3 className="text-truncate" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{p.name}</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Project #{p.id}</p>
                                        </div>
                                    </div>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                        <ArrowUpRight size={14} color="var(--text-subtle)" />
                                    </div>
                                </div>

                                {/* Stats row */}
                                <div style={{ display: 'flex', gap: '16px', marginBottom: pIssues.length > 0 ? '14px' : '0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        <TicketCheck size={12} /> {pIssues.length} tickets
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        <Zap size={12} /> {pIncidents} incidents
                                    </div>
                                    {p.createdAt && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-subtle)', marginLeft: 'auto' }}>
                                            <Clock size={11} /> {new Date(p.createdAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>

                                {/* Progress bar */}
                                {pIssues.length > 0 && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pPct >= 80 ? 'var(--success)' : 'var(--text-secondary)' }}>{pPct}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--bg-overlay)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pPct}%`, background: pPct >= 80 ? 'var(--success)' : color.accent, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-subtle)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Zap size={28} style={{ opacity: 0.3 }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>
                            {search ? 'No projects match your search.' : 'No projects found. Create one or ask for an invite.'}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};


export default ProjectsPage;
