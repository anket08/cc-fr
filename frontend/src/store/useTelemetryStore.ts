import { create } from 'zustand';

export interface TelemetryPoint {
    backendLat: number;
    dbLat: number;
    authLat: number;
    wsLat: number;
    ok: boolean;
    timestamp: number;
    time: string;
    endpoints?: EndpointStat[];
}

export interface EndpointStat {
    endpoint: string;
    avgLatency: number;
    p95: number;
    calls: number;
    errors: number;
}

const PREFIX = 'cymops_store_';
const store = {
    get: <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set: (k: string, v: unknown) => { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch {} },
};

interface TelemetryState {
    history: TelemetryPoint[];
    endpoints: EndpointStat[];
    logs: { time: string, level: string, msg: string, source: string }[];
    wsConnected: boolean;
    connectWs: (projectId: number, token: string) => void;
    addLog: (level: string, msg: string, source: string) => void;
    recordEndpointCall: (endpoint: string, latency: number, error: boolean) => void;
    clearData: () => void;
}

let wsInstance: WebSocket | null = null;
let wsProjectId: number | null = null;

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
    history: store.get('history', []),
    endpoints: store.get('endpoints', []),
    logs: store.get('logs', []),
    wsConnected: false,

    connectWs: (projectId, token) => {
        if (!projectId || !token) return;

        if (wsInstance && wsProjectId === projectId) {
            return;
        }

        if (wsInstance) {
            wsInstance.close();
            wsInstance = null;
        }

        wsProjectId = projectId;

        console.log("[Telemetry] Connecting to WebSocket...");
        const url = `ws://localhost:8080/ws/telemetry?projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;
        wsInstance = new WebSocket(url);

        wsInstance.onopen = () => {
            console.log("[Telemetry] Connected");
            set({ wsConnected: true });
        };

        wsInstance.onclose = () => {
            console.log("[Telemetry] Disconnected");
            set({ wsConnected: false });
            wsInstance = null;
            const reconnectProjectId = wsProjectId;
            const latestToken = localStorage.getItem('token') || token;
            if (reconnectProjectId && latestToken) {
                setTimeout(() => get().connectWs(reconnectProjectId, latestToken), 5000);
            }
        };

        wsInstance.onmessage = (event) => {
            const data: TelemetryPoint = JSON.parse(event.data);
            
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            data.time = timeStr;

            if (Array.isArray(data.endpoints)) {
                const sanitized = data.endpoints.map((entry) => ({
                    endpoint: entry.endpoint,
                    avgLatency: Math.round(entry.avgLatency),
                    p95: Math.round(entry.p95),
                    calls: Number(entry.calls) || 0,
                    errors: Number(entry.errors) || 0,
                }));
                store.set('endpoints', sanitized);
                set({ endpoints: sanitized });
            }

            if (data.backendLat > 100) get().addLog('WARN', `Backend API latency spike (${data.backendLat}ms)`, 'sys');
            if (!data.ok) get().addLog('ERROR', 'Telemetry health check reported degraded status', 'sys');

            set(state => {
                const newHistory = [...state.history, data].slice(-2000); // Allow up to >1 hour of data
                store.set('history', newHistory);
                return { history: newHistory };
            });
        };
    },

    addLog: (level, msg, source) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        set(state => {
            const logs = [{ time, level, msg, source }, ...state.logs].slice(0, 150);
            store.set('logs', logs);
            return { logs };
        });
    },

    recordEndpointCall: (endpoint, latency, error) => {
        set(state => {
            const eps = [...state.endpoints];
            const idx = eps.findIndex(e => e.endpoint === endpoint);
            if (idx === -1) {
                eps.push({ endpoint, avgLatency: latency, p95: latency, calls: 1, errors: error ? 1 : 0 });
            } else {
                const curr = eps[idx];
                const newTotal = curr.avgLatency * curr.calls + latency;
                curr.calls += 1;
                curr.avgLatency = Math.round(newTotal / curr.calls);
                if (latency > curr.p95) curr.p95 = latency; // simple mock p95
                if (error) curr.errors += 1;
            }
            store.set('endpoints', eps);
            return { endpoints: eps };
        });
    },

    clearData: () => {
        store.set('history', []);
        store.set('endpoints', []);
        store.set('logs', []);
        set({ history: [], endpoints: [], logs: [] });
    }
}));
