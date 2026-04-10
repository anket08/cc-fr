import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  Shield,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Key,
  Activity,
  Cpu,
  Database,
  Cloud,
  Server,
  BookOpen,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────
interface IngestKey {
  id: number;
  label: string;
  ingestKey: string;
  projectId: number;
  createdAt?: string;
  active?: boolean;
}

interface Project {
  id: number;
  name: string;
}

interface UsageData {
  metricsEventCount: number;
  logsEventCount: number;
  lastEventAt?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PLATFORMS = ['Node.js', 'Python', 'Docker', 'Kubernetes', 'Java', 'Go', 'Ruby'] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_ICONS: Record<Platform, string> = {
  'Node.js':    '⚡',
  'Python':     '🐍',
  'Docker':     '🐳',
  'Kubernetes': '☸️',
  'Java':       '☕',
  'Go':         '🔵',
  'Ruby':       '💎',
};

const TROUBLESHOOT_ITEMS = [
  {
    error: '401 Unauthorized on /api/ingest/*',
    cause: 'Missing or invalid ingest key in `X-INGEST-KEY` header.',
    fix: 'Regenerate a key from the Keys panel above and update your agent config. Ensure the header name is exactly `X-INGEST-KEY` (case-sensitive).',
  },
  {
    error: '403 Forbidden on /api/observability/*',
    cause: 'The request is missing a `projectId`, or the authenticated user is not a member of the project.',
    fix: 'Include `?projectId=<id>` in the request URL. Confirm the user is added as a member or creator of the project.',
  },
  {
    error: '400 Bad Request on ingest payload',
    cause: 'The payload is missing required fields: `service`, `env`, or `timestamp`.',
    fix: 'Ensure your payload always contains these three fields. The `timestamp` must be ISO-8601 format (e.g. `2026-04-10T21:00:00Z`).',
  },
  {
    error: 'No data showing in Telemetry dashboard',
    cause: 'Events might be ingested but scoped to a different project.',
    fix: 'Check that the ingest key you\'re using belongs to the same project you have selected in the dashboard. You can verify via the Key manager above.',
  },
  {
    error: 'Agent code throws connection refused',
    cause: 'The CyMOPS backend is not running or is on a different host/port.',
    fix: 'Ensure the backend is running (`mvnw spring-boot:run`) on port 8080. In production environments, replace `localhost:8080` with your deployed API host.',
  },
];

// ─── CopyButton ───────────────────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string; small?: boolean; label?: string }> = ({ text, small, label }) => {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handle} style={{
      background: copied ? 'var(--success-subtle)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${copied ? 'rgba(0,214,143,0.3)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: '6px', color: copied ? 'var(--success)' : 'var(--text-secondary)',
      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: small ? '4px 8px' : '7px 14px',
      fontSize: small ? '0.7rem' : '0.78rem', fontWeight: 600, transition: 'all 0.2s ease', fontFamily: 'inherit',
    }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {label ?? (copied ? 'Copied!' : 'Copy')}
    </button>
  );
};

// ─── Platform Snippet Generator ──────────────────────────────────────────────
function buildSnippet(platform: Platform, key: string, endpoint: string = 'http://localhost:8080/api/ingest'): string {
  const k = key || 'cymops_ing_YOUR_KEY_HERE';
  switch (platform) {
    case 'Node.js': return `const axios = require('axios'); // npm install axios

const CYMOPS = {
  KEY: '${k}',
  ENDPOINT: '${endpoint}',

  async log(level, message, service = process.env.SERVICE_NAME || 'my-app') {
    return axios.post(\`\${this.ENDPOINT}/logs\`, {
      source: service,
      payload: { service, env: process.env.NODE_ENV || 'production',
                 level, message, timestamp: new Date().toISOString() }
    }, { headers: { 'X-INGEST-KEY': this.KEY } });
  },

  async metrics(service, data) {
    return axios.post(\`\${this.ENDPOINT}/metrics\`, {
      source: service,
      payload: { service, env: process.env.NODE_ENV || 'production',
                 timestamp: new Date().toISOString(), ...data }
    }, { headers: { 'X-INGEST-KEY': this.KEY } });
  }
};

// Examples:
CYMOPS.log('ERROR', 'Database connection pool exhausted', 'order-service');
CYMOPS.metrics('api-gateway', { latencyP95Ms: 143, errorRatePercent: 1.2, requestsPerMinute: 420 });`;

    case 'Python': return `import requests, os
from datetime import datetime, timezone

CYMOPS_KEY      = "${k}"
CYMOPS_ENDPOINT = "${endpoint}"
SERVICE_NAME    = os.getenv("SERVICE_NAME", "my-app")

def cymops_log(level: str, message: str, service: str = SERVICE_NAME) -> None:
    requests.post(f"{CYMOPS_ENDPOINT}/logs", json={
        "source": service, "payload": {
            "service": service, "env": os.getenv("ENV", "production"),
            "level": level, "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }, headers={"X-INGEST-KEY": CYMOPS_KEY}, timeout=5)

def cymops_metrics(service: str, **metrics) -> None:
    requests.post(f"{CYMOPS_ENDPOINT}/metrics", json={
        "source": service, "payload": {
            "service": service, "env": os.getenv("ENV", "production"),
            "timestamp": datetime.now(timezone.utc).isoformat(), **metrics
        }
    }, headers={"X-INGEST-KEY": CYMOPS_KEY}, timeout=5)

# Examples:
cymops_log("ERROR", "Payment service timeout", service="payment-api")
cymops_metrics("api-gateway", latencyP95Ms=143, errorRatePercent=1.2)`;

    case 'Docker': return `# 1. Create cymops-agent.sh
#!/bin/sh
tail -F /var/log/app.log | while IFS= read -r LINE; do
  curl -sf -X POST "$CYMOPS_ENDPOINT/logs" \\
    -H "X-INGEST-KEY: $CYMOPS_INGEST_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"source\\":\\"$SERVICE_NAME\\",\\"payload\\":{\\"service\\":\\"$SERVICE_NAME\\",\\"env\\":\\"$ENV\\",\\"level\\":\\"INFO\\",\\"message\\":$(printf '%s' \\"$LINE\\" | jq -Rs .),\\"timestamp\\":\\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"}}"
done

# 2. docker-compose.yml — add alongside your app
services:
  cymops-agent:
    image: alpine:3.18
    restart: unless-stopped
    environment:
      CYMOPS_INGEST_KEY: ${k}
      CYMOPS_ENDPOINT: ${endpoint}
      SERVICE_NAME: my-docker-app
      ENV: production
    volumes:
      - /var/log:/var/log:ro
      - ./cymops-agent.sh:/agent.sh
    entrypoint: ["sh", "/agent.sh"]
    depends_on: [my-app]`;

    case 'Kubernetes': return `# 1. Create secret
kubectl create secret generic cymops-creds \\
  --from-literal=ingest-key="${k}" \\
  -n monitoring

# 2. cymops-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cymops-agent
  namespace: monitoring
spec:
  selector: { matchLabels: { app: cymops-agent } }
  template:
    metadata: { labels: { app: cymops-agent } }
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.2
          env:
            - name: CYMOPS_INGEST_KEY
              valueFrom:
                secretKeyRef: { name: cymops-creds, key: ingest-key }
          volumeMounts:
            - { name: varlog, mountPath: /var/log }
      volumes:
        - name: varlog
          hostPath: { path: /var/log }

# 3. Apply
kubectl apply -f cymops-daemonset.yaml`;

    case 'Java': return `// Maven: add to pom.xml
// <dependency><groupId>com.squareup.okhttp3</groupId>
//   <artifactId>okhttp</artifactId><version>4.12.0</version></dependency>

import okhttp3.*;
import java.time.Instant;

public class CymopsAgent {
    private static final String KEY      = "${k}";
    private static final String ENDPOINT = "${endpoint}";
    private static final OkHttpClient    HTTP = new OkHttpClient();
    private static final MediaType JSON  = MediaType.get("application/json; charset=utf-8");

    public static void log(String level, String message, String service) throws Exception {
        String body = "{\\"source\\":\\""+service+"\\",\\"payload\\":{\\"service\\":\\""+service+"\\","
            + "\\"env\\":\\"production\\",\\"level\\":\\""+level+"\\","
            + "\\"message\\":\\""+message+"\\",\\"timestamp\\":\\""+Instant.now()+"\\"}}";;
        Request req = new Request.Builder().url(ENDPOINT+"/logs")
            .header("X-INGEST-KEY", KEY).post(RequestBody.create(body, JSON)).build();
        try (Response r = HTTP.newCall(req).execute()) {
            if (!r.isSuccessful()) throw new RuntimeException("CyMOPS error: "+r.code());
        }
    }
}
// CymopsAgent.log("ERROR", "DB pool exhausted", "order-service");`;

    case 'Go': return `package cymops // go get github.com/cymops/go-agent (or use stdlib)

import (
  "bytes", "encoding/json", "fmt"
  "net/http", "os", "time"
)

var ingestKey = "${k}"
var endpoint  = "${endpoint}"

func Log(level, message, service string) error {
  p, _ := json.Marshal(map[string]any{
    "source": service, "payload": map[string]string{
      "service": service, "env": os.Getenv("ENV"),
      "level": level, "message": message,
      "timestamp": time.Now().UTC().Format(time.RFC3339),
    },
  })
  req, _ := http.NewRequest("POST", endpoint+"/logs", bytes.NewReader(p))
  req.Header.Set("X-INGEST-KEY", ingestKey)
  req.Header.Set("Content-Type", "application/json")
  res, err := http.DefaultClient.Do(req)
  if err != nil { return err }
  if res.StatusCode >= 400 { return fmt.Errorf("cymops: %d", res.StatusCode) }
  return nil
}
// cymops.Log("ERROR", "DB timeout", "payment-service")`;

    case 'Ruby': return `# Gemfile: gem 'faraday'
require 'faraday', 'json', 'time'

module CymopsAgent
  KEY      = "${k}".freeze
  ENDPOINT = "${endpoint}".freeze
  CONN     = Faraday.new(url: ENDPOINT) do |f|
    f.headers['X-INGEST-KEY']  = KEY
    f.headers['Content-Type']  = 'application/json'
    f.adapter Faraday.default_adapter
  end

  def self.log(level, message, service: ENV.fetch('SERVICE_NAME', 'ruby-app'))
    CONN.post('/logs', {
      source: service, payload: {
        service: service, env: ENV.fetch('RAILS_ENV', 'production'),
        level: level, message: message, timestamp: Time.now.utc.iso8601
      }
    }.to_json)
  end

  def self.metrics(service, **data)
    CONN.post('/metrics', {
      source: service, payload: { service: service,
        env: ENV.fetch('RAILS_ENV', 'production'),
        timestamp: Time.now.utc.iso8601, **data }
    }.to_json)
  end
end

# CymopsAgent.log('ERROR', 'Sidekiq queue backed up', service: 'background-worker')
# CymopsAgent.metrics('api', latency_p95_ms: 143, error_rate_percent: 1.2)`;

    default: return '';
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────
const AgentSetupPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [keys, setKeys] = useState<IngestKey[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [platform, setPlatform] = useState<Platform>('Node.js');
  const [createLabel, setCreateLabel] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keysLoading, setKeysLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<IngestKey | null>(null);

  // Load projects
  useEffect(() => {
    api.get('/projects').then(r => {
      setProjects(r.data);
      if (r.data.length > 0) {
        // Prefer onboarded project
        const ob = localStorage.getItem('cymops_onboarded_project');
        const pid = ob ? parseInt(ob) : r.data[0].id;
        const match = r.data.find((p: Project) => p.id === pid);
        setSelectedProject(match ? match.id : r.data[0].id);
      }
    }).catch(() => {});
  }, []);

  // Load keys when project changes
  useEffect(() => {
    if (selectedProject) {
      loadKeys();
      loadUsage();
    }
  }, [selectedProject]);

  const loadKeys = useCallback(async () => {
    if (!selectedProject) return;
    setKeysLoading(true);
    try {
      const res = await api.get(`/api/ingest/keys?projectId=${selectedProject}`);
      if (Array.isArray(res.data)) {
        setKeys(res.data);
        if (res.data.length > 0 && !selectedKey) setSelectedKey(res.data[0]);
      } else {
        setKeys([]);
      }
    } catch { setKeys([]); } finally { setKeysLoading(false); }
  }, [selectedProject]);

  const loadUsage = useCallback(async () => {
    if (!selectedProject) return;
    setUsageLoading(true);
    try {
      const res = await api.get(`/api/ingest/usage?projectId=${selectedProject}`);
      if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        setUsage(res.data);
      } else {
        setUsage(null);
      }
    } catch { setUsage(null); } finally { setUsageLoading(false); }
  }, [selectedProject]);

  const createKey = async () => {
    if (!createLabel.trim() || !selectedProject) { toast.error('Enter a label'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/ingest/keys', { projectId: selectedProject, label: createLabel.trim() });
      setKeys(prev => [...prev, res.data]);
      setSelectedKey(res.data);
      setCreateLabel('');
      setShowCreateForm(false);
      toast.success('Ingest key created!');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create key');
    } finally { setLoading(false); }
  };

  const revokeKey = async (id: number) => {
    if (!confirm('Revoke this key? Active agents using it will stop working.')) return;
    try {
      await api.post(`/api/ingest/keys/${id}/revoke`);
      setKeys(prev => prev.filter(k => k.id !== id));
      if (selectedKey?.id === id) setSelectedKey(keys.find(k => k.id !== id) || null);
      toast.success('Key revoked');
    } catch { toast.error('Failed to revoke key'); }
  };

  const rotateKey = async (id: number) => {
    if (!confirm('Rotate this key? Update your agent config with the new key.')) return;
    try {
      const res = await api.post(`/api/ingest/keys/${id}/rotate`);
      setKeys(prev => prev.map(k => k.id === id ? { ...k, ...res.data } : k));
      if (selectedKey?.id === id) setSelectedKey({ ...selectedKey, ...res.data });
      toast.success('Key rotated — update your agent!');
    } catch { toast.error('Failed to rotate key'); }
  };

  const activeKey = selectedKey?.ingestKey || keys[0]?.ingestKey || '';
  const snippet = buildSnippet(platform, activeKey);
  const totalEvents = (usage?.metricsEventCount || 0) + (usage?.logsEventCount || 0);
  const isLive = totalEvents > 0;

  return (
    <div style={{ maxWidth: '900px', marginInline: 'auto' }}>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.05))',
            border: '1px solid rgba(108,92,231,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-text)',
          }}>
            <Terminal size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Agent Setup</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Connect your infrastructure · ship logs & metrics to CyMOPS
            </p>
          </div>
        </div>
      </div>

      {/* ─── Project Selector + Connection Status ─── */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: '14px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', flexWrap: 'wrap', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Project
          </label>
          <select
            className="input-modern"
            value={selectedProject || ''}
            onChange={e => setSelectedProject(Number(e.target.value))}
            style={{ width: '220px', padding: '7px 12px', cursor: 'pointer' }}
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Connection status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '50px',
            background: isLive ? 'var(--success-subtle)' : 'var(--bg-elevated)',
            border: `1px solid ${isLive ? 'rgba(0,214,143,0.25)' : 'var(--border-default)'}`,
            transition: 'all 0.4s ease',
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: isLive ? 'var(--success)' : 'var(--text-tertiary)',
              animation: isLive ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            }} />
            <span style={{
              fontSize: '0.75rem', fontWeight: 600,
              color: isLive ? 'var(--success)' : 'var(--text-secondary)',
            }}>
              {usageLoading ? 'Checking…' : isLive ? `${totalEvents} events received` : 'Waiting for first event'}
            </span>
          </div>

          <button onClick={loadUsage} className="btn-ghost" style={{ padding: '7px' }} title="Refresh usage">
            <RefreshCw size={14} className={usageLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── 2-col grid: Keys + Stats ─── */}
      <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

        {/* Key Manager */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: '14px', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={14} color="var(--accent-text)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ingest Keys</span>
              {keys.length > 0 && <span className="badge badge-primary">{keys.length}</span>}
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-pill"
              style={{ padding: '5px 12px', fontSize: '0.75rem' }}
            >
              <Plus size={12} /> New Key
            </button>
          </div>

          {showCreateForm && (
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input-modern"
                  placeholder="e.g. prod-agent · staging-k8s"
                  value={createLabel}
                  onChange={e => setCreateLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createKey()}
                  style={{ flex: 1, padding: '7px 12px', fontSize: '0.8rem' }}
                />
                <button
                  onClick={createKey}
                  disabled={loading}
                  className="btn-pill"
                  style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                >
                  {loading ? '…' : 'Create'}
                </button>
              </div>
            </div>
          )}

          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {keysLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Loading keys…</div>
            ) : keys.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <Key size={24} style={{ color: 'var(--text-tertiary)', opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>No ingest keys yet</p>
              </div>
            ) : (
              keys.map(k => (
                <div
                  key={k.id}
                  onClick={() => setSelectedKey(k)}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    background: selectedKey?.id === k.id ? 'var(--accent-subtle)' : 'transparent',
                    transition: 'background 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: '0.8rem', fontWeight: 600,
                      color: selectedKey?.id === k.id ? 'var(--accent-text)' : 'var(--text-primary)',
                    }}>
                      {k.label}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginTop: '2px' }}>
                      {(k.ingestKey || '').substring(0, 20)}…
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); rotateKey(k.id); }}
                      className="btn-ghost"
                      title="Rotate key"
                      style={{ padding: '4px', fontSize: '0.7rem' }}
                    >
                      <RefreshCw size={12} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); revokeKey(k.id); }}
                      className="btn-ghost"
                      title="Revoke key"
                      style={{ padding: '4px', color: 'var(--danger)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Usage Stats */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: '14px', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} color="var(--accent-text)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Telemetry Usage</span>
          </div>
          <div style={{ padding: '20px 18px' }}>
            {[
              { label: 'Metrics Events', value: usage?.metricsEventCount ?? '—', icon: <Cpu size={14} />, color: 'var(--info)' },
              { label: 'Log Events', value: usage?.logsEventCount ?? '—', icon: <Database size={14} />, color: 'var(--warning)' },
              { label: 'Total Events', value: totalEvents || '—', icon: <Zap size={14} />, color: 'var(--accent-text)' },
            ].map((stat, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{stat.label}</span>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {usageLoading ? '…' : stat.value}
                </span>
              </div>
            ))}
            {usage?.lastEventAt && (
              <p style={{ margin: '14px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Last event: {new Date(usage.lastEventAt).toLocaleString()}
              </p>
            )}
            {!isLive && !usageLoading && (
              <div style={{
                marginTop: '16px', padding: '12px', borderRadius: '8px',
                background: 'var(--warning-subtle)', border: '1px solid rgba(255,192,72,0.2)',
                display: 'flex', alignItems: 'flex-start', gap: '8px',
              }}>
                <Info size={13} color="var(--warning)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  No events yet. Follow the integration guide below to send your first signal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Integration Guide ─── */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: '14px', overflow: 'hidden', marginBottom: '20px',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={14} color="var(--accent-text)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Integration Guide</span>
          {selectedKey && (
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              Using key: <strong style={{ color: 'var(--text-secondary)' }}>{selectedKey.label}</strong>
            </span>
          )}
        </div>

        {/* Platform Tabs */}
        <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              style={{
                padding: '7px 16px', border: 'none', background: 'transparent',
                fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                color: platform === p ? 'var(--accent-text)' : 'var(--text-secondary)',
                borderBottom: `2px solid ${platform === p ? 'var(--accent)' : 'transparent'}`,
                transition: 'all 0.15s ease', marginBottom: '-1px',
              }}
            >
              {PLATFORM_ICONS[p]} {p}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div style={{ background: '#0d0d1a' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
            </div>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
              cymops-agent · {platform.toLowerCase().replace('.js', '').replace('/', '-')}
            </span>
            <CopyButton text={snippet} small label={activeKey ? 'Copy (key included)' : 'Copy'} />
          </div>
          <pre style={{
            margin: 0, padding: '20px 24px',
            fontSize: '0.73rem', lineHeight: 1.7,
            color: '#a9b7c6',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            overflowX: 'auto', maxHeight: '380px', overflowY: 'auto',
          }}>
            <code>{snippet}</code>
          </pre>
        </div>

        {/* Footer info */}
        <div style={{
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          borderTop: '1px solid var(--border-default)', background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={12} color="var(--warning)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              Store your ingest key in a secret manager — never commit to version control
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <a href="https://cymops.dev/docs/agent" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '0.72rem', color: 'var(--accent-text)', textDecoration: 'none', fontWeight: 500,
            }}>
              Full docs <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {/* ─── How It Works ─── */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: '14px', padding: '22px 24px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <Cloud size={14} color="var(--accent-text)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>How the Pipeline Works</span>
        </div>
        <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', alignItems: 'center' }}>
          {[
            { icon: <Server size={18} />, label: 'Your App', desc: 'Ships logs & metrics', color: 'var(--text-secondary)' },
            null,
            { icon: <Shield size={18} />, label: 'Ingest API', desc: 'Key-authenticated', color: 'var(--info)' },
            null,
            { icon: <Zap size={18} />, label: 'AI Engine', desc: 'Anomaly → RCA', color: 'var(--accent-text)' },
          ].map((item, i) => item === null ? (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={16} color="var(--text-tertiary)" />
            </div>
          ) : (
            <div key={i} style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: `${item.color}15`,
                border: `1px solid ${item.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.color, margin: '0 auto 10px',
              }}>
                {item.icon}
              </div>
              <p style={{ margin: '0 0 3px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Troubleshooting ─── */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={14} color="var(--warning)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Troubleshooting</span>
        </div>
        {TROUBLESHOOT_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{ borderBottom: i < TROUBLESHOOT_ITEMS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
          >
            <button
              onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              style={{
                width: '100%', padding: '14px 24px', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                color: 'var(--text-primary)', gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: item.error.includes('401') ? 'var(--danger)'
                    : item.error.includes('403') ? 'var(--warning)'
                    : item.error.includes('400') ? 'var(--info)'
                    : 'var(--text-tertiary)',
                }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.error}</span>
              </div>
              {activeFaq === i ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
            </button>
            {activeFaq === i && (
              <div style={{ padding: '0 24px 18px 42px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Cause:</strong> {item.cause}
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--success)' }}>Fix:</strong> {item.fix}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentSetupPage;
