import { Vector3 } from './vector3.ts';

export class Entity {
    pos:    Vector3;  // unit vector on S²
    vel:    Vector3;  // rotation axis, perpendicular to pos
    mass:   number;
    radius: number;   // angular radius, radians

    private _hasHeading      = false;
    private _headingAngle    = 0;
    private _headingFallback: Vector3 | null = null;

    constructor(pos: Vector3, vel: Vector3, mass: number, radius: number) {
        this.pos    = pos;
        this.vel    = vel;
        this.mass   = mass;
        this.radius = radius;
    }

    // Call once to opt this entity into the heading system.
    initHeading(tangentVec: Vector3): void {
        this._hasHeading      = true;
        this._headingFallback = tangentVec.projectOntoTangentPlane(this.pos).normalize();
        this._encodeAngle(this._headingFallback);
    }

    private _encodeAngle(hv: Vector3): void {
        if (this.vel.length < 1e-10) return;
        const motFwd  = this.vel.normalize().cross(this.pos);
        const motSide = this.vel.normalize();
        this._headingAngle = Math.atan2(hv.dot(motSide), hv.dot(motFwd));
    }

    getHeadingVec(): Vector3 | null {
        if (!this._hasHeading) return null;
        if (this.vel.length < 1e-10) return this._headingFallback;
        const motFwd  = this.vel.normalize().cross(this.pos);
        const motSide = this.vel.normalize();
        return motFwd.scale(Math.cos(this._headingAngle))
                     .add(motSide.scale(Math.sin(this._headingAngle)));
    }

    turnToward(targetTangent: Vector3, maxAngle: number): void {
        if (!this._hasHeading) return;
        const hv    = this.getHeadingVec()!;
        const dot   = Math.max(-1, Math.min(1, hv.dot(targetTangent)));
        const cross = hv.cross(targetTangent).dot(this.pos);
        const full  = Math.atan2(cross, dot);
        const turn  = Math.sign(full) * Math.min(Math.abs(full), maxAngle);
        const newHv = hv.rotateAround(this.pos, turn);
        this._headingFallback = newHv;
        this._encodeAngle(newHv);
    }

    // c = speed of light in the world's units (radians/s).
    step(dt: number, c: number): void {
        const momentum = this.vel.length;
        if (momentum < 1e-10) return;
        const actualSpeed = momentum / Math.sqrt(1 + (momentum / c) ** 2);
        const axis = this.vel.normalize();
        this.pos = this.pos.rotateAround(axis, actualSpeed * dt).normalize();
        this.vel = this.vel.projectOntoTangentPlane(this.pos);
        // Heading angle needs no update: parallel transport along a geodesic
        // preserves the angle between a tangent vector and the geodesic direction.
    }

    applyImpulse(delta: Vector3): void {
        const hv  = this._hasHeading ? this.getHeadingVec() : null;
        const raw = this.vel.add(delta);
        const len = raw.length;
        this.vel  = len > 1e-10
            ? raw.projectAndRescale(this.pos, len)
            : new Vector3(0, 0, 0);
        if (hv !== null) {
            this._headingFallback = hv;
            this._encodeAngle(hv);
        }
    }
}
