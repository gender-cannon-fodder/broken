import { Vector3 } from '../venus/vector3.ts';
import { Entity } from '../venus/entity.ts';
import type { RenderableEntity, Marker } from '../venus/renderer.ts';

export const C         = 1.2;
export const ACCEL     = 1.2;
export const TURN_RATE = Math.PI;

export const ship = new Entity(
    new Vector3(0, 0, 1),
    new Vector3(0, 0, 0),
    1,
    0.07,
);
ship.initHeading(new Vector3(0, 1, 0));

const COLORS = [
    '#ff6b6b','#ffa94d','#ffe066','#69db7c',
    '#4dabf7','#cc5de8','#f783ac','#a9e34b',
    '#63e6be','#74c0fc','#da77f2','#ff8787',
];

export const balls: RenderableEntity[] = [];
for (let i = 0; i < 14; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const pos = new Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
    );
    const anyUp = Math.abs(pos.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
    const t1 = pos.cross(anyUp).normalize();
    const t2 = pos.cross(t1).normalize();
    const bAngle = Math.random() * Math.PI * 2;
    const bSpd   = 0.1 + Math.random() * 0.2;
    const vel    = t1.scale(Math.cos(bAngle) * bSpd).add(t2.scale(Math.sin(bAngle) * bSpd));
    balls.push({
        entity: new Entity(pos, vel, 6, 0.09),
        color:  COLORS[i % COLORS.length],
    });
}

export const markers: Marker[] = [
    { entity: new Entity(new Vector3( 1, 0, 0), new Vector3(0, 0, 0), Infinity, 0.03), label: '+X', color: '#f87' },
    { entity: new Entity(new Vector3(-1, 0, 0), new Vector3(0, 0, 0), Infinity, 0.03), label: '−X', color: '#f87' },
    { entity: new Entity(new Vector3( 0, 1, 0), new Vector3(0, 0, 0), Infinity, 0.03), label: '+Y', color: '#8f8' },
    { entity: new Entity(new Vector3( 0,-1, 0), new Vector3(0, 0, 0), Infinity, 0.03), label: '−Y', color: '#8f8' },
    { entity: new Entity(new Vector3( 0, 0, 1), new Vector3(0, 0, 0), Infinity, 0.03), label: '+Z', color: '#8cf' },
    { entity: new Entity(new Vector3( 0, 0,-1), new Vector3(0, 0, 0), Infinity, 0.03), label: '−Z', color: '#8cf' },
];
