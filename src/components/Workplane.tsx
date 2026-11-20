import { useEffect, useRef, useState } from 'react';
import { PART_INFO } from '../parts';
import type { Part, PartType, Wire } from '../parts';
import type { Reading } from '../simulator';
import { getPinPosition } from '../helpers';
import PartDrawing from './PartDrawing';

type Props = {
  parts: Part[];
  wires: Wire[];
  selectedPartId: string | null;
  selectedWireId: string | null;
  readings: Record<string, Reading> | null;
  onSelectPart: (id: string | null) => void;
  onSelectWire: (id: string | null) => void;
  onAddPart: (type: PartType, x: number, y: number) => void;
  onMovePart: (id: string, x: number, y: number) => void;
  onAddWire: (fromPart: string, fromPin: string, toPart: string, toPin: string) => void;
  onFlipSwitch: (id: string) => void;
};

type PinSpot = { partId: string; pin: string };

export default function Workplane(props: Props) {
  const { parts, wires, readings } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [wireStart, setWireStart] = useState<PinSpot | null>(null);
  const [hoveredPin, setHoveredPin] = useState<PinSpot | null>(null);
  const dragging = useRef<{ partId: string | null; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  function toWorkplane(clientX: number, clientY: number) {
    const box = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - box.left - camera.x) / camera.zoom,
      y: (clientY - box.top - camera.y) / camera.zoom,
    };
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setWireStart(null);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const svg = svgRef.current!;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const box = svg.getBoundingClientRect();
      const mouseX = e.clientX - box.left;
      const mouseY = e.clientY - box.top;
      setCamera((cam) => {
        const newZoom = Math.min(3, Math.max(0.3, e.deltaY < 0 ? cam.zoom * 1.1 : cam.zoom / 1.1));
        const ratio = newZoom / cam.zoom;
        return { zoom: newZoom, x: mouseX - (mouseX - cam.x) * ratio, y: mouseY - (mouseY - cam.y) * ratio };
      });
    }
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);


  function handleBackgroundDown(e: React.PointerEvent<SVGSVGElement>) {
    props.onSelectPart(null);
    props.onSelectWire(null);
    setWireStart(null);
    dragging.current = { partId: null, startX: e.clientX - camera.x, startY: e.clientY - camera.y, offsetX: 0, offsetY: 0 };
    svgRef.current!.setPointerCapture(e.pointerId);
  }

  function handlePartDown(e: React.PointerEvent, part: Part) {
    e.stopPropagation(); 
    props.onSelectPart(part.id);
    const spot = toWorkplane(e.clientX, e.clientY);
    dragging.current = { partId: part.id, startX: 0, startY: 0, offsetX: spot.x - part.x, offsetY: spot.y - part.y };
    svgRef.current!.setPointerCapture(e.pointerId);
  }

  function handlePinDown(e: React.PointerEvent, partId: string, pin: string) {
    e.stopPropagation();
    if (wireStart === null) {
      setWireStart({ partId, pin });
    } else {
      const samePin = wireStart.partId === partId && wireStart.pin === pin;
      if (!samePin) props.onAddWire(wireStart.partId, wireStart.pin, partId, pin);
      setWireStart(null);
    }
  }

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const spot = toWorkplane(e.clientX, e.clientY);
    setMouse(spot);

    const drag = dragging.current;
    if (!drag) return;
    if (drag.partId) {
      props.onMovePart(drag.partId, spot.x - drag.offsetX, spot.y - drag.offsetY);
    } else {
      setCamera((cam) => ({ ...cam, x: e.clientX - drag.startX, y: e.clientY - drag.startY }));
    }
  }

  function handleUp() {
    dragging.current = null;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData('part-type') as PartType;
    if (!PART_INFO[type]) return;
    const spot = toWorkplane(e.clientX, e.clientY);
    props.onAddPart(type, spot.x, spot.y);
  }

  const findPart = (id: string) => parts.find((p) => p.id === id);
  const startingPart = wireStart ? findPart(wireStart.partId) : undefined;
  const wireStartPos = wireStart && startingPart ? getPinPosition(startingPart, wireStart.pin) : null;

  return (
    <svg
      ref={svgRef}
      className={wireStart ? 'workplane drawing-wire' : 'workplane'}
      onPointerDown={handleBackgroundDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <defs>
        <pattern id="small-grid" width={10} height={10} patternUnits="userSpaceOnUse">
          <path d="M10 0 L0 0 0 10" fill="none" stroke="#e3e8ee" strokeWidth={0.5} />
        </pattern>
        <pattern id="grid" width={50} height={50} patternUnits="userSpaceOnUse">
          <rect width={50} height={50} fill="url(#small-grid)" />
          <path d="M50 0 L0 0 0 50" fill="none" stroke="#cfd8e3" strokeWidth={1} />
        </pattern>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>

      <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
        <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#grid)" pointerEvents="none" />

        {/* Parts */}
        {parts.map((part) => {
          const info = PART_INFO[part.type];
          const reading = readings?.[part.id];
          const isSelected = part.id === props.selectedPartId;
          return (
            <g
              key={part.id}
              className={`part part-${part.type}`}
              transform={`translate(${part.x} ${part.y}) rotate(${part.rotation} ${info.width / 2} ${info.height / 2})`}
              onPointerDown={(e) => handlePartDown(e, part)}
            >
              <rect x={-4} y={-4} width={info.width + 8} height={info.height + 8} fill="transparent" />
              <PartDrawing
                part={part}
                brightness={reading?.brightness}
                burnedOut={part.type === 'led' && !!reading?.warning}
                onFlipSwitch={() => props.onFlipSwitch(part.id)}
              />
              {isSelected && (
                <rect x={-6} y={-6} width={info.width + 12} height={info.height + 12} className="selection-box" />
              )}
              {reading?.warning && <circle cx={info.width} cy={-2} r={8} className="warning-dot" />}
            </g>
          );
        })}

        {wires.map((wire) => {
          const fromPart = findPart(wire.fromPart);
          const toPart = findPart(wire.toPart);
          if (!fromPart || !toPart) return null;
          const start = getPinPosition(fromPart, wire.fromPin);
          const end = getPinPosition(toPart, wire.toPin);
          const isSelected = wire.id === props.selectedWireId;
          return (
            <g
              key={wire.id}
              className="wire"
              onPointerDown={(e) => {
                e.stopPropagation();
                props.onSelectWire(wire.id);
              }}
            >

              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="transparent" strokeWidth={12} />
              {isSelected && <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#90caf9" strokeWidth={8} strokeLinecap="round" />}
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={wire.color} strokeWidth={4} strokeLinecap="round" />
            </g>
          );
        })}

        {wireStartPos && (
          <line
            x1={wireStartPos.x}
            y1={wireStartPos.y}
            x2={mouse.x}
            y2={mouse.y}
            stroke="#546e7a"
            strokeWidth={3}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        )}

        {parts.map((part) =>
          PART_INFO[part.type].pins.map((pin) => {
            const pos = getPinPosition(part, pin.name);
            const isHovered = hoveredPin?.partId === part.id && hoveredPin.pin === pin.name;
            const isWireStart = wireStart?.partId === part.id && wireStart.pin === pin.name;
            const highlight = isHovered || isWireStart;
            return (
              <g key={part.id + pin.name}>
                <rect
                  className={highlight ? 'pin pin-active' : 'pin'}
                  data-pin={`${part.type}-${pin.name}`}
                  x={pos.x - 5}
                  y={pos.y - 5}
                  width={10}
                  height={10}
                  rx={2}
                  onPointerDown={(e) => handlePinDown(e, part.id, pin.name)}
                  onPointerEnter={() => setHoveredPin({ partId: part.id, pin: pin.name })}
                  onPointerLeave={() => setHoveredPin(null)}
                />
                {highlight && (
                  <text x={pos.x + 8} y={pos.y - 8} className="pin-label">
                    {pin.label}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </g>

      {parts.length === 0 && (
        <text x="50%" y="50%" textAnchor="middle" className="empty-message">
          Drag components from the panel on the right to get started
        </text>
      )}
    </svg>
  );
}
