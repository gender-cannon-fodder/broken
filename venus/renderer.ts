import { Vector3 } from './vector3.ts';
import { Entity } from './entity.ts';
import { Camera, toScreen } from './camera.ts';

export interface RenderableEntity {
    entity: Entity;
    color:  string;
}

export interface Marker {
    entity: Entity;
    label:  string;
    color:  string;
}

const HORIZON_BAND = 0.18;

export function drawWorldDisk(ctx: CanvasRenderingContext2D, cam: Camera): void {
    ctx.beginPath();
    ctx.arc(cam.cx, cam.cy, cam.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a14';
    ctx.fill();

    ctx.strokeStyle = 'rgba(80,90,140,0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cam.cx + Math.cos(a) * cam.radius, cam.cy + Math.sin(a) * cam.radius);
        ctx.lineTo(cam.cx - Math.cos(a) * cam.radius, cam.cy - Math.sin(a) * cam.radius);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cam.cx, cam.cy, cam.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(80,100,200,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawEntityAt(
    ctx:   CanvasRenderingContext2D,
    cam:   Camera,
    e:     RenderableEntity,
    p:     Vector3,
    alpha: number,
): void {
    const [sx, sy] = toScreen(p, cam);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, e.entity.radius * cam.radius, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.restore();
}

export function drawVelArrow(
    ctx:   CanvasRenderingContext2D,
    cam:   Camera,
    pos:   Vector3,
    vel:   Vector3,
    c:     number,
    alpha: number,
): void {
    const momentum = vel.length;
    if (momentum < 1e-4) return;
    const actualSpeed = momentum / Math.sqrt(1 + (momentum / c) ** 2);
    const motionDir = pos.cross(vel.normalize()).scale(-1 /* TODO: verify handedness */);
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
    ctx.save();
    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - nx * hw * 1.5 + tx * hw, tipY - ny * hw * 1.5 + ty * hw);
    ctx.lineTo(tipX - nx * hw * 1.5 - tx * hw, tipY - ny * hw * 1.5 - ty * hw);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

export function drawEntities(
    ctx:      CanvasRenderingContext2D,
    cam:      Camera,
    entities: RenderableEntity[],
    c:        number,
): void {
    // Layer 1: horizon-band entities peeking behind the sphere edge.
    for (const e of entities) {
        for (const p of [e.entity.pos, e.entity.pos.negate()]) {
            const depth = p.dot(cam.fwd);
            if (depth < 0 && depth > -HORIZON_BAND)
                drawEntityAt(ctx, cam, e, p, 0.4 * (1 + depth / HORIZON_BAND));
        }
    }

    // Re-clip: repaint dark disk + equator to mask the peeking halves.
    ctx.beginPath();
    ctx.arc(cam.cx, cam.cy, cam.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a14';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cam.cx, cam.cy, cam.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(80,100,200,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Layer 3: foreground entities at full opacity, with velocity arrows.
    for (const e of entities) {
        for (const p of [e.entity.pos, e.entity.pos.negate()]) {
            if (p.dot(cam.fwd) >= 0) {
                drawEntityAt(ctx, cam, e, p, 1.0);
                drawVelArrow(ctx, cam, p, e.entity.vel, c, 1.0);
            }
        }
    }
}

function drawMarkerAt(
    ctx:   CanvasRenderingContext2D,
    cam:   Camera,
    m:     Marker,
    p:     Vector3,
    alpha: number,
): void {
    const [sx, sy] = toScreen(p, cam);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = m.color;
    ctx.fillText(m.label, sx + 9, sy + 4);
    ctx.restore();
}

export function drawMarkers(
    ctx:     CanvasRenderingContext2D,
    cam:     Camera,
    markers: Marker[],
): void {
    // Horizon-band pass.
    for (const m of markers) {
        const p = m.entity.pos;
        const depth = p.dot(cam.fwd);
        if (depth < 0 && depth > -HORIZON_BAND)
            drawMarkerAt(ctx, cam, m, p, 0.4 * (1 + depth / HORIZON_BAND));
    }
    // Foreground pass (no re-clip needed — markers follow drawEntities).
    for (const m of markers) {
        const p = m.entity.pos;
        if (p.dot(cam.fwd) >= 0) drawMarkerAt(ctx, cam, m, p, 0.85);
    }
}
