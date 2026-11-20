import { LED_COLORS } from './parts';
import type { Part, Wire } from './parts';

export type Reading = {
  current: number;
  voltage: number; 
  power: number; 
  brightness: number; 
  warning: string;
};

export type SimulationResult = {
  readings: Record<string, Reading>;
  warnings: string[];
};

const BATTERY_RESISTANCE = 0.5; 
const BULB_RESISTANCE = 100;
const BULB_FULL_POWER = 0.81;
const LED_ON_RESISTANCE = 10;
const LED_FULL_CURRENT = 0.02;
const LED_MAX_CURRENT = 0.05;
const RESISTOR_MAX_POWER = 0.25;
const SHORT_CIRCUIT_CURRENT = 1;
const TINY = 1e-9

type Element = {
  part: Part;
  nodeA: number;
  nodeB: number;
  conductance: number;
  push: number; 
};

export function runSimulation(parts: Part[], wires: Wire[]): SimulationResult {
  const result: SimulationResult = { readings: {}, warnings: [] };
  if (parts.length === 0) return result;

  const { nodeOf, nodeCount } = groupPinsIntoNodes(parts, wires);

  const firstBattery = parts.find((p) => p.type === 'battery');
  const ground = firstBattery ? nodeOf(firstBattery.id, 'minus') : 0;

  const ledIsOn: Record<string, boolean> = {};
  for (const part of parts) {
    if (part.type === 'led') ledIsOn[part.id] = false;
  }

  let elements: Element[] = [];
  let voltages: number[] = [];

  for (let attempt = 0; attempt < 40; attempt++) {
    elements = parts.map((part) => makeElement(part, nodeOf, ledIsOn[part.id]));
    voltages = solveForVoltages(elements, nodeCount, ground);

    let guessChanged = false;
    for (const el of elements) {
      if (el.part.type !== 'led') continue;
      const voltageAcross = voltages[el.nodeA] - voltages[el.nodeB];
      const current = el.conductance * (voltageAcross - el.push);
      const turnOnVoltage = LED_COLORS[el.part.color ?? 'red'].forwardVoltage;

      if (!ledIsOn[el.part.id] && voltageAcross > turnOnVoltage) {
        ledIsOn[el.part.id] = true; 
        guessChanged = true;
      } else if (ledIsOn[el.part.id] && current < 0) {
        ledIsOn[el.part.id] = false; 
        guessChanged = true;
      }
    }
    if (!guessChanged) break;
  }

  for (const el of elements) {
    const part = el.part;
    const voltage = voltages[el.nodeA] - voltages[el.nodeB];
    let current = el.conductance * (voltage - el.push);
    let brightness = 0;
    let warning = '';

    if (part.type === 'battery') {
      current = -current;
      if (current > SHORT_CIRCUIT_CURRENT) {
        warning = `Short circuit! ${current.toFixed(1)} A is flowing and the battery would overheat.`;
      }
    } else if (part.type === 'led') {
      if (!ledIsOn[part.id]) current = 0;
      brightness = Math.min(1, current / LED_FULL_CURRENT);
      if (current > LED_MAX_CURRENT) {
        warning = `${(current * 1000).toFixed(0)} mA through the LED. It would burn out, so add a resistor.`;
      }
    } else if (part.type === 'switch' && !part.isOn) {
      current = 0;
    }

    current = part.type === 'battery' ? current : Math.abs(current);
    const power = Math.abs(voltage * current);

    if (part.type === 'bulb') {
      brightness = Math.min(1, power / BULB_FULL_POWER);
    }
    if (part.type === 'resistor' && power > RESISTOR_MAX_POWER) {
      warning = `The resistor is using ${power.toFixed(2)} W (max is ${RESISTOR_MAX_POWER} W) and would overheat.`;
    }

    if (warning) result.warnings.push(warning);
    result.readings[part.id] = { current, voltage, power, brightness, warning };
  }

  return result;
}

function groupPinsIntoNodes(parts: Part[], wires: Wire[]) {
  const nodeNumber: Record<string, number> = {};
  const neighbors: Record<string, string[]> = {};

  const key = (partId: string, pin: string) => partId + ':' + pin;

  for (const wire of wires) {
    const a = key(wire.fromPart, wire.fromPin);
    const b = key(wire.toPart, wire.toPin);
    (neighbors[a] ??= []).push(b);
    (neighbors[b] ??= []).push(a);
  }

  let nodeCount = 0;
  for (const part of parts) {
    for (const pin of pinsOf(part)) {
      const start = key(part.id, pin);
      if (nodeNumber[start] !== undefined) continue;

      const toVisit = [start];
      nodeNumber[start] = nodeCount;
      while (toVisit.length > 0) {
        const current = toVisit.pop()!;
        for (const next of neighbors[current] ?? []) {
          if (nodeNumber[next] === undefined) {
            nodeNumber[next] = nodeCount;
            toVisit.push(next);
          }
        }
      }
      nodeCount++;
    }
  }

  const nodeOf = (partId: string, pin: string) => nodeNumber[key(partId, pin)] ?? 0;
  return { nodeOf, nodeCount };
}

function pinsOf(part: Part) {
  if (part.type === 'battery' || part.type === 'led') return ['plus', 'minus'];
  return ['a', 'b'];
}

function makeElement(
  part: Part,
  nodeOf: (partId: string, pin: string) => number,
  ledOn: boolean | undefined,
): Element {
  const [pinA, pinB] = pinsOf(part);
  const element: Element = {
    part,
    nodeA: nodeOf(part.id, pinA),
    nodeB: nodeOf(part.id, pinB),
    conductance: TINY,
    push: 0,
  };

  if (part.type === 'battery') {
    element.conductance = 1 / BATTERY_RESISTANCE;
    element.push = part.voltage ?? 9;
  } else if (part.type === 'resistor') {
    element.conductance = 1 / Math.max(part.resistance ?? 330, 0.001);
  } else if (part.type === 'bulb') {
    element.conductance = 1 / BULB_RESISTANCE;
  } else if (part.type === 'switch' && part.isOn) {
    element.conductance = 100;
  } else if (part.type === 'led' && ledOn) {
    element.conductance = 1 / LED_ON_RESISTANCE;
    element.push = LED_COLORS[part.color ?? 'red'].forwardVoltage;
  }

  return element;
}

function solveForVoltages(elements: Element[], nodeCount: number, ground: number) {

  const row: number[] = [];
  let size = 0;
  for (let node = 0; node < nodeCount; node++) {
    row[node] = node === ground ? -1 : size++;
  }

  const G: number[][] = [];
  const I: number[] = [];
  for (let i = 0; i < size; i++) {
    G.push(new Array(size).fill(0));
    G[i][i] = TINY;
    I.push(0);
  }

  for (const el of elements) {
    const a = row[el.nodeA];
    const b = row[el.nodeB];
    const g = el.conductance;

    if (a >= 0) {
      G[a][a] += g;
      I[a] += g * el.push;
    }
    if (b >= 0) {
      G[b][b] += g;
      I[b] -= g * el.push;
    }
    if (a >= 0 && b >= 0) {
      G[a][b] -= g;
      G[b][a] -= g;
    }
  }

  const answer = gaussianElimination(G, I);

  const voltages: number[] = [];
  for (let node = 0; node < nodeCount; node++) {
    voltages[node] = row[node] >= 0 ? answer[row[node]] : 0;
  }
  return voltages;
}

function gaussianElimination(A: number[][], b: number[]) {
  const n = b.length;
  const m = A.map((rowValues, i) => [...rowValues, b[i]]); // augmented matrix

  for (let col = 0; col < n; col++) {
    let best = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[best][col])) best = r;
    }
    [m[col], m[best]] = [m[best], m[col]];

    for (let r = col + 1; r < n; r++) {
      const factor = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }

  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = m[r][n];
    for (let c = r + 1; c < n; c++) sum -= m[r][c] * x[c];
    x[r] = sum / m[r][r];
  }
  return x;
}
