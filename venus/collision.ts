import { Entity } from './entity.ts';
import { Vector3 } from './vector3.ts';

interface CollidableProxy {
    pos:          Vector3;
    vel:          Vector3;
    mass:         number;
    applyImpulse: (delta: Vector3) => void;
}

function resolveCollision(a: CollidableProxy, b: CollidableProxy, restitution = 1): void {
    const n = a.pos.cross(b.pos).normalize();
    if (n.length < 1e-10) return;

    const relSpeed = a.vel.sub(b.vel).dot(n);
    if (relSpeed < 0) return;

    const j = -(1 + restitution) * relSpeed / (1/a.mass + 1/b.mass);
    a.applyImpulse(n.scale( j / a.mass));
    b.applyImpulse(n.scale(-j / b.mass));
}

export function checkAndResolve(a: Entity, b: Entity, restitution = 1): boolean {
    const threshold = a.radius + b.radius;

    if (a.pos.angleTo(b.pos) < threshold) {
        resolveCollision(a, b, restitution);
        return true;
    }

    if (a.pos.angleTo(b.pos.negate()) < threshold) {
        // Mirror image: same rotation axis, position negated.
        const mirror: CollidableProxy = {
            pos:          b.pos.negate(),
            vel:          b.vel,
            mass:         b.mass,
            applyImpulse: (delta) => b.applyImpulse(delta),
        };
        resolveCollision(a, mirror, restitution);
        return true;
    }

    return false;
}
