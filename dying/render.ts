import { Vector3 } from '../venus/vector3.ts';
import { checkAndResolve } from '../venus/collision.ts';
import type { Camera } from '../venus/camera.ts';
import { integrateCamBasis, toScreen } from '../venus/camera.ts';
import { drawWorldDisk, drawEntities, drawMarkers, drawVelArrow } from '../venus/renderer.ts';
import { C, ACCEL, TURN_RATE, ship, balls, markers } from './world.ts';
import { drawHUD } from './hud.ts';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx    = canvas.getContext('2d')!;
let RADIUS = 0, CX = 0, CY = 0;

function resize(): void {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    RADIUS = Math.min(canvas.width, canvas.height) * 0.45;
    CX = canvas.width  / 2;
    CY = canvas.height / 2;
}
window.addEventListener('resize', resize);
resize();

let camRight = new Vector3(1, 0, 0);
let pointerX = CX, pointerY = CY, rmb = false;

canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    pointerX = e.clientX - r.left;
    pointerY = e.clientY - r.top;
});
canvas.addEventListener('mousedown',   e => { if (e.button === 2) rmb = true;  e.preventDefault(); });
canvas.addEventListener('mouseup',     e => { if (e.button === 2) rmb = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

let last = performance.now();

function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Capture the rotation step() is about to apply so we can rotate camRight identically.
    const stepSpeed = ship.vel.length;
    const stepAxis  = stepSpeed > 1e-10 ? ship.vel.normalize() : new Vector3(0, 0, 1);
    const stepAngle = stepSpeed * dt;

    // Build pre-step basis so the pointer is interpreted in the current view.
    const preFwd   = ship.pos;
    const preRight = camRight.projectOntoTangentPlane(preFwd).normalize();
    const preUp    = preFwd.cross(preRight).normalize();

    // Turn heading toward pointer (always).
    {
        const dx = (pointerX - CX) / RADIUS;
        const dy = (pointerY - CY) / RADIUS;
        if (dx * dx + dy * dy > 1e-6) {
            const cursorTangent = preRight.scale(dx).add(preUp.scale(-dy)).normalize();
            ship.turnToward(cursorTangent, TURN_RATE * dt);
        }
    }

    // Boost forward along heading (RMB held).
    if (rmb) {
        const hv = ship.getHeadingVec()!;
        ship.applyImpulse(ship.pos.cross(hv).scale(ACCEL * dt));
    }

    ship.step(dt, C);

    const result = integrateCamBasis(ship.pos, camRight, stepAxis, stepAngle);
    camRight = result.camRight;
    const cam: Camera = {
        cx: CX, cy: CY, radius: RADIUS,
        fwd: result.fwd, right: result.right, up: result.up,
    };

    for (const ball of balls) {
        ball.entity.step(dt, C);
        checkAndResolve(ship, ball.entity);
    }
    for (let i = 0; i < balls.length; i++)
        for (let j = i + 1; j < balls.length; j++)
            checkAndResolve(balls[i].entity, balls[j].entity);

    // ── Draw ─────────────────────────────────────────────────────────────────

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 0;

    drawWorldDisk(ctx, cam);
    drawEntities(ctx, cam, balls, C);
    drawMarkers(ctx, cam, markers);

    // Ship triangle (game-specific geometry).
    const [shipX, shipY] = toScreen(ship.pos, cam);
    const hv    = ship.getHeadingVec()!;
    const angle = Math.atan2(hv.dot(cam.up), -hv.dot(cam.right));
    const s = ship.radius * RADIUS;
    ctx.save();
    ctx.translate(shipX, shipY);
    ctx.rotate(angle);
    ctx.shadowColor = '#7ef';
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.moveTo(-s * 1.6, 0);
    ctx.lineTo( s * 0.8,  s * 0.9);
    ctx.lineTo( s * 0.4,  0);
    ctx.lineTo( s * 0.8, -s * 0.9);
    ctx.closePath();
    ctx.fillStyle = rmb ? '#aff' : '#7ef';
    ctx.fill();
    ctx.restore();

    drawVelArrow(ctx, cam, ship.pos, ship.vel, C, 1.0);

    // Thruster indicator while accelerating.
    if (rmb) {
        const dx = (pointerX - CX) / RADIUS;
        const dy = (pointerY - CY) / RADIUS;
        if (dx * dx + dy * dy <= 1) {
            ctx.beginPath();
            ctx.arc(pointerX, pointerY, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(150,220,255,0.6)';
            ctx.fill();
        }
    }

    drawHUD(ctx, cam, ship, balls, C);

    requestAnimationFrame(frame);
}

export function start(): void {
    requestAnimationFrame(frame);
}
