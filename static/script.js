/* ============================================================
   CORECONTROL PRO — DASHBOARD SCRIPT
   ============================================================ */

// ── CLOCK ─────────────────────────────────────────────────────
function updateClock() {
    const el = document.getElementById('nav-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ── TOAST ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';

    const icons = {
        error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
        warn:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
        info:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    };

    const colors = { error: 'var(--red)', success: 'var(--green)', warn: 'var(--amber)', info: 'var(--blue)' };
    toast.style.borderLeftColor = colors[type] || colors.info;
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.35s ease forwards';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// ── SAFE FETCH ─────────────────────────────────────────────────
async function safeFetch(url, actionName) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    } catch (err) {
        console.warn(`[CoreControl] Backend not available for ${url}:`, err);
        showToast(`${actionName} — Offline Presentation Mode`, 'warn');
        return null;
    }
}

// ── ACTIONS ───────────────────────────────────────────────────
function startGNB() {
    safeFetch('/start_gnb', 'Deploy gNB');
    showToast('Deploying gNB sequence initiated…', 'info');
    addLog('INFO', 'Deploy gNB command issued. Initializing radio access network…');
}
function stopGNB() {
    safeFetch('/stop_gnb', 'Power Down gNB');
    showToast('gNB Power Down signal sent', 'error');
    addLog('WARN', 'gNB Power Down initiated. Radio interface going offline.');
}
function startUE() {
    safeFetch('/start_ue', 'Connect UE');
    showToast('Connecting User Equipment…', 'info');
    addLog('INFO', 'UE connection sequence started. Awaiting authentication…');
}
function stopUE() {
    safeFetch('/stop_ue', 'Disconnect UE');
    showToast('UE Disconnect signal sent', 'warn');
    addLog('WARN', 'UE disconnect requested. Terminating PDU sessions.');
}

async function checkCoreHealth() {
    showToast('Running 5G Core health diagnostics…', 'info');
    addLog('INFO', '5G Core health check initiated. Probing AMF / SMF / UPF…');
    await new Promise(r => setTimeout(r, 1200));
    addLog('OK', 'AMF — Service Available. UPF — Packet Forwarding Active. SMF — Sessions Nominal.');
    showToast('Core Health: All NFs operational', 'success');
}

// ── NODES ─────────────────────────────────────────────────────
function loadNodes() {
    const btn = document.getElementById('sync-btn');
    if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }

    fetch('/nodes')
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => renderNodes(d))
        .catch(() => renderNodesFallback())
        .finally(() => {
            if (btn) { btn.style.opacity = ''; btn.style.pointerEvents = ''; }
        });
}

function renderNodes(data) {
    // data expected: array of {name, type, status}
    const el = document.getElementById('nodes');
    if (!Array.isArray(data)) { renderNodesFallback(); return; }
    el.innerHTML = data.map(n => nodeItemHTML(n.name, n.type, n.status)).join('');
}

function renderNodesFallback() {
    const nodes = [
        { label: 'Radio Node (gNB)', icon: 'antenna', status: 'ONLINE' },
        { label: 'Core Gateway (AMF)', icon: 'server', status: 'ONLINE' },
        { label: 'Session Mgmt (SMF)', icon: 'cpu', status: 'ONLINE' },
        { label: 'User Plane (UPF)', icon: 'network', status: 'ONLINE' },
        { label: 'User Equipment (UE)', icon: 'phone', status: 'IDLE' },
    ];
    document.getElementById('nodes').innerHTML = nodes.map(n => nodeItemHTML(n.label, n.icon, n.status)).join('');
}

function nodeItemHTML(label, type, status) {
    const icons = {
        antenna: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon node-icon"><path d="M2 12h4l2-9 4 18 2-9h6"/></svg>`,
        server:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon node-icon"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`,
        cpu:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon node-icon"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M20 15h2M2 9h2M20 9h2M9 2v2M9 20v2"/></svg>`,
        network: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon node-icon"><rect width="6" height="6" x="9" y="2" rx="1"/><rect width="6" height="6" x="2" y="16" rx="1"/><rect width="6" height="6" x="16" y="16" rx="1"/><path d="M12 8v4"/><path d="M12 12H5v4"/><path d="M12 12h7v4"/></svg>`,
        phone:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon node-icon"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
    };
    const iconSVG = icons[type] || icons.server;
    const stClass = status === 'ONLINE' ? 'online' : status === 'IDLE' ? 'idle' : 'offline';

    return `<div class="node-item">
        <span class="node-label">${iconSVG} ${label}</span>
        <span class="node-badge ${stClass}">${status}</span>
    </div>`;
}

// ── TRUST SCORE ────────────────────────────────────────────────
function loadTrust() {
    fetch('/trust')
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => updateTrustUI(d.score, d.status))
        .catch(() => {
            const score = Math.floor(Math.random() * 12) + 74;
            updateTrustUI(score, score > 80 ? 'SECURE' : 'WARNING');
        });
}

function updateTrustUI(score, status) {
    const ring   = document.getElementById('score-ring-fg');
    const valEl  = document.getElementById('score-value');
    const detEl  = document.getElementById('score-details');

    // Animate score number
    animateCounter(valEl, parseInt(valEl.textContent) || 0, score, 900);

    // Update SVG ring (circumference = 2π×50 ≈ 314)
    const circumference = 314;
    const offset = circumference - (score / 100) * circumference;
    ring.style.strokeDashoffset = offset;

    const cfg = {
        SECURE:  { color: 'var(--green)', stroke: '#00E676', label: 'SECURE',  icon: '✔', detail: 'All integrity checks passed.' },
        WARNING: { color: 'var(--amber)', stroke: '#FFB300', label: 'WARNING', icon: '⚠', detail: 'Minor anomalies detected in auth layer.' },
        BREACH:  { color: 'var(--red)',   stroke: '#FF3D00', label: 'BREACH',  icon: '✗', detail: 'Critical integrity failure detected!' },
    };
    const c = cfg[status] || cfg.SECURE;

    ring.style.stroke = c.stroke;
    ring.style.filter = `drop-shadow(0 0 6px ${c.stroke}60)`;

    detEl.innerHTML = `
        <div style="margin-bottom:6px; color: var(--text-muted); font-size:0.78rem; text-transform:uppercase; letter-spacing:1px; font-weight:700;">System State</div>
        <div style="color:${c.color}; font-size:1.05rem; font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:8px;">
            <span>${c.icon}</span> ${c.label}
        </div>
        <div style="color:var(--text-secondary); font-size:0.85rem; line-height:1.5;">${c.detail}</div>
    `;
}

function animateCounter(el, from, to, duration) {
    if (!el) return;
    const start = performance.now();
    function step(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (to - from) * ease);
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ── KPI METRICS ───────────────────────────────────────────────
const kpiTargets = { latency: 8, throughput: 2100, ues: 1, signal: -68 };

function loadKPIs() {
    // Simulate fluctuating values (replace with real fetch when backend is ready)
    const jitter    = (base, pct) => +(base * (1 + (Math.random() - 0.5) * pct)).toFixed(0);
    const latency   = jitter(kpiTargets.latency, 0.3);
    const throughput= jitter(kpiTargets.throughput, 0.15);
    const ues       = kpiTargets.ues + Math.round((Math.random() - 0.5) * 2);
    const signal    = jitter(kpiTargets.signal, 0.05);

    animateCounter(document.getElementById('kpi-val-latency'),   0, latency,    600);
    animateCounter(document.getElementById('kpi-val-throughput'), 0, throughput, 800);
    animateCounter(document.getElementById('kpi-val-ues'),        0, ues,        500);
    animateCounter(document.getElementById('kpi-val-signal'),     0, signal,     500);

    // trend badges
    const latTrend = document.getElementById('kpi-trend-latency');
    latTrend.textContent = latency < 10 ? '▼ Excellent' : latency < 15 ? '▲ Nominal' : '▲ High';
    latTrend.className = 'kpi-trend ' + (latency < 10 ? 'up' : latency < 15 ? 'neutral' : 'down');

    const tpTrend = document.getElementById('kpi-trend-throughput');
    tpTrend.textContent = throughput > 2000 ? '▲ Peak' : throughput > 1500 ? '● Good' : '▼ Low';
    tpTrend.className = 'kpi-trend ' + (throughput > 2000 ? 'up' : throughput > 1500 ? 'neutral' : 'down');
}

// ── LIVE CHARTS ───────────────────────────────────────────────
const MAX_POINTS = 40;
const throughputData = Array.from({ length: MAX_POINTS }, () => Math.random() * 600 + 1700);
const latencyData    = Array.from({ length: MAX_POINTS }, () => Math.random() * 6 + 6);

function drawLineChart(canvasId, data, color, minY, maxY, unit) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.clientWidth || 400;
    const H = canvas.height = 120;
    const PAD = { top: 10, right: 16, bottom: 28, left: 46 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    const step = cW / (data.length - 1);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = PAD.top + (cH / 4) * i;
        ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke();
        const val = (maxY - ((maxY - minY) / 4) * i).toFixed(0);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val, PAD.left - 6, y + 4);
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
    gradient.addColorStop(0, color + '44');
    gradient.addColorStop(1, color + '00');

    ctx.beginPath();
    data.forEach((v, i) => {
        const x = PAD.left + i * step;
        const y = PAD.top + cH - ((v - minY) / (maxY - minY)) * cH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(PAD.left + (data.length - 1) * step, PAD.top + cH);
    ctx.lineTo(PAD.left, PAD.top + cH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v, i) => {
        const x = PAD.left + i * step;
        const y = PAD.top + cH - ((v - minY) / (maxY - minY)) * cH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Last-point dot
    const lx = PAD.left + (data.length - 1) * step;
    const lv = data[data.length - 1];
    const ly = PAD.top + cH - ((lv - minY) / (maxY - minY)) * cH;
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#08090D'; ctx.lineWidth = 2; ctx.stroke();

    // Current value label
    ctx.fillStyle = color;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${lv.toFixed(1)} ${unit}`, lx - 30, ly - 10);
}

function updateCharts() {
    // Push new data points
    throughputData.push(kpiTargets.throughput * (0.85 + Math.random() * 0.3));
    if (throughputData.length > MAX_POINTS) throughputData.shift();

    latencyData.push(kpiTargets.latency * (0.7 + Math.random() * 0.6));
    if (latencyData.length > MAX_POINTS) latencyData.shift();

    drawLineChart('chart-throughput', throughputData, '#00E676', 1200, 2800, 'Mbps');
    drawLineChart('chart-latency',    latencyData,    '#2979FF', 3,    25,   'ms');
}

// ── TOPOLOGY MAP ──────────────────────────────────────────────
function drawTopology() {
    const canvas = document.getElementById('topology-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.clientWidth || 320;
    const H = 180;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    const nodes = [
        { id: 'UE',   x: 0.12, y: 0.5,  label: 'UE',   color: '#B388FF', r: 22 },
        { id: 'gNB',  x: 0.35, y: 0.5,  label: 'gNB',  color: '#2979FF', r: 26 },
        { id: 'AMF',  x: 0.58, y: 0.22, label: 'AMF',  color: '#00E676', r: 22 },
        { id: 'SMF',  x: 0.58, y: 0.5,  label: 'SMF',  color: '#00E676', r: 22 },
        { id: 'UPF',  x: 0.58, y: 0.78, label: 'UPF',  color: '#00E676', r: 22 },
        { id: 'Core', x: 0.83, y: 0.5,  label: '5GC',  color: '#FF6D00', r: 26 },
    ];

    const edges = [
        ['UE','gNB','#B388FF'], ['gNB','AMF','#2979FF66'], ['gNB','SMF','#2979FF66'],
        ['gNB','UPF','#2979FF66'], ['AMF','Core','#00E67666'], ['SMF','Core','#00E67666'],
        ['UPF','Core','#00E67666'],
    ];

    const pos = {};
    nodes.forEach(n => { pos[n.id] = { x: n.x * W, y: n.y * H }; });

    // Draw edges
    edges.forEach(([a, b, color]) => {
        const p1 = pos[a], p2 = pos[b];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color || 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // Draw nodes
    nodes.forEach(n => {
        const { x, y } = pos[n.id];

        // Glow
        const glow = ctx.createRadialGradient(x, y, n.r * 0.3, x, y, n.r * 1.6);
        glow.addColorStop(0, n.color + '22');
        glow.addColorStop(1, n.color + '00');
        ctx.beginPath();
        ctx.arc(x, y, n.r * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Circle
        ctx.beginPath();
        ctx.arc(x, y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = '#0F1117';
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = n.color;
        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, x, y);
    });
}

// ── LOGS ──────────────────────────────────────────────────────
const MAX_LOG_ENTRIES = 80;
let logEntries = [];
let elapsedSeconds = 0;

function addLog(level, msg) {
    const el = document.getElementById('logs-list');
    if (!el) return;

    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-level ${level}">${level}</span>
        <span class="log-msg">${msg}</span>
    `;
    el.appendChild(entry);
    logEntries.push(entry);

    if (logEntries.length > MAX_LOG_ENTRIES) {
        logEntries[0].remove();
        logEntries.shift();
    }

    const autoscroll = document.getElementById('autoscroll-toggle');
    if (autoscroll && autoscroll.checked) {
        const container = document.getElementById('log-container');
        if (container) container.scrollTop = container.scrollHeight;
    }
}

function clearLogs() {
    const el = document.getElementById('logs-list');
    if (el) el.innerHTML = '';
    logEntries = [];
    addLog('INFO', 'Log stream cleared.');
}

function fetchLogs() {
    fetch('/logs')
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => {
            if (typeof data === 'string') addLog('INFO', data);
            else if (Array.isArray(data)) data.forEach(e => addLog(e.level || 'INFO', e.message || e));
        })
        .catch(() => simulateLog());
}

// Simulated log messages when backend is offline
const SIM_LOGS = [
    ['INFO',  'NAS registration request received from UE-1. Processing…'],
    ['OK',    'PDU Session established. QoS flow ID: 7. DRB mapped successfully.'],
    ['INFO',  'Measurement report received: RSRP -72 dBm, RSRQ -9 dB.'],
    ['INFO',  'RRC reconfiguration complete for UE-1.'],
    ['WARN',  'Handover preparation triggered. Target cell: PCI-312.'],
    ['OK',    'Handover execution success. UE-1 now connected to PCI-312.'],
    ['INFO',  'AMF heartbeat: 200 OK. N1/N2 interface nominal.'],
    ['INFO',  'SMF session modification: updated maximum bitrate to 1.2 Gbps.'],
    ['DEBUG', 'PDCP reorder buffer: 0 SDUs. No reorder issues.'],
    ['INFO',  'UPF GTP-U tunnel established. TEIDg: 0x0000A1F3.'],
    ['OK',    'Security mode command accepted. Integrity algorithm: NIA2.'],
    ['DEBUG', 'HARQ feedback: ACK received for HARQ ID 3, TB size 8500 bytes.'],
    ['INFO',  'Scheduling: 14 PRBs allocated for downlink transmission.'],
    ['WARN',  'Retransmission triggered: HARQ process 1, RV index 1.'],
    ['OK',    'Retransmission ACK received. Link budget nominal.'],
    ['INFO',  'UE capability information reported: 5G NR CA Band n78 + n41.'],
    ['INFO',  'Periodic TAU timer updated: T3512 = 54 min.'],
    ['OK',    'Core health check: AMF ✓  SMF ✓  UPF ✓  PCF ✓'],
];
let simLogIndex = 0;

function simulateLog() {
    const [level, msg] = SIM_LOGS[simLogIndex % SIM_LOGS.length];
    addLog(level, msg);
    simLogIndex++;
}

// ── INITIAL SEED LOGS ─────────────────────────────────────────
function seedLogs() {
    addLog('INFO',  'CoreControl Pro initialized. Connecting to backend…');
    addLog('WARN',  'Backend unreachable. Entering offline presentation mode.');
    addLog('INFO',  'Loading cached node topology from last synchronization.');
    addLog('OK',    'Node topology loaded. 5 nodes active: gNB, AMF, SMF, UPF, UE.');
    addLog('INFO',  'Starting live KPI telemetry simulation…');
}

// ── BOOT SEQUENCE ─────────────────────────────────────────────
function boot() {
    seedLogs();
    renderNodesFallback();
    loadTrust();
    loadKPIs();
    drawTopology();
    updateCharts();
}

window.addEventListener('load', boot);

// ── INTERVALS ─────────────────────────────────────────────────
setInterval(fetchLogs,    4000);  // Log refresh
setInterval(loadNodes,    5000);  // Node status refresh
setInterval(loadTrust,    7000);  // Trust score refresh
setInterval(() => { loadKPIs(); updateCharts(); }, 2000); // KPI + charts every 2s
setInterval(drawTopology, 10000); // Topology refresh

// Resize charts on window resize
window.addEventListener('resize', () => {
    drawTopology();
    updateCharts();
function blockIMSI() {
    const imsi = document.getElementById("imsi-input").value;

    fetch('/block_imsi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imsi: imsi })
    })
    .then(res => res.json())
    .then(data => {
        showToast("IMSI Blocked: " + imsi, "error");
        addLog("WARN", "Blocked IMSI: " + imsi);
    });
}
});
function loadLiveIMSI(){

    fetch('/live_imsi')
    .then(res => res.json())
    .then(data => {

        document.getElementById("live-imsi").innerText =
            "IMSI-" + data.imsi;

    });

}

setInterval(loadLiveIMSI, 4000);

loadLiveIMSI();
