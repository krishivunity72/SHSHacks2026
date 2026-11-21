import { LED_COLORS } from '../parts';
import type { Part } from '../parts';

type Props = {
  part: Part;
  brightness?: number;
  burnedOut?: boolean;
  onFlipSwitch?: () => void;
};

const BAND_COLORS = ['#000', '#795548', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#9e9e9e', '#fff'];
const GOLD = '#c9a227';

function resistorBands(ohms: number) {
  const digits = String(Math.round(ohms));
  if (digits.length < 2) return [BAND_COLORS[Number(digits)], BAND_COLORS[0], GOLD, GOLD];
  const first = Number(digits[0]);
  const second = Number(digits[1]);
  const zeros = Math.min(digits.length - 2, 9);
  return [BAND_COLORS[first], BAND_COLORS[second], BAND_COLORS[zeros], GOLD];
}

export default function PartDrawing({ part, brightness = 0, burnedOut = false, onFlipSwitch }: Props) {
  if (part.type === 'arduino') {
    const d13High = (part.pinOutputs?.d13 ?? 5) > 2.5;
    const active = part.activePins ?? ['5v', 'gnd', 'd13'];
    return (
      <g>
        {}
        <rect x={0} y={0} width={200} height={140} rx={10} fill="#00878F" stroke="#005C62" strokeWidth={2.5} />
        
        {}
        <rect x={-6} y={20} width={28} height={26} fill="#B0BEC5" stroke="#78909C" strokeWidth={1.5} rx={3} />
        <rect x={2} y={26} width={14} height={14} fill="#ECEFF1" />

        {}
        <rect x={-6} y={90} width={34} height={28} fill="#263238" stroke="#102027" strokeWidth={1.5} rx={3} />
        <rect x={-6} y={100} width={12} height={8} fill="#37474F" />

        {}
        <rect x={85} y={55} width={70} height={28} fill="#212121" stroke="#333" strokeWidth={1} rx={3} />
        <text x={120} y={73} textAnchor="middle" fill="#E0E0E0" fontSize={9} fontFamily="monospace" fontWeight="bold">
          ATmega328P
        </text>

        {}
        <rect x={55} y={60} width={12} height={20} rx={4} fill="#CFD8DC" stroke="#90A4AE" />

        {}
        <rect x={22} y={2} width={168} height={12} fill="#1E1E1E" rx={2} stroke="#111" />
        {[
          { name: 'aref', x: 28 }, { name: 'gnd', x: 38 }, { name: 'd13', x: 48 }, { name: 'd12', x: 58 },
          { name: 'd11', x: 68 }, { name: 'd10', x: 78 }, { name: 'd9', x: 88 }, { name: 'd8', x: 98 },
          { name: 'd7', x: 114 }, { name: 'd6', x: 124 }, { name: 'd5', x: 134 }, { name: 'd4', x: 144 },
          { name: 'd3', x: 154 }, { name: 'd2', x: 164 }, { name: 'd1', x: 174 }, { name: 'd0', x: 184 },
        ].map((p) => {
          const isSpawned = active.includes(p.name);
          return (
            <g key={p.name}>
              <circle cx={p.x} cy={8} r={2.5} fill={isSpawned ? '#FFD54F' : '#424242'} />
              {isSpawned && (
                <text x={p.x} y={22} textAnchor="middle" fill="#FFFFFF" fontSize={7.5} fontWeight="bold">
                  {p.name.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {}
        <rect x={22} y={126} width={140} height={12} fill="#1E1E1E" rx={2} stroke="#111" />
        {[
          { name: 'ioref', x: 28 }, { name: 'reset', x: 38 }, { name: '3v3', x: 48 }, { name: '5v', x: 58 },
          { name: 'gnd1', x: 68 }, { name: 'gnd2', x: 78 }, { name: 'vin', x: 88 },
          { name: 'a0', x: 104 }, { name: 'a1', x: 114 }, { name: 'a2', x: 124 }, { name: 'a3', x: 134 },
          { name: 'a4', x: 144 }, { name: 'a5', x: 154 },
        ].map((p) => {
          const isSpawned = active.includes(p.name);
          return (
            <g key={p.name}>
              <circle cx={p.x} cy={132} r={2.5} fill={isSpawned ? '#FFD54F' : '#424242'} />
              {isSpawned && (
                <text x={p.x} y={120} textAnchor="middle" fill="#FFFFFF" fontSize={7.5} fontWeight="bold">
                  {p.name.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {}
        <text x={120} y={42} textAnchor="middle" fill="#FFFFFF" fontSize={14} fontWeight="bold" fontFamily="sans-serif">
          ARDUINO UNO
        </text>

        {}
        <circle cx={58} cy={48} r={3.5} fill={d13High ? '#FFEB3B' : '#616161'} />
        {d13High && <circle cx={58} cy={48} r={8} fill="#FFEE58" opacity={0.5} filter="url(#glow)" />}
        <text x={58} y={40} textAnchor="middle" fill="#E0F7FA" fontSize={8} fontWeight="bold">L</text>
      </g>
    );
  }

  if (part.type === 'battery') {
    return (
      <g>
        <rect x={10} y={2} width={16} height={12} rx={2} fill="#9e9e9e" />
        <rect x={34} y={2} width={16} height={12} rx={4} fill="#9e9e9e" />
        <rect x={4} y={14} width={52} height={86} rx={5} fill="#263238" />
        <rect x={4} y={66} width={52} height={34} rx={5} fill="#c47a2c" />
        <text x={30} y={48} textAnchor="middle" fill="white" fontSize={18} fontWeight="bold">
          {part.voltage}V
        </text>
        <text x={18} y={28} textAnchor="middle" fill="#ff8a80" fontSize={12}>+</text>
        <text x={42} y={28} textAnchor="middle" fill="#bbb" fontSize={12}>−</text>
      </g>
    );
  }

  if (part.type === 'resistor') {
    const bands = resistorBands(part.resistance ?? 330);
    return (
      <g>
        <line x1={0} y1={10} x2={80} y2={10} stroke="#9e9e9e" strokeWidth={3} />
        <rect x={18} y={2} width={44} height={16} rx={7} fill="#e8cfa0" />
        {bands.map((color, i) => (
          <rect key={i} x={24 + i * 8 + (i === 3 ? 4 : 0)} y={2} width={4} height={16} fill={color} />
        ))}
      </g>
    );
  }

  if (part.type === 'led') {
    const colors = LED_COLORS[part.color ?? 'red'];
    const isLit = brightness > 0.01 && !burnedOut;
    const bodyColor = burnedOut ? '#424242' : colors.fill;
    return (
      <g>
        {isLit && (
          <circle cx={20} cy={22} r={18 + 14 * brightness} fill={colors.glow} opacity={0.3 + 0.4 * brightness} filter="url(#glow)" />
        )}
        <polyline points="10,40 10,52 6,58 10,64 10,70" fill="none" stroke="#9e9e9e" strokeWidth={3} />
        <line x1={30} y1={40} x2={30} y2={70} stroke="#9e9e9e" strokeWidth={3} />
        <path d="M4,42 L4,20 A16,16 0 0 1 36,20 L36,42 Z" fill={bodyColor} opacity={isLit ? 1 : 0.75} />
        <rect x={2} y={38} width={36} height={5} fill={bodyColor} />
        {isLit && <ellipse cx={14} cy={18} rx={4} ry={7} fill="white" opacity={0.6} />}
        {burnedOut && (
          <text x={20} y={30} textAnchor="middle" fontSize={16} fill="#ffeb3b" fontWeight="bold">✕</text>
        )}
      </g>
    );
  }

  if (part.type === 'switch') {
    return (
      <g>
        <line x1={0} y1={15} x2={12} y2={15} stroke="#9e9e9e" strokeWidth={3} />
        <line x1={58} y1={15} x2={70} y2={15} stroke="#9e9e9e" strokeWidth={3} />
        <rect x={10} y={4} width={50} height={22} rx={3} fill="#37474f" />
        <rect
          className="switch-slider"
          x={part.isOn ? 36 : 16}
          y={6}
          width={18}
          height={18}
          rx={2}
          fill={part.isOn ? '#66bb6a' : '#bdbdbd'}
          onPointerDown={(e) => {
            e.stopPropagation();
            onFlipSwitch?.();
          }}
        />
        <text x={35} y={-4} textAnchor="middle" fontSize={10} fill="#546e7a">
          {part.isOn ? 'ON' : 'OFF'}
        </text>
      </g>
    );
  }

  if (part.type === 'button') {
    return (
      <g
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onFlipSwitch?.();
        }}
      >
        <image
          href="/button.png"
          x={0}
          y={0}
          width={60}
          height={36}
          style={{
            transformOrigin: '30px 18px',
            transform: part.isOn ? 'scale(0.94)' : 'scale(1)',
            transition: 'transform 0.08s ease',
            filter: part.isOn ? 'brightness(1.15) drop-shadow(0 0 4px rgba(229,57,53,0.6))' : 'none',
          }}
        />
      </g>
    );
  }
  if (part.type === 'buzzer') {
    const isBuzzing = (brightness ?? 0) > 0.01;
    return (
      <g>
        <image href="/buzzer.png" x={0} y={0} width={50} height={50} />
        {isBuzzing && (
          <g stroke="#ffca28" strokeWidth={2} fill="none">
            <path d="M 18 8 A 12 12 0 0 1 32 8" />
            <path d="M 12 2 A 20 20 0 0 1 38 2" />
          </g>
        )}
      </g>
    );
  }
  const isLit = brightness > 0.01;
  return (
    <g>
      {isLit && <circle cx={25} cy={24} r={24 + 18 * brightness} fill="#fff59d" opacity={0.2 + 0.5 * brightness} filter="url(#glow)" />}
      <line x1={15} y1={58} x2={15} y2={70} stroke="#9e9e9e" strokeWidth={3} />
      <line x1={35} y1={58} x2={35} y2={70} stroke="#9e9e9e" strokeWidth={3} />
      <circle cx={25} cy={24} r={21} fill={isLit ? `rgba(255, 238, 88, ${0.35 + 0.65 * brightness})` : '#e0f2f1'} stroke="#90a4ae" strokeWidth={2} />
      <path d="M18,40 L18,28 Q25,18 32,28 L32,40" fill="none" stroke={isLit ? '#ff6f00' : '#78909c'} strokeWidth={1.5} />
      <rect x={14} y={42} width={22} height={16} rx={2} fill="#90a4ae" />
    </g>
  );
}
