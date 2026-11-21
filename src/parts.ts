export type PartType = 'battery' | 'resistor' | 'led' | 'switch' | 'bulb' | 'button' | 'buzzer' | 'arduino';
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
  code?: string;
  pinOutputs?: Record<string, number>;
  activePins?: string[]; 
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
  button: {
    name: 'Push Button',
    width: 60,
    height: 36,
    pins: [
      { name: 'a', label: 'Pin 1', x: 0, y: 18 },
      { name: 'b', label: 'Pin 2', x: 60, y: 18 },
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
  buzzer: {
    name: 'Piezo Buzzer',
    width: 50,
    height: 50,
    pins: [
      { name: 'a', label: 'Pin 1', x: 0, y: 25 },
      { name: 'b', label: 'Pin 2', x: 50, y: 25 },
    ],
  },
  arduino: {
    name: 'Arduino Uno',
    width: 200,
    height: 140,
    pins: [
      
      { name: 'ioref', label: 'IOREF', x: 28, y: 140 },
      { name: 'reset', label: 'RESET', x: 38, y: 140 },
      { name: '3v3', label: '3.3V', x: 48, y: 140 },
      { name: '5v', label: '5V (Power)', x: 58, y: 140 },
      { name: 'gnd1', label: 'GND', x: 68, y: 140 },
      { name: 'gnd2', label: 'GND', x: 78, y: 140 },
      { name: 'vin', label: 'VIN', x: 88, y: 140 },
      { name: 'a0', label: 'A0', x: 104, y: 140 },
      { name: 'a1', label: 'A1', x: 114, y: 140 },
      { name: 'a2', label: 'A2', x: 124, y: 140 },
      { name: 'a3', label: 'A3', x: 134, y: 140 },
      { name: 'a4', label: 'A4', x: 144, y: 140 },
      { name: 'a5', label: 'A5', x: 154, y: 140 },

      { name: 'd0', label: 'D0 (RX)', x: 184, y: 0 },
      { name: 'd1', label: 'D1 (TX)', x: 174, y: 0 },
      { name: 'd2', label: 'D2', x: 164, y: 0 },
      { name: 'd3', label: 'D3 (~PWM)', x: 154, y: 0 },
      { name: 'd4', label: 'D4', x: 144, y: 0 },
      { name: 'd5', label: 'D5 (~PWM)', x: 134, y: 0 },
      { name: 'd6', label: 'D6 (~PWM)', x: 124, y: 0 },
      { name: 'd7', label: 'D7', x: 114, y: 0 },

      { name: 'd8', label: 'D8', x: 98, y: 0 },
      { name: 'd9', label: 'D9 (~PWM)', x: 88, y: 0 },
      { name: 'd10', label: 'D10 (~PWM)', x: 78, y: 0 },
      { name: 'd11', label: 'D11 (~PWM)', x: 68, y: 0 },
      { name: 'd12', label: 'D12', x: 58, y: 0 },
      { name: 'd13', label: 'D13 (LED)', x: 48, y: 0 },
      { name: 'gnd', label: 'GND', x: 38, y: 0 },
      { name: 'aref', label: 'AREF', x: 28, y: 0 },
    ],
  },
};

export const PART_TYPES: PartType[] = ['battery', 'resistor', 'led', 'switch', 'bulb', 'button', 'buzzer', 'arduino'];

export function defaultSettings(type: PartType): Partial<Part> {
  if (type === 'battery') return { voltage: 9 };
  if (type === 'resistor') return { resistance: 330 };
  if (type === 'led') return { color: 'red' };
  if (type === 'switch') return { isOn: false };
  if (type === 'button') return { isOn: false };
  if (type === 'arduino') {
    return {
      code: "void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}",
      activePins: ['5v', 'gnd', 'd13'], 
      pinOutputs: { d13: 5, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, d7: 0, d8: 0, d9: 0, d10: 0, d11: 0, d12: 0 },
    };
  }
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
