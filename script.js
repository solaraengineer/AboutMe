// ════════ THEME TOGGLE ════════
const toggle = document.getElementById('theme-toggle');
const root = document.documentElement;

function getTheme() {
  return localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  toggle.textContent = theme === 'dark' ? '◑' : '◐';
}

setTheme(getTheme());

toggle.addEventListener('click', () => {
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ════════ STREAMING CANVAS ════════
const canvas = document.getElementById('stream-canvas');
const ctx = canvas.getContext('2d');
let w, h, nodes = [];

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}

function initNodes() {
  nodes = [];
  const count = Math.floor((w * h) / 25000);
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1.5
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, w, h);

  const isDark = root.getAttribute('data-theme') === 'dark';
  const dotColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const lineRGB = isDark ? '77,148,255' : '0,102,255';

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    a.x += a.vx;
    a.y += a.vy;
    if (a.x < 0 || a.x > w) a.vx *= -1;
    if (a.y < 0 || a.y > h) a.vy *= -1;

    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();

    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${lineRGB},${0.04 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(draw);
}

window.addEventListener('resize', () => { resize(); initNodes(); });
resize();
initNodes();
draw();