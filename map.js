// ─────────────────────────────────────────────────────────────────
// Solara · System Architect · Interactive Portfolio Map
// ─────────────────────────────────────────────────────────────────

const GITHUB_URL = 'https://github.com/solaraengineer';
const DISCORD_HANDLE = '';

// ──────────────── DATA ────────────────

const ZONES = [
  {
    id: 'wardent',
    name: 'Wardent',
    tagline: 'Custom reverse proxy',
    status: 'production',
    stack: 'Rust · Hyper · rustls · governor · dashmap',
    summary: 'Replaces nginx. TLS termination, hot cert reload, per-IP rate limiting, bot filtering, header injection, ACME passthrough.',
    repo: 'https://github.com/solaraengineer/wardent',
    bbox: { x: 420, y: 290, w: 380, h: 620 },
  },
  {
    id: 'solctl',
    name: 'Sol-ctl',
    tagline: 'Custom container orchestrator with VPC mesh networking',
    status: 'production',
    stack: 'Rust · bollard · netlink · iptables',
    scores: 'Grok 8.7 · Gemini 8.7 · ChatGPT 9.1',
    summary: 'Replaces docker-compose at the orchestration layer. Runs SolaraDocs in production on AWS EC2.',
    repo: 'https://github.com/solaraengineer/sol-ctl',
    bbox: { x: 880, y: 200, w: 620, h: 750 },
  },
  {
    id: 'solaradocs',
    name: 'SolaraDocs',
    tagline: 'Production document collaboration SaaS',
    status: 'production',
    stack: 'Django · Celery · Redis · Postgres · Stripe · Brevo',
    summary: 'Live at solaradocs.net. RBAC, approval workflows, version control, diff view, billing. 9 accounts, 0 revenue.',
    repo: 'https://github.com/solaraengineer/solaradocs',
    site: 'https://solaradocs.net',
    bbox: { x: 1540, y: 270, w: 620, h: 680 },
  },
  {
    id: 'scheduler',
    name: 'Solara-scheduler',
    tagline: 'Custom cron replacement',
    status: 'production',
    stack: 'Rust',
    summary: 'Runs tier reconciliation and promo expiry on EC2. Daemon + CLI over unix socket.',
    repo: 'https://github.com/solaraengineer/solara-scheduler',
    bbox: { x: 770, y: 1100, w: 400, h: 300 },
  },
  {
    id: 'solgit',
    name: 'Sol-git',
    tagline: 'Custom version control system',
    status: 'working',
    stack: 'Rust',
    summary: 'Local-only. Hash-addressed object store, init/add/commit/log/diff. No server-side API yet.',
    bbox: { x: 340, y: 1100, w: 340, h: 300 },
  },
];

const NODES = [
  // ── Edge (no zone)
  { id: 'client', label: 'Client', sub: 'Browser', type: 'external', x: 110, y: 620, detail: {
    title: 'Client', tag: 'External · End user',
    description: 'Browser making HTTPS requests to fwaeh.cloud and solaradocs.net.',
    bullets: ['Standard browser TLS', 'Initiates all request flows'],
  }},
  { id: 'cloudflare', label: 'Cloudflare', sub: 'DNS · Proxy', type: 'external', x: 290, y: 620, detail: {
    title: 'Cloudflare', tag: 'External · Edge',
    description: 'DNS, proxying, and basic edge protection in front of the origin.',
    bullets: ['DNS for fwaeh.cloud and solaradocs.net', 'Proxied A records to the EC2 elastic IP', 'TLS to origin terminated by Wardent'],
  }},

  // ── Wardent
  { id: 'w_tls',    zone: 'wardent', label: 'TLS termination',  sub: 'rustls', type: 'custom', x: 530, y: 380, detail: {
    title: 'TLS termination', tag: 'Custom · Wardent',
    description: 'rustls-based TLS. Hot reload on cert changes via mtime polling; atomic swap of the shared ServerConfig.',
    bullets: [
      'PKCS#8, PKCS#1, SEC1 key support',
      'mtime polling for cert/key files',
      'Atomic Arc<RwLock<Arc<ServerConfig>>> swap — no dropped connections',
      'SNI-aware multi-domain support',
    ],
    stack: ['Rust', 'rustls', 'tokio'],
  }},
  { id: 'w_rate',   zone: 'wardent', label: 'Rate limiting',    sub: 'governor · dashmap', type: 'custom', x: 720, y: 430, detail: {
    title: 'Rate limiting', tag: 'Custom · Wardent',
    description: 'Per-IP token bucket using governor. dashmap keyed by client IP. Background task evicts stale buckets.',
    bullets: [
      'Per-IP token bucket via governor',
      'dashmap concurrent map for state',
      'Background cleanup task evicts idle entries',
      'Configurable per-route limits',
    ],
    stack: ['Rust', 'governor', 'dashmap'],
  }},
  { id: 'w_bot',    zone: 'wardent', label: 'Bot filter',       sub: 'regex UA match', type: 'custom', x: 530, y: 540, detail: {
    title: 'Bot filter', tag: 'Custom · Wardent',
    description: 'Regex-based user-agent matching. Blocks known crawlers and AI scrapers before they hit the upstream.',
    bullets: [
      'Blocks GPTBot, Googlebot, CCBot, Bingbot, etc.',
      'Compiled regex per pattern',
      'Returns 403 before forwarding',
    ],
  }},
  { id: 'w_header', zone: 'wardent', label: 'Header injection', sub: 'insert semantics', type: 'custom', x: 720, y: 580, detail: {
    title: 'Header injection', tag: 'Custom · Wardent',
    description: 'Arbitrary key-value headers from config. Insert semantics — overwrites client-supplied headers to prevent spoofing.',
    bullets: [
      'X-Wardent-Secret injected before forwarding',
      'Overwrite, not append — anti-spoofing',
      'Per-upstream header sets',
    ],
  }},
  { id: 'w_errors', zone: 'wardent', label: 'Custom error pages', sub: 'in-memory cache', type: 'custom', x: 530, y: 690, detail: {
    title: 'Custom error pages', tag: 'Custom · Wardent',
    description: 'Reads error_<code>.html files at startup, caches in memory, serves on matching upstream status.',
    bullets: [
      'Loaded once at boot',
      'Matched by HTTP status code',
      'Fallback to plain text if no template',
    ],
  }},
  { id: 'w_acme',   zone: 'wardent', label: 'ACME passthrough', sub: '/.well-known/acme-challenge', type: 'custom', x: 720, y: 740, detail: {
    title: 'ACME passthrough', tag: 'Custom · Wardent',
    description: 'Serves /.well-known/acme-challenge/* directly from acme_webroot. Path traversal guard rejects ../ and absolute paths.',
    bullets: [
      'Direct file serve, no upstream forwarding',
      'Path traversal guard',
      'Lets Let\'s Encrypt run without stopping the proxy',
    ],
  }},
  { id: 'w_timeout', zone: 'wardent', label: 'Timeout overrides', sub: 'per-path starts_with', type: 'custom', x: 530, y: 830, detail: {
    title: 'Timeout overrides', tag: 'Custom · Wardent',
    description: 'Per-path timeouts matched by starts_with in declaration order. First match wins.',
    bullets: [
      'Declaration order matters',
      'Longer prefixes should come first',
      'Falls back to default upstream timeout',
    ],
  }},

  // ── Sol-ctl
  { id: 's_cli',     zone: 'solctl', label: 'solctl',          sub: 'CLI', type: 'custom', x: 980, y: 290, detail: {
    title: 'solctl', tag: 'Custom · CLI',
    description: 'CLI front-end to sol-control. Talks over a unix socket. Subcommands cover the full container lifecycle.',
    bullets: ['createvpc', 'deploy', 'assign', 'rebuild', 'restart', 'destroy', 'join', 'addenv', 'list'],
    stack: ['Rust', 'clap'],
  }},
  { id: 's_control', zone: 'solctl', label: 'sol-control',     sub: 'daemon · systemd', type: 'custom', x: 1180, y: 350, detail: {
    title: 'sol-control', tag: 'Custom · Daemon',
    description: 'Long-running orchestration daemon. Systemd unit. Unix socket IPC. Persists state to disk and reconciles on boot.',
    bullets: [
      'Systemd-managed, unix socket IPC',
      'State persistence + reconciliation on startup',
      'Spawns one sol-vpc child per VPC',
      'Docker API access via bollard',
      'Emits targets.json on every lifecycle event',
    ],
    stack: ['Rust', 'tokio', 'bollard', 'serde'],
  }},
  { id: 's_network', zone: 'solctl', label: 'Networking',      sub: 'mesh IPs · iptables', type: 'custom', x: 1400, y: 340, detail: {
    title: 'Networking detail', tag: 'Custom · Linux kernel',
    description: 'Per-VPC bridge with veth pairs into container netns. Mesh IPs in 172.100.x.0/24. iptables FORWARD + MASQUERADE rules.',
    bullets: [
      'Mesh IPs: 172.100.<vpc>.0/24',
      'IFNAMSIZ 15-char bridge name limit handled explicitly',
      'veth pairs into container network namespaces',
      'iptables FORWARD rules for non-docker0 bridges',
      'MASQUERADE for outbound NAT',
    ],
  }},
  { id: 's_vpc',     zone: 'solctl', label: 'sol-vpc',         sub: 'per-VPC child', type: 'custom', x: 1380, y: 490, detail: {
    title: 'sol-vpc', tag: 'Custom · Process',
    description: 'Per-VPC child process spawned by sol-control. Owns bridge creation, veth wiring, netns assignment, iptables rules.',
    bullets: [
      'One process per VPC',
      'Creates bridge + veth pairs + netns wiring',
      'Applies iptables rules per VPC',
      'Cleanup on shutdown',
    ],
  }},
  { id: 's_router',  zone: 'solctl', label: 'Router :9040',    sub: 'HTTP frontend', type: 'custom', x: 980, y: 800, detail: {
    title: 'Router', tag: 'Custom · HTTP frontend',
    description: 'HTTP front-end on :9040. Validates X-Wardent-Secret. Routes by X-Sol-Environment header to the target VPC\'s web container mesh IP.',
    bullets: [
      'Listens on :9040 (private, behind Wardent)',
      'Validates X-Wardent-Secret to prevent direct ingress',
      'X-Sol-Environment header selects target VPC',
      'Forwards to web container mesh IP inside VPC',
    ],
  }},
  { id: 's_vols',    zone: 'solctl', label: 'Volumes',         sub: 'VPC-scoped binds', type: 'custom', x: 1180, y: 530, detail: {
    title: 'Volumes', tag: 'Custom · Storage',
    description: 'VPC-scoped bind mounts. All paths enforced under /var/sol-ctl/volumes/. Persist across container rebuilds.',
    bullets: [
      'Bind mounts only — no docker volumes',
      'Path enforcement: must resolve under /var/sol-ctl/volumes/',
      'Survive container rebuilds',
      'Per-VPC scoping',
    ],
  }},
  { id: 's_targets', zone: 'solctl', label: 'targets.json',    sub: 'Prometheus file_sd', type: 'custom', x: 1400, y: 660, detail: {
    title: 'targets.json', tag: 'Custom · Service discovery',
    description: 'Prometheus file_sd_config generation. Atomic writes via rename. Service labels derived from container metadata.',
    bullets: [
      'Regenerated on every container lifecycle event',
      'Atomic write via tmp file + rename',
      'Labels derived from VPC + service name',
      'Consumed by Prometheus file_sd_config',
    ],
  }},

  // ── SolaraDocs
  { id: 'sd_django',  zone: 'solaradocs', label: 'Django app',       sub: 'web · RBAC', type: 'custom', x: 1660, y: 620, detail: {
    title: 'Django app', tag: 'Custom · Web',
    description: 'Production Django app. RBAC (owner/contributor/team), approval workflows, audit logs, version control, diff view, Google Docs import.',
    bullets: [
      'Three role tiers: owner, contributor, team',
      'Approval workflow for changes',
      'Full audit log of every action',
      'Document version control with diff view',
      'Google Docs import path',
    ],
    stack: ['Python', 'Django', 'gunicorn'],
    links: [{ label: 'solaradocs.net', href: 'https://solaradocs.net' }],
  }},
  { id: 'sd_stripe',  zone: 'solaradocs', label: 'Stripe',           sub: 'billing', type: 'external', x: 1880, y: 350, detail: {
    title: 'Stripe', tag: 'External · Billing',
    description: 'Three flat tiers ($6, $16, $36). Webhook-driven state. Customer portal + invoice PDF download.',
    bullets: [
      'Tiers: $6 / $16 / $36 flat',
      'Webhooks: invoice.paid, payment_failed, charge.refunded',
      'Stripe billing portal embedded',
      'Invoice PDF download',
    ],
  }},
  { id: 'sd_celery',  zone: 'solaradocs', label: 'Celery + Redis',   sub: 'async tasks', type: 'custom', x: 1880, y: 760, detail: {
    title: 'Celery + Redis', tag: 'Infra · Async',
    description: 'Celery workers with Redis as broker and result backend. Handles email sends, webhook processing, scheduled tasks.',
    bullets: [
      'Async email sending',
      'Webhook handler offloading',
      'Periodic scheduled tasks',
      'Redis as broker + result backend',
    ],
    stack: ['Celery', 'Redis'],
  }},
  { id: 'sd_neon',    zone: 'solaradocs', label: 'NeonDB',           sub: 'Postgres', type: 'external', x: 2080, y: 880, detail: {
    title: 'NeonDB', tag: 'External · Database',
    description: 'Serverless Postgres on paid tier. Hard cap at 12 PLN to keep costs deterministic.',
    bullets: [
      'Serverless Postgres',
      'Paid tier with 12 PLN cap',
      'Connection pooling enabled',
    ],
  }},
  { id: 'sd_brevo',   zone: 'solaradocs', label: 'Brevo',            sub: 'SMTP relay', type: 'external', x: 2080, y: 450, detail: {
    title: 'Brevo', tag: 'External · Email',
    description: 'Transactional email via SMTP relay. Used for billing notifications, password resets, approval requests.',
    bullets: ['SMTP relay', 'Transactional only — no marketing'],
  }},
  { id: 'sd_r2',      zone: 'solaradocs', label: 'Cloudflare R2',    sub: 'version backups', type: 'external', x: 2080, y: 620, detail: {
    title: 'Cloudflare R2', tag: 'External · Object storage',
    description: 'S3-compatible object storage. Holds versioned document backups. Egress-free.',
    bullets: ['S3-compatible API', 'Egress-free pricing', 'Version backup destination'],
  }},
  { id: 'sd_obs',     zone: 'solaradocs', label: 'Observability',    sub: 'Prom · Grafana · Loki · Tempo · OTel', type: 'infra', x: 1660, y: 870, detail: {
    title: 'Observability stack', tag: 'Infra · Telemetry',
    description: 'Full observability: Prometheus + Grafana + Loki + Promtail + Tempo + OTel Collector + Alertmanager. node-exporter and redis-exporter for system + redis metrics.',
    bullets: [
      'Prometheus + Alertmanager — metrics + alerting',
      'Grafana — dashboards',
      'Loki + Promtail — log aggregation',
      'Tempo + OpenTelemetry Collector — traces',
      'node-exporter, redis-exporter',
      'Service discovery via sol-ctl targets.json',
    ],
  }},

  // ── Solara-scheduler
  { id: 'sc_daemon', zone: 'scheduler', label: 'Daemon',       sub: 'long-running', type: 'custom', x: 870, y: 1190, detail: {
    title: 'Daemon', tag: 'Custom · Process',
    description: 'Long-running scheduler process. Reads jobs.toml at boot. Fires jobs on schedule. Same unix-socket IPC pattern as sol-ctl.',
    bullets: ['Reads jobs.toml on boot', 'Schedules and fires jobs', 'Unix socket IPC for control'],
  }},
  { id: 'sc_cli',    zone: 'scheduler', label: 'Client bin',   sub: 'CLI', type: 'custom', x: 870, y: 1320, detail: {
    title: 'Client binary', tag: 'Custom · CLI',
    description: 'CLI client to the scheduler daemon. List, trigger, inspect, reload jobs.',
    bullets: ['Unix socket client', 'List / trigger / inspect / reload'],
  }},
  { id: 'sc_jobs',   zone: 'scheduler', label: 'jobs.toml',    sub: 'config', type: 'custom', x: 1070, y: 1240, detail: {
    title: 'jobs.toml', tag: 'Config · Schedule',
    description: 'Declarative job definitions. Schedule, command, working directory, environment per job.',
    bullets: ['TOML format', 'Cron-style schedule expressions', 'Per-job env and cwd'],
  }},

  // ── Sol-git
  { id: 'sg_store',  zone: 'solgit', label: 'Object store',    sub: 'hash-addressed', type: 'custom', x: 450, y: 1190, detail: {
    title: 'Hash-addressed object store', tag: 'Custom · Storage',
    description: 'Content-addressable object store. Blobs, trees, commits indexed by hash of content.',
    bullets: ['SHA-based content addressing', 'Blobs, trees, commits', 'Local disk only'],
  }},
  { id: 'sg_ops',    zone: 'solgit', label: 'CLI ops',         sub: 'init · add · commit · log', type: 'custom', x: 570, y: 1310, detail: {
    title: 'Local operations', tag: 'Custom · CLI',
    description: 'Core porcelain. No server-side / network operations yet.',
    bullets: ['init', 'add', 'commit', 'log', 'diff'],
  }},

];

const CONNECTIONS = [
  // Request flow (animated)
  { from: 'client',     to: 'cloudflare', flow: true, label: 'HTTPS' },
  { from: 'cloudflare', to: 'w_tls',      flow: true, label: 'HTTPS' },
  { from: 'w_tls',      to: 'w_bot',      flow: true },
  { from: 'w_bot',      to: 'w_rate',     flow: true },
  { from: 'w_rate',     to: 'w_header',   flow: true },
  { from: 'w_header',   to: 's_router',   flow: true, label: 'X-Wardent-Secret' },
  { from: 's_router',   to: 'sd_django',  flow: true, label: 'X-Sol-Environment' },

  // Wardent peripherals
  { from: 'w_tls',      to: 'w_errors' },
  { from: 'w_tls',      to: 'w_acme' },
  { from: 'w_tls',      to: 'w_timeout' },

  // SolaraDocs internal
  { from: 'sd_django',  to: 'sd_celery',  flow: true },
  { from: 'sd_django',  to: 'sd_neon',    flow: true, label: 'SQL' },
  { from: 'sd_celery',  to: 'sd_neon' },
  { from: 'sd_django',  to: 'sd_stripe',  flow: true },
  { from: 'sd_django',  to: 'sd_brevo' },
  { from: 'sd_django',  to: 'sd_r2' },
  { from: 'sd_django',  to: 'sd_obs',     dashed: true },

  // Sol-ctl internal
  { from: 's_cli',      to: 's_control' },
  { from: 's_control',  to: 's_vpc' },
  { from: 's_control',  to: 's_router' },
  { from: 's_control',  to: 's_targets' },
  { from: 's_control',  to: 's_vols' },
  { from: 's_vpc',      to: 's_network' },
  { from: 's_targets',  to: 'sd_obs', dashed: true, label: 'file_sd' },

  // Scheduler
  { from: 'sc_cli',     to: 'sc_daemon' },
  { from: 'sc_daemon',  to: 'sc_jobs' },
  { from: 'sc_daemon',  to: 'sd_django', dashed: true, label: 'tier reconciliation' },

  // Sol-git internal
  { from: 'sg_ops',     to: 'sg_store' },
];

// ──────────────── RENDER ────────────────

const $stage      = document.getElementById('stage');
const $svg        = document.getElementById('connections');
const $zonesLayer = document.getElementById('zones');
const $nodesLayer = document.getElementById('nodes');
const $panel      = document.getElementById('panel');
const $panelBody  = document.getElementById('panel-body');
const $quicknav   = document.getElementById('quicknav');

const WORLD = { w: 2400, h: 1500 };
$svg.setAttribute('viewBox', `0 0 ${WORLD.w} ${WORLD.h}`);
$svg.setAttribute('width', WORLD.w);
$svg.setAttribute('height', WORLD.h);
$stage.style.width  = WORLD.w + 'px';
$stage.style.height = WORLD.h + 'px';

const nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));
const zoneById = Object.fromEntries(ZONES.map(z => [z.id, z]));

// Zones
for (const zone of ZONES) {
  const el = document.createElement('div');
  el.className = 'zone';
  el.dataset.zoneId = zone.id;
  el.style.left   = zone.bbox.x + 'px';
  el.style.top    = zone.bbox.y + 'px';
  el.style.width  = zone.bbox.w + 'px';
  el.style.height = zone.bbox.h + 'px';
  el.innerHTML = `
    <div class="zone-header">
      <span class="zone-name">${zone.name}</span>
      <span class="zone-status status-${zone.status}">${zone.status.toUpperCase()}</span>
    </div>
    <div class="zone-tagline">${zone.tagline}</div>
  `;
  el.addEventListener('click', e => {
    if (e.target.closest('.node')) return;
    openZone(zone.id);
  });
  $zonesLayer.appendChild(el);
}

// Connections
const SVG_NS = 'http://www.w3.org/2000/svg';
const connectionEls = [];
const packets = [];

for (const c of CONNECTIONS) {
  const a = nodeById[c.from];
  const b = nodeById[c.to];
  if (!a || !b) continue;
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', a.x);
  line.setAttribute('y1', a.y);
  line.setAttribute('x2', b.x);
  line.setAttribute('y2', b.y);
  line.setAttribute('class', `conn ${c.flow ? 'flow' : ''} ${c.dashed ? 'dashed' : ''}`);
  $svg.appendChild(line);
  connectionEls.push({ line, conn: c });

  if (c.label) {
    const text = document.createElementNS(SVG_NS, 'text');
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    text.setAttribute('x', mx);
    text.setAttribute('y', my - 6);
    text.setAttribute('class', 'conn-label');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = c.label;
    $svg.appendChild(text);
  }

  if (c.flow) {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', 3);
    dot.setAttribute('class', 'packet');
    $svg.appendChild(dot);
    packets.push({
      el: dot,
      ax: a.x, ay: a.y, bx: b.x, by: b.y,
      duration: 2400 + Math.random() * 1200,
      offset: Math.random(),
    });
  }
}

// Nodes
for (const n of NODES) {
  const el = document.createElement('button');
  el.className = `node type-${n.type}`;
  el.dataset.nodeId = n.id;
  el.style.left = n.x + 'px';
  el.style.top  = n.y + 'px';
  el.innerHTML = `
    <span class="node-dot"></span>
    <span class="node-label">${n.label}</span>
    ${n.sub ? `<span class="node-sub">${n.sub}</span>` : ''}
  `;
  el.addEventListener('click', e => {
    e.stopPropagation();
    openNode(n.id);
  });
  $nodesLayer.appendChild(el);
}

// Quick nav
for (const z of ZONES) {
  const btn = document.createElement('button');
  btn.className = 'quicknav-item';
  btn.textContent = z.name;
  btn.addEventListener('click', () => focusZone(z.id));
  $quicknav.appendChild(btn);
}

// ──────────────── PANEL ────────────────

function openNode(id) {
  const n = nodeById[id];
  if (!n) return;
  const d = n.detail || {};
  const zone = n.zone ? zoneById[n.zone] : null;
  $panelBody.innerHTML = `
    <div class="panel-eyebrow">${zone ? zone.name : 'Edge'}</div>
    <h2 class="panel-title">${d.title || n.label}</h2>
    ${d.tag ? `<div class="panel-tag">${d.tag}</div>` : ''}
    ${d.description ? `<p class="panel-desc">${d.description}</p>` : ''}
    ${d.bullets ? `
      <h3 class="panel-h">Details</h3>
      <ul class="panel-list">
        ${d.bullets.map(b => `<li>${b}</li>`).join('')}
      </ul>` : ''}
    ${d.stack ? `
      <h3 class="panel-h">Stack</h3>
      <div class="panel-chips">
        ${d.stack.map(s => `<span class="chip">${s}</span>`).join('')}
      </div>` : ''}
    ${d.links ? `
      <h3 class="panel-h">Links</h3>
      <div class="panel-links">
        ${d.links.map(l => `<a href="${l.href}" target="_blank" rel="noopener">${l.label} →</a>`).join('')}
      </div>` : ''}
  `;
  showPanel();
  highlightNode(id);
}

function openZone(id) {
  const z = zoneById[id];
  if (!z) return;
  const zoneNodes = NODES.filter(n => n.zone === id);
  const linkRow = (z.repo || z.site) ? `
    <div class="panel-links inline">
      ${z.repo ? `<a href="${z.repo}" target="_blank" rel="noopener">GitHub →</a>` : ''}
      ${z.site ? `<a href="${z.site}" target="_blank" rel="noopener">${z.site.replace(/^https?:\/\//, '')} →</a>` : ''}
    </div>` : '';
  $panelBody.innerHTML = `
    <div class="panel-eyebrow">Zone</div>
    <h2 class="panel-title">${z.name}</h2>
    <div class="panel-tag">${z.tagline}</div>
    <div class="panel-meta">
      <span class="status-${z.status}">${z.status.toUpperCase()}</span>
      ${z.stack ? `<span class="meta-sep">·</span><span>${z.stack}</span>` : ''}
    </div>
    ${z.summary ? `<p class="panel-desc">${z.summary}</p>` : ''}
    ${z.scores ? `<div class="panel-scores"><strong>AI Review:</strong> ${z.scores}</div>` : ''}
    ${linkRow}
    <h3 class="panel-h">Components</h3>
    <ul class="panel-nodelist">
      ${zoneNodes.map(n => `
        <li><button class="panel-nodelink" data-node-id="${n.id}">
          <span class="node-dot type-${n.type}"></span>
          <span><strong>${n.label}</strong>${n.sub ? ` <span class="muted">${n.sub}</span>` : ''}</span>
        </button></li>`).join('')}
    </ul>
  `;
  $panelBody.querySelectorAll('.panel-nodelink').forEach(b => {
    b.addEventListener('click', () => openNode(b.dataset.nodeId));
  });
  showPanel();
  clearHighlight();
}

function showPanel() {
  $panel.setAttribute('aria-hidden', 'false');
  hideAbout();
}
function hidePanel() {
  $panel.setAttribute('aria-hidden', 'true');
  clearHighlight();
}

function highlightNode(id) {
  document.querySelectorAll('.node').forEach(el => {
    el.classList.toggle('active', el.dataset.nodeId === id);
    el.classList.toggle('dim', el.dataset.nodeId !== id);
  });
  connectionEls.forEach(({ line, conn }) => {
    const active = conn.from === id || conn.to === id;
    line.classList.toggle('active', active);
  });
}
function clearHighlight() {
  document.querySelectorAll('.node').forEach(el => {
    el.classList.remove('active', 'dim');
  });
  connectionEls.forEach(({ line }) => line.classList.remove('active'));
}

document.getElementById('panel-close').addEventListener('click', hidePanel);
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'Escape') { hidePanel(); hideAbout(); return; }
  if (e.key === '+' || e.key === '=') { zoomBy(1.5); e.preventDefault(); return; }
  if (e.key === '-' || e.key === '_') { zoomBy(1 / 1.5); e.preventDefault(); return; }
  if (e.key === '0') { fit(); e.preventDefault(); return; }
});

// ──────────────── ABOUT PANEL ────────────────

const $about = document.getElementById('about');
document.getElementById('btn-about').addEventListener('click', () => {
  $about.setAttribute('aria-hidden', 'false');
});
document.getElementById('about-close').addEventListener('click', hideAbout);
function hideAbout() { $about.setAttribute('aria-hidden', 'true'); }

// Wire up GitHub / contact links in the About panel
document.querySelectorAll('[data-link="github"]').forEach(a => a.href = GITHUB_URL);
if (DISCORD_HANDLE) {
  document.querySelectorAll('[data-link="discord-value"]').forEach(el => el.textContent = DISCORD_HANDLE);
} else {
  document.querySelectorAll('[data-link="discord-row"]').forEach(el => el.remove());
}

// ──────────────── PAN / ZOOM ────────────────

const view = { tx: 0, ty: 0, s: 1 };
const MIN_S = 0.15;
const MAX_S = 3.5;
const $map = document.getElementById('map');
const clampS = s => Math.max(MIN_S, Math.min(MAX_S, s));

function applyTransform() {
  $stage.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`;
}

function fit() {
  const rect = $map.getBoundingClientRect();
  const pad = 24;
  const sx = (rect.width  - pad * 2) / WORLD.w;
  const sy = (rect.height - pad * 2) / WORLD.h;
  view.s  = Math.min(sx, sy, MAX_S);
  view.tx = (rect.width  - WORLD.w * view.s) / 2;
  view.ty = (rect.height - WORLD.h * view.s) / 2;
  applyTransform();
}
window.addEventListener('resize', fit);

function focusZone(id) {
  const z = zoneById[id];
  if (!z) return;
  const rect = $map.getBoundingClientRect();
  const targetScale = clampS(Math.min(
    (rect.width  - 80) / z.bbox.w,
    (rect.height - 80) / z.bbox.h,
    1.8
  ));
  const cx = z.bbox.x + z.bbox.w / 2;
  const cy = z.bbox.y + z.bbox.h / 2;
  animateTo({
    tx: rect.width / 2 - cx * targetScale,
    ty: rect.height / 2 - cy * targetScale,
    s: targetScale,
  });
  openZone(id);
}

function animateTo(target, duration = 500) {
  const start = { ...view };
  const t0 = performance.now();
  function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    view.tx = start.tx + (target.tx - start.tx) * e;
    view.ty = start.ty + (target.ty - start.ty) * e;
    view.s  = start.s  + (target.s  - start.s)  * e;
    applyTransform();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Drag pan
let dragging = false, dragStart = null, didPan = false;
$map.addEventListener('pointerdown', e => {
  if (e.target.closest('.node') || e.target.closest('.zone-header')) return;
  dragging = true;
  didPan = false;
  dragStart = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  $map.setPointerCapture(e.pointerId);
  $map.classList.add('dragging');
});
$map.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) didPan = true;
  view.tx = dragStart.tx + dx;
  view.ty = dragStart.ty + dy;
  applyTransform();
});
function endDrag(e) {
  if (!dragging) return;
  dragging = false;
  $map.classList.remove('dragging');
  try { $map.releasePointerCapture(e.pointerId); } catch {}
}
$map.addEventListener('pointerup', endDrag);
$map.addEventListener('pointercancel', endDrag);

// Wheel zoom — trackpad-friendly, line/page deltas normalized
$map.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = $map.getBoundingClientRect();
  const dx = e.clientX - rect.left;
  const dy = e.clientY - rect.top;
  let dz = e.deltaY;
  if (e.deltaMode === 1) dz *= 16;
  else if (e.deltaMode === 2) dz *= 100;
  const factor = Math.exp(-dz * 0.0025);
  const newS = clampS(view.s * factor);
  const k = newS / view.s;
  view.tx = dx - (dx - view.tx) * k;
  view.ty = dy - (dy - view.ty) * k;
  view.s = newS;
  applyTransform();
}, { passive: false });

// Zoom buttons — anchor on map center
function zoomBy(factor) {
  const rect = $map.getBoundingClientRect();
  const dx = rect.width / 2, dy = rect.height / 2;
  const newS = clampS(view.s * factor);
  const k = newS / view.s;
  animateTo({
    tx: dx - (dx - view.tx) * k,
    ty: dy - (dy - view.ty) * k,
    s: newS,
  }, 180);
}
document.getElementById('zoom-in').addEventListener('click',  () => zoomBy(1.5));
document.getElementById('zoom-out').addEventListener('click', () => zoomBy(1 / 1.5));
document.getElementById('zoom-reset').addEventListener('click', fit);
document.getElementById('btn-fit').addEventListener('click', fit);

// Touch pinch zoom
const pinch = { active: false, d0: 0, s0: 1, cx: 0, cy: 0 };
$map.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    pinch.active = true;
    const [a, b] = e.touches;
    pinch.d0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinch.s0 = view.s;
    const rect = $map.getBoundingClientRect();
    pinch.cx = (a.clientX + b.clientX) / 2 - rect.left;
    pinch.cy = (a.clientY + b.clientY) / 2 - rect.top;
  }
}, { passive: true });
$map.addEventListener('touchmove', e => {
  if (!pinch.active || e.touches.length !== 2) return;
  const [a, b] = e.touches;
  const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const newS = clampS(pinch.s0 * (d / pinch.d0));
  const k = newS / view.s;
  view.tx = pinch.cx - (pinch.cx - view.tx) * k;
  view.ty = pinch.cy - (pinch.cy - view.ty) * k;
  view.s = newS;
  applyTransform();
}, { passive: true });
$map.addEventListener('touchend', () => { pinch.active = false; });

// ──────────────── PACKET ANIMATION ────────────────

function tickPackets(now) {
  for (const p of packets) {
    const t = ((now / p.duration) + p.offset) % 1;
    p.el.setAttribute('cx', p.ax + (p.bx - p.ax) * t);
    p.el.setAttribute('cy', p.ay + (p.by - p.ay) * t);
  }
  requestAnimationFrame(tickPackets);
}
requestAnimationFrame(tickPackets);

// Outside click closes panel — but not if the user just panned
$map.addEventListener('click', e => {
  if (didPan) return;
  if (e.target === $map || e.target === $stage || e.target.classList.contains('bg-grid')) hidePanel();
});

// Initial fit
fit();
