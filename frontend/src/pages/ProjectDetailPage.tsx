import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hash, Shield, Plus, X, User, ArrowLeft, MessageSquare, KeyRound, RotateCcw, Ban } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';

const ProjectDetailPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [showTeamPanel, setShowTeamPanel] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [userRole, setUserRole] = useState<string>('MEMBER');
    const [ingestKeys, setIngestKeys] = useState<any[]>([]);
    const [ingestUsage, setIngestUsage] = useState<any>(null);
    const [newIngestKeyLabel, setNewIngestKeyLabel] = useState('');
    const [ingestPanelLoading, setIngestPanelLoading] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await api.get('/projects');
                const p = res.data.find((x: any) => x.id === Number(id));
                setProject(p);
            } catch (e) {
                console.error('Failed to get project detail');
            }
        };
        fetchProject();
        fetchRooms();
        fetchMembers();

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const rawRole: string = payload.role || payload.authorities?.[0] || '';
                setUserRole(rawRole);
            } catch (e) {}
        }
    }, [id]);

    const fetchIngestAdminData = async () => {
        if (!id) return;
        setIngestPanelLoading(true);
        try {
            const [keysRes, usageRes] = await Promise.all([
                api.get(`/api/ingest/keys?projectId=${id}`),
                api.get(`/api/ingest/usage?projectId=${id}`),
            ]);
            setIngestKeys(keysRes.data || []);
            setIngestUsage(usageRes.data || null);
        } catch (err) {
            console.error('Failed to load ingest admin data', err);
        } finally {
            setIngestPanelLoading(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await api.get(`/rooms/${id}`);
            setRooms(res.data);
        } catch (e) { console.error('Failed to fetch rooms'); }
    };

    const fetchMembers = async () => {
        try {
            const res = await api.get(`/projects/${id}/members`);
            setMembers(res.data);
        } catch (e) { console.error('Failed to fetch members'); }
    };

    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomSeverity, setNewRoomSeverity] = useState('SEV3');
    const [newRoomDesc, setNewRoomDesc] = useState('');

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/rooms', { 
                projectId: id, 
                name: newRoomName, 
                status: 'OPEN',
                severity: newRoomSeverity,
                description: newRoomDesc
            });
            fetchRooms();
            setShowCreateRoom(false);
            setNewRoomName('');
            setNewRoomDesc('');
            setNewRoomSeverity('SEV3');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to open an Incident Room.');
        }
    };



    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/projects/${id}/invite`, { email: inviteEmail });
            toast.success('Invite sent successfully!');
            setInviteEmail('');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to invite user.';
            toast.error(msg);
        }
    };

    const handleRemoveMember = async (email: string) => {
        if (!confirm(`Remove ${email} from this project?`)) return;
        try {
            await api.delete(`/projects/${id}/members`, { data: { email } });
            toast.success('Member removed');
            fetchMembers();
        } catch (err) {
            toast.error('Failed to remove member.');
        }
    };

    const handleOneClickWarRoom = async () => {
        try {
            const res = await api.post('/rooms', { 
                projectId: id, 
                name: "🔥 Sev-1 War Room", 
                status: 'INVESTIGATING',
                severity: 'SEV1',
                description: 'Emergency one-click war room activated.'
            });
            navigate(`/rooms/${res.data.id}`);
        } catch (err) {
            toast.error('Failed to launch War Room.');
        }
    };

    const handleCreateIngestKey = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/ingest/keys', { projectId: Number(id), label: newIngestKeyLabel });
            toast.success('Ingest key created');
            setNewIngestKeyLabel('');
            fetchIngestAdminData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create ingest key');
        }
    };

    const handleRevokeIngestKey = async (keyId: number) => {
        if (!confirm('Revoke this ingest key? Existing agents will stop sending telemetry.')) return;
        try {
            await api.post(`/api/ingest/keys/${keyId}/revoke`);
            toast.success('Ingest key revoked');
            fetchIngestAdminData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to revoke ingest key');
        }
    };

    const handleRotateIngestKey = async (keyId: number) => {
        try {
            const res = await api.post(`/api/ingest/keys/${keyId}/rotate`);
            if (res.data?.ingestKey) {
                window.prompt('Copy the new ingest key now. It will not be shown again.', res.data.ingestKey);
            }
            toast.success('Ingest key rotated');
            fetchIngestAdminData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to rotate ingest key');
        }
    };

    const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';

    useEffect(() => {
        if (isAdmin && id) {
            fetchIngestAdminData();
        }
    }, [id, isAdmin]);

    if (!project) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-subtle)' }}>
                Loading project...
            </div>
        );
    }

    const openRooms = rooms.filter(r => r.status === 'OPEN' || r.status === 'INVESTIGATING' || r.status === 'MITIGATED');
    const resolvedRooms = rooms.filter(r => r.status === 'RESOLVED');
    const metricsUsage = ingestUsage?.metrics;
    const logsUsage = ingestUsage?.logs;

    return (
        <div className="animate-entrance" style={{ display: 'flex', gap: '24px', maxWidth: '1400px' }}>
            {/* Main Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Breadcrumb + Header */}
                <div style={{ marginBottom: '28px' }}>
                    <button onClick={() => navigate('/projects')} className="btn-ghost" style={{ marginBottom: '12px', padding: '6px 10px', fontSize: '0.8rem' }}>
                        <ArrowLeft size={14} /> All Projects
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>{project.name}</h1>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                <span className="badge badge-primary">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                                <span className="badge badge-green">{openRooms.length} active</span>
                                {resolvedRooms.length > 0 && <span className="badge" style={{ background: 'rgba(113,113,122,0.15)', color: 'var(--text-muted)' }}>{resolvedRooms.length} resolved</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleOneClickWarRoom} className="btn-pill" style={{ backgroundImage: 'linear-gradient(135deg, #ef4444, #f97316)', border: 'none' }}>
                                💥 Start Incident
                            </button>
                            {isAdmin && (
                                <button onClick={() => setShowTeamPanel(!showTeamPanel)} className="btn-pill-dark">
                                    <Shield size={16} /> Team
                                </button>
                            )}
                            <button onClick={() => setShowCreateRoom(true)} className="btn-pill">
                                <Plus size={16} /> New Room
                            </button>
                        </div>
                    </div>
                </div>

                <div className="divider" />

                {/* Create Room Modal */}
                {showCreateRoom && (
                    <div className="modern-card" style={{ padding: '24px', marginBottom: '28px', border: '1px solid var(--accent-purple)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Create New Incident Room</h3>
                            <button onClick={() => setShowCreateRoom(false)} className="btn-ghost" style={{ padding: '4px' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Room Name / Designation</label>
                                <input type="text" className="input-modern" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="e.g. DB Outage" required style={{ width: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Severity</label>
                                    <select className="input-modern" value={newRoomSeverity} onChange={e => setNewRoomSeverity(e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
                                        <option value="SEV1">SEV1 - Critical</option>
                                        <option value="SEV2">SEV2 - High</option>
                                        <option value="SEV3">SEV3 - Moderate</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Description (optional)</label>
                                <textarea className="input-modern" value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)} placeholder="Brief issue description..." rows={2} style={{ width: '100%', resize: 'none' }} />
                            </div>
                            <button type="submit" className="btn-pill" style={{ alignSelf: 'flex-start' }}>Initialize Room</button>
                        </form>
                    </div>
                )}

                {isAdmin && (
                    <div className="modern-card" style={{ padding: '24px', marginBottom: '28px', border: '1px solid rgba(59,130,246,0.35)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <KeyRound size={16} /> Ingest Keys & Quotas
                                </h3>
                                <p style={{ margin: '6px 0 0', color: 'var(--text-subtle)', fontSize: '0.82rem' }}>
                                    Project-scoped access, per-key rate limits, and separate metrics/logs quotas.
                                </p>
                            </div>
                            <button onClick={fetchIngestAdminData} className="btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }} disabled={ingestPanelLoading}>
                                {ingestPanelLoading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>

                        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            <div className="modern-card" style={{ padding: '14px' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>Metrics quota</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Req/min: {metricsUsage?.projectRequestsCurrentMinute ?? 0} / {metricsUsage?.projectRequestsLimitPerMinute ?? '—'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Bytes/sec: {metricsUsage?.projectBytesCurrentSecond ?? 0} / {metricsUsage?.projectBytesLimitPerSecond ?? '—'}</div>
                            </div>
                            <div className="modern-card" style={{ padding: '14px' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>Logs quota</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Req/min: {logsUsage?.projectRequestsCurrentMinute ?? 0} / {logsUsage?.projectRequestsLimitPerMinute ?? '—'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Bytes/sec: {logsUsage?.projectBytesCurrentSecond ?? 0} / {logsUsage?.projectBytesLimitPerSecond ?? '—'}</div>
                            </div>
                        </div>

                        <form onSubmit={handleCreateIngestKey} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <input
                                className="input-modern"
                                placeholder="New key label e.g. acme-prod-metrics"
                                value={newIngestKeyLabel}
                                onChange={e => setNewIngestKeyLabel(e.target.value)}
                                style={{ minWidth: '280px', flex: 1 }}
                            />
                            <button className="btn-pill" type="submit" disabled={!newIngestKeyLabel.trim()}>
                                Create Key
                            </button>
                        </form>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-subtle)' }}>
                                        <th style={{ padding: '8px 6px' }}>Label</th>
                                        <th style={{ padding: '8px 6px' }}>Active</th>
                                        <th style={{ padding: '8px 6px' }}>Last Used</th>
                                        <th style={{ padding: '8px 6px' }}>Created</th>
                                        <th style={{ padding: '8px 6px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingestKeys.map((key) => (
                                        <tr key={key.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                                            <td style={{ padding: '10px 6px', fontWeight: 600 }}>{key.label}</td>
                                            <td style={{ padding: '10px 6px' }}>
                                                <span className="badge" style={{ background: key.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: key.active ? '#22c55e' : '#ef4444' }}>
                                                    {key.active ? 'Active' : 'Revoked'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 6px', color: 'var(--text-subtle)' }}>{key.lastUsedAt || 'Never'}</td>
                                            <td style={{ padding: '10px 6px', color: 'var(--text-subtle)' }}>{key.createdAt || '—'}</td>
                                            <td style={{ padding: '10px 6px' }}>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button className="btn-ghost" type="button" onClick={() => handleRotateIngestKey(key.id)} style={{ padding: '5px 8px', fontSize: '0.78rem' }}>
                                                        <RotateCcw size={14} /> Rotate
                                                    </button>
                                                    <button className="btn-ghost" type="button" onClick={() => handleRevokeIngestKey(key.id)} style={{ padding: '5px 8px', fontSize: '0.78rem' }}>
                                                        <Ban size={14} /> Revoke
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {ingestKeys.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '14px 6px', color: 'var(--text-subtle)' }}>No ingest keys yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Active Rooms */}
                {openRooms.length > 0 && (
                    <div style={{ marginBottom: '28px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="status-dot online pulse-online"></span> Active Incident Rooms
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                            {openRooms.map(r => (
                                <div key={r.id} onClick={() => navigate(`/rooms/${r.id}`)} className="modern-card" style={{ padding: '20px', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Hash size={18} color="var(--primary-light)" />
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <h4 className="text-truncate" style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{r.name}</h4>
                                            {r.description && <p className="text-truncate" style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>{r.description}</p>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: r.severity === 'SEV1' ? 'rgba(239,68,68,0.2)' : r.severity === 'SEV2' ? 'rgba(249,115,22,0.2)' : 'rgba(59,130,246,0.2)', color: r.severity === 'SEV1' ? '#fca5a5' : r.severity === 'SEV2' ? '#fdba74' : '#93c5fd', fontWeight: 700 }}>{r.severity || 'SEV3'}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 600 }}>{r.status}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <MessageSquare size={16} color="var(--text-subtle)" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Resolved Rooms */}
                {resolvedRooms.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-muted)' }}>
                            Resolved ({resolvedRooms.length})
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                            {resolvedRooms.map(r => (
                                <div key={r.id} onClick={() => navigate(`/rooms/${r.id}`)} className="modern-card" style={{ padding: '20px', cursor: 'pointer', opacity: 0.6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Hash size={16} color="var(--text-subtle)" />
                                        <span className="text-truncate" style={{ fontSize: '0.95rem', fontWeight: 500 }}>{r.name}</span>
                                        <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(113,113,122,0.15)', color: 'var(--text-muted)' }}>Resolved</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {rooms.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>
                        <MessageSquare size={36} style={{ opacity: 0.2, marginBottom: '12px' }} />
                        <p>No incident rooms yet. Create one to start collaborating.</p>
                    </div>
                )}
            </div>

            {/* Team Panel */}
            {showTeamPanel && (
                <aside className="animate-entrance modern-card-flat" style={{ width: '340px', minWidth: '340px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', alignSelf: 'flex-start', position: 'sticky', top: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontWeight: 700, margin: 0, fontSize: '1rem' }}>Team ({members.length})</h3>
                        <button onClick={() => setShowTeamPanel(false)} className="btn-ghost" style={{ padding: '4px' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Members */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {members.map((m: any, i: number) => {
                            const isOnline = m.status === 'ONLINE';
                            const formatLastSeen = (ts: number | null) => {
                                if (!ts) return 'Never';
                                const diff = Date.now() - ts;
                                if (diff < 60000) return 'Just now';
                                if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                                if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                                return new Date(ts).toLocaleDateString();
                            };
                            const lastSeenLabel = formatLastSeen(m.lastSeen);
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-pitch)', border: '1px solid var(--card-border)' }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{
                                            width: '34px', height: '34px', borderRadius: '50%',
                                            background: m.role === 'ADMIN' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'var(--card-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <User size={16} color="#fff" />
                                        </div>
                                        <span className={`status-dot ${isOnline ? 'online pulse-online' : 'offline'}`} style={{
                                            position: 'absolute', bottom: '-1px', right: '-1px',
                                            border: '2px solid var(--bg-pitch)',
                                        }}></span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p className="text-truncate" style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem' }}>{m.email}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: 700, color: m.role === 'ADMIN' ? 'var(--accent-purple)' : 'var(--text-subtle)', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                                                {m.role}
                                            </span>
                                            <span style={{ color: 'var(--text-subtle)' }}>·</span>
                                            <span>{isOnline ? 'Online' : `${lastSeenLabel}`}</span>
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <button onClick={() => handleRemoveMember(m.email)} className="btn-ghost" style={{ padding: '4px', color: 'var(--accent-red)', opacity: 0.5 }}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {members.length === 0 && <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem', padding: '8px' }}>No members yet.</p>}
                    </div>

                    {/* Invite Form */}
                    {isAdmin && (
                        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', color: 'var(--text-subtle)' }}>
                                Invite Member
                            </p>
                            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input type="email" className="input-modern" placeholder="email@example.com" value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)} required />
                                <button type="submit" className="btn-pill" style={{ width: '100%' }}>Send Invite</button>
                            </form>
                        </div>
                    )}
                </aside>
            )}
        </div>
    );
};

export default ProjectDetailPage;
