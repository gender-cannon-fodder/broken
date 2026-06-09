import { Vector3 } from './vector3.ts';

export interface Camera {
    cx:     number;
    cy:     number;
    radius: number;
    fwd:    Vector3;
    right:  Vector3;
    up:     Vector3;
}

// Pure function: integrates camRight by rotAxis/rotAngle, re-orthogonalises against fwd.
// Returns new basis + updated camRight for the caller to persist.
export function integrateCamBasis(
    fwd:      Vector3,
    camRight: Vector3,
    rotAxis:  Vector3,
    rotAngle: number,
): { fwd: Vector3; right: Vector3; up: Vector3; camRight: Vector3 } {
    let r = camRight;
    if (rotAngle > 1e-10) r = r.rotateAround(rotAxis, rotAngle);
    r = r.projectOntoTangentPlane(fwd).normalize();
    const up = fwd.cross(r).normalize();
    return { fwd, right: r, up, camRight: r };
}

export function toScreen(pos: Vector3, cam: Camera): [number, number, boolean] {
    return [
        cam.cx + pos.dot(cam.right) * cam.radius,
        cam.cy - pos.dot(cam.up)    * cam.radius,
        pos.dot(cam.fwd) >= 0,
    ];
}
