import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Trash2, Pause, Play, RefreshCw, ExternalLink,
  ArrowUpCircle, ArrowDownCircle, Clock, Wifi, WifiOff,
  ChevronDown, X, Globe, Zap, AlertTriangle,
  ArrowLeft, Shield, Activity, TrendingUp, TrendingDown,
  CheckCircle2, FileText, BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// @ts-ignore
import SockJS from 'sockjs-client/dist/sockjs';
import { Client } from '@stomp/stompjs';

interface Monitor {
  id: number;
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
  intervalSeconds: number;
  timeoutMs: number;
  paused: boolean;
  project?: { id: number; name: string };
  createdAt: string;
}

interface Check {
  id: number;
  statusCode: number | null;
  responseTimeMs: number;
  isUp: boolean;
  errorMessage: string | null;
  checkedAt: string;
}

interface MonitorStats {
  currentStatus: string;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  avgResponseTime24h: number | null;
  avgResponseTime7d: number | null;
  minResponseTime24h: number | null;
  maxResponseTime24h: number | null;
  lastCheckedAt: string | null;
  lastResponseTime: number | null;
  lastStatusCode: number | null;
  totalChecks: number;
  incidents24h: number;
  incidents7d: number;
  incidents30d: number;
}

/* ═══════════════════════════════════════════════════════════
   UPTIMEPAGE — UptimeRobot-style Monitor Dashboard
   ═══════════════════════════════════════════════════════════ */
const UptimePage: React.FC = () => {
  const { token } = useAuth();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stats, setStats] = useState<{ [id: number]: MonitorStats }>({});
  const [checks, setChecks] = useState<{ [id: number]: Check[] }>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const stompRef = useRef<Client | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formMethod, setFormMethod] = useState('GET');
  const [formExpectedStatus, setFormExpectedStatus] = useState(200);
  const [formInterval, setFormInterval] = useState(60);
  const [formProject, setFormProject] = useState<number | ''>('');

  // Live clock to keep "time ago" labels fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Data fetching ──────────────────────────────
  const fetchMonitors = useCallback(async () => {
    try {
      const res = await api.get('/api/uptime/monitors');
      setMonitors(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch monitors', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects');
      const data = Array.isArray(res.data) ? res.data : [];
      setProjects(data);
      if (data.length > 0 && formProject === '') {
        setFormProject(data[0].id);
      }
    } catch (e) {}
  }, []);

  const fetchStatsForMonitor = useCallback(async (id: number) => {
    try {
      const res = await api.get(`/api/uptime/monitors/${id}/stats`);
      setStats(prev => ({ ...prev, [id]: res.data }));
    } catch (e) {}
  }, []);

  const fetchChecksForMonitor = useCallback(async (id: number) => {
    try {
      const res = await api.get(`/api/uptime/monitors/${id}/checks?hours=24`);
      setChecks(prev => ({ ...prev, [id]: Array.isArray(res.data) ? res.data : [] }));
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchMonitors();
    fetchProjects();
  }, [fetchMonitors, fetchProjects]);

  // Fetch stats for all monitors
  useEffect(() => {
    monitors.forEach(m => fetchStatsForMonitor(m.id));
  }, [monitors, fetchStatsForMonitor]);

  // Fetch checks when a monitor is selected
  useEffect(() => {
    if (selectedId !== null) {
      fetchChecksForMonitor(selectedId);
    }
  }, [selectedId, fetchChecksForMonitor]);

  // ─── Real-time WebSocket ──────────────────────────
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        // Subscribe to all uptime updates
        client.subscribe('/topic/uptime/summary', (msg) => {
          try {
            const data = JSON.parse(msg.body);
            const monitorId = data.monitorId;

            // Refresh stats for this monitor
            fetchStatsForMonitor(monitorId);

            // If we have checks loaded for this monitor, append the new check
            setChecks(prev => {
              if (prev[monitorId]) {
                const newCheck: Check = {
                  id: data.checkId || Date.now(),
                  statusCode: data.statusCode,
                  responseTimeMs: data.responseTimeMs,
                  isUp: data.isUp,
                  errorMessage: data.errorMessage || null,
                  checkedAt: data.checkedAt,
                };
                return { ...prev, [monitorId]: [...prev[monitorId], newCheck] };
              }
              return prev;
            });
          } catch (e) {}
        });
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [token, fetchStatsForMonitor]);

  // ─── Handlers ──────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim() || formProject === '') return;
    try {
      await api.post(`/api/uptime/monitors?projectId=${formProject}`, {
        name: formName.trim(),
        url: formUrl.trim(),
        method: formMethod,
        expectedStatus: formExpectedStatus,
        intervalSeconds: formInterval,
      });
      setFormName(''); setFormUrl(''); setFormMethod('GET'); setFormExpectedStatus(200); setFormInterval(60);
      setShowAddForm(false);
      fetchMonitors();
    } catch (e) { console.error('Failed to create monitor', e); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this monitor and all its check history?')) return;
    try {
      await api.delete(`/api/uptime/monitors/${id}`);
      toast.success('Monitor deleted');
      if (selectedId === id) setSelectedId(null);
      fetchMonitors();
    } catch (e) {
      toast.error('Failed to delete monitor');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const res = await api.patch(`/api/uptime/monitors/${id}/toggle`);
      const updated = res.data;
      toast.success(updated.paused ? 'Monitor paused' : 'Monitor resumed');
      // Update the monitor in-place so detail view stays open
      setMonitors(prev => prev.map(m => m.id === id ? { ...m, paused: updated.paused } : m));
      fetchStatsForMonitor(id);
    } catch (e) {
      toast.error('Failed to toggle monitor');
    }
  };

  const handleCheckNow = async (id: number) => {
    try {
      toast.loading('Checking...', { id: `check-${id}` });
      await api.post(`/api/uptime/monitors/${id}/check-now`);
      toast.success('Check complete!', { id: `check-${id}` });
      // Explicitly refresh stats and checks
      fetchStatsForMonitor(id);
      fetchChecksForMonitor(id);
    } catch (e) {
      toast.error('Check failed', { id: `check-${id}` });
    }
  };

  // ─── Helpers ──────────────────────────────
  const getStatusColor = (status?: string) => {
    if (!status || status === 'PENDING') return 'var(--text-tertiary)';
    return status === 'UP' ? '#22c55e' : '#ef4444';
  };

  const getUptimeColor = (pct: number) => {
    if (pct >= 99.5) return '#22c55e';
    if (pct >= 95) return '#eab308';
    return '#ef4444';
  };

  const formatMs = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimeAgo = (ts: string | null) => {
    if (!ts) return 'Never';
    const diff = now - new Date(ts).getTime();
    if (diff < 0) return 'just now';
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m, ${secs % 60}s ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  const formatDuration = (ts: string | null) => {
    if (!ts) return 'N/A';
    const diff = now - new Date(ts).getTime();
    if (diff < 0) return '0s';
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h ${mins % 60}m`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m ${secs % 60}s`;
    if (mins > 0) return `${mins}m, ${secs % 60}s`;
    return `${secs}s`;
  };

  const formatInterval = (s: number) => {
    if (s < 60) return `Every ${s}s`;
    if (s < 3600) return `Every ${s / 60}m`;
    return `Every ${s / 3600}h`;
  };

  // ─── Selected monitor data ──────────────────────
  const selectedMonitor = monitors.find(m => m.id === selectedId);
  const selectedStats = selectedId ? stats[selectedId] : undefined;
  const selectedChecks = selectedId ? (checks[selectedId] || []) : [];

  // Count UP/DOWN/PAUSED
  const upCount = monitors.filter(m => stats[m.id]?.currentStatus === 'UP').length;
  const downCount = monitors.filter(m => stats[m.id]?.currentStatus === 'DOWN').length;
  const pausedCount = monitors.filter(m => m.paused).length;

  // ═══════════════════════════════════════════════════════
  // DETAIL VIEW — single monitor like UptimeRobot
  // ═══════════════════════════════════════════════════════
  if (selectedMonitor && selectedStats) {
    const s = selectedStats;
    const monitorChecks = selectedChecks;
    const last90 = monitorChecks.slice(-90);

    // Compute chart scaling
    const maxRt = Math.max(...last90.map(c => c.responseTimeMs), 100);
    const chartH = 180;

    // Recent incidents (DOWN checks)
    const incidents = monitorChecks.filter(c => !c.isUp).slice().reverse().slice(0, 10);

    return (
      <div style={{ padding: '0', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Back Button & Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => setSelectedId(null)}
            className="btn-ghost"
            style={{ padding: '8px', borderRadius: '8px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Monitoring
          </span>
        </div>

        {/* Monitor Title Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: s.currentStatus === 'UP'
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : s.currentStatus === 'DOWN'
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'var(--bg-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: s.currentStatus === 'UP' ? '0 0 20px rgba(34,197,94,0.3)' : s.currentStatus === 'DOWN' ? '0 0 20px rgba(239,68,68,0.3)' : 'none',
          }}>
            {s.currentStatus === 'UP' ? <ArrowUpCircle size={22} color="#fff" /> : <ArrowDownCircle size={22} color="#fff" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>{selectedMonitor.name}</h1>
              <a href={selectedMonitor.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-tertiary)' }}>
                <ExternalLink size={14} />
              </a>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={12} /> {selectedMonitor.method} monitor for
              <a href={selectedMonitor.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-text)', textDecoration: 'none' }}>
                {selectedMonitor.url}
              </a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => handleCheckNow(selectedMonitor.id)} className="btn-pill-dark" style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '5px' }}>
              <Zap size={13} /> Check Now
            </button>
            <button onClick={() => handleToggle(selectedMonitor.id)} className="btn-pill-dark" style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '5px' }}>
              {selectedMonitor.paused ? <Play size={13} /> : <Pause size={13} />}
              {selectedMonitor.paused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={() => handleDelete(selectedMonitor.id)} className="btn-pill-dark" style={{ padding: '7px 14px', fontSize: '0.78rem', color: 'var(--danger)' }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* ─── Top Stats Row (UptimeRobot style) ─── */}
        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          {/* Current Status */}
          <div className="modern-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Current status</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: getStatusColor(s.currentStatus), marginBottom: '4px' }}>
              {s.currentStatus === 'UP' ? 'Up' : s.currentStatus === 'DOWN' ? 'Down' : 'Pending'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              {s.currentStatus === 'UP' ? `Currently up for ${formatDuration(selectedMonitor.createdAt)}` : 'Service is experiencing issues'}
            </div>
          </div>

          {/* Last Check */}
          <div className="modern-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Last check</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>
              {formatTimeAgo(s.lastCheckedAt)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Checked {formatInterval(selectedMonitor.intervalSeconds).toLowerCase()}
            </div>
          </div>

          {/* Last 24 Hours */}
          <div className="modern-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Last 24 hours</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: getUptimeColor(s.uptime24h) }}>
                {s.uptime24h?.toFixed(3)}%
              </span>
            </div>
            {/* Mini uptime bar */}
            <div style={{ display: 'flex', gap: '1px', height: '22px', alignItems: 'flex-end' }}>
              {(() => {
                const bars = monitorChecks.slice(-60);
                if (bars.length === 0) {
                  return Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: '22px', borderRadius: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  ));
                }
                return bars.map((c, i) => (
                  <div
                    key={i}
                    title={`${c.isUp ? 'UP' : 'DOWN'} — ${c.responseTimeMs}ms`}
                    style={{
                      flex: 1,
                      height: '22px',
                      borderRadius: '1px',
                      background: c.isUp ? '#22c55e' : '#ef4444',
                      opacity: 0.9,
                    }}
                  />
                ));
              })()}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              <span>{s.incidents24h} incident{s.incidents24h !== 1 ? 's' : ''}</span>
              <span>{s.totalChecks} checks</span>
            </div>
          </div>
        </div>

        {/* ─── Uptime Periods (7d, 30d) ─── */}
        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div className="modern-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Last 7 days</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: getUptimeColor(s.uptime7d) }}>{s.uptime7d?.toFixed(3)}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {s.incidents7d} incident{s.incidents7d !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="modern-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Last 30 days</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: getUptimeColor(s.uptime30d) }}>{s.uptime30d?.toFixed(3)}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {s.incidents30d} incident{s.incidents30d !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="modern-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total Checks</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{s.totalChecks}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Since {new Date(selectedMonitor.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* ─── Response Time Chart ─── */}
        <div className="modern-card" style={{ padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Response time.</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Last hour</span>
          </div>

          {/* Chart Area */}
          <div style={{ position: 'relative', height: `${chartH}px`, borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
            {/* Y-axis labels */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {[maxRt, Math.round(maxRt * 0.66), Math.round(maxRt * 0.33), 0].map((v, i) => (
                <span key={i} style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{v}ms</span>
              ))}
            </div>

            {/* Chart bars */}
            <div style={{ position: 'absolute', left: '55px', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
              {last90.length === 0 ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                  No checks recorded yet
                </div>
              ) : (
                last90.map((c, i) => {
                  const h = Math.max(2, (c.responseTimeMs / maxRt) * chartH);
                  return (
                    <div
                      key={i}
                      title={`${c.responseTimeMs}ms — ${new Date(c.checkedAt).toLocaleTimeString()}`}
                      style={{
                        flex: 1,
                        height: `${h}px`,
                        borderRadius: '2px 2px 0 0',
                        background: c.isUp
                          ? `linear-gradient(180deg, #22c55e, #16a34a)`
                          : `linear-gradient(180deg, #ef4444, #dc2626)`,
                        opacity: 0.85,
                        transition: 'height 0.3s ease',
                        cursor: 'pointer',
                        minWidth: '3px',
                      }}
                    />
                  );
                })
              )}
            </div>

            {/* Horizontal grid lines */}
            {[0.33, 0.66].map((pct, i) => (
              <div key={i} style={{
                position: 'absolute', left: '55px', right: 0,
                top: `${pct * 100}%`,
                borderTop: '1px dashed var(--border-subtle)',
              }} />
            ))}
          </div>

          {/* Time labels */}
          {last90.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '55px', fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
              <span>{new Date(last90[0].checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span>{new Date(last90[last90.length - 1].checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>

        {/* ─── Response Time Stats ─── */}
        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div className="modern-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{formatMs(s.avgResponseTime24h)}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Average</div>
            </div>
          </div>
          <div className="modern-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={18} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{formatMs(s.minResponseTime24h)}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Minimum</div>
            </div>
          </div>
          <div className="modern-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{formatMs(s.maxResponseTime24h)}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Maximum</div>
            </div>
          </div>
        </div>

        {/* ─── Latest Incidents ─── */}
        <div className="modern-card" style={{ padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Latest incidents.</span>
            </div>
            <button className="btn-pill-dark" style={{ padding: '5px 12px', fontSize: '0.72rem', gap: '4px' }}>
              <FileText size={12} /> Export logs
            </button>
          </div>

          <div style={{ borderRadius: '8px', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Root Cause</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Started</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      <CheckCircle2 size={20} style={{ opacity: 0.3, marginBottom: '6px' }} />
                      <div>That's all, folks!</div>
                    </td>
                  </tr>
                ) : (
                  incidents.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--success)' }}>Resolved</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: c.statusCode ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
                          color: c.statusCode ? 'var(--danger)' : 'var(--warning)',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                        }}>
                          {c.statusCode || 'Timeout'}
                        </span>
                        <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {c.errorMessage ? c.errorMessage.split(':')[0] : 'Connection Error'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {new Date(c.checkedAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                        {c.responseTimeMs}ms
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Recent Checks Table ─── */}
        <div className="modern-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Recent checks.</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
              Last {monitorChecks.length} checks
            </span>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Response</th>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Error</th>
                </tr>
              </thead>
              <tbody>
                {monitorChecks.slice().reverse().slice(0, 50).map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: c.isUp ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '0.78rem' }}>
                        {c.isUp ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
                        {c.isUp ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{c.statusCode ?? '—'}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>
                      <span style={{ color: c.responseTimeMs < 500 ? '#22c55e' : c.responseTimeMs < 2000 ? '#eab308' : '#ef4444' }}>
                        {formatMs(c.responseTimeMs)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                      {new Date(c.checkedAt).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--danger)', fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.errorMessage || '—'}
                    </td>
                  </tr>
                ))}
                {monitorChecks.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No checks recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // LIST VIEW — all monitors
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ padding: '0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wifi size={24} style={{ color: '#22c55e' }} />
            Uptime Monitors
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-tertiary)' }}>
            Monitor health endpoints & API availability in real-time
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-pill"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px', fontWeight: 700 }}
        >
          <Plus size={16} /> Add Monitor
        </button>
      </div>

      {/* Summary Cards */}
      {monitors.length > 0 && (
        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <div className="modern-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpCircle size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>{upCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>UP</div>
            </div>
          </div>
          <div className="modern-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownCircle size={20} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{downCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>DOWN</div>
            </div>
          </div>
          <div className="modern-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{monitors.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Monitors</div>
            </div>
          </div>
          <div className="modern-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pause size={20} style={{ color: '#eab308' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#eab308' }}>{pausedCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Paused</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Monitor Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.2s ease' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} /> Add New Monitor
              </h3>
              <button onClick={() => setShowAddForm(false)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="modal-body">
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Monitor Name</label>
                <input className="input-modern" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Production API" required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>URL</label>
                <input className="input-modern" value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://api.example.com/health" required />
              </div>
              <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Method</label>
                  <select className="input-modern" value={formMethod} onChange={e => setFormMethod(e.target.value)}>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="HEAD">HEAD</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Expected Status</label>
                  <input className="input-modern" type="number" value={formExpectedStatus} onChange={e => setFormExpectedStatus(+e.target.value)} />
                </div>
              </div>
              <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Check Interval</label>
                  <select className="input-modern" value={formInterval} onChange={e => setFormInterval(+e.target.value)}>
                    <option value={30}>Every 30s</option>
                    <option value={60}>Every 1 min</option>
                    <option value={300}>Every 5 min</option>
                    <option value={600}>Every 10 min</option>
                    <option value={1800}>Every 30 min</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Project</label>
                  <select className="input-modern" value={formProject} onChange={e => setFormProject(+e.target.value)} required>
                    <option value="" disabled>Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '0', borderTop: 'none', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-pill-dark" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" className="btn-pill" style={{ padding: '10px 20px' }}>Create Monitor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monitor List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
          <RefreshCw size={28} className="spin" style={{ opacity: 0.4 }} />
          <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading monitors...</p>
        </div>
      ) : monitors.length === 0 ? (
        <div className="modern-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <WifiOff size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.4, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>No Monitors Yet</h3>
          <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
            Add your first endpoint to start monitoring uptime and response times.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {monitors.map(m => {
            const s = stats[m.id];
            const statusColor = getStatusColor(s?.currentStatus);

            return (
              <div
                key={m.id}
                className="modern-card"
                style={{ overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s ease' }}
                onClick={() => {
                  setSelectedId(m.id);
                  fetchChecksForMonitor(m.id);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
                  {/* Status Dot */}
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: m.paused ? '#eab308' : statusColor,
                    boxShadow: !m.paused && s?.currentStatus === 'UP' ? `0 0 10px rgba(34,197,94,0.4)` : !m.paused && s?.currentStatus === 'DOWN' ? '0 0 10px rgba(239,68,68,0.4)' : 'none',
                    flexShrink: 0,
                    animation: !m.paused && s?.currentStatus === 'UP' ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                  }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.name}</span>
                      {m.paused && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#eab308', background: 'rgba(234,179,8,0.1)', padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          Paused
                        </span>
                      )}
                      <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>
                        {m.method}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.url}
                    </div>
                  </div>

                  {/* Stats Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                    {s && (
                      <>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: getUptimeColor(s.uptime24h || 100) }}>
                            {s.uptime24h?.toFixed(1) || '—'}%
                          </div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>24h</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatMs(s.avgResponseTime24h)}
                          </div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '60px' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {formatTimeAgo(s.lastCheckedAt)}
                          </div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Checked</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); handleCheckNow(m.id); }} className="btn-ghost" style={{ padding: '6px' }} title="Check Now">
                      <Zap size={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleToggle(m.id); }} className="btn-ghost" style={{ padding: '6px' }} title={m.paused ? "Resume" : "Pause"}>
                      {m.paused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="btn-ghost" style={{ padding: '6px' }} title="Open URL">
                      <ExternalLink size={14} />
                    </a>
                    <button onClick={e => { e.stopPropagation(); handleDelete(m.id); }} className="btn-ghost" style={{ padding: '6px', color: 'var(--danger)' }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                    <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UptimePage;
