import React, { useEffect, useState } from 'react';
import {
    FolderKanban, CheckCircle, XCircle, TrendingUp, Zap, Bell, ArrowRight,
    Clock, SquareKanban, CircleDot, CheckCheck, AlertTriangle, Plus,
    MessageCircle, Search, ArrowUpRight, Target, Activity, Loader, Database,
} from 'lucide-react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';

const AI_INSIGHTS_CACHE_KEY = 'dashboard_ai_insights_cache_v1';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string>('MEMBER');
    const [greeting, setGreeting] = useState('');
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [incidents, setIncidents] = useState<any[]>([]);
    const [allIssues, setAllIssues] = useState<any[]>([]);
    const [allSprints, setAllSprints] = useState<any[]>([]);
    const [aiHealth, setAiHealth] = useState<any>(null);
    const [aiInsights, setAiInsights] = useState<string>('');
    const [aiPanelLoading, setAiPanelLoading] = useState<boolean>(false);
    const [goldenSignals, setGoldenSignals] = useState<any>(null);
    const [dbAudit, setDbAudit] = useState<any>(null);
    const [obsPanelLoading, setObsPanelLoading] = useState<boolean>(false);
    const [obsProjectId, setObsProjectId] = useState<number | null>(null);

    useEffect(() => {
        fetchProjects();
        fetchInvites();
        fetchIncidents();
        const hasCachedInsights = hydrateAiInsightsFromCache();
        fetchAiHealth();
        if (!hasCachedInsights) {
            fetchAiPanel(false);
        }

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const rawRole: string = payload.role || payload.authorities?.[0] || '';
                setUserRole(rawRole);
                const email: string = payload.sub || '';
                setUserEmail(email);
                setUserName(email.split('@')[0]);
            } catch (e) {}
        }

        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    useEffect(() => {
        if (projects.length > 0) {
            fetchAllIssues();
            fetchAllSprints();
            setObsProjectId(prev => prev ?? projects[0].id);
        }
    }, [projects]);

    useEffect(() => {
        if (obsProjectId) {
            fetchObservabilityPanel(obsProjectId);
        }
    }, [obsProjectId]);

    const fetchProjects = async () => {
        try { const res = await api.get('/projects'); setProjects(res.data); } catch {}
    };
    const fetchIncidents = async () => {
        try { const res = await api.get('/rooms'); setIncidents(res.data); } catch {}
    };
    const fetchInvites = async () => {
        try { const res = await api.get('/invites/me'); setInvites(res.data); } catch {}
    };
    const fetchAllIssues = async () => {
        try {
            const results = await Promise.all(projects.map(p => api.get(`/issues?projectId=${p.id}`)));
            setAllIssues(results.flatMap(r => r.data));
        } catch {}
    };
    const fetchAllSprints = async () => {
        try {
            const results = await Promise.all(projects.map(p => api.get(`/sprints?projectId=${p.id}`)));
            setAllSprints(results.flatMap(r => r.data));
        } catch {}
    };

    const hydrateAiInsightsFromCache = () => {
        try {
            const raw = localStorage.getItem(AI_INSIGHTS_CACHE_KEY);
            if (!raw) {
                return false;
            }
            const parsed = JSON.parse(raw);
            if (parsed?.insights) {
                setAiInsights(parsed.insights);
                return true;
            }
            return false;
        } catch {
            localStorage.removeItem(AI_INSIGHTS_CACHE_KEY);
            return false;
        }
    };

    const cacheAiInsights = (insights: string) => {
        localStorage.setItem(AI_INSIGHTS_CACHE_KEY, JSON.stringify({
            insights,
            cachedAt: new Date().toISOString(),
        }));
    };

    const fetchAiHealth = async () => {
        try {
            const healthRes = await api.get('/api/ai/health');
            setAiHealth(healthRes.data);
        } catch {
            setAiHealth({ ready: false, status: 'NOT_READY', issues: ['Unable to load AI health. Check backend and auth token.'] });
        }
    };

    const fetchAiPanel = async (refreshInsights: boolean) => {
        setAiPanelLoading(true);
        try {
            const insightsRes = await api.get(`/api/ai/engineering-report/insights?refresh=${refreshInsights}`);
            const insights = insightsRes.data?.insights || 'No AI insights returned yet.';
            setAiInsights(insights);
            cacheAiInsights(insights);

            if (refreshInsights) {
                toast.success('Analysis refreshed successfully.');
            }
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 429) {
                toast.error('Daily refresh limit reached. You can refresh analysis once per day.');
            } else {
                toast.error('AI analysis is unavailable right now.');
            }

            if (!aiInsights) {
                setAiInsights('AI analysis is unavailable right now. Verify GitHub settings and AI provider configuration.');
            }
        } finally {
            setAiPanelLoading(false);
        }
    };

    const fetchObservabilityPanel = async (projectId: number) => {
        setObsPanelLoading(true);
        try {
            const [goldenSignalsRes, dbAuditRes] = await Promise.all([
                api.get(`/api/observability/golden-signals?projectId=${projectId}`),
                api.get(`/api/observability/db-audit?projectId=${projectId}`),
            ]);
            setGoldenSignals(goldenSignalsRes.data);
            setDbAudit(dbAuditRes.data);
        } catch {
            setGoldenSignals({ status: 'UNKNOWN', alerts: ['Unable to load Golden Signals'] });
            setDbAudit({ status: 'UNKNOWN', actions: ['Unable to load DB audit actions'] });
        } finally {
            setObsPanelLoading(false);
        }
    };

    const handleAcceptInvite = async (id: number) => {
        try { await api.post(`/invites/${id}/accept`); fetchInvites(); fetchProjects(); } catch {}
    };
    const handleRejectInvite = async (id: number) => {
        try { await api.post(`/invites/${id}/reject`); fetchInvites(); } catch {}
    };

    const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';

    // ── Incident Metrics ──
    const totalIncidents = incidents.length;
    const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED').length;
    const sev1Count = incidents.filter(i => i.severity === 'SEV1').length;
    const resolvedCount = totalIncidents - activeIncidents;

    const getAvgResolution = () => {
        const resolved = incidents.filter(i => i.status === 'RESOLVED' && i.resolvedAt && i.createdAt);
        if (resolved.length === 0) return '—';
        let totalMs = 0;
        resolved.forEach(i => { totalMs += Math.max(0, new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()); });
        const avg = totalMs / resolved.length;
        const mins = Math.floor(avg / 60000);
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    // ── Ticket Metrics ──
    const totalTickets = allIssues.length;
    const openTickets = allIssues.filter(i => i.status === 'TODO' || i.status === 'ON_HOLD').length;
    const inProgressTickets = allIssues.filter(i => ['IN_PROGRESS', 'IN_REVIEW', 'QA'].includes(i.status)).length;
    const doneTickets = allIssues.filter(i => i.status === 'DONE').length;

    // ── My Tickets ──
    const myTickets = allIssues.filter(i => i.assigneeEmail === userEmail && i.status !== 'DONE').slice(0, 5);

    // ── Active Sprints ──
    const activeSprints = allSprints.filter(s => s.status === 'ACTIVE');

    // ── Status Breakdown ──
    const statusBreakdown = [
        { label: 'To Do', count: allIssues.filter(i => i.status === 'TODO').length, color: '#71717a' },
        { label: 'On Hold', count: allIssues.filter(i => i.status === 'ON_HOLD').length, color: '#a855f7' },
        { label: 'In Progress', count: allIssues.filter(i => i.status === 'IN_PROGRESS').length, color: 'var(--accent)' },
        { label: 'In Review', count: allIssues.filter(i => i.status === 'IN_REVIEW').length, color: 'var(--warning)' },
        { label: 'QA', count: allIssues.filter(i => i.status === 'QA').length, color: '#06b6d4' },
        { label: 'Done', count: doneTickets, color: 'var(--success)' },
    ];

    // ── Chart Data ──
    const getChartData = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const toLocalISOString = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

        return Array.from({ length: 7 }, (_, idx) => {
            const d = new Date(); d.setDate(now.getDate() - (6 - idx));
            const dateStr = toLocalISOString(d);
            return {
                name: days[d.getDay()],
                incidents: incidents.filter(inc => toLocalISOString(new Date(inc.createdAt || Date.now())) === dateStr).length,
                tickets: allIssues.filter(iss => toLocalISOString(new Date(iss.createdAt || Date.now())) === dateStr).length,
                fixed: incidents.filter(inc => inc.status === 'RESOLVED' && inc.resolvedAt && toLocalISOString(new Date(inc.resolvedAt)) === dateStr).length,
            };
        });
    };

    // ── Priority helpers ──
    const priorityColor: Record<string, string> = {
        HIGHEST: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#6366f1', LOW: '#22c55e', LOWEST: '#71717a',
    };
    const priorityIcon: Record<string, string> = {
        HIGHEST: '⬆⬆', HIGH: '⬆', MEDIUM: '—', LOW: '⬇', LOWEST: '⬇⬇',
    };

    const metricTone = (value: number, threshold?: number) => {
        if (threshold === undefined || Number.isNaN(value)) {
            return { bg: 'rgba(99, 102, 241, 0.14)', fg: '#a5b4fc', label: 'N/A' };
        }
        if (value >= threshold) {
            return { bg: 'rgba(239, 68, 68, 0.16)', fg: '#ef4444', label: 'High' };
        }
        if (value >= threshold * 0.75) {
            return { bg: 'rgba(245, 158, 11, 0.16)', fg: '#f59e0b', label: 'Warning' };
        }
        return { bg: 'rgba(34, 197, 94, 0.16)', fg: '#22c55e', label: 'Healthy' };
    };

    const trafficTone = (rpm: number) => {
        if (rpm <= 0) {
            return { bg: 'rgba(239, 68, 68, 0.16)', fg: '#ef4444', label: 'No Traffic' };
        }
        if (rpm < 1) {
            return { bg: 'rgba(245, 158, 11, 0.16)', fg: '#f59e0b', label: 'Low Traffic' };
        }
        return { bg: 'rgba(34, 197, 94, 0.16)', fg: '#22c55e', label: 'Healthy' };
    };

    return (
        <div className="animate-entrance" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>

            {/* ═══ Header ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 500, marginBottom: '6px', letterSpacing: '0.02em' }}>
                        {greeting}{userName ? `, ${userName}` : ''} 👋
                    </p>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, var(--text-primary) 60%, var(--accent-text))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Command Center
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => navigate('/issues')} className="btn-ghost" style={{ fontSize: '0.82rem' }}>
                        <SquareKanban size={14} /> Board
                    </button>
                    <button onClick={() => navigate('/search')} className="btn-ghost" style={{ fontSize: '0.82rem' }}>
                        <Search size={14} /> Search
                    </button>
                    {isAdmin && (
                        <button onClick={() => navigate('/projects')} className="btn-pill" style={{ fontSize: '0.82rem', padding: '7px 16px' }}>
                            <Plus size={14} /> New Project
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ Pending Invites ═══ */}
            {invites.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        background: 'rgba(99, 102, 241, 0.06)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <Bell size={16} color="var(--primary-light)" />
                            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                                {invites.length} Pending Invitation{invites.length > 1 ? 's' : ''}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {invites.map(i => (
                                <div key={i.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'var(--card-bg)', padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                                }}>
                                    <div>
                                        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}>
                                            {i.projectName || `Project #${i.projectId}`}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Clock size={11} /> {new Date(i.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => handleAcceptInvite(i.id)} className="btn-pill" style={{ padding: '5px 12px', fontSize: '0.78rem', background: 'var(--accent-green)' }}>
                                            <CheckCircle size={13} /> Accept
                                        </button>
                                        <button onClick={() => handleRejectInvite(i.id)} className="btn-ghost" style={{ padding: '5px 12px', fontSize: '0.78rem', color: 'var(--accent-red)' }}>
                                            <XCircle size={13} /> Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Combined Stats Row (6 cards) ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
                {[
                    { icon: <AlertTriangle size={20} />, label: 'Incidents', value: totalIncidents, iconBg: 'rgba(255, 107, 107, 0.1)', iconColor: '#ff6b6b', glowColor: 'rgba(255, 107, 107, 0.06)' },
                    { icon: <Activity size={20} />, label: 'Active', value: activeIncidents, iconBg: 'rgba(0, 214, 143, 0.1)', iconColor: '#00d68f', glowColor: 'rgba(0, 214, 143, 0.06)' },
                    { icon: <Zap size={20} />, label: 'SEV1', value: sev1Count, iconBg: 'rgba(255, 192, 72, 0.1)', iconColor: '#ffc048', highlight: sev1Count > 0, glowColor: 'rgba(255, 192, 72, 0.08)' },
                    { icon: <SquareKanban size={20} />, label: 'Tickets', value: totalTickets, iconBg: 'rgba(108, 92, 231, 0.1)', iconColor: '#6c5ce7', glowColor: 'rgba(108, 92, 231, 0.06)' },
                    { icon: <Loader size={20} />, label: 'In Progress', value: inProgressTickets, iconBg: 'rgba(77, 171, 247, 0.1)', iconColor: '#4dabf7', glowColor: 'rgba(77, 171, 247, 0.06)' },
                    { icon: <CheckCheck size={20} />, label: 'Completed', value: doneTickets, iconBg: 'rgba(0, 214, 143, 0.1)', iconColor: '#00d68f', glowColor: 'rgba(0, 214, 143, 0.06)' },
                ].map((s, idx) => (
                    <div key={idx} className="modern-card" style={{
                        padding: '20px', textAlign: 'center',
                        border: (s as any).highlight ? '1px solid rgba(255, 192, 72, 0.25)' : undefined,
                        background: (s as any).highlight ? 'linear-gradient(145deg, rgba(255, 192, 72, 0.04), transparent)' : undefined,
                    }}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: s.iconBg, color: s.iconColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px',
                            boxShadow: `0 4px 12px ${(s as any).glowColor || 'transparent'}`,
                        }}>
                            {s.icon}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                        <p style={{
                            margin: '6px 0 0', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em',
                            color: (s as any).highlight ? '#ffc048' : 'var(--text-primary)',
                        }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ═══ Status Breakdown Bar ═══ */}
            {totalTickets > 0 && (
                <div className="modern-card" style={{ padding: '18px 22px', marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ticket Status Distribution</p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-subtle)', background: 'var(--bg-overlay)', padding: '3px 10px', borderRadius: 'var(--radius-pill)' }}>
                            {totalTickets > 0 ? `${Math.round((doneTickets / totalTickets) * 100)}% complete` : ''}
                        </p>
                    </div>
                    <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', gap: '2px', background: 'var(--bg-overlay)' }}>
                        {statusBreakdown.filter(s => s.count > 0).map(s => (
                            <div key={s.label} title={`${s.label}: ${s.count}`} style={{
                                flex: s.count, background: s.color, borderRadius: '2px', transition: 'flex 0.4s ease',
                            }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {statusBreakdown.filter(s => s.count > 0).map(s => (
                            <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '3px', background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}40` }} />
                                {s.label} <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ Two-Column: Chart + My Tickets ═══ */}
            <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px', marginBottom: '28px' }}>

                {/* Chart */}
                <div className="modern-card">
                    <div style={{ padding: '20px 22px 0' }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(108, 92, 231, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TrendingUp size={15} color="var(--accent)" />
                            </div>
                            Activity (Past 7 Days)
                        </h3>
                    </div>
                    <div style={{ height: '240px', padding: '12px 16px 16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gTkt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gFix" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00d68f" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#00d68f" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="name" stroke="var(--text-subtle)" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                                <YAxis stroke="var(--text-subtle)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip 
                                    cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '10px', fontSize: '0.78rem', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }} 
                                />
                                <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#ff6b6b" strokeWidth={2} fillOpacity={1} fill="url(#gInc)" />
                                <Area type="monotone" dataKey="tickets" name="Tickets" stroke="#6c5ce7" strokeWidth={2} fillOpacity={1} fill="url(#gTkt)" />
                                <Area type="monotone" dataKey="fixed" name="Fixed" stroke="#00d68f" strokeWidth={2} fillOpacity={1} fill="url(#gFix)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* My Tickets */}
                <div className="modern-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(108, 92, 231, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Target size={15} color="var(--accent)" />
                            </div>
                            My Tickets
                        </h3>
                        <button onClick={() => navigate('/issues')} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                            View All <ArrowRight size={12} />
                        </button>
                    </div>
                    <div style={{ flex: 1, padding: '0 14px 14px', overflow: 'auto' }}>
                        {myTickets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-subtle)' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                    <CheckCheck size={24} style={{ opacity: 0.4 }} />
                                </div>
                                <p style={{ margin: 0, fontSize: '0.82rem' }}>No assigned tickets — you're all clear!</p>
                            </div>
                        ) : (
                            myTickets.map(t => (
                                <div key={t.id} onClick={() => navigate('/issues')} style={{
                                    padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                                        background: priorityColor[t.priority] || '#71717a',
                                        boxShadow: `0 0 6px ${priorityColor[t.priority] || '#71717a'}60`,
                                    }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p className="text-truncate" style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600 }}>{t.title}</p>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                                            {t.status?.replace('_', ' ')} · {priorityIcon[t.priority] || ''} {t.priority}
                                        </p>
                                    </div>
                                    <ArrowUpRight size={13} color="var(--text-subtle)" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ Two-Column: Active Sprints + Quick Metrics ═══ */}
            <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

                {/* Active Sprints */}
                <div className="modern-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={15} color="var(--warning)" /> Active Sprints
                    </h3>
                    {activeSprints.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-subtle)' }}>No active sprints right now.</p>
                    ) : (
                        activeSprints.map(sp => {
                            const sprintIssues = allIssues.filter(i => i.sprintId === sp.id);
                            const sprintDone = sprintIssues.filter(i => i.status === 'DONE').length;
                            const pct = sprintIssues.length > 0 ? Math.round((sprintDone / sprintIssues.length) * 100) : 0;
                            return (
                                <div key={sp.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sp.name}</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>{sprintDone}/{sprintIssues.length} done</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--bg-overlay)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--success)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                                        {sp.endDate ? `Ends ${new Date(sp.endDate).toLocaleDateString()}` : ''} · {pct}% complete
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Quick Stats */}
                <div className="modern-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={15} color="var(--accent)" /> Quick Stats
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { label: 'Projects Enrolled', value: projects.length, icon: <FolderKanban size={14} /> },
                            { label: 'Avg Resolution Time', value: getAvgResolution(), icon: <Clock size={14} /> },
                            { label: 'Resolved Incidents', value: resolvedCount, icon: <CheckCircle size={14} /> },
                            { label: 'Open Tickets', value: openTickets, icon: <CircleDot size={14} /> },
                            { label: 'My Open Tickets', value: myTickets.length, icon: <CircleDot size={14} /> },
                        ].map((q, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    {q.icon} {q.label}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{q.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ AI Engineering Analysis ═══ */}
            <div className="modern-card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageCircle size={15} color="var(--accent)" /> AI Engineering Analysis
                    </h3>
                    <button
                        onClick={() => fetchAiPanel(true)}
                        className="btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                        disabled={aiPanelLoading}
                    >
                        {aiPanelLoading ? 'Refreshing...' : 'Refresh Analysis'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        background: aiHealth?.ready ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: aiHealth?.ready ? '#22c55e' : '#ef4444',
                    }}>
                        AI {aiHealth?.status || 'UNKNOWN'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        Provider: <strong style={{ color: 'var(--text-main)' }}>{aiHealth?.provider || 'n/a'}</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        Model: <strong style={{ color: 'var(--text-main)' }}>{aiHealth?.model || 'n/a'}</strong>
                    </span>
                </div>

                {Array.isArray(aiHealth?.issues) && aiHealth.issues.length > 0 && (
                    <div style={{ marginBottom: '10px', fontSize: '0.78rem', color: '#f59e0b' }}>
                        {aiHealth.issues.join(' ')}
                    </div>
                )}

                <div style={{
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                }}>
                    {aiPanelLoading ? 'Loading AI analysis...' : (aiInsights || 'No analysis yet. Click Refresh Analysis.')}
                </div>
            </div>

            {/* ═══ Golden Signals & DB Audit ═══ */}
            <div className="modern-card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Database size={15} color="var(--accent)" /> Platform Health
                    </h3>
                    <button
                        onClick={() => {
                            if (obsProjectId) {
                                fetchObservabilityPanel(obsProjectId);
                            }
                        }}
                        className="btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                        disabled={obsPanelLoading || !obsProjectId}
                    >
                        {obsPanelLoading ? 'Refreshing...' : 'Refresh Health'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        background: goldenSignals?.status === 'HEALTHY' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: goldenSignals?.status === 'HEALTHY' ? '#22c55e' : '#f59e0b',
                    }}>
                        Golden Signals {goldenSignals?.status || 'UNKNOWN'}
                    </span>
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        background: dbAudit?.status === 'HEALTHY' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: dbAudit?.status === 'HEALTHY' ? '#22c55e' : '#ef4444',
                    }}>
                        DB Audit {dbAudit?.status || 'UNKNOWN'}
                    </span>
                </div>

                <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                        background: 'var(--bg-overlay)',
                        border: `1px solid ${metricTone(Number(goldenSignals?.latency?.httpP95Ms ?? 0), Number(goldenSignals?.latency?.thresholdMs ?? 0)).fg}`,
                        borderRadius: '10px',
                        padding: '10px',
                    }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Latency p95</p>
                        <p style={{ margin: '4px 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>{goldenSignals?.latency?.httpP95Ms ?? '—'} ms</p>
                        <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: metricTone(Number(goldenSignals?.latency?.httpP95Ms ?? 0), Number(goldenSignals?.latency?.thresholdMs ?? 0)).bg,
                            color: metricTone(Number(goldenSignals?.latency?.httpP95Ms ?? 0), Number(goldenSignals?.latency?.thresholdMs ?? 0)).fg,
                        }}>
                            {metricTone(Number(goldenSignals?.latency?.httpP95Ms ?? 0), Number(goldenSignals?.latency?.thresholdMs ?? 0)).label}
                        </span>
                    </div>
                    <div style={{
                        background: 'var(--bg-overlay)',
                        border: `1px solid ${trafficTone(Number(goldenSignals?.traffic?.requestsPerMinute ?? 0)).fg}`,
                        borderRadius: '10px',
                        padding: '10px',
                    }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Traffic</p>
                        <p style={{ margin: '4px 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>{goldenSignals?.traffic?.requestsPerMinute ?? '—'} rpm</p>
                        <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: trafficTone(Number(goldenSignals?.traffic?.requestsPerMinute ?? 0)).bg,
                            color: trafficTone(Number(goldenSignals?.traffic?.requestsPerMinute ?? 0)).fg,
                        }}>
                            {trafficTone(Number(goldenSignals?.traffic?.requestsPerMinute ?? 0)).label}
                        </span>
                    </div>
                    <div style={{
                        background: 'var(--bg-overlay)',
                        border: `1px solid ${metricTone(Number(goldenSignals?.errors?.errorRatePercent ?? 0), Number(goldenSignals?.errors?.thresholdPercent ?? 0)).fg}`,
                        borderRadius: '10px',
                        padding: '10px',
                    }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Error Rate</p>
                        <p style={{ margin: '4px 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>{goldenSignals?.errors?.errorRatePercent ?? '—'}%</p>
                        <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: metricTone(Number(goldenSignals?.errors?.errorRatePercent ?? 0), Number(goldenSignals?.errors?.thresholdPercent ?? 0)).bg,
                            color: metricTone(Number(goldenSignals?.errors?.errorRatePercent ?? 0), Number(goldenSignals?.errors?.thresholdPercent ?? 0)).fg,
                        }}>
                            {metricTone(Number(goldenSignals?.errors?.errorRatePercent ?? 0), Number(goldenSignals?.errors?.thresholdPercent ?? 0)).label}
                        </span>
                    </div>
                    <div style={{
                        background: 'var(--bg-overlay)',
                        border: `1px solid ${metricTone(Number(goldenSignals?.saturation?.dbConnectionUtilizationPercent ?? 0), Number(goldenSignals?.saturation?.dbConnectionThresholdPercent ?? 0)).fg}`,
                        borderRadius: '10px',
                        padding: '10px',
                    }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-subtle)' }}>DB Conn Usage</p>
                        <p style={{ margin: '4px 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>{goldenSignals?.saturation?.dbConnectionUtilizationPercent ?? '—'}%</p>
                        <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: metricTone(Number(goldenSignals?.saturation?.dbConnectionUtilizationPercent ?? 0), Number(goldenSignals?.saturation?.dbConnectionThresholdPercent ?? 0)).bg,
                            color: metricTone(Number(goldenSignals?.saturation?.dbConnectionUtilizationPercent ?? 0), Number(goldenSignals?.saturation?.dbConnectionThresholdPercent ?? 0)).fg,
                        }}>
                            {metricTone(Number(goldenSignals?.saturation?.dbConnectionUtilizationPercent ?? 0), Number(goldenSignals?.saturation?.dbConnectionThresholdPercent ?? 0)).label}
                        </span>
                    </div>
                </div>

                <div style={{
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} color="#f59e0b" /> DB Audit Actions
                    </p>
                    {Array.isArray(dbAudit?.actions) && dbAudit.actions.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '16px' }}>
                            {dbAudit.actions.slice(0, 4).map((action: string, idx: number) => (
                                <li key={idx} style={{ marginBottom: '4px' }}>{action}</li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ margin: 0 }}>No immediate DB audit actions. System is within configured thresholds.</p>
                    )}
                </div>
            </div>

            {/* ═══ Recent Projects ═══ */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Recent Projects</h2>
                    <button onClick={() => navigate('/projects')} className="btn-ghost" style={{ fontSize: '0.82rem' }}>
                        View All <ArrowRight size={14} />
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                    {projects.slice(0, 6).map(p => {
                        const pIssues = allIssues.filter(i => i.projectId === p.id);
                        const pDone = pIssues.filter(i => i.status === 'DONE').length;
                        const pPct = pIssues.length > 0 ? Math.round((pDone / pIssues.length) * 100) : 0;
                        const pIncidents = incidents.filter(i => i.projectId === p.id).length;
                        return (
                            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="modern-card" style={{ padding: '18px', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        background: `hsl(${(p.id * 67) % 360}, 40%, 20%)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <FolderKanban size={18} color={`hsl(${(p.id * 67) % 360}, 60%, 65%)`} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <h4 className="text-truncate" style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>{p.name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                                            {pIssues.length} tickets · {pIncidents} incidents
                                        </p>
                                    </div>
                                </div>
                                {pIssues.length > 0 && (
                                    <>
                                        <div style={{ height: '4px', background: 'var(--bg-overlay)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pPct}%`, background: 'var(--success)', borderRadius: '2px' }} />
                                        </div>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.68rem', color: 'var(--text-subtle)', textAlign: 'right' }}>{pPct}% complete</p>
                                    </>
                                )}
                            </div>
                        );
                    })}
                    {projects.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-subtle)' }}>
                            <Zap size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ margin: 0 }}>No projects yet. {isAdmin ? 'Create your first one.' : 'Wait for an invite.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
