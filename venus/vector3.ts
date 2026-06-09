export class Vector3 {
    constructor(public x: number, public y: number, public z: number) {}

    add(o: Vector3)   { return new Vector3(this.x+o.x, this.y+o.y, this.z+o.z); }
    sub(o: Vector3)   { return new Vector3(this.x-o.x, this.y-o.y, this.z-o.z); }
    scale(s: number)  { return new Vector3(this.x*s,   this.y*s,   this.z*s  ); }
    negate()          { return this.scale(-1); }
    dot(o: Vector3)   { return this.x*o.x + this.y*o.y + this.z*o.z; }

    cross(o: Vector3) {
        return new Vector3(
            this.y*o.z - this.z*o.y,
            this.z*o.x - this.x*o.z,
            this.x*o.y - this.y*o.x,
        );
    }

    get length() { return Math.sqrt(this.dot(this)); }

    normalize() {
        const l = this.length;
        return l > 1e-10 ? this.scale(1/l) : new Vector3(0, 0, 1);
    }

    projectOntoTangentPlane(pos: Vector3) {
        return this.sub(pos.scale(this.dot(pos)));
    }

    projectAndRescale(pos: Vector3, targetLength: number) {
        if (targetLength < 1e-10) return new Vector3(0, 0, 0);
        return this.projectOntoTangentPlane(pos).normalize().scale(targetLength);
    }

    // Rodrigues' rotation formula.
    rotateAround(axis: Vector3, angle: number) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return this.scale(cos)
            .add(axis.cross(this).scale(sin))
            .add(axis.scale(axis.dot(this) * (1 - cos)));
    }

    angleTo(o: Vector3) {
        return Math.acos(Math.max(-1, Math.min(1, this.dot(o))));
    }

    projectiveAngleTo(o: Vector3) {
        return Math.min(this.angleTo(o), this.angleTo(o.negate()));
    }
}
