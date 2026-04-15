// ════════ 3D INTRO — Studio Display Zoom-Through ════════
// Loads the Studio Display .glb, renders a stylized portfolio hero on its
// screen, then zooms the camera through the screen and fades to reveal the
// real portfolio underneath.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Pre-webgl studio backdrop. Dark grey so there's no flash of a light void
// before Three.js lands the first frame. The real page's --bg is applied on
// top of this once the theme has been read, so the final fade handoff blends
// into whichever theme is active.
const STUDIO_BG = '#1a1a1d';

const overlay = document.getElementById('intro-3d');
const canvasEl = document.getElementById('intro-canvas');

// Graceful exit helper — tears down overlay + restores scroll.
function teardown(immediate = false) {
  document.body.classList.remove('intro-active');
  if (immediate) {
    overlay.style.transition = 'none';
    overlay.style.opacity = '0';
  } else {
    overlay.classList.add('intro-done');
  }
  // Wait out the 1.4s CSS opacity/blur transition before removing element.
  setTimeout(() => {
    overlay.style.display = 'none';
  }, immediate ? 0 : 1500);
}

// Respect reduced-motion.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  teardown(true);
} else {
  document.body.classList.add('intro-active');
  runIntro().catch((err) => {
    console.error('[intro] failed:', err);
    teardown(true);
  });
}

async function runIntro() {
  // Wait for webfonts so the canvas texture renders with Sora/JetBrains Mono
  // rather than a fallback. Non-blocking if the browser lacks the API.
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (_) {}
  }

  // ── Read theme from live CSS variables ──────────────────────────────────
  // The 3D environment is a dimly-lit dark studio regardless of theme. The
  // SCREEN content stays theme-aware, AND the overlay element's background
  // is set to the theme's --bg — so when the canvas fades out, the pixels
  // behind it already match the real page body and the handoff is seamless.
  const theme = readTheme();

  // Immediately slave the overlay bg to the real page bg so the final fade
  // dissolves into a pixel-identical color instead of a contrasting void.
  overlay.style.background = theme.BG;

  // ── Scene ────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  // Radial-gradient backdrop: a subtle hotspot behind the monitor falling
  // off to near-black at the corners. Gives depth without harsh contrast so
  // the scene reads as a dimly-lit studio cyc rather than a flat void.
  scene.background = createStudioBackdrop();
  // No fog — we want crisp edges on the monitor silhouette.

  // ── Camera ───────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  const camStart = new THREE.Vector3(0, 0.05, 5.2);
  const camEnd = new THREE.Vector3(0, 0, 1.15);
  camera.position.copy(camStart);
  camera.lookAt(0, 0, 0);

  // ── Renderer ─────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Filmic tone mapping — handles the IBL-lit aluminum without blowing out
  // the highlights or crushing the shadows.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  // Soft contact shadow under the monitor. PCFSoft + a wide radius gives
  // the shadow a natural falloff rather than a hard drop.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Lighting ─────────────────────────────────────────────────────────────
  // Image-based lighting is doing the heavy lifting here: RoomEnvironment
  // gives the model soft, natural illumination from every direction (which
  // is how a real object sits in a dim studio — lit by the walls and the
  // ceiling, not a harsh spotlight). PMREMGenerator turns the procedural
  // scene into a pre-filtered cubemap the PBR materials can sample.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envRT.texture;
  // Dim the environment to match the "dimly-lit studio" vibe — RoomEnvironment
  // is a bright white box by default; this scales its contribution down so
  // the whole scene reads as a low-key studio rather than a product shoot.
  scene.environmentIntensity = 0.65;
  pmrem.dispose();

  // Gentle sky→ground bias so the top of the monitor reads slightly lighter
  // than the underside, sourcing the feeling of an overhead diffuse source.
  const hemi = new THREE.HemisphereLight(0xdadada, 0x161618, 0.35);
  scene.add(hemi);

  // Floor of ambient so no facet ever crushes to pure black.
  scene.add(new THREE.AmbientLight(0xffffff, 0.28));

  // Single soft shadow-caster. Its directional contribution is tiny (the
  // IBL already handles most of the shading) — it exists almost entirely to
  // drop a soft, natural-looking contact shadow beneath the monitor. The
  // generous shadow.radius + low groundMat opacity make it read as an
  // ambient occlusion pool, not a hard drop shadow.
  const shadowLight = new THREE.DirectionalLight(0xffffff, 0.25);
  shadowLight.position.set(2, 6, 2.5);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.set(2048, 2048);
  shadowLight.shadow.camera.near = 0.1;
  shadowLight.shadow.camera.far = 20;
  shadowLight.shadow.camera.left = -4;
  shadowLight.shadow.camera.right = 4;
  shadowLight.shadow.camera.top = 4;
  shadowLight.shadow.camera.bottom = -4;
  shadowLight.shadow.bias = -0.0001;
  shadowLight.shadow.normalBias = 0.02;
  shadowLight.shadow.radius = 14; // very soft, diffuse edge
  scene.add(shadowLight);

  // ── Portfolio preview texture ────────────────────────────────────────────
  const screenTexture = createPortfolioTexture(theme);

  // ── Load the Studio Display ──────────────────────────────────────────────
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load('studio_display.glb', resolve, undefined, reject);
  });

  const model = gltf.scene;

  // Auto-center + scale the model. We target a scale where the overall model
  // is ~2.6 world units in its longest axis; the camera positions are then
  // computed relative to the detected screen's actual world bounds below.
  const bbox = new THREE.Box3().setFromObject(model);
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const targetSize = 2.6;
  const scale = targetSize / maxDim;
  model.scale.setScalar(scale);
  model.position.set(
    -center.x * scale,
    -center.y * scale,
    -center.z * scale
  );
  // Every mesh in the monitor body casts the shadow for the ground contact.
  // Screen mesh gets opted out below once we detect it, since its unlit
  // basic material shouldn't cast a shadow through the bezel.
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  scene.add(model);

  // ── Ground plane ────────────────────────────────────────────────────────
  // ShadowMaterial renders only the shadow, so the plane is invisible
  // everywhere except where the shadow-caster's shadow falls. Low opacity
  // plus the wide shadow.radius above makes it read as a soft ambient-
  // occlusion pool beneath the stand rather than a sharp drop shadow.
  const groundGeo = new THREE.PlaneGeometry(30, 30);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.22 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  // Place ground just below the model's lowest point so the stand visually
  // rests on it. Recompute the world bbox now that scaling/positioning has
  // been applied.
  const modelWorldBox = new THREE.Box3().setFromObject(model);
  ground.position.y = modelWorldBox.min.y + 0.001;
  scene.add(ground);

  // ── Screen detection ───────────────────────────────────────────────────
  // GLB meshes in this model have obfuscated names (e.g. NYVmzMLiovxElXF),
  // so name-matching fails. Instead we score every mesh on screen-shaped
  // heuristics: large, flat, roughly 16:9/16:10 aspect, centered on x=0,
  // toward the front of the model, and (strongest signal) an emissive
  // material — the GLB authors used self-illumination to flag the panel.
  const screenCandidates = [];
  model.traverse((obj) => {
    if (!obj.isMesh) return;

    const meshBox = new THREE.Box3().setFromObject(obj);
    const meshSize = meshBox.getSize(new THREE.Vector3());
    const meshCenter = meshBox.getCenter(new THREE.Vector3());

    // Reject tiny/degenerate meshes outright.
    if (meshSize.x < 0.1 || meshSize.y < 0.05) return;

    const maxD = Math.max(meshSize.x, meshSize.y, meshSize.z);
    const minD = Math.min(meshSize.x, meshSize.y, meshSize.z);
    const flatness = minD / maxD;  // lower = flatter

    // Aspect ratio — reject anything wildly non-rectangular-monitor.
    const aspect = meshSize.x / meshSize.y;
    if (aspect < 1.2 || aspect > 2.5) return;

    // Emissive bonus — this is the strongest signal for a screen.
    let emissiveScore = 0;
    const mat = obj.material;
    if (mat?.emissive) {
      const e = mat.emissive;
      emissiveScore = (e.r + e.g + e.b) / 3; // 0..1
    }

    const area = meshSize.x * meshSize.y;
    const flatBonus = flatness < 0.2 ? 1 : 0;
    const frontZ = meshCenter.z;

    // Higher score = more likely the screen panel.
    const score =
      area * 2 +
      emissiveScore * 20 +
      flatBonus * 2 +
      frontZ * 0.5;

    screenCandidates.push({
      mesh: obj,
      score,
      area,
      flatness,
      emissiveScore,
      size: meshSize,
      center: meshCenter,
    });
  });

  screenCandidates.sort((a, b) => b.score - a.score);
  const screenPick = screenCandidates[0];
  const screenMesh = screenPick?.mesh || null;

  // Compute the world bounds of the model (used for framing) and screen.
  const worldBox = new THREE.Box3().setFromObject(model);
  const worldCenter = worldBox.getCenter(new THREE.Vector3());

  let screenCenterWorld;
  let screenSizeWorld;

  // Max anisotropy — keeps the screen text crisp at glancing angles and
  // at any distance. Set on the texture before the material picks it up.
  screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  if (screenMesh) {
    // Replace the screen material with our canvas texture. MeshBasicMaterial
    // ignores lighting, so the texture reads at its true dark-theme colors
    // regardless of the key/fill/rim setup — perfect for a crisp handoff.
    // polygonOffset nudges the screen slightly toward the camera in the
    // depth buffer to prevent any z-fighting against the bezel geometry.
    screenMesh.material = new THREE.MeshBasicMaterial({
      map: screenTexture,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    // Unlit material doesn't need to cast shadows on the ground plane.
    screenMesh.castShadow = false;
    // Recompute the world bbox now that the material has changed (position
    // unaffected, but done for clarity).
    const sb = new THREE.Box3().setFromObject(screenMesh);
    screenCenterWorld = sb.getCenter(new THREE.Vector3());
    screenSizeWorld = sb.getSize(new THREE.Vector3());
  } else {
    // Fallback: synthesize a plane on the front face of the model.
    const planeW = (worldBox.max.x - worldBox.min.x) * 0.88;
    const planeH = planeW * (9 / 16);
    const frontZ = worldBox.max.z + 0.002;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(planeW, planeH),
      new THREE.MeshBasicMaterial({
        map: screenTexture,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    plane.position.set(worldCenter.x, worldCenter.y + 0.15, frontZ);
    scene.add(plane);
    screenCenterWorld = plane.position.clone();
    screenSizeWorld = new THREE.Vector3(planeW, planeH, 0);
  }

  // ── Dynamically compute camera start/end positions ─────────────────────
  // Place the camera on an arc around the screen center such that at
  // "camEnd" the screen vertically fills ~100% of the viewport, and at
  // "camStart" it occupies ~38%. This makes the zoom feel proportional
  // regardless of the model's actual authored scale.
  const fovRad = THREE.MathUtils.degToRad(camera.fov);

  // Distance at which a height of `h` fills the vertical viewport.
  const fitDistance = (h) => h / 2 / Math.tan(fovRad / 2);
  // Clamp by horizontal fit too, in case the viewport is narrow.
  const fitDistanceH = (w) => w / 2 / Math.tan(fovRad / 2) / camera.aspect;

  const fitV = fitDistance(screenSizeWorld.y);
  const fitH = fitDistanceH(screenSizeWorld.x);
  const fit = Math.max(fitV, fitH); // the larger = screen just fits

  // Distance at zoom END — well past the exact fit point so the screen is
  // significantly larger than the viewport (~200%) by the time the fade
  // starts. That guarantees the bezel and backdrop are well offscreen when
  // we blend to the DOM, so the only thing visible during the fade is the
  // screen texture dissolving into the real page.
  const endDist = fit * 0.48;
  // Distance at zoom START — multiplier depends on viewport shape. Wide
  // desktops get a 3.0× pull-back; tall mobile viewports use 1.9× so the
  // monitor doesn't look like a stamp in a sea of white. Slightly further
  // back than before to compensate for the 45° start angle (screen appears
  // narrower when viewed at an angle).
  const startFactor = camera.aspect < 1 ? 1.9 : 3.0;
  const startDist = fit * startFactor;

  // Camera orbits around the screen center on a horizontal arc (around Y).
  // Start at -45° (left side) off-axis, end at 0° (straight-on).
  const START_ANGLE_DEG = -45;
  const END_ANGLE_DEG = 0;

  // Look target — always the screen center so the camera tracks the screen
  // as it orbits in.
  const target = screenCenterWorld.clone();

  // Given an orbit angle (deg) and a distance from the screen, returns a
  // world-space camera position. Angle is measured around the screen's
  // local Y axis: 0° = straight in front, 45° = offset to the right.
  function positionAt(angleDeg, dist, yLift = 0) {
    const rad = THREE.MathUtils.degToRad(angleDeg);
    return new THREE.Vector3(
      screenCenterWorld.x + Math.sin(rad) * dist,
      screenCenterWorld.y + yLift,
      screenCenterWorld.z + Math.cos(rad) * dist
    );
  }

  // Small vertical lift at start for a subtle "looking down at it" feel,
  // eased back to 0 by the end so the camera is straight-on through the
  // center of the screen.
  const START_Y_LIFT = 0.18;
  const END_Y_LIFT = 0;

  camStart.copy(positionAt(START_ANGLE_DEG, startDist, START_Y_LIFT));
  camEnd.copy(positionAt(END_ANGLE_DEG, endDist, END_Y_LIFT));

  camera.position.copy(camStart);
  camera.lookAt(target);

  // ── Animation state ──────────────────────────────────────────────────────
  const t0 = performance.now();
  const HOLD_MS = 1100;      // pause before zoom
  const ZOOM_MS = 4400;      // zoom duration (slower, more cinematic)
  const FADE_TRIGGER = 0.58; // start fade early so the 1.4s blur crossfade
                              // overlaps with the last inward push — the
                              // camera keeps moving *during* the dissolve,
                              // so 3D and 2D never read as separate states.
  let fadeStarted = false;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Lerp helper used for angle + distance.
  const lerpN = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // Subtle idle swing on the monitor during the hold phase so it feels
  // alive (not a static still). Returns to neutral before zoom kicks in.
  function idleRotation(elapsed) {
    const hold = Math.min(elapsed / HOLD_MS, 1);
    const swing = Math.sin(elapsed * 0.0008) * (1 - hold) * 0.04;
    model.rotation.y = swing;
  }

  function render(now) {
    const elapsed = now - t0;
    idleRotation(elapsed);

    if (elapsed < HOLD_MS) {
      // Hold phase — parked at the -45° start angle, full distance back.
      camera.position.copy(camStart);
      camera.lookAt(target);
    } else {
      const zt = Math.min((elapsed - HOLD_MS) / ZOOM_MS, 1);
      const e = easeInOutCubic(zt);

      // Angle and Y-lift complete their easing by 60% of the zoom — after
      // that point the camera is locked straight-on and only pushes inward,
      // so the fade (starting at 66%) happens with no orbital motion visible.
      const angleT = easeInOutCubic(clamp01(zt / 0.6));
      const angle = lerpN(START_ANGLE_DEG, END_ANGLE_DEG, angleT);
      const yLift = lerpN(START_Y_LIFT, END_Y_LIFT, angleT);
      // Distance glides the full span with a smooth ease so the push-in
      // feels continuous even after the orbit finishes.
      const dist = lerpN(startDist, endDist, e);
      camera.position.copy(positionAt(angle, dist, yLift));
      camera.lookAt(target);

      // Start fading the overlay when we're most of the way in, so the
      // handoff happens as the screen grows past 100% of the viewport.
      if (zt >= FADE_TRIGGER && !fadeStarted) {
        fadeStarted = true;
        overlay.classList.add('intro-done');
        // Unlock scroll slightly before teardown so hash links work immediately.
        document.body.classList.remove('intro-active');
      }

      if (zt >= 1) {
        renderer.render(scene, camera);
        // Final cleanup — schedule display:none after the CSS fade settles.
        window.removeEventListener('resize', onResize);
        setTimeout(() => {
          overlay.style.display = 'none';
          // Dispose GPU resources.
          screenTexture.dispose();
          envRT.dispose();
          renderer.dispose();
          scene.traverse((o) => {
            if (o.isMesh) {
              o.geometry?.dispose?.();
              if (Array.isArray(o.material)) {
                o.material.forEach((m) => m.dispose?.());
              } else {
                o.material?.dispose?.();
              }
            }
          });
        }, 800);
        return;
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  // ── Resize ───────────────────────────────────────────────────────────────
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // Safety net — if something hangs, force-hide after 8 s.
  setTimeout(() => {
    if (overlay.style.display !== 'none') teardown();
  }, 8000);
}

// ═════════════════════════════════════════════════════════════════════════
// Read theme-driven palette from live CSS variables. Returns the palette
// plus an isDark flag so downstream code can tune glows, particle opacity,
// etc. to match the active theme.
// ═════════════════════════════════════════════════════════════════════════
function readTheme() {
  const s = getComputedStyle(document.documentElement);
  const get = (name, fallback) => {
    const v = s.getPropertyValue(name).trim();
    return v || fallback;
  };
  const BG = get('--bg', '#0A0A0A');
  const FG = get('--fg', '#E8E8E8');
  const MUTED = get('--muted', '#777777');
  const STREAM = get('--stream', '#4D94FF');
  const BORDER = get('--border', '#1E1E1E');
  // Detect dark mode by looking at background lightness.
  const rgb = hexToRgb(BG);
  const lum = (rgb.r + rgb.g + rgb.b) / 3 / 255;
  const isDark = lum < 0.5;
  return { BG, FG, MUTED, STREAM, BORDER, isDark };
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// Studio backdrop — a radial-gradient CanvasTexture used as scene.background.
// Dimly-lit-studio feel: a subtle dark-grey hotspot behind the monitor
// falling off to near-black at the corners. The gradient gives depth so the
// monitor reads as sitting *inside* a space rather than floating in a void,
// without the harsh contrast of a bright backdrop.
// ═════════════════════════════════════════════════════════════════════════
function createStudioBackdrop() {
  const S = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Base — dark charcoal floor that the gradient rolls off toward.
  ctx.fillStyle = '#131316';
  ctx.fillRect(0, 0, S, S);

  // Radial hotspot behind the monitor. Slightly above center to sit right
  // behind where the screen will be after camera framing, with a generous
  // radius so the falloff is gentle rather than spotlight-shaped.
  const grad = ctx.createRadialGradient(
    S * 0.5, S * 0.45, 80,
    S * 0.5, S * 0.55, S * 0.9
  );
  grad.addColorStop(0.0, '#34343a'); // subtle hotspot
  grad.addColorStop(0.4, '#24242a');
  grad.addColorStop(1.0, '#101013'); // near-black corners
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Faint linear darkening from mid-height to the bottom — floor shadow
  // reinforcement, deeper than the light-mode version so the monitor sits
  // on a sense of floor rather than levitating.
  const floor = ctx.createLinearGradient(0, S * 0.55, 0, S);
  floor.addColorStop(0, 'rgba(0,0,0,0)');
  floor.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, S, S);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Multiply a hex color by a factor (f<1 darkens, f>1 lightens).
function darkenHex(hex, f) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const nr = clamp(r * f);
  const ng = clamp(g * f);
  const nb = clamp(b * f);
  return (
    '#' +
    nr.toString(16).padStart(2, '0') +
    ng.toString(16).padStart(2, '0') +
    nb.toString(16).padStart(2, '0')
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Canvas texture — renders a pixel-faithful mock of the portfolio hero.
// Colors, fonts, and layout mirror style.css so the handoff to the real
// DOM looks seamless during the fade. Accepts a theme palette so it
// matches whichever theme the user has active.
// ═════════════════════════════════════════════════════════════════════════
function createPortfolioTexture(theme) {
  // Virtual drawing space — the existing layout is authored for a 2560×1440
  // canvas. We scale the underlying canvas to true 4K (3840×2160 = ×1.5) and
  // apply a matching ctx.scale() transform so all existing draw calls remain
  // correct while rendering at 4K native resolution. This makes the text
  // crisp at glancing angles and under close-up zoom.
  const W = 2560;
  const H = 1440;
  const SCALE = 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  // Crisp downsampling of any image ops (not strictly needed, but cheap).
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(SCALE, SCALE);

  const { BG, FG, MUTED, STREAM, BORDER, isDark } = theme;

  // ── Background ────────────────────────────────────────────────────────
  // Helpers — build rgba strings from the live theme hex values so colors
  // track light/dark without hardcoding channels.
  const streamRgb = hexToRgb(STREAM);
  const fgRgb = hexToRgb(FG);
  const rgba = (rgb, a) => `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
  const dotColor = isDark ? rgba(fgRgb, 0.05) : rgba(fgRgb, 0.10);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow from accent color (matches --stream).
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.35, 40, W * 0.72, H * 0.35, 900);
  glow.addColorStop(0, rgba(streamRgb, 0.06));
  glow.addColorStop(1, rgba(streamRgb, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Dot-grid particles (same feel as stream-canvas but static).
  ctx.fillStyle = dotColor;
  const dotCount = 140;
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < dotCount; i++) {
    const x = rand() * W;
    const y = rand() * H;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sparse connecting lines.
  ctx.strokeStyle = rgba(streamRgb, 0.04);
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x1 = rand() * W;
    const y1 = rand() * H;
    const x2 = x1 + (rand() - 0.5) * 180;
    const y2 = y1 + (rand() - 0.5) * 180;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // ── Nav bar ───────────────────────────────────────────────────────────
  const NAV_H = 100;
  const bgRgb = hexToRgb(BG);
  ctx.fillStyle = rgba(bgRgb, 0.85);
  ctx.fillRect(0, 0, W, NAV_H);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, NAV_H);
  ctx.lineTo(W, NAV_H);
  ctx.stroke();

  // Logo nodes — three dots in a triangle, matching .logo-nodes spans.
  const logoX = 100;
  const logoY = 50;
  ctx.fillStyle = FG;
  const drawDot = (x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  drawDot(logoX + 18, logoY - 16, 5);
  drawDot(logoX + 2, logoY + 16, 5);
  drawDot(logoX + 34, logoY + 16, 5);
  // Lines connecting them.
  ctx.strokeStyle = FG;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(logoX + 6, logoY + 14);
  ctx.lineTo(logoX + 18, logoY - 14);
  ctx.lineTo(logoX + 30, logoY + 14);
  ctx.stroke();

  // Logo text
  ctx.fillStyle = FG;
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOLARA', logoX + 58, logoY + 2);

  // Nav links right-aligned
  const navLinks = ['CLUSTER', 'PIPELINE', 'OPS', 'TOPICS', 'CONNECT'];
  ctx.font = '500 16px "JetBrains Mono", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right';
  let rightEdge = W - 100;
  const linkGap = 46;
  for (let i = navLinks.length - 1; i >= 0; i--) {
    ctx.fillText(navLinks[i], rightEdge, logoY + 2);
    rightEdge -= ctx.measureText(navLinks[i]).width + linkGap;
  }
  // Reset alignment
  ctx.textAlign = 'left';

  // ── Hero ──────────────────────────────────────────────────────────────
  const heroX = 140;
  let heroY = 320;

  // Label
  ctx.fillStyle = STREAM;
  drawDot(heroX + 10, heroY + 4, 8);
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillText('SYSTEM ARCHITECT — WARSAW, PL', heroX + 30, heroY + 6);

  heroY += 80;

  // Headline — 3 lines. Huge serif-like size. clamp(44px,7vw,82px) -> ~118px at W=2560.
  ctx.font = '800 150px "Sora", sans-serif';
  ctx.fillStyle = FG;
  ctx.fillText('Architect.', heroX, heroY + 110);

  heroY += 155;
  ctx.font = '300 150px "Sora", sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText('Ship.', heroX, heroY + 110);

  heroY += 155;
  ctx.font = '800 150px "Sora", sans-serif';
  ctx.fillStyle = FG;
  ctx.fillText('Observe.', heroX, heroY + 110);

  heroY += 190;

  // Subtitle
  ctx.font = '300 30px "Sora", sans-serif';
  ctx.fillStyle = MUTED;
  const subLines = [
    'Designing distributed systems, deployment pipelines, and',
    'production infrastructure. Every system I build runs in',
    'production with real users and full observability.',
  ];
  subLines.forEach((line, i) => {
    ctx.fillText(line, heroX, heroY + i * 42);
  });

  heroY += subLines.length * 42 + 60;

  // Metrics row
  const metrics = [
    { val: '2yr', label: 'EXPERIENCE' },
    { val: '2',   label: 'PROD SYSTEMS' },
    { val: '3',   label: 'ACTIVE CLUSTERS' },
  ];
  let mx = heroX;
  metrics.forEach((m) => {
    // Left border bar
    ctx.fillStyle = FG;
    ctx.fillRect(mx, heroY, 4, 70);

    ctx.font = '700 50px "JetBrains Mono", monospace';
    ctx.fillStyle = FG;
    ctx.fillText(m.val, mx + 22, heroY + 42);

    ctx.font = '500 18px "JetBrains Mono", monospace';
    ctx.fillStyle = MUTED;
    ctx.fillText(m.label, mx + 22, heroY + 82);

    const metricWidth =
      Math.max(
        ctx.measureText(m.val).width,
        ctx.measureText(m.label).width
      ) + 80;
    mx += metricWidth;
  });

  // ── Hero pipe (right side vertical nodes) ─────────────────────────────
  const pipeX = W - 260;
  const pipeY0 = 420;
  const pipeGap = 90;
  for (let i = 0; i < 5; i++) {
    const y = pipeY0 + i * pipeGap;
    const active = i < 3;
    ctx.beginPath();
    ctx.arc(pipeX, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = active ? STREAM : BG;
    ctx.fill();
    ctx.strokeStyle = active ? STREAM : FG;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (i < 4) {
      ctx.strokeStyle = active && i < 2 ? STREAM : BORDER;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pipeX, y + 11);
      ctx.lineTo(pipeX, y + pipeGap - 11);
      ctx.stroke();
    }
  }

  // ── Bottom section divider hint ───────────────────────────────────────
  const divY = H - 140;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(100, divY);
  ctx.lineTo(W - 100, divY);
  ctx.stroke();

  // Packet dots on the divider
  ctx.fillStyle = STREAM;
  drawDot(W * 0.2, divY, 6);
  drawDot(W * 0.5, divY, 6);
  drawDot(W * 0.8, divY, 6);

  // Next section label
  ctx.fillStyle = MUTED;
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.fillText('00', 100, divY + 55);
  ctx.fillStyle = FG;
  ctx.font = '600 28px "JetBrains Mono", monospace';
  ctx.fillText('WHY KAFKA', 160, divY + 55);

  // ── Build texture ─────────────────────────────────────────────────────
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // anisotropy is upgraded later to renderer.maxAnisotropy by the caller;
  // the remaining filter settings give trilinear + anisotropic sampling.
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
