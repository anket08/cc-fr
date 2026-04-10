import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Building2,
  Terminal,
  Radio,
  Sparkles,
  Copy,
  Check,
  Globe,
  Users,
  Server,
  AlertTriangle,
  Brain,
  TrendingUp,
  Shield,
  ChevronRight,
  Rocket,
  Activity,
  Clock,
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────
interface OrgForm {
  companyName: string;
  industry: string;
  teamSize: string;
  projectName: string;
}

interface IngestKey {
  id: number;
  label: string;
  ingestKey: string;
  projectId: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Welcome',      icon: <Zap size={16} /> },
  { id: 2, label: 'Organization', icon: <Building2 size={16} /> },
  { id: 3, label: 'Agent Setup',  icon: <Terminal size={16} /> },
  { id: 4, label: 'First Signal', icon: <Radio size={16} /> },
  { id: 5, label: 'AI Ready',     icon: <Sparkles size={16} /> },
];

const INDUSTRIES = [
  'Financial Services', 'HealthTech', 'E-Commerce', 'SaaS / Cloud',
  'Gaming', 'Media & Streaming', 'Logistics', 'EdTech', 'Other',
];

const TEAM_SIZES = ['1–5', '6–20', '21–100', '101–500', '500+'];

const PLATFORMS = ['Node.js', 'Python', 'Docker', 'Kubernetes', 'Java', 'Go'] as const;
type Platform = typeof PLATFORMS[number];

const LIFECYCLE_ITEMS = [
  { icon: <AlertTriangle size={18} />, color: '#ff6b6b', label: 'DETECT', desc: 'Agent ships anomalies in real-time' },
  { icon: <Radio size={18} />, color: '#ffc048', label: 'ALERT', desc: 'War room auto-created, team notified' },
  { icon: <Brain size={18} />, color: '#a29bfe', label: 'RCA', desc: 'AI analyzes logs & pinpoints root cause' },
  { icon: <TrendingUp size={18} />, color: '#00d68f', label: 'IMPROVE', desc: 'Actionable fix recommendations delivered' },
];

// ─── Snippet Generator ───────────────────────────────────────────────────────
function getSnippet(platform: Platform, ingestKey: string, _projectId?: number): string {
  const key = ingestKey || 'cymops_ing_YOUR_KEY_HERE';
  const endpoint = 'http://localhost:8080/api/ingest';

  switch (platform) {
    case 'Node.js':
      return `// npm install axios
const axios = require('axios');

const cymops = {
  async sendMetrics(data) {
    await axios.post('${endpoint}/metrics', {
      source: process.env.SERVICE_NAME || 'my-service',
      payload: {
        service: data.service,
        env: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
        ...data.metrics
      }
    }, { headers: { 'X-INGEST-KEY': '${key}' } });
  },
  async sendLog(level, message, meta = {}) {
    await axios.post('${endpoint}/logs', {
      source: process.env.SERVICE_NAME || 'my-service',
      payload: {
        service: meta.service || 'backend-api',
        env: process.env.NODE_ENV || 'production',
        level,
        message,
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, { headers: { 'X-INGEST-KEY': '${key}' } });
  }
};

// Usage
cymops.sendLog('ERROR', 'DB connection timeout', { service: 'user-api' });
cymops.sendMetrics({ service: 'api-gateway', metrics: { latencyP95Ms: 143, errorRatePercent: 1.2 } });`;

    case 'Python':
      return `# pip install requests
import requests
import os
from datetime import datetime, timezone

CYMOPS_INGEST_KEY = "${key}"
CYMOPS_ENDPOINT   = "${endpoint}"

def send_log(level: str, message: str, service: str = "backend-api"):
    requests.post(
        f"{CYMOPS_ENDPOINT}/logs",
        json={
            "source": os.getenv("SERVICE_NAME", "my-service"),
            "payload": {
                "service": service,
                "env": os.getenv("ENV", "production"),
                "level": level,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        },
        headers={"X-INGEST-KEY": CYMOPS_INGEST_KEY},
        timeout=5
    )

def send_metrics(service: str, **metrics):
    requests.post(
        f"{CYMOPS_ENDPOINT}/metrics",
        json={
            "source": os.getenv("SERVICE_NAME", "my-service"),
            "payload": {
                "service": service,
                "env": os.getenv("ENV", "production"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **metrics
            }
        },
        headers={"X-INGEST-KEY": CYMOPS_INGEST_KEY},
        timeout=5
    )

# Usage
send_log("ERROR", "Database connection pool exhausted", service="order-service")
send_metrics("api-gateway", latencyP95Ms=143, errorRatePercent=1.2, requestsPerMinute=420)`;

    case 'Docker':
      return `# docker-compose.yml — add to your existing services
version: '3.8'
services:
  cymops-agent:
    image: alpine:3.18
    restart: always
    environment:
      - CYMOPS_INGEST_KEY=${key}
      - CYMOPS_ENDPOINT=${endpoint}
      - SERVICE_NAME=my-app
      - ENV=production
    volumes:
      - /var/log:/var/log:ro          # mount your app logs
      - ./cymops-agent.sh:/agent.sh
    entrypoint: ["/bin/sh", "/agent.sh"]
    depends_on:
      - your-app

# cymops-agent.sh — tail logs and ship to CyMOPS
#!/bin/sh
tail -F /var/log/app.log | while read LINE; do
  curl -s -X POST "$CYMOPS_ENDPOINT/logs" \\
    -H "X-INGEST-KEY: $CYMOPS_INGEST_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{
      \\"source\\": \\"$SERVICE_NAME\\",
      \\"payload\\": {
        \\"service\\": \\"$SERVICE_NAME\\",
        \\"env\\": \\"$ENV\\",
        \\"level\\": \\"INFO\\",
        \\"message\\": $(echo $LINE | jq -Rs .),
        \\"timestamp\\": \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"
      }
    }"
done`;

    case 'Kubernetes':
      return `# cymops-agent-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cymops-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: cymops-agent
  template:
    metadata:
      labels:
        app: cymops-agent
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
      containers:
        - name: agent
          image: fluent/fluent-bit:2.2
          env:
            - name: CYMOPS_INGEST_KEY
              valueFrom:
                secretKeyRef:
                  name: cymops-secret
                  key: ingest-key
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: config
              mountPath: /fluent-bit/etc/
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: config
          configMap:
            name: cymops-fluent-bit-config
---
# Secret
apiVersion: v1
kind: Secret
metadata:
  name: cymops-secret
  namespace: monitoring
stringData:
  ingest-key: "${key}"
---
# kubectl apply -f cymops-agent-daemonset.yaml`;

    case 'Java':
      return `// pom.xml dependency
// <dependency>
//   <groupId>com.squareup.okhttp3</groupId>
//   <artifactId>okhttp</artifactId>
//   <version>4.12.0</version>
// </dependency>

import okhttp3.*;
import java.io.IOException;
import java.time.Instant;

public class CymopsAgent {
    private static final String INGEST_KEY = "${key}";
    private static final String ENDPOINT   = "${endpoint}";
    private final OkHttpClient  client     = new OkHttpClient();
    private static final MediaType JSON    = MediaType.get("application/json");

    public void sendLog(String level, String message, String service) throws IOException {
        String body = String.format("""
            {
              "source": "java-app",
              "payload": {
                "service": "%s",
                "env": "production",
                "level": "%s",
                "message": "%s",
                "timestamp": "%s"
              }
            }""", service, level, message, Instant.now().toString());

        Request request = new Request.Builder()
            .url(ENDPOINT + "/logs")
            .header("X-INGEST-KEY", INGEST_KEY)
            .post(RequestBody.create(body, JSON))
            .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) throw new IOException("Unexpected code: " + response);
        }
    }
}

// Usage example:
// CymopsAgent agent = new CymopsAgent();
// agent.sendLog("ERROR", "DB connection pool exhausted", "order-service");`;

    case 'Go':
      return `package cymops

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

const (
    IngestKey = "${key}"
    Endpoint  = "${endpoint}"
)

type LogPayload struct {
    Source  string      \`json:"source"\`
    Payload interface{} \`json:"payload"\`
}

func SendLog(level, message, service string) error {
    payload := LogPayload{
        Source: "go-service",
        Payload: map[string]string{
            "service":   service,
            "env":       "production",
            "level":     level,
            "message":   message,
            "timestamp": time.Now().UTC().Format(time.RFC3339),
        },
    }
    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", Endpoint+"/logs", bytes.NewBuffer(body))
    req.Header.Set("X-INGEST-KEY", IngestKey)
    req.Header.Set("Content-Type", "application/json")
    resp, err := http.DefaultClient.Do(req)
    if err != nil { return err }
    defer resp.Body.Close()
    if resp.StatusCode >= 400 {
        return fmt.Errorf("cymops: unexpected status %d", resp.StatusCode)
    }
    return nil
}

// SendLog("ERROR", "DB connection timeout", "payment-service")`;

    default:
      return '';
  }
}

// ─── CopyButton Component ────────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string; small?: boolean }> = ({ text, small }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? 'var(--success-subtle)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${copied ? 'rgba(0,214,143,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '6px',
        color: copied ? 'var(--success)' : 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: small ? '4px 8px' : '6px 12px',
        fontSize: small ? '0.7rem' : '0.75rem',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
        flexShrink: 0,
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

// ─── Step 1: Welcome ─────────────────────────────────────────────────────────
const StepWelcome: React.FC = () => (
  <div className="ob-step-content">
    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '80px', height: '80px', borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.05))',
        border: '1px solid rgba(108,92,231,0.3)',
        marginBottom: '24px',
        boxShadow: '0 0 40px rgba(108,92,231,0.2)',
      }}>
        <Rocket size={36} color="var(--accent-text)" />
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.04em', lineHeight: 1.2 }}>
        Welcome to <span style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CyMOPS</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.65 }}>
        The AI-first incident command center. Your team will go from <strong style={{ color: 'var(--text-primary)' }}>alert firing</strong> to <strong style={{ color: 'var(--text-primary)' }}>root cause in minutes</strong> — not hours.
      </p>
    </div>

    {/* Lifecycle */}
    <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '36px' }}>
      {LIFECYCLE_ITEMS.map((item, i) => (
        <div key={i} style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '14px',
          padding: '20px 16px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: `${item.color}15`,
            border: `1px solid ${item.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            color: item.color,
          }}>
            {item.icon}
          </div>
          <p style={{ margin: '0 0 4px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: item.color }}>{item.label}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.desc}</p>
          {i < 3 && (
            <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: 'var(--text-tertiary)' }}>
              <ChevronRight size={16} />
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Feature pills */}
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {[
        { icon: <Shield size={12} />, label: 'Zero data loss' },
        { icon: <Activity size={12} />, label: 'Real-time detection' },
        { icon: <Clock size={12} />, label: 'MTTR reduction' },
        { icon: <Brain size={12} />, label: 'AI-powered RCA' },
        { icon: <Users size={12} />, label: 'War room collaboration' },
        { icon: <Globe size={12} />, label: 'Multi-tenant isolation' },
      ].map((pill, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '5px 12px', borderRadius: '50px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--accent-text)' }}>{pill.icon}</span>
          {pill.label}
        </span>
      ))}
    </div>
  </div>
);

// ─── Step 2: Organization ────────────────────────────────────────────────────
const StepOrganization: React.FC<{
  form: OrgForm;
  onChange: (f: OrgForm) => void;
  loading: boolean;
  projectId: number | null;
}> = ({ form, onChange, loading, projectId }) => {
  const field = (label: string, field: keyof OrgForm, placeholder: string, type: 'input' | 'select' = 'input', options?: string[]) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '7px' }}>
        {label}
      </label>
      {type === 'input' ? (
        <input
          className="input-modern"
          placeholder={placeholder}
          value={form[field]}
          onChange={e => onChange({ ...form, [field]: e.target.value })}
          disabled={loading || !!projectId}
          style={{ opacity: (loading || !!projectId) ? 0.6 : 1 }}
        />
      ) : (
        <select
          className="input-modern"
          value={form[field]}
          onChange={e => onChange({ ...form, [field]: e.target.value })}
          disabled={loading || !!projectId}
          style={{ cursor: 'pointer', opacity: (loading || !!projectId) ? 0.6 : 1 }}
        >
          <option value="">Select {label.toLowerCase()}…</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  );

  return (
    <div className="ob-step-content">
      <div style={{ maxWidth: '540px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'var(--info-subtle)', border: '1px solid rgba(77,171,247,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'var(--info)',
          }}>
            <Building2 size={26} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>Set up your organization</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            This creates your first project — your team's isolated workspace in CyMOPS.
          </p>
        </div>

        {projectId ? (
          <div style={{
            background: 'var(--success-subtle)', border: '1px solid rgba(0,214,143,0.25)',
            borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'
          }}>
            <CheckCircle size={20} color="var(--success)" />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Project created!</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <strong>{form.projectName}</strong> — Project #{projectId}
              </p>
            </div>
          </div>
        ) : null}

        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: '16px', padding: '28px',
        }}>
          {field('Company Name', 'companyName', 'e.g. Acme Corporation')}
          {field('Project / Workspace Name', 'projectName', 'e.g. Acme Production')}
          {field('Industry', 'industry', '', 'select', INDUSTRIES)}
          {field('Team Size', 'teamSize', '', 'select', TEAM_SIZES)}
        </div>
      </div>
    </div>
  );
};

// ─── Step 3: Agent Setup ─────────────────────────────────────────────────────
const StepAgentSetup: React.FC<{ ingestKey: IngestKey | null; projectId: number | null }> = ({ ingestKey, projectId: _pid }) => {
  const [platform, setPlatform] = useState<Platform>('Node.js');

  const snippet = ingestKey
    ? getSnippet(platform, ingestKey.ingestKey, ingestKey.projectId)
    : getSnippet(platform, 'cymops_ing_LOADING...');

  return (
    <div className="ob-step-content">
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'rgba(108,92,231,0.12)', border: '1px solid rgba(108,92,231,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', color: 'var(--accent-text)',
        }}>
          <Terminal size={26} />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>Install the CyMOPS Agent</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Add a few lines of code to start shipping logs and metrics. Your ingest key is pre-filled.
        </p>
      </div>

      {/* Key display */}
      {ingestKey && (
        <div style={{
          background: 'rgba(0,214,143,0.06)', border: '1px solid rgba(0,214,143,0.2)',
          borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '20px', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={14} color="var(--success)" />
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingest Key Generated</p>
              <p style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '2px' }}>
                {ingestKey.ingestKey.substring(0, 24)}…
              </p>
            </div>
          </div>
          <CopyButton text={ingestKey.ingestKey} small />
        </div>
      )}

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className="ob-platform-tab"
            data-active={platform === p}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              background: platform === p ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
              color: platform === p ? 'var(--accent-text)' : 'var(--text-secondary)',
              border: `1px solid ${platform === p ? 'rgba(108,92,231,0.3)' : 'var(--border-default)'}`,
              transition: 'all 0.15s ease',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div style={{
        background: '#0d0d1a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
            cymops-agent · {platform.toLowerCase().replace('.js', '').replace('/', '-')}
          </span>
          <CopyButton text={snippet} small />
        </div>
        <pre style={{
          margin: 0, padding: '20px',
          fontSize: '0.72rem', lineHeight: 1.65,
          color: '#a9b7c6',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          overflowX: 'auto',
          maxHeight: '320px',
          overflowY: 'auto',
        }}>
          <code>{snippet}</code>
        </pre>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
        💡 Store your ingest key in a secret manager — never commit it to version control.
      </p>
    </div>
  );
};

// ─── Step 4: First Signal ────────────────────────────────────────────────────
const StepFirstSignal: React.FC<{
  projectId: number | null;
  connected: boolean;
  eventCount: number;
  onManualCheck: () => void;
  polling: boolean;
}> = ({ projectId, connected, eventCount, onManualCheck, polling }) => {
  const curlSnippet = `curl -X POST http://localhost:8080/api/ingest/logs \\
  -H "X-INGEST-KEY: YOUR_INGEST_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "test-agent",
    "payload": {
      "service": "my-app",
      "env": "production",
      "level": "INFO",
      "message": "CyMOPS agent connected successfully!",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }'`;

  return (
    <div className="ob-step-content">
      <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: connected ? 'var(--success-subtle)' : 'var(--bg-elevated)',
          border: `2px solid ${connected ? 'rgba(0,214,143,0.4)' : 'var(--border-default)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          transition: 'all 0.5s ease',
          boxShadow: connected ? '0 0 40px rgba(0,214,143,0.2)' : 'none',
          position: 'relative',
        }}>
          {connected ? (
            <CheckCircle size={36} color="var(--success)" />
          ) : (
            <>
              <Radio size={36} color="var(--text-tertiary)" />
              {polling && (
                <div style={{
                  position: 'absolute', inset: '-6px',
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: 'var(--accent)',
                  animation: 'spin 1s linear infinite',
                }} />
              )}
            </>
          )}
        </div>

        {connected ? (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
              🎉 Signal received!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              CyMOPS received <strong style={{ color: 'var(--text-primary)' }}>{eventCount} event{eventCount !== 1 ? 's' : ''}</strong> from your project. Your agent is live and connected.
            </p>
            <div style={{
              background: 'var(--success-subtle)', border: '1px solid rgba(0,214,143,0.2)',
              borderRadius: '12px', padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>Agent Online · Project #{projectId}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>Waiting for your first event</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>
              Run the snippet from Step 3, or use the curl command below to send a test event. CyMOPS will detect it instantly.
            </p>

            {/* Quick test curl */}
            <div style={{
              background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', overflow: 'hidden', textAlign: 'left', marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Quick test · curl</span>
                <CopyButton text={curlSnippet} small />
              </div>
              <pre style={{
                margin: 0, padding: '14px', fontSize: '0.7rem', lineHeight: 1.6,
                color: '#a9b7c6', fontFamily: 'monospace', overflowX: 'auto',
              }}>
                <code>{curlSnippet}</code>
              </pre>
            </div>

            <button
              onClick={onManualCheck}
              disabled={polling}
              className="btn-pill-dark"
              style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
            >
              {polling ? (
                <>
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%',
                    border: '2px solid transparent', borderTopColor: 'var(--accent)',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Checking…
                </>
              ) : (
                <><Radio size={15} /> Check for Signal</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Step 5: AI Ready ─────────────────────────────────────────────────────────
const StepAiReady: React.FC = () => {
  const rcaLines = [
    { ts: '12:03:41', type: 'anomaly', msg: '⚡ Anomaly detected: error_rate > 5% threshold breached' },
    { ts: '12:03:42', type: 'incident', msg: '🚨 Incident room #42 created · on-call notified' },
    { ts: '12:03:43', type: 'ai', msg: '🤖 AI analyzing 2,847 log lines from last 30 minutes…' },
    { ts: '12:03:45', type: 'rca', msg: '🔍 Root cause: PostgreSQL connection pool exhausted (maxPoolSize=10)' },
    { ts: '12:03:46', type: 'fix', msg: '✅ Recommendation: Increase spring.datasource.hikari.maximumPoolSize to 50' },
    { ts: '12:03:46', type: 'link', msg: '📋 Jira issue INFRA-892 created · linked to incident' },
  ];

  return (
    <div className="ob-step-content">
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(162,155,254,0.1))',
          border: '1px solid rgba(108,92,231,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 40px rgba(108,92,231,0.25)',
          animation: 'ob-glow-pulse 3s ease-in-out infinite',
        }}>
          <Sparkles size={36} color="var(--accent-text)" />
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: '1.6rem', fontWeight: 800 }}>You're AI-ready 🚀</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '500px', marginInline: 'auto', lineHeight: 1.6 }}>
          Here's a preview of what happens the next time your system encounters an incident. CyMOPS handles everything automatically.
        </p>
      </div>

      {/* Animated RCA terminal */}
      <div style={{
        background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px', overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        maxWidth: '620px', marginInline: 'auto',
      }}>
        <div style={{
          padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginLeft: '6px' }}>
            cymops-ai-engine · live incident demo
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px', alignItems: 'center' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28c840', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.65rem', color: '#28c840', fontFamily: 'monospace' }}>LIVE</span>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {rcaLines.map((line, i) => (
            <div key={i} style={{
              display: 'flex', gap: '12px', marginBottom: '8px',
              animation: `ob-line-in 0.4s ease ${i * 0.15}s both`,
            }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', fontFamily: 'monospace', flexShrink: 0, marginTop: '1px' }}>
                {line.ts}
              </span>
              <span style={{
                fontSize: '0.78rem', fontFamily: 'monospace',
                color: line.type === 'rca' ? '#a29bfe'
                  : line.type === 'fix' ? '#00d68f'
                  : line.type === 'anomaly' ? '#ff6b6b'
                  : line.type === 'ai' ? '#ffd93d'
                  : '#c3cad9',
                lineHeight: 1.5,
              }}>
                {line.msg}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Capabilities grid */}
      <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '24px', maxWidth: '620px', marginInline: 'auto' }}>
        {[
          { icon: <Server size={14} />, label: 'Metrics & Logs', desc: 'Full telemetry pipeline' },
          { icon: <Brain size={14} />, label: 'AI Postmortems', desc: 'Auto-generated RCA docs' },
          { icon: <TrendingUp size={14} />, label: 'MTTR Tracking', desc: 'Downtime analytics' },
        ].map((cap, i) => (
          <div key={i} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: '10px', padding: '14px',
            display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            <div style={{ color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {cap.icon}
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cap.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{cap.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const [orgForm, setOrgForm] = useState<OrgForm>({ companyName: '', industry: '', teamSize: '', projectName: '' });
  const [projectId, setProjectId] = useState<number | null>(null);
  const [ingestKey, setIngestKey] = useState<IngestKey | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  const [connected, setConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-poll when on step 4
  useEffect(() => {
    if (step === 4 && projectId && !connected) {
      pollRef.current = setInterval(() => checkForSignal(), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, projectId, connected]);

  const checkForSignal = async () => {
    if (!projectId) return;
    try {
      setPolling(true);
      const res = await api.get(`/api/ingest/usage?projectId=${projectId}`);
      const total = (res.data.metricsEventCount || 0) + (res.data.logsEventCount || 0);
      if (total > 0) {
        setConnected(true);
        setEventCount(total);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {
      // Usage endpoint not ready yet or no events
    } finally {
      setPolling(false);
    }
  };

  const createProjectAndKey = async (): Promise<boolean> => {
    if (!orgForm.projectName.trim()) {
      toast.error('Please enter a project name');
      return false;
    }
    if (!orgForm.companyName.trim()) {
      toast.error('Please enter your company name');
      return false;
    }
    if (projectId) return true; // Already created

    setOrgLoading(true);
    try {
      // 1. Create project
      const projRes = await api.post('/projects', { name: orgForm.projectName.trim() });
      const pid: number = projRes.data.id;
      setProjectId(pid);

      // 2. Generate ingest key
      const keyRes = await api.post('/api/ingest/keys', {
        projectId: pid,
        label: `${orgForm.companyName.toLowerCase().replace(/\s+/g, '-')}-prod-agent`,
      });
      setIngestKey(keyRes.data);
      toast.success('Project created & agent key generated!');
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create project');
      return false;
    } finally {
      setOrgLoading(false);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('cymops_onboarding_complete', 'true');
    localStorage.setItem('cymops_onboarded_project', String(projectId));
    toast.success('Setup complete! Welcome to CyMOPS 🚀');
    navigate('/dashboard');
  };

  const handleNext = async () => {
    if (step === 2) {
      const ok = await createProjectAndKey();
      if (!ok) return;
    }
    if (step === 5) {
      completeOnboarding();
      return;
    }
    setDirection('forward');
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setDirection('back');
    setStep(s => s - 1);
  };

  const canProceed = () => {
    if (step === 2) return orgForm.companyName.trim() !== '' && orgForm.projectName.trim() !== '';
    return true;
  };

  const stepContent = () => {
    switch (step) {
      case 1: return <StepWelcome />;
      case 2: return <StepOrganization form={orgForm} onChange={setOrgForm} loading={orgLoading} projectId={projectId} />;
      case 3: return <StepAgentSetup ingestKey={ingestKey} projectId={projectId} />;
      case 4: return <StepFirstSignal projectId={projectId} connected={connected} eventCount={eventCount} onManualCheck={checkForSignal} polling={polling} />;
      case 5: return <StepAiReady />;
      default: return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-root)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px 60px',
      position: 'relative', overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Background radial */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(108,92,231,0.12) 0%, transparent 70%)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', zIndex: 1 }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={16} color="#fff" />
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>CyMOPS</span>
      </div>

      {/* Step Indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0',
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: '50px', padding: '4px', marginBottom: '40px', zIndex: 1,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '7px 16px', borderRadius: '50px',
              background: step === s.id ? 'var(--accent)' : 'transparent',
              transition: 'all 0.25s ease',
              cursor: step > s.id ? 'pointer' : 'default',
            }}
              onClick={() => step > s.id ? setStep(s.id) : undefined}
            >
              <span style={{
                color: step >= s.id ? (step === s.id ? '#fff' : 'var(--success)') : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center',
              }}>
                {step > s.id ? <Check size={13} /> : s.icon}
              </span>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                color: step === s.id ? '#fff' : step > s.id ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: '20px', height: '1px', background: 'var(--border-default)' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Content card */}
      <div
        key={step}
        style={{
          width: '100%', maxWidth: '760px', zIndex: 1,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: 'var(--shadow-lg)',
          animation: `ob-step-${direction} 0.35s cubic-bezier(0.16,1,0.3,1) both`,
          minHeight: '400px',
        }}
      >
        {stepContent()}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: '760px', marginTop: '24px', zIndex: 1,
      }}>
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="btn-pill-dark"
          style={{ opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? 'none' : 'auto' }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {STEPS.map(s => (
            <div key={s.id} style={{
              width: step === s.id ? '20px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: step >= s.id ? 'var(--accent)' : 'var(--border-default)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={!canProceed() || orgLoading}
          className="btn-pill"
          style={{ minWidth: '130px', justifyContent: 'center' }}
        >
          {orgLoading ? (
            <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} /> Creating…</>
          ) : step === 4 && !connected ? (
            <>Skip for now <ArrowRight size={15} /></>
          ) : step === 5 ? (
            <>Go to Dashboard <Rocket size={15} /></>
          ) : (
            <>Continue <ArrowRight size={15} /></>
          )}
        </button>
      </div>

      {/* Skip entirely */}
      {step < 5 && (
        <button
          onClick={completeOnboarding}
          style={{
            marginTop: '16px', background: 'none', border: 'none',
            color: 'var(--text-tertiary)', fontSize: '0.78rem', cursor: 'pointer',
            fontFamily: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted',
            zIndex: 1,
          }}
        >
          Skip setup for now
        </button>
      )}
    </div>
  );
};

export default OnboardingPage;
