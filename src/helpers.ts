import { PART_INFO } from './parts';
import type { Part } from './parts';

const GRID_SIZE = 10;

export function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function makeId(prefix: string) {
  return prefix + '-' + Math.random().toString(36).slice(2, 7);
}

export function getPinPosition(part: Part, pinName: string) {
  const info = PART_INFO[part.type];
  const pin = info.pins.find((p) => p.name === pinName);
  if (!pin) return { x: part.x, y: part.y };

  const centerX = info.width / 2;
  const centerY = info.height / 2;
  const angle = (part.rotation * Math.PI) / 180;

  const dx = pin.x - centerX;
  const dy = pin.y - centerY;

  const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

  return { x: part.x + centerX + rotatedX, y: part.y + centerY + rotatedY };
}
