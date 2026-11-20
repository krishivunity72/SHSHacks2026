import { LED_COLORS, PART_INFO, WIRE_COLORS, defaultSettings } from './parts';
import type { Part, PartType, Wire } from './parts';
import { makeId, snapToGrid } from './helpers';

type SketchNode = {
  id?: string;
  type?: string;
  label?: string;
  value?: string | number;
  x?: number;
  y?: number;
  pins?: string[];
};

type SketchEdge = {
  from?: string;
  to?: string;
  fromPin?: string;
  toPin?: string;
};

export type ConvertedSketch = {
  parts: Part[];
  wires: Wire[];
  skipped: string[];
};

type WireEnd = { partId: string; pin: string } | { net: string };

const TYPE_WORDS: Record<PartType, string[]> = {
  battery: ['battery', 'cell', 'vcc', 'voltage', 'source', 'power'],
  resistor: ['resistor', 'resistance'],
  led: ['led', 'diode', 'light emitting'],
  switch: ['switch', 'button', 'push'],
  bulb: ['bulb', 'lamp', 'light'],
};

const NET_WORDS = ['ground', 'gnd', 'junction', 'node', 'connection', 'wire', 'net', 'dot'];

function figureOutType(node: SketchNode): PartType | 'net' | null {
  const text = `${node.type ?? ''} ${node.label ?? ''}`.toLowerCase();
  const type = (node.type ?? '').toLowerCase();

  if (NET_WORDS.some((word) => type.includes(word))) return 'net';
  for (const partType of Object.keys(TYPE_WORDS) as PartType[]) {
    if (TYPE_WORDS[partType].some((word) => type.includes(word))) return partType;
  }

  for (const partType of Object.keys(TYPE_WORDS) as PartType[]) {
    if (TYPE_WORDS[partType].some((word) => text.includes(word))) return partType;
  }
  return null;
}

function readNumber(value: string | number | undefined, needsUnit = false): number | null {
  if (typeof value === 'number') return value;
  if (!value) return null;
  const text = value.toLowerCase().replace(/,/g, '');

  for (const match of text.matchAll(/(\d+\.?\d*)\s*(k|m)?\s*(ω|ohm|v)?/g)) {
    const [, digits, prefix, unit] = match;
    if (needsUnit && !prefix && !unit) continue;

    let number = parseFloat(digits);
    if (prefix === 'k') number *= 1000;
    if (prefix === 'm' && !text.includes('ma')) number *= 1000000;
    return number;
  }
  return null;
}

function readSettings(type: PartType, node: SketchNode): Partial<Part> {
  const settings = defaultSettings(type);
  const text = `${node.label ?? ''} ${node.value ?? ''}`.toLowerCase();

  if (type === 'battery') {
    const volts = readNumber(node.value) ?? readNumber(node.label, true);
    if (volts && volts > 0 && volts <= 24) settings.voltage = volts;
  }
  if (type === 'resistor') {
    const ohms = readNumber(node.value) ?? readNumber(node.label, true);
    if (ohms && ohms > 0) settings.resistance = ohms;
  }
  if (type === 'led') {
    const color = Object.keys(LED_COLORS).find((c) => text.includes(c));
    if (color) settings.color = color;
  }
  if (type === 'switch') {
    settings.isOn = text.includes('closed') || text.includes(' on');
  }
  return settings;
}

const clean = (pin: string) => pin.toLowerCase().replace(/[\s_]/g, '').replace('−', '-');

const FIRST_PIN_WORDS = ['+', 'plus', 'pos', 'positive', 'anode', 'a', 'vcc', 'v+', '1', 'pin1', 'p1', 'in', 'left', 'top', 'terminal1', 't1'];
const SECOND_PIN_WORDS = ['-', 'minus', 'neg', 'negative', 'cathode', 'k', 'c', 'gnd', 'ground', 'v-', 'b', '2', 'pin2', 'p2', 'out', 'right', 'bottom', 'terminal2', 't2'];

function ourPinName(type: PartType, whichPin: 1 | 2) {
  return PART_INFO[type].pins[whichPin - 1].name;
}

function matchPin(type: PartType, aiPin: string | undefined, nodePins: string[] = []): string | null {
  if (!aiPin) return null;
  const pin = clean(aiPin);

  if (FIRST_PIN_WORDS.includes(pin)) return ourPinName(type, 1);
  if (SECOND_PIN_WORDS.includes(pin)) return ourPinName(type, 2);

  const index = nodePins.map(clean).indexOf(pin);
  if (index === 0) return ourPinName(type, 1);
  if (index === 1) return ourPinName(type, 2);
  return null;
}

export function convertSketch(data: unknown): ConvertedSketch {
  const response = (data ?? {}) as { nodes?: SketchNode[]; edges?: SketchEdge[] };
  const nodes = Array.isArray(response.nodes) ? response.nodes : [];
  const edges = Array.isArray(response.edges) ? response.edges : [];

  const parts: Part[] = [];
  const skipped: string[] = [];
  const typeOfNode: Record<string, PartType | 'net'> = {};
  const nodeById: Record<string, SketchNode> = {};

  nodes.forEach((node, i) => {
    const id = node.id ?? `node${i}`;
    nodeById[id] = node;
    const type = figureOutType(node);

    if (type === null) {
      skipped.push(node.label || node.type || id);
      return;
    }
    typeOfNode[id] = type;
    if (type === 'net') return;

    const info = PART_INFO[type];
    const centerX = typeof node.x === 'number' ? node.x : 150 + (i % 4) * 180;
    const centerY = typeof node.y === 'number' ? node.y : 150 + Math.floor(i / 4) * 180;

    parts.push({
      id,
      type,
      x: snapToGrid(centerX - info.width / 2),
      y: snapToGrid(centerY - info.height / 2),
      rotation: 0,
      ...readSettings(type, node),
    });
  });

  const pinsUsed: Record<string, number> = {};
  function findEnd(nodeId: string | undefined, aiPin: string | undefined): WireEnd | null {
    if (!nodeId || !typeOfNode[nodeId]) return null;
    const type = typeOfNode[nodeId];
    if (type === 'net') return { net: nodeId };

    let pin = matchPin(type, aiPin, nodeById[nodeId].pins);
    if (!pin) {
      const first = ourPinName(type, 1);
      const second = ourPinName(type, 2);
      const used = (p: string) => pinsUsed[nodeId + ':' + p] ?? 0;
      pin = used(first) <= used(second) ? first : second;
    }
    pinsUsed[nodeId + ':' + pin] = (pinsUsed[nodeId + ':' + pin] ?? 0) + 1;
    return { partId: nodeId, pin };
  }

  const wires: Wire[] = [];
  const netConnections: { net: string; end: { partId: string; pin: string } }[] = [];
  const sameNetAs: Record<string, string> = {};
  function mainNet(net: string) {
    while (sameNetAs[net]) net = sameNetAs[net];
    return net;
  }

  function addWire(a: { partId: string; pin: string }, b: { partId: string; pin: string }) {
    if (a.partId === b.partId && a.pin === b.pin) return;
    wires.push({
      id: makeId('wire'),
      fromPart: a.partId,
      fromPin: a.pin,
      toPart: b.partId,
      toPin: b.pin,
      color: WIRE_COLORS[wires.length % WIRE_COLORS.length],
    });
  }

  for (const edge of edges) {
    const a = findEnd(edge.from, edge.fromPin);
    const b = findEnd(edge.to, edge.toPin);
    if (!a || !b) continue;

    if ('net' in a && 'net' in b) {
      const mainA = mainNet(a.net);
      const mainB = mainNet(b.net);
      if (mainA !== mainB) sameNetAs[mainB] = mainA;
    } else if ('net' in a) {
      netConnections.push({ net: a.net, end: b as { partId: string; pin: string } });
    } else if ('net' in b) {
      netConnections.push({ net: b.net, end: a });
    } else {
      addWire(a, b);
    }
  }

  const netMembers: Record<string, { partId: string; pin: string }[]> = {};
  const groundNets = new Set<string>();
  for (const { net, end } of netConnections) {
    (netMembers[mainNet(net)] ??= []).push(end);
  }
  for (const netId of Object.keys(typeOfNode)) {
    const node = nodeById[netId];
    if (typeOfNode[netId] === 'net' && /gnd|ground/i.test(`${node.type} ${node.label}`)) {
      groundNets.add(mainNet(netId));
    }
  }

  const battery = parts.find((p) => p.type === 'battery');
  for (const net of Object.keys(netMembers)) {
    const members = netMembers[net];
    if (groundNets.has(net) && battery) {
      const alreadyThere = members.some((m) => m.partId === battery.id && m.pin === 'minus');
      if (!alreadyThere) members.unshift({ partId: battery.id, pin: 'minus' });
    }
    for (let i = 1; i < members.length; i++) addWire(members[i - 1], members[i]);
  }

  return { parts, wires, skipped };
}
