// venus/vector3.ts
var Vector3 = class _Vector3 {
  x;
  y;
  z;
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  add(o) {
    return new _Vector3(this.x + o.x, this.y + o.y, this.z + o.z);
  }
  sub(o) {
    return new _Vector3(this.x - o.x, this.y - o.y, this.z - o.z);
  }
  scale(s) {
    return new _Vector3(this.x * s, this.y * s, this.z * s);
  }
  negate() {
    return this.scale(-1);
  }
  dot(o) {
    return this.x * o.x + this.y * o.y + this.z * o.z;
  }
  cross(o) {
    return new _Vector3(this.y * o.z - this.z * o.y, this.z * o.x - this.x * o.z, this.x * o.y - this.y * o.x);
  }
  get length() {
    return Math.sqrt(this.dot(this));
  }
  normalize() {
    const l = this.length;
    return l > 1e-10 ? this.scale(1 / l) : new _Vector3(0, 0, 1);
  }
  projectOntoTangentPlane(pos) {
    return this.sub(pos.scale(this.dot(pos)));
  }
  projectAndRescale(pos, targetLength) {
    if (targetLength < 1e-10) return new _Vector3(0, 0, 0);
    return this.projectOntoTangentPlane(pos).normalize().scale(targetLength);
  }
  // Rodrigues' rotation formula.
  rotateAround(axis, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return this.scale(cos).add(axis.cross(this).scale(sin)).add(axis.scale(axis.dot(this) * (1 - cos)));
  }
  angleTo(o) {
    return Math.acos(Math.max(-1, Math.min(1, this.dot(o))));
  }
  projectiveAngleTo(o) {
    return Math.min(this.angleTo(o), this.angleTo(o.negate()));
  }
};

// venus/collision.ts
function resolveCollision(a, b, restitution = 1) {
  const n = a.pos.cross(b.pos).normalize();
  if (n.length < 1e-10) return;
  const relSpeed = a.vel.sub(b.vel).dot(n);
  if (relSpeed < 0) return;
  const j = -(1 + restitution) * relSpeed / (1 / a.mass + 1 / b.mass);
  a.applyImpulse(n.scale(j / a.mass));
  b.applyImpulse(n.scale(-j / b.mass));
}
function checkAndResolve(a, b, restitution = 1) {
  const threshold = a.radius + b.radius;
  if (a.pos.angleTo(b.pos) < threshold) {
    resolveCollision(a, b, restitution);
    return true;
  }
  if (a.pos.angleTo(b.pos.negate()) < threshold) {
    const mirror = {
      pos: b.pos.negate(),
      vel: b.vel,
      mass: b.mass,
      applyImpulse: (delta) => b.applyImpulse(delta)
    };
    resolveCollision(a, mirror, restitution);
    return true;
  }
  return false;
}

// venus/camera.ts
function integrateCamBasis(fwd, camRight2, rotAxis, rotAngle) {
  let r = camRight2;
  if (rotAngle > 1e-10) r = r.rotateAround(rotAxis, rotAngle);
  r = r.projectOntoTangentPlane(fwd).normalize();
  const up = fwd.cross(r).normalize();
  return {
    fwd,
    right: r,
    up,
    camRight: r
  };
}
function toScreen(pos, cam) {
  return [
    cam.cx + pos.dot(cam.right) * cam.radius,
    cam.cy - pos.dot(cam.up) * cam.radius,
    pos.dot(cam.fwd) >= 0
  ];
}

// venus/renderer.ts
var HORIZON_BAND = 0.18;
function drawWorldDisk(ctx2, cam) {
  ctx2.beginPath();
  ctx2.arc(cam.cx, cam.cy, cam.radius, 0, Math.PI * 2);
  ctx2.fillStyle = "#0a0a14";
  ctx2.fill();
  ctx2.strokeStyle = "rgba(80,90,140,0.18)";
  ctx2.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI;
    ctx2.beginPath();
    ctx2.moveTo(cam.cx + Math.cos(a) * cam.radius, cam.cy + Math.sin(a) * cam.radius);
    ctx2.lineTo(cam.cx - Math.cos(a) * cam.radius, cam.cy - Math.sin(a) * cam.radius);
    ctx2.stroke();
  }
  ctx2.beginPath();
  ctx2.arc(cam.cx, cam.cy, cam.radius, 0, Math.PI * 2);
  ctx2.strokeStyle = "rgba(80,100,200,0.25)";
  ctx2.lineWidth = 1.5;
  ctx2.stroke();
}
function drawEntityAt(ctx2, cam, e, p, alpha) {
  const [sx, sy] = toScreen(p, cam);
  ctx2.save();
  ctx2.globalAlpha = alpha;
  ctx2.beginPath();
  ctx2.arc(sx, sy, e.entity.radius * cam.radius, 0, Math.PI * 2);
  ctx2.fillStyle = e.color;
  ctx2.fill();
  ctx2.restore();
}
function drawVelArrow(ctx2, cam, pos, vel, c, alpha) {
  const momentum = vel.length;
  if (momentum < 1e-4) return;
  const actualSpeed = momentum / Math.sqrt(1 + (momentum / c) ** 2);
  const motionDir = pos.cross(vel.normalize()).scale(
    -1
    /* TODO: verify handedness */
  );
  const mx = motionDir.dot(cam.right);
  const my = motionDir.dot(cam.up);
  const mag = Math.sqrt(mx * mx + my * my);
  if (mag < 1e-10) return;
  const len = actualSpeed * cam.radius / 6;
  const [sx, sy] = toScreen(pos, cam);
  const nx = mx / mag;
  const ny = -my / mag;
  const tx = -ny, ty = nx;
  const tipX = sx + nx * len, tipY = sy + ny * len;
  const hw = len * 0.22;
  ctx2.save();
  ctx2.globalAlpha = alpha * 0.75;
  ctx2.strokeStyle = "#fff";
  ctx2.lineWidth = 1.5;
  ctx2.beginPath();
  ctx2.moveTo(sx, sy);
  ctx2.lineTo(tipX, tipY);
  ctx2.stroke();
  ctx2.fillStyle = "#fff";
  ctx2.beginPath();
  ctx2.moveTo(tipX, tipY);
  ctx2.lineTo(tipX - nx * hw * 1.5 + tx * hw, tipY - ny * hw * 1.5 + ty * hw);
  ctx2.lineTo(tipX - nx * hw * 1.5 - tx * hw, tipY - ny * hw * 1.5 - ty * hw);
  ctx2.closePath();
  ctx2.fill();
  ctx2.restore();
}
function drawEntities(ctx2, cam, entities, c) {
  for (const e of entities) {
    for (const p of [
      e.entity.pos,
      e.entity.pos.negate()
    ]) {
      const depth = p.dot(cam.fwd);
      if (depth < 0 && depth > -HORIZON_BAND) drawEntityAt(ctx2, cam, e, p, 0.4 * (1 + depth / HORIZON_BAND));
    }
  }
  ctx2.beginPath();
  ctx2.arc(cam.cx, cam.cy, cam.radius, 0, Math.PI * 2);
  ctx2.fillStyle = "#0a0a14";
  ctx2.fill();
  ctx2.beginPath();
  ctx2.arc(cam.cx, cam.cy, cam.radius, 0, Math.PI * 2);
  ctx2.strokeStyle = "rgba(80,100,200,0.25)";
  ctx2.lineWidth = 1.5;
  ctx2.stroke();
  for (const e of entities) {
    for (const p of [
      e.entity.pos,
      e.entity.pos.negate()
    ]) {
      if (p.dot(cam.fwd) >= 0) {
        drawEntityAt(ctx2, cam, e, p, 1);
        drawVelArrow(ctx2, cam, p, e.entity.vel, c, 1);
      }
    }
  }
}
function drawMarkerAt(ctx2, cam, m, p, alpha) {
  const [sx, sy] = toScreen(p, cam);
  ctx2.save();
  ctx2.globalAlpha = alpha;
  ctx2.beginPath();
  ctx2.arc(sx, sy, 6, 0, Math.PI * 2);
  ctx2.fillStyle = m.color;
  ctx2.fill();
  ctx2.font = "bold 11px monospace";
  ctx2.fillStyle = m.color;
  ctx2.fillText(m.label, sx + 9, sy + 4);
  ctx2.restore();
}
function drawMarkers(ctx2, cam, markers2) {
  for (const m of markers2) {
    const p = m.entity.pos;
    const depth = p.dot(cam.fwd);
    if (depth < 0 && depth > -HORIZON_BAND) drawMarkerAt(ctx2, cam, m, p, 0.4 * (1 + depth / HORIZON_BAND));
  }
  for (const m of markers2) {
    const p = m.entity.pos;
    if (p.dot(cam.fwd) >= 0) drawMarkerAt(ctx2, cam, m, p, 0.85);
  }
}

// venus/entity.ts
var Entity = class {
  pos;
  vel;
  mass;
  radius;
  _hasHeading = false;
  _headingAngle = 0;
  _headingFallback = null;
  constructor(pos, vel, mass, radius) {
    this.pos = pos;
    this.vel = vel;
    this.mass = mass;
    this.radius = radius;
  }
  // Call once to opt this entity into the heading system.
  initHeading(tangentVec) {
    this._hasHeading = true;
    this._headingFallback = tangentVec.projectOntoTangentPlane(this.pos).normalize();
    this._encodeAngle(this._headingFallback);
  }
  _encodeAngle(hv) {
    if (this.vel.length < 1e-10) return;
    const motFwd = this.vel.normalize().cross(this.pos);
    const motSide = this.vel.normalize();
    this._headingAngle = Math.atan2(hv.dot(motSide), hv.dot(motFwd));
  }
  getHeadingVec() {
    if (!this._hasHeading) return null;
    if (this.vel.length < 1e-10) return this._headingFallback;
    const motFwd = this.vel.normalize().cross(this.pos);
    const motSide = this.vel.normalize();
    return motFwd.scale(Math.cos(this._headingAngle)).add(motSide.scale(Math.sin(this._headingAngle)));
  }
  turnToward(targetTangent, maxAngle) {
    if (!this._hasHeading) return;
    const hv = this.getHeadingVec();
    const dot = Math.max(-1, Math.min(1, hv.dot(targetTangent)));
    const cross = hv.cross(targetTangent).dot(this.pos);
    const full = Math.atan2(cross, dot);
    const turn = Math.sign(full) * Math.min(Math.abs(full), maxAngle);
    const newHv = hv.rotateAround(this.pos, turn);
    this._headingFallback = newHv;
    this._encodeAngle(newHv);
  }
  // c = speed of light in the world's units (radians/s).
  step(dt, c) {
    const momentum = this.vel.length;
    if (momentum < 1e-10) return;
    const actualSpeed = momentum / Math.sqrt(1 + (momentum / c) ** 2);
    const axis = this.vel.normalize();
    this.pos = this.pos.rotateAround(axis, actualSpeed * dt).normalize();
    this.vel = this.vel.projectOntoTangentPlane(this.pos);
  }
  applyImpulse(delta) {
    const hv = this._hasHeading ? this.getHeadingVec() : null;
    const raw = this.vel.add(delta);
    const len = raw.length;
    this.vel = len > 1e-10 ? raw.projectAndRescale(this.pos, len) : new Vector3(0, 0, 0);
    if (hv !== null) {
      this._headingFallback = hv;
      this._encodeAngle(hv);
    }
  }
};

// dying/world.ts
var C = 1.2;
var ACCEL = 1.2;
var TURN_RATE = Math.PI;
var ship = new Entity(new Vector3(0, 0, 1), new Vector3(0, 0, 0), 1, 0.07);
ship.initHeading(new Vector3(0, 1, 0));
var COLORS = [
  "#ff6b6b",
  "#ffa94d",
  "#ffe066",
  "#69db7c",
  "#4dabf7",
  "#cc5de8",
  "#f783ac",
  "#a9e34b",
  "#63e6be",
  "#74c0fc",
  "#da77f2",
  "#ff8787"
];
var balls = [];
for (let i = 0; i < 14; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const pos = new Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
  const anyUp = Math.abs(pos.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  const t1 = pos.cross(anyUp).normalize();
  const t2 = pos.cross(t1).normalize();
  const bAngle = Math.random() * Math.PI * 2;
  const bSpd = 0.1 + Math.random() * 0.2;
  const vel = t1.scale(Math.cos(bAngle) * bSpd).add(t2.scale(Math.sin(bAngle) * bSpd));
  balls.push({
    entity: new Entity(pos, vel, 6, 0.09),
    color: COLORS[i % COLORS.length]
  });
}
var markers = [
  {
    entity: new Entity(new Vector3(1, 0, 0), new Vector3(0, 0, 0), Infinity, 0.03),
    label: "+X",
    color: "#f87"
  },
  {
    entity: new Entity(new Vector3(-1, 0, 0), new Vector3(0, 0, 0), Infinity, 0.03),
    label: "\u2212X",
    color: "#f87"
  },
  {
    entity: new Entity(new Vector3(0, 1, 0), new Vector3(0, 0, 0), Infinity, 0.03),
    label: "+Y",
    color: "#8f8"
  },
  {
    entity: new Entity(new Vector3(0, -1, 0), new Vector3(0, 0, 0), Infinity, 0.03),
    label: "\u2212Y",
    color: "#8f8"
  },
  {
    entity: new Entity(new Vector3(0, 0, 1), new Vector3(0, 0, 0), Infinity, 0.03),
    label: "+Z",
    color: "#8cf"
  },
  {
    entity: new Entity(new Vector3(0, 0, -1), new Vector3(0, 0, 0), Infinity, 0.03),
    label: "\u2212Z",
    color: "#8cf"
  }
];

// dying/hud.ts
function drawHUD(ctx2, cam, ship2, balls2, c) {
  const shipMomentum = ship2.vel.length;
  const shipActualSpeed = shipMomentum / Math.sqrt(1 + (shipMomentum / c) ** 2);
  const speedFraction = Math.min(shipActualSpeed / c, 1);
  if (shipMomentum > 1e-4) {
    const motFwd = ship2.vel.normalize().cross(ship2.pos);
    const vx = motFwd.dot(cam.right);
    const vy = -motFwd.dot(cam.up);
    const ext = Math.hypot(cam.cx * 2, cam.cy * 2);
    const t = speedFraction;
    ctx2.shadowBlur = 0;
    for (const [df, rf, a] of [
      [
        0.6,
        0.6,
        0.05
      ],
      [
        0.5,
        0.4,
        0.06
      ],
      [
        0.45,
        0.25,
        0.07
      ]
    ]) {
      const off = df * ext, rad = rf * ext, alpha = (a * t).toFixed(3);
      ctx2.beginPath();
      ctx2.arc(cam.cx + vx * off, cam.cy + vy * off, rad, 0, Math.PI * 2);
      ctx2.fillStyle = `rgba(20,160,255,${alpha})`;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(cam.cx - vx * off, cam.cy - vy * off, rad, 0, Math.PI * 2);
      ctx2.fillStyle = `rgba(255,90,20,${alpha})`;
      ctx2.fill();
    }
  }
  {
    const W = 6;
    const cx = cam.cx, cy = cam.cy, r = cam.radius + 6 + W / 2;
    const A0 = 2 * Math.PI / 3;
    const A1 = 4 * Math.PI / 3;
    ctx2.beginPath();
    ctx2.arc(cx, cy, r, A0, A1, false);
    ctx2.strokeStyle = "rgba(80,110,160,0.25)";
    ctx2.lineWidth = W;
    ctx2.shadowBlur = 0;
    ctx2.stroke();
    const fillEnd = A0 + speedFraction * (A1 - A0);
    if (speedFraction > 1e-3) {
      const hue = Math.round(200 - speedFraction * 20);
      const lit = Math.round(50 + speedFraction * 35);
      ctx2.beginPath();
      ctx2.arc(cx, cy, r, A0, fillEnd, false);
      ctx2.strokeStyle = `hsl(${hue}, 100%, ${lit}%)`;
      ctx2.lineWidth = W + 6;
      ctx2.shadowColor = `hsl(${hue}, 100%, ${lit}%)`;
      ctx2.shadowBlur = 6 + speedFraction * 10;
      ctx2.stroke();
      ctx2.shadowBlur = 0;
    }
    ctx2.font = "9px monospace";
    ctx2.fillStyle = "rgba(100,140,200,0.5)";
    ctx2.textAlign = "center";
    ctx2.fillText("0", cx + Math.cos(A0) * (r + W), cy + Math.sin(A0) * (r + 18) + 3);
    ctx2.fillText("C", cx + Math.cos(A1) * (r + W), cy + Math.sin(A1) * (r + 18) + 3);
    ctx2.font = "bold 20px monospace";
    ctx2.fillStyle = "rgba(140,190,255,0.85)";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(shipMomentum.toFixed(3), cx + Math.cos(fillEnd) * (r + 38), cy + Math.sin(fillEnd) * (r + 38));
    ctx2.textBaseline = "alphabetic";
    ctx2.textAlign = "left";
  }
  {
    ctx2.font = "11px monospace";
    ctx2.fillStyle = "rgba(100,140,200,0.55)";
    let px = 0, py = 0, pz = 0;
    for (const e of [
      ship2,
      ...balls2.map((b) => b.entity)
    ]) {
      px += e.mass * e.vel.x;
      py += e.mass * e.vel.y;
      pz += e.mass * e.vel.z;
    }
    const pMag = Math.sqrt(px * px + py * py + pz * pz);
    ctx2.fillText(`p = ${pMag.toFixed(2)}`, 14, cam.cy * 2 - 20);
  }
}

// dying/render.ts
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var RADIUS = 0;
var CX = 0;
var CY = 0;
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  RADIUS = Math.min(canvas.width, canvas.height) * 0.45;
  CX = canvas.width / 2;
  CY = canvas.height / 2;
}
window.addEventListener("resize", resize);
resize();
var camRight = new Vector3(1, 0, 0);
var pointerX = CX;
var pointerY = CY;
var rmb = false;
canvas.addEventListener("mousemove", (e) => {
  const r = canvas.getBoundingClientRect();
  pointerX = e.clientX - r.left;
  pointerY = e.clientY - r.top;
});
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 2) rmb = true;
  e.preventDefault();
});
canvas.addEventListener("mouseup", (e) => {
  if (e.button === 2) rmb = false;
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
var last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1e3, 0.05);
  last = now;
  const stepSpeed = ship.vel.length;
  const stepAxis = stepSpeed > 1e-10 ? ship.vel.normalize() : new Vector3(0, 0, 1);
  const stepAngle = stepSpeed * dt;
  const preFwd = ship.pos;
  const preRight = camRight.projectOntoTangentPlane(preFwd).normalize();
  const preUp = preFwd.cross(preRight).normalize();
  {
    const dx = (pointerX - CX) / RADIUS;
    const dy = (pointerY - CY) / RADIUS;
    if (dx * dx + dy * dy > 1e-6) {
      const cursorTangent = preRight.scale(dx).add(preUp.scale(-dy)).normalize();
      ship.turnToward(cursorTangent, TURN_RATE * dt);
    }
  }
  if (rmb) {
    const hv2 = ship.getHeadingVec();
    ship.applyImpulse(ship.pos.cross(hv2).scale(ACCEL * dt));
  }
  ship.step(dt, C);
  const result = integrateCamBasis(ship.pos, camRight, stepAxis, stepAngle);
  camRight = result.camRight;
  const cam = {
    cx: CX,
    cy: CY,
    radius: RADIUS,
    fwd: result.fwd,
    right: result.right,
    up: result.up
  };
  for (const ball of balls) {
    ball.entity.step(dt, C);
    checkAndResolve(ship, ball.entity);
  }
  for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) checkAndResolve(balls[i].entity, balls[j].entity);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.shadowBlur = 0;
  drawWorldDisk(ctx, cam);
  drawEntities(ctx, cam, balls, C);
  drawMarkers(ctx, cam, markers);
  const [shipX, shipY] = toScreen(ship.pos, cam);
  const hv = ship.getHeadingVec();
  const angle = Math.atan2(hv.dot(cam.up), -hv.dot(cam.right));
  const s = ship.radius * RADIUS;
  ctx.save();
  ctx.translate(shipX, shipY);
  ctx.rotate(angle);
  ctx.shadowColor = "#7ef";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-s * 1.6, 0);
  ctx.lineTo(s * 0.8, s * 0.9);
  ctx.lineTo(s * 0.4, 0);
  ctx.lineTo(s * 0.8, -s * 0.9);
  ctx.closePath();
  ctx.fillStyle = rmb ? "#aff" : "#7ef";
  ctx.fill();
  ctx.restore();
  drawVelArrow(ctx, cam, ship.pos, ship.vel, C, 1);
  if (rmb) {
    const dx = (pointerX - CX) / RADIUS;
    const dy = (pointerY - CY) / RADIUS;
    if (dx * dx + dy * dy <= 1) {
      ctx.beginPath();
      ctx.arc(pointerX, pointerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(150,220,255,0.6)";
      ctx.fill();
    }
  }
  drawHUD(ctx, cam, ship, balls, C);
  requestAnimationFrame(frame);
}
function start() {
  requestAnimationFrame(frame);
}

// dying/main.ts
start();
