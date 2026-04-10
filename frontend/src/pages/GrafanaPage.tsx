import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Cell, ReferenceLine
} from 'recharts';
import {
    Activity, Database, Network, Server, Terminal, Globe,
    Radio, AlertTriangle, Shield, ChevronDown, ChevronUp,
    Inbox, Clock, Wifi, WifiOff, ArrowUp, ArrowDown, TrendingUp, Trash2
} from 'lucide-react';
import { useTelemetryStore } from '../store/useTelemetryStore';
import api from '../api/axios';

// ═══════════════════════════════════════════
// DESIGN TOKENS — single source of truth
// ═══════════════════════════════════════════
const T = {
    // surfaces
    bg: '#0b0c0e',
    panelBg: '#131518',
    panelBgHover: '#181b1f',
    border: '#1e2228',
    borderLight: '#282d35',
    // text
    text: '#d8dade',
    textSecondary: '#9198a1',
    textTertiary: '#565c65',
    // semantic
    green: '#3fb950',
    greenDim: '#23862e',
    yellow: '#d29922',
    yellowDim: '#845c16',
    red: '#f85149',
    redDim: '#a1201b',
    // chart lines
    cyan: '#58a6ff',
    purple: '#bc8cff',
    orange: '#f0883e',
    // misc
    blue: '#388bfd',
};

const latencyColor = (ms: number) => ms > 100 ? T.red : ms > 50 ? T.yellow : T.green;
const errorRateColor = (rate: number) => rate > 5 ? T.red : rate > 1 ? T.yellow : T.green;

const resolveWindowStart = (range: string, now: number) => {
    if (range === 'Last 5m') return now - 5 * 60 * 1000;
    if (range === 'Last 15m') return now - 15 * 60 * 1000;
    if (range === 'Last 1h') return now - 60 * 60 * 1000;
    if (range === 'Last 24h') return now - 24 * 60 * 60 * 1000;
    return 0;
};

const resolveWindowLabel = (range: string) => {
    if (range === 'Last 5m') return '5m';
    if (range === 'Last 15m') return '15m';
    if (range === 'Last 1h') return '1h';
    if (range === 'Last 24h') return '24h';
    return range;
};

interface ServiceState {
    name: string; status: 'UP' | 'DOWN' | 'DEGRADED' | 'CHECKING';
    latency: number; lastCheck: string; endpoint: string; sparkline: number[];
}

// ═══════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════
const PREFIX = 'cymops_obs_';
const store = {
    get: <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set: (k: string, v: unknown) => { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch { } },
};

// ═══════════════════════════════════════════
// MICRO-COMPONENTS
// ═══════════════════════════════════════════

const Panel: React.FC<{ children: React.ReactNode; span: number; style?: React.CSSProperties }> = ({ children, span, style }) => (
    <div style={{
        gridColumn: `span ${span}`, background: T.panelBg,
        border: `1px solid ${T.border}`, borderRadius: '6px',
        padding: '12px 14px', display: 'flex', flexDirection: 'column',
        ...style
    }}>{children}</div>
);

const PanelTitle: React.FC<{ title: string; icon: React.ReactNode; right?: React.ReactNode }> = ({ title, icon, right }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {icon} {title}
        </div>
        {right}
    </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const c = status === 'UP' ? T.green : status === 'DEGRADED' ? T.yellow : status === 'CHECKING' ? T.textTertiary : T.red;
    return (
        <span style={{
            fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '3px',
            color: c, background: `${c}18`, border: `1px solid ${c}30`,
            textTransform: 'uppercase', letterSpacing: '0.3px'
        }}>{status}</span>
    );
};

const Dropdown: React.FC<{ label: string; options: string[]; value: string; onChange: (v: string) => void }> = ({ label, options, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: `${T.border}80`, padding: '3px 8px', borderRadius: '4px', border: `1px solid ${T.border}` }}>
        <span style={{ fontSize: '0.65rem', color: T.textTertiary }}>{label}</span>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select value={value} onChange={e => onChange(e.target.value)}
                style={{ background: 'transparent', color: T.text, border: 'none', outline: 'none', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', appearance: 'none', paddingRight: '14px' }}>
                {options.map(o => <option key={o} value={o} style={{ background: T.panelBg }}>{o}</option>)}
            </select>
            <ChevronDown size={10} color={T.textTertiary} style={{ position: 'absolute', right: 0, pointerEvents: 'none' }} />
        </div>
    </div>
);

const MiniSparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 28 }) => {
    const points = useMemo(() => (data || []).map((v, i) => ({ i, v })), [data]);
    if (points.length < 2) return <div style={{ height, opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: T.textTertiary }}>...</div>;
    return (
        <div style={{ height, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs><linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient></defs>
                    <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color.replace('#', '')})`} dot={false} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const EmptyState: React.FC<{ msg?: string }> = ({ msg = 'Awaiting data…' }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.textTertiary, gap: '6px', minHeight: '60px' }}>
        <Inbox size={18} strokeWidth={1.5} /><span style={{ fontSize: '0.68rem' }}>{msg}</span>
    </div>
);

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
const GrafanaPage: React.FC = () => {
    // ── Filters ──
    const [timeRange, setTimeRange] = useState('Last 5m');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [envFilter, setEnvFilter] = useState('Production');
    const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => store.get<number | null>('projectId', null));

    // ── Telemetry Store (WebSocket Driven) ──
    const { history: globalHistory, endpoints: endpointStats, logs, wsConnected, connectWs, clearData } = useTelemetryStore();

    // Load projects and ensure a valid selected project
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const res = await api.get('/projects');
                const loaded = Array.isArray(res.data) ? res.data : [];
                setProjects(loaded);

                if (loaded.length === 0) {
                    setSelectedProjectId(null);
                    return;
                }

                const found = loaded.find((p: { id: number }) => p.id === selectedProjectId);
                if (!found) {
                    setSelectedProjectId(loaded[0].id);
                }
            } catch {
                setProjects([]);
            }
        };
        loadProjects();
    }, []);

    useEffect(() => {
        store.set('projectId', selectedProjectId);
    }, [selectedProjectId]);

    // Connect WebSocket when project context exists
    useEffect(() => {
        if (!selectedProjectId) {
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        connectWs(selectedProjectId, token);
    }, [connectWs, selectedProjectId]);

    // ── Time Range Filtering ──
    const latencyHistory = useMemo(() => {
        if (!globalHistory || globalHistory.length === 0) return [];
        const now = Date.now();
        const limit = resolveWindowStart(timeRange, now);

        return globalHistory.filter(h => h.timestamp >= limit);
    }, [globalHistory, timeRange]);

    const endpointWindowStats = useMemo(() => {
        if (!globalHistory || globalHistory.length === 0) {
            return endpointStats;
        }

        const now = Date.now();
        const windowStart = resolveWindowStart(timeRange, now);
        const pointsInWindow = globalHistory.filter(point => point.timestamp >= windowStart);
        if (pointsInWindow.length === 0) {
            return [];
        }

        const baseline = [...globalHistory].reverse().find(point => point.timestamp < windowStart);
        const previousByEndpoint = new Map<string, { calls: number; errors: number }>();
        if (Array.isArray(baseline?.endpoints)) {
            baseline.endpoints.forEach((ep) => {
                previousByEndpoint.set(ep.endpoint, { calls: ep.calls, errors: ep.errors });
            });
        }

        const aggregate = new Map<string, { calls: number; errors: number; latencyWeightedSum: number; p95: number }>();

        pointsInWindow.forEach((point) => {
            if (!Array.isArray(point.endpoints)) {
                return;
            }

            point.endpoints.forEach((ep) => {
                const prev = previousByEndpoint.get(ep.endpoint) || { calls: 0, errors: 0 };
                let deltaCalls = ep.calls - prev.calls;
                let deltaErrors = ep.errors - prev.errors;

                if (deltaCalls < 0) {
                    deltaCalls = ep.calls;
                }
                if (deltaErrors < 0) {
                    deltaErrors = ep.errors;
                }

                if (deltaCalls > 0 || deltaErrors > 0) {
                    const curr = aggregate.get(ep.endpoint) || { calls: 0, errors: 0, latencyWeightedSum: 0, p95: 0 };
                    curr.calls += Math.max(0, deltaCalls);
                    curr.errors += Math.max(0, deltaErrors);
                    curr.latencyWeightedSum += ep.avgLatency * Math.max(0, deltaCalls);
                    curr.p95 = Math.max(curr.p95, ep.p95);
                    aggregate.set(ep.endpoint, curr);
                }

                previousByEndpoint.set(ep.endpoint, { calls: ep.calls, errors: ep.errors });
            });
        });

        const rows = Array.from(aggregate.entries()).map(([endpoint, value]) => ({
            endpoint,
            avgLatency: value.calls > 0 ? Math.round((value.latencyWeightedSum / value.calls) * 100) / 100 : 0,
            p95: Math.round(value.p95 * 100) / 100,
            calls: value.calls,
            errors: value.errors,
        }));

        if (rows.length === 0) {
            return endpointStats;
        }

        return rows
            .sort((a, b) => b.calls - a.calls)
            .slice(0, 15);
    }, [globalHistory, endpointStats, timeRange]);

    // ── Timers ──
    const [uptimeStart] = useState(() => { const s = store.get<number | null>('uptime', null); if (s) return s; const n = Date.now(); store.set('uptime', n); return n; });
    const [uptime, setUptime] = useState('0s');

    // Auto-refresh is removed as it is now pushed by WebSocket!
    useEffect(() => store.set('checks', latencyHistory.length), [latencyHistory]);

    // ── Build Services from Latest Point ──
    const latest = globalHistory.length > 0 ? globalHistory[globalHistory.length - 1] : null;
    const services: ServiceState[] = useMemo(() => [
        { name: 'Backend API', status: latest?.ok ? (latest.backendLat! > 100 ? 'DEGRADED' : 'UP') : 'DOWN', latency: latest?.backendLat || 0, lastCheck: latest?.time || '—', endpoint: '/projects', sparkline: latencyHistory.map(h => h.backendLat) },
        { name: 'PostgreSQL DB', status: latest?.ok ? (latest.dbLat! > 100 ? 'DEGRADED' : 'UP') : 'DOWN', latency: latest?.dbLat || 0, lastCheck: latest?.time || '—', endpoint: '/api/metrics', sparkline: latencyHistory.map(h => h.dbLat) },
        { name: 'WebSocket', status: wsConnected ? 'UP' : 'DOWN', latency: latest?.wsLat || 0, lastCheck: latest?.time || '—', endpoint: 'ws', sparkline: latencyHistory.map(h => h.wsLat) },
        { name: 'Auth Service', status: latest?.ok ? (latest.authLat! > 100 ? 'DEGRADED' : 'UP') : 'DOWN', latency: latest?.authLat || 0, lastCheck: latest?.time || '—', endpoint: '/invites/me', sparkline: latencyHistory.map(h => h.authLat) },
    ], [latencyHistory, latest, wsConnected]);


    // ── Timers ──
    useEffect(() => {
        const t = setInterval(() => {
            const d = Date.now() - uptimeStart;
            const h = Math.floor(d / 3600000);
            const m = Math.floor((d % 3600000) / 60000);
            const s = Math.floor((d % 60000) / 1000);
            setUptime(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
        }, 1000);
        return () => clearInterval(t);
    }, [uptimeStart]);

    const [prevErrorRate, setPrevErrorRate] = useState<number>(() => store.get('prevErrRate', 0));
    const endpointWindowLabel = useMemo(() => resolveWindowLabel(timeRange), [timeRange]);


    // ── Derived metrics ──
    const totalCalls = endpointWindowStats.reduce((a, c) => a + c.calls, 0);
    const totalErrors = endpointWindowStats.reduce((a, c) => a + c.errors, 0);
    const currentErrorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;
    const errorRateDelta = currentErrorRate - prevErrorRate;

    // Save previous error rate for trend comparison
    useEffect(() => {
        const timer = setTimeout(() => { setPrevErrorRate(currentErrorRate); store.set('prevErrRate', currentErrorRate); }, 30000);
        return () => clearTimeout(timer);
    }, [currentErrorRate]);

    // Latency distribution histogram (real data from epTracker)
    const latencyBuckets = useMemo(() => {
        const bounds = [20, 50, 100];
        const buckets = [
            { range: '0–20ms', count: 0, color: T.green },
            { range: '20–50ms', count: 0, color: `${T.green}cc` },
            { range: '50–100ms', count: 0, color: T.yellow },
            { range: '100ms+', count: 0, color: T.red },
        ];
        latencyHistory.forEach(d => {
            [d.backendLat, d.dbLat, d.authLat].filter(Boolean).forEach(lat => {
                if (lat! < bounds[0]) buckets[0].count++;
                else if (lat! < bounds[1]) buckets[1].count++;
                else if (lat! < bounds[2]) buckets[2].count++;
                else buckets[3].count++;
            });
        });
        return buckets;
    }, [latencyHistory]);

    // Services filtered by dropdown
    const filteredServices = services.filter(s => {
        if (serviceFilter === 'All') return true;
        return s.name.toLowerCase().includes(serviceFilter.toLowerCase());
    });

    const serviceIcons: Record<string, React.ReactNode> = {
        'Backend API': <Server size={14} />, 'PostgreSQL DB': <Database size={14} />,
        'WebSocket': <Radio size={14} />, 'Auth Service': <Shield size={14} />,
    };

    const someDown = services.some(s => s.status === 'DOWN');

    // Sort state for endpoint table
    const [sortCol, setSortCol] = useState<string>('endpoint');
    const [sortAsc, setSortAsc] = useState(true);
    const sortedEndpoints = useMemo(() => {
        const sorted = [...endpointWindowStats];
        sorted.sort((a, b) => {
            const av = (a as any)[sortCol]; const bv = (b as any)[sortCol];
            if (typeof av === 'number') return sortAsc ? av - bv : bv - av;
            return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });
        return sorted;
    }, [endpointWindowStats, sortCol, sortAsc]);

    const toggleSort = (col: string) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } };

    // Log scroll ref
    const logRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (logRef.current) logRef.current.scrollTop = 0; }, [logs]);

    const activeAlerts = useMemo(() => {
        const alerts = [];
        if (currentErrorRate > 5) alerts.push({ type: 'CRITICAL', msg: `Error rate critically high (${currentErrorRate.toFixed(2)}%)`, color: T.red });
        else if (currentErrorRate > 1) alerts.push({ type: 'WARN', msg: `Error rate rising (${currentErrorRate.toFixed(2)}%)`, color: T.yellow });

        if (latest?.backendLat && latest.backendLat > 100) alerts.push({ type: 'CRITICAL', msg: `Backend API latency spike (${latest.backendLat}ms)`, color: T.red });
        else if (latest?.backendLat && latest.backendLat > 50) alerts.push({ type: 'WARN', msg: `Backend API degraded (${latest.backendLat}ms)`, color: T.yellow });

        if (latest?.dbLat && latest.dbLat > 100) alerts.push({ type: 'CRITICAL', msg: `Database slow response (${latest.dbLat}ms)`, color: T.red });

        if (someDown) alerts.push({ type: 'CRITICAL', msg: 'Core service unreachable', color: T.red });

        return alerts;
    }, [currentErrorRate, latest, someDown]);

    const globalState = currentErrorRate > 5 || someDown ? 'INCIDENT' :
        (currentErrorRate > 1 || (latest?.backendLat && latest.backendLat > 100)) ? 'DEGRADED' : 'HEALTHY';

    // ══════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════
    return (
        <div style={{ background: T.bg, minHeight: '100%', padding: '10px 12px', fontFamily: "'Inter', -apple-system, sans-serif", color: T.text, overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* ═══ STICKY TOP BAR ═══ */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: T.panelBg, border: `1px solid ${T.border}`, padding: '6px 12px', borderRadius: '6px',
                backdropFilter: 'blur(8px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={15} color={someDown ? T.red : T.green} />
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', letterSpacing: '-0.2px' }}>Observability</span>

                    {/* GLOBAL STATUS BADGE */}
                    <div style={{
                        padding: '4px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, marginLeft: '8px',
                        background: globalState === 'INCIDENT' ? `${T.red}20` : globalState === 'DEGRADED' ? `${T.yellow}20` : `${T.green}20`,
                        color: globalState === 'INCIDENT' ? T.red : globalState === 'DEGRADED' ? T.yellow : T.green,
                        border: `1px solid ${globalState === 'INCIDENT' ? T.red : globalState === 'DEGRADED' ? T.yellow : T.green}40`,
                        animation: globalState === 'INCIDENT' ? 'pulseRed 2s infinite' : 'none',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        {globalState === 'INCIDENT' && <AlertTriangle size={12} />}
                        {globalState === 'DEGRADED' && <AlertTriangle size={12} />}
                        {globalState === 'HEALTHY' && <Shield size={12} />}
                        SYSTEM {globalState}
                    </div>

                    <div style={{ width: '1px', height: '14px', background: T.border, margin: '0 6px' }} />
                    <Dropdown label="Range" options={['Last 5m', 'Last 15m', 'Last 1h', 'Last 24h']} value={timeRange} onChange={setTimeRange} />
                    <Dropdown label="Service" options={['All', 'Backend', 'DB', 'Auth', 'WebSocket']} value={serviceFilter} onChange={setServiceFilter} />
                    <Dropdown label="Env" options={['Production', 'Staging', 'Dev']} value={envFilter} onChange={setEnvFilter} />
                    <Dropdown
                        label="Project"
                        options={projects.map(p => `${p.id}:${p.name}`)}
                        value={projects.find(p => p.id === selectedProjectId) ? `${selectedProjectId}:${projects.find(p => p.id === selectedProjectId)?.name}` : 'No projects'}
                        onChange={(value) => {
                            const nextId = Number(value.split(':')[0]);
                            if (!Number.isNaN(nextId)) {
                                setSelectedProjectId(nextId);
                            }
                        }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: T.textTertiary }}>
                        <Clock size={11} /> <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: T.textSecondary }}>{uptime}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: wsConnected ? T.green : T.red }}>
                        {wsConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                        <span style={{ fontFamily: 'monospace' }}>{wsConnected ? 'WS' : 'WS ✗'}</span>
                    </div>
                    {currentErrorRate > 5 && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: `${T.red}20`, color: T.red, border: `1px solid ${T.red}40`, animation: 'blink 1.5s infinite' }}>
                            ⚠ HIGH ERRORS
                        </span>
                    )}
                    <a href="https://github.com/anketkumar/CyMOPS" target="_blank" rel="noopener noreferrer" style={{
                        background: 'transparent', border: `1px solid ${T.border}`, color: T.textTertiary, textDecoration: 'none',
                        padding: '3px 10px', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s',
                    }} onMouseOver={e => e.currentTarget.style.color = T.textSecondary} onMouseOut={e => e.currentTarget.style.color = T.textTertiary}>
                        <Globe size={11} /> Source
                    </a>
                    <button onClick={clearData} style={{
                        background: 'transparent', border: `1px solid ${T.border}`, color: T.textTertiary,
                        padding: '3px 10px', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s',
                    }} onMouseOver={e => e.currentTarget.style.borderColor = T.red} onMouseOut={e => e.currentTarget.style.borderColor = T.border}>
                        <Trash2 size={11} /> Clear
                    </button>
                </div>
            </div>

            {/* ═══ 12-COLUMN GRID ═══ */}
            <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px' }}>

                {/* ── SERVICE CARDS ── */}
                {filteredServices.map((svc) => {
                    const statusCol = svc.status === 'UP' ? T.green : svc.status === 'DEGRADED' ? T.yellow : svc.status === 'CHECKING' ? T.textTertiary : T.red;
                    const latCol = latencyColor(svc.latency);
                    const glowShadow = svc.status === 'DOWN' ? `inset 0 1px 0 ${T.red}30` : svc.status === 'DEGRADED' ? `inset 0 1px 0 ${T.yellow}25` : `inset 0 1px 0 ${T.green}15`;
                    return (
                        <div key={svc.name} style={{
                            gridColumn: 'span 3', background: T.panelBg, border: `1px solid ${T.border}`,
                            borderRadius: '6px', padding: '10px 12px', cursor: 'pointer',
                            borderTop: `2px solid ${statusCol}`, boxShadow: glowShadow,
                            transition: 'background 0.15s',
                        }} onMouseOver={e => e.currentTarget.style.background = T.panelBgHover} onMouseOut={e => e.currentTarget.style.background = T.panelBg}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                                    <span style={{ color: statusCol }}>{serviceIcons[svc.name]}</span> {svc.name}
                                </div>
                                <StatusBadge status={svc.status} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <MiniSparkline data={svc.sparkline || []} color={latCol} />
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: latCol, lineHeight: 1, fontFamily: 'monospace' }}>
                                        {svc.latency}<span style={{ fontSize: '0.55rem', color: T.textTertiary, fontWeight: 400 }}>ms</span>
                                    </div>
                                    <div style={{ fontSize: '0.58rem', color: T.textTertiary, marginTop: '2px' }}>{svc.lastCheck}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* ── MAIN LATENCY CHART ── */}
                <Panel span={8} style={{ height: '300px' }}>
                    <PanelTitle title="Service Latency" icon={<TrendingUp size={13} color={T.blue} />} right={
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.62rem', fontWeight: 600 }}>
                            {[{ k: 'backend', l: 'API', c: T.cyan }, { k: 'db', l: 'DB', c: T.purple }, { k: 'auth', l: 'Auth', c: T.orange }].map(s => (
                                <span key={s.k} style={{ color: s.c, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: 8, height: 3, borderRadius: 2, background: s.c, display: 'inline-block' }} />{s.l}
                                </span>
                            ))}
                        </div>
                    } />
                    {latencyHistory.length > 1 ? (
                        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={latencyHistory} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.cyan} stopOpacity={0.15} /><stop offset="95%" stopColor={T.cyan} stopOpacity={0} /></linearGradient>
                                        <linearGradient id="gPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.purple} stopOpacity={0.15} /><stop offset="95%" stopColor={T.purple} stopOpacity={0} /></linearGradient>
                                        <linearGradient id="gOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.orange} stopOpacity={0.15} /><stop offset="95%" stopColor={T.orange} stopOpacity={0} /></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.border} />
                                    <XAxis dataKey="time" stroke={T.textTertiary} fontSize={9} tickLine={false} axisLine={false} tickMargin={6}
                                        label={{ value: 'Time', position: 'insideBottomRight', fill: T.textTertiary, fontSize: 9, offset: -2 }} />
                                    <YAxis stroke={T.textTertiary} fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}`}
                                        label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: T.textTertiary, fontSize: 9, offset: 12 }} />
                                    <Tooltip
                                        content={(props) => {
                                            if (!props.active || !props.payload || !props.payload.length) return null;
                                            const pt = props.payload[0].payload;
                                            const isSpike = pt.backendLat > 100 || pt.dbLat > 100;
                                            return (
                                                <div style={{ background: '#1a1d22', border: `1px solid ${isSpike ? T.red : T.border}`, borderRadius: '5px', padding: '8px 10px', boxShadow: isSpike ? `0 0 10px ${T.red}40` : 'none' }}>
                                                    <div style={{ fontSize: '11px', color: isSpike ? T.red : T.textSecondary, marginBottom: '6px', fontWeight: isSpike ? 800 : 500 }}>
                                                        {isSpike ? `⚠️ Latency Spike: ${pt.backendLat}ms` : pt.time}
                                                    </div>
                                                    {props.payload.map((p: any) => (
                                                        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', color: p.color, fontSize: '11px', fontFamily: 'monospace', fontWeight: 600 }}>
                                                            <span>{p.name}:</span>
                                                            <span>{p.value}ms</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }}
                                    />
                                    <ReferenceLine y={100} stroke={T.red} strokeDasharray="4 4" strokeOpacity={0.5}
                                        label={{ position: 'insideTopRight', value: 'Critical (100ms)', fill: T.red, fontSize: 8 }} />
                                    <ReferenceLine y={50} stroke={T.yellow} strokeDasharray="4 4" strokeOpacity={0.4}
                                        label={{ position: 'insideTopRight', value: 'Warning (50ms)', fill: T.yellow, fontSize: 8 }} />

                                    {/* Focus Zone and Spikes */}
                                    {latencyHistory.length > 5 && <ReferenceLine x={latencyHistory[latencyHistory.length - 5].time} stroke={T.textTertiary} strokeOpacity={0.2} />}
                                    {latencyHistory.filter(h => h.backendLat && h.backendLat > 100).map((h, i) => (
                                        <ReferenceLine key={`red_${h.time}_${i}`} x={h.time} stroke={T.red} strokeWidth={1.5} strokeDasharray="3 3" />
                                    ))}
                                    <Area type="monotone" dataKey="backendLat" name="API" stroke={T.cyan} strokeWidth={1.8} fill="url(#gCyan)" dot={false} isAnimationActive={false} />
                                    <Area type="monotone" dataKey="dbLat" name="DB" stroke={T.purple} strokeWidth={1.8} fill="url(#gPurple)" dot={false} isAnimationActive={false} />
                                    <Area type="monotone" dataKey="authLat" name="Auth" stroke={T.orange} strokeWidth={1.8} fill="url(#gOrange)" dot={false} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState msg="Collecting latency data…" />}
                </Panel>

                {/* ── ERROR RATE & ALERTS ── */}
                <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Panel span={12} style={{ gridColumn: 'unset' }}>
                        <PanelTitle title="Error Rate" icon={<AlertTriangle size={13} color={T.red} />} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: errorRateColor(currentErrorRate), lineHeight: 1, fontFamily: 'monospace' }}>
                                {currentErrorRate.toFixed(2)}<span style={{ fontSize: '1rem', color: T.textTertiary }}>%</span>
                            </div>
                            <div style={{ fontSize: '0.62rem', color: T.textTertiary }}>{totalErrors} err / {totalCalls} req</div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', marginTop: '2px',
                                color: errorRateDelta > 0 ? T.red : errorRateDelta < 0 ? T.green : T.textTertiary
                            }}>
                                {errorRateDelta > 0 ? <ArrowUp size={10} /> : errorRateDelta < 0 ? <ArrowDown size={10} /> : null}
                                {errorRateDelta !== 0 && <span>{Math.abs(errorRateDelta).toFixed(2)}%</span>}
                                {errorRateDelta === 0 && <span>stable</span>}
                            </div>
                        </div>
                    </Panel>

                    {/* ── ACTIVE ALERTS ── */}
                    <Panel span={12} style={{ gridColumn: 'unset', flex: 1, overflowY: 'auto' }}>
                        <PanelTitle title="Active Alerts" icon={<AlertTriangle size={13} color={T.red} />} right={
                            <span style={{ fontSize: '0.6rem', background: T.red, color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>{activeAlerts.length}</span>
                        } />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {activeAlerts.length === 0 ? <EmptyState msg="No active alerts" /> :
                                activeAlerts.map((a, i) => (
                                    <div key={i} style={{ background: `${a.color}15`, borderLeft: `2px solid ${a.color}`, padding: '6px 8px', borderRadius: '0 4px 4px 0' }}>
                                        <div style={{ color: a.color, fontWeight: 700, fontSize: '0.68rem' }}>{a.type}</div>
                                        <div style={{ color: T.textSecondary, fontSize: '0.65rem', marginTop: '2px' }}>{a.msg}</div>
                                    </div>
                                ))
                            }
                        </div>
                    </Panel>
                </div>

                {/* ── ENDPOINT TABLE ── */}
                <Panel span={5} style={{ minHeight: '240px' }}>
                    <PanelTitle title="Network Endpoints" icon={<Network size={13} color={T.cyan} />} right={
                        <span style={{ fontSize: '0.58rem', color: T.textTertiary }}>{endpointWindowStats.length} endpoints</span>
                    } />
                    <div style={{ fontSize: '0.6rem', color: T.textTertiary, marginBottom: '8px' }}>
                        Derived from cumulative counter deltas ({endpointWindowLabel} window)
                    </div>
                    {sortedEndpoints.length > 0 ? (
                        <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: '6px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: `${T.border}50` }}>
                                        {[
                                            { key: 'endpoint', label: 'Endpoint' },
                                            { key: 'window', label: 'Window' },
                                            { key: 'avgLatency', label: 'Avg (ms)' },
                                            { key: 'p95', label: 'p95' },
                                            { key: 'calls', label: 'Calls' },
                                            { key: 'errors', label: 'Errors' },
                                            { key: 'status', label: 'Status' },
                                        ].map(col => (
                                            <th key={col.key} onClick={() => toggleSort(col.key)}
                                                style={{ padding: '5px 4px', textAlign: 'left', color: T.textTertiary, fontWeight: 600, fontSize: '0.58rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                                                {col.label}
                                                {sortCol === col.key && (sortAsc ? <ChevronUp size={9} style={{ marginLeft: 2, verticalAlign: 'middle' }} /> : <ChevronDown size={9} style={{ marginLeft: 2, verticalAlign: 'middle' }} />)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedEndpoints.map((ep, i) => {
                                        const errorRate = ep.calls > 0 ? ep.errors / ep.calls : 0;
                                        const fail = (ep.calls >= 20 && errorRate >= 0.05) || (ep.calls < 20 && ep.errors >= 3);
                                        const warn = !fail && (ep.avgLatency > 100 || ep.p95 > 250 || ep.errors > 0);
                                        const status = fail ? 'FAIL' : warn ? 'WARN' : 'PASS';
                                        const hc = fail ? T.red : warn ? T.yellow : T.green;
                                        return (
                                            <tr key={i} style={{ borderBottom: `1px solid ${T.border}08`, background: i % 2 === 0 ? 'transparent' : `${T.border}22`, cursor: 'pointer', transition: 'background 0.1s' }}
                                                onMouseOver={e => e.currentTarget.style.background = T.panelBgHover}
                                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '7px 6px', fontFamily: 'monospace', fontSize: '0.68rem', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ep.endpoint}>
                                                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: hc, marginRight: 6 }} />{ep.endpoint}
                                                </td>
                                                <td style={{ padding: '7px 6px', color: T.textSecondary, fontFamily: 'monospace' }}>{endpointWindowLabel}</td>
                                                <td style={{ padding: '7px 6px', color: latencyColor(ep.avgLatency), fontWeight: 600, fontFamily: 'monospace' }}>{ep.avgLatency}</td>
                                                <td style={{ padding: '7px 6px', color: latencyColor(ep.p95), fontFamily: 'monospace' }}>{ep.p95}</td>
                                                <td style={{ padding: '7px 6px', color: T.textSecondary, fontFamily: 'monospace' }}>{ep.calls}</td>
                                                <td style={{ padding: '7px 6px', color: ep.errors > 0 ? T.red : T.textTertiary, fontWeight: ep.errors > 0 ? 700 : 400, fontFamily: 'monospace' }}>{ep.errors}</td>
                                                <td style={{ padding: '7px 6px' }}>
                                                    <span style={{ fontSize: '0.58rem', fontWeight: 700, minWidth: '40px', display: 'inline-block', textAlign: 'center', padding: '2px 6px', borderRadius: '3px', color: hc, background: `${hc}15`, border: `1px solid ${hc}25` }}>
                                                        {status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : <EmptyState msg="Awaiting endpoint data…" />}
                </Panel>

                {/* ── LATENCY DISTRIBUTION HISTOGRAM ── */}
                <Panel span={3} style={{ minHeight: '240px' }}>
                    <PanelTitle title="Latency Dist" icon={<Activity size={13} color={T.cyan} />} />
                    {latencyBuckets.some(b => b.count > 0) ? (
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={latencyBuckets} layout="vertical" margin={{ top: 2, right: 8, left: -20, bottom: 2 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.border} />
                                    <XAxis type="number" stroke={T.textTertiary} fontSize={9} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="range" stroke={T.textTertiary} fontSize={9} tickLine={false} axisLine={false} width={65} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                                        contentStyle={{ background: '#1a1d22', border: `1px solid ${T.border}`, borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                                        formatter={(val: number) => [`${val} requests`, 'Count']}
                                    />
                                    <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={12}>
                                        {latencyBuckets.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.85} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState msg="No latency data yet" />}
                </Panel>

                {/* ── SYSTEM LOGS ── */}
                <Panel span={4} style={{ minHeight: '240px', background: '#0c0e11' }}>
                    <PanelTitle title="System Logs" icon={<Terminal size={13} color={T.textTertiary} />} right={
                        <span style={{ fontSize: '0.58rem', color: T.textTertiary }}>{logs.length} entries</span>
                    } />
                    {logs.length > 0 ? (
                        <div ref={logRef} style={{ flex: 1, overflowY: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.65rem', lineHeight: 1.7 }}>
                            {logs.map((entry, i) => {
                                const isSpike = entry.msg.toLowerCase().includes('spike');
                                const lc = isSpike || entry.level === 'ERROR' ? T.red : entry.level === 'WARN' ? T.yellow : T.green;

                                if (isSpike) {
                                    return (
                                        <div key={i} style={{ padding: '8px', background: `${lc}15`, borderLeft: `2px solid ${lc}`, marginBottom: '6px', borderRadius: '0 4px 4px 0' }}>
                                            <div style={{ color: lc, fontSize: '0.7rem', fontWeight: 600 }}>⚠️ INCIDENT: {entry.msg}</div>
                                            <div style={{ color: T.textSecondary, fontSize: '0.65rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <TrendingUp size={11} color={T.red} /> Impact: Global latency degraded
                                            </div>
                                            <div style={{ color: T.textTertiary, fontSize: '0.65rem', marginTop: '4px' }}>→ Time: {entry.time}</div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={i} style={{
                                        display: 'flex', gap: '8px', padding: '2px 6px',
                                        borderLeft: `2px solid ${lc}`,
                                        background: i % 2 === 0 ? 'rgba(255,255,255,0.008)' : 'transparent',
                                    }}>
                                        <span style={{ color: T.textTertiary, width: '62px', flexShrink: 0 }}>{entry.time}</span>
                                        <span style={{ color: lc, width: '36px', fontWeight: 700, flexShrink: 0 }}>{entry.level}</span>
                                        <span style={{ color: T.textTertiary, width: '52px', flexShrink: 0 }}>[{entry.source}]</span>
                                        <span style={{ color: entry.level === 'ERROR' ? '#ffb3b8' : entry.level === 'WARN' ? '#ffe08a' : T.text }}>{entry.msg}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <EmptyState msg="No log entries" />}
                </Panel>

            </div>

            {/* ── STATUS BAR ── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 12px', fontSize: '0.6rem', color: T.textTertiary,
                borderTop: `1px solid ${T.border}`, marginTop: '2px',
            }}>
                <span>CyMOPS Observability · {envFilter} · Real-time push</span>
                <span>History: {globalHistory.length} · Endpoints: {endpointWindowStats.length} · Logs: {logs.length}</span>
            </div>

            <style>{`
                @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
                @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
                @keyframes blinkRed { 0%, 100% { opacity: 1; border-color: ${T.red}; } 50% { opacity: 0.5; border-color: transparent; } }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: ${T.textTertiary}; }
            `}</style>
        </div>
    );
};

export default GrafanaPage;
