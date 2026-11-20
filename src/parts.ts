export type PartType = 'battery' | 'resistor' | 'led' | 'switch' | 'bulb';
export type Part = {
  id: string;
  type: PartType;
  x: number;
  y: number;
  rotation: number;
  voltage?: number;
  resistance?: number; 
  color?: string; 
  isOn?: boolean; 
};

export type Wire = {
  id: string;
  fromPart: string;
  fromPin: string;
  toPart: string;
  toPin: string;
  color: string;
};

type PinInfo = {
  name: string;
  label: string;
  x: number;
  y: number;
};

type PartInfo = {
  name: string;
  width: number;
  height: number;
  pins: PinInfo[];
};

export const PART_INFO: Record<PartType, PartInfo> = {
  battery: {
    name: 'Battery',
    width: 60,
    height: 100,
    pins: [
      { name: 'plus', label: '+', x: 18, y: 6 },
      { name: 'minus', label: '−', x: 42, y: 6 },
    ],
  },
  resistor: {
    name: 'Resistor',
    width: 80,
    height: 20,
    pins: [
      { name: 'a', label: 'End 1', x: 0, y: 10 },
      { name: 'b', label: 'End 2', x: 80, y: 10 },
    ],
  },
  led: {
    name: 'LED',
    width: 40,
    height: 70,
    pins: [
      { name: 'plus', label: 'Anode (+)', x: 10, y: 70 },
      { name: 'minus', label: 'Cathode (−)', x: 30, y: 70 },
    ],
  },
  switch: {
    name: 'Switch',
    width: 70,
    height: 30,
    pins: [
      { name: 'a', label: 'End 1', x: 0, y: 15 },
      { name: 'b', label: 'End 2', x: 70, y: 15 },
    ],
  },
  bulb: {
    name: 'Light Bulb',
    width: 50,
    height: 70,
    pins: [
      { name: 'a', label: 'End 1', x: 15, y: 70 },
      { name: 'b', label: 'End 2', x: 35, y: 70 },
    ],
  },
};

export const PART_TYPES: PartType[] = ['battery', 'resistor', 'led', 'switch', 'bulb'];

export function defaultSettings(type: PartType): Partial<Part> {
  if (type === 'battery') return { voltage: 9 };
  if (type === 'resistor') return { resistance: 330 };
  if (type === 'led') return { color: 'red' };
  if (type === 'switch') return { isOn: false };
  return {};
}

export const LED_COLORS: Record<string, { forwardVoltage: number; fill: string; glow: string }> = {
  red: { forwardVoltage: 1.8, fill: '#e53935', glow: '#ff5252' },
  yellow: { forwardVoltage: 2.0, fill: '#fdd835', glow: '#ffff8d' },
  green: { forwardVoltage: 2.1, fill: '#43a047', glow: '#69f0ae' },
  blue: { forwardVoltage: 3.0, fill: '#1e88e5', glow: '#82b1ff' },
  white: { forwardVoltage: 3.0, fill: '#eeeeee', glow: '#ffffff' },
};

export const WIRE_COLORS = ['#e53935', '#212121', '#1e88e5', '#43a047', '#fdd835', '#fb8c00'];
