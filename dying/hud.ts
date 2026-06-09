import { Entity } from '../venus/entity.ts';
import type { Camera } from '../venus/camera.ts';
import type { RenderableEntity } from '../venus/renderer.ts';

export function drawHUD(
    ctx:   CanvasRenderingContext2D,
    cam:   Camera,
    ship:  Entity,
    balls: RenderableEntity[],
    c:     number,
): void {
    const shipMomentum    = ship.vel.length;
    const shipActualSpeed = shipMomentum / Math.sqrt(1 + (shipMomentum / c) ** 2);
    const speedFraction   = Math.min(shipActualSpeed / c, 1);

    // Relativistic doppler — layered circles approximating a directional gradient.
    // Each circle is centred off-screen; only its fringe bleeds onto the canvas.
    if (shipMomentum > 1e-4) {
        const motFwd = ship.vel.normalize().cross(ship.pos);
        const vx =  motFwd.dot(cam.right);
        const vy = -motFwd.dot(cam.up);  // canvas y is inverted
        const ext = Math.hypot(cam.cx * 2, cam.cy * 2);
        const t   = speedFraction;
        ctx.shadowBlur = 0;
        for (const [df, rf, a] of [
            [0.60, 0.60, 0.05],
            [0.50, 0.40, 0.06],
            [0.45, 0.25, 0.07],
        ] as [number, number, number][]) {
            const off = df * ext, rad = rf * ext, alpha = (a * t).toFixed(3);
            ctx.beginPath();
            ctx.arc(cam.cx + vx * off, cam.cy + vy * off, rad, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(20,160,255,${alpha})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cam.cx - vx * off, cam.cy - vy * off, rad, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,90,20,${alpha})`;
            ctx.fill();
        }
    }

    // Speedometer arc — 120° gauge hugging the left of the vision circle.
    {
        const W  = 6;
        const cx = cam.cx, cy = cam.cy, r = cam.radius + 6 + W / 2;
        const A0 = 2 * Math.PI / 3;   // 120° — stopped
        const A1 = 4 * Math.PI / 3;   // 240° — at C

        ctx.beginPath();
        ctx.arc(cx, cy, r, A0, A1, false);
        ctx.strokeStyle = 'rgba(80,110,160,0.25)';
        ctx.lineWidth = W;
        ctx.shadowBlur = 0;
        ctx.stroke();

        const fillEnd = A0 + speedFraction * (A1 - A0);
        if (speedFraction > 1e-3) {
            const hue = Math.round(200 - speedFraction * 20);
            const lit = Math.round(50  + speedFraction * 35);
            ctx.beginPath();
            ctx.arc(cx, cy, r, A0, fillEnd, false);
            ctx.strokeStyle = `hsl(${hue}, 100%, ${lit}%)`;
            ctx.lineWidth   = W + 6;
            ctx.shadowColor = `hsl(${hue}, 100%, ${lit}%)`;
            ctx.shadowBlur  = 6 + speedFraction * 10;
            ctx.stroke();
            ctx.shadowBlur  = 0;
        }

        ctx.font      = '9px monospace';
        ctx.fillStyle = 'rgba(100,140,200,0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('0', cx + Math.cos(A0) * (r + W), cy + Math.sin(A0) * (r + 18) + 3);
        ctx.fillText('C', cx + Math.cos(A1) * (r + W), cy + Math.sin(A1) * (r + 18) + 3);

        ctx.font         = 'bold 20px monospace';
        ctx.fillStyle    = 'rgba(140,190,255,0.85)';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            shipMomentum.toFixed(3),
            cx + Math.cos(fillEnd) * (r + 38),
            cy + Math.sin(fillEnd) * (r + 38),
        );
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign    = 'left';
    }

    // Total momentum conservation display.
    {
        ctx.font      = '11px monospace';
        ctx.fillStyle = 'rgba(100,140,200,0.55)';
        let px = 0, py = 0, pz = 0;
        for (const e of [ship, ...balls.map(b => b.entity)]) {
            px += e.mass * e.vel.x;
            py += e.mass * e.vel.y;
            pz += e.mass * e.vel.z;
        }
        const pMag = Math.sqrt(px * px + py * py + pz * pz);
        ctx.fillText(`p = ${pMag.toFixed(2)}`, 14, cam.cy * 2 - 20);
    }
}
