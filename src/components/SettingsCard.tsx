import { LED_COLORS, PART_INFO, WIRE_COLORS } from '../parts';
import type { Part, Wire } from '../parts';
import type { Reading } from '../simulator';

type Props = {
  part: Part | undefined;
  wire: Wire | undefined;
  reading: Reading | undefined;
  onChangePart: (changes: Partial<Part>) => void;
  onChangeWireColor: (color: string) => void;
  onRotate: () => void;
  onDelete: () => void;
};

function formatCurrent(amps: number) {
  return amps < 1 ? (amps * 1000).toFixed(1) + ' mA' : amps.toFixed(2) + ' A';
}

export default function SettingsCard({ part, wire, reading, onChangePart, onChangeWireColor, onRotate, onDelete }: Props) {
  if (wire) {
    return (
      <div className="settings-card">
        <h3>Wire</h3>
        <label>Color</label>
        <div className="color-options">
          {WIRE_COLORS.map((color) => (
            <button
              key={color}
              className={wire.color === color ? 'color-dot chosen' : 'color-dot'}
              style={{ background: color }}
              onClick={() => onChangeWireColor(color)}
            />
          ))}
        </div>
        <button className="btn small red-text" onClick={onDelete}>
          Delete wire
        </button>
      </div>
    );
  }

  if (!part) return null;

  return (
    <div className="settings-card">
      <h3>{PART_INFO[part.type].name}</h3>

      {part.type === 'battery' && (
        <>
          <label>Voltage</label>
          <select value={part.voltage} onChange={(e) => onChangePart({ voltage: Number(e.target.value) })}>
            {[1.5, 3, 5, 9, 12].map((v) => (
              <option key={v} value={v}>
                {v} V
              </option>
            ))}
          </select>
        </>
      )}

      {part.type === 'resistor' && (
        <>
          <label>Resistance (Ω)</label>
          <input
            id="resistance"
            type="number"
            min={1}
            value={part.resistance}
            onChange={(e) => onChangePart({ resistance: Math.max(1, Number(e.target.value)) })}
          />
        </>
      )}

      {part.type === 'led' && (
        <>
          <label>Color</label>
          <select value={part.color} onChange={(e) => onChangePart({ color: e.target.value })}>
            {Object.keys(LED_COLORS).map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </>
      )}

      {part.type === 'switch' && (
        <button className="btn small" onClick={() => onChangePart({ isOn: !part.isOn })}>
          Turn {part.isOn ? 'off' : 'on'}
        </button>
      )}

      {reading && (
        <div className="readings">
          <p>
            Current <b>{formatCurrent(reading.current)}</b>
          </p>
          <p>
            Voltage <b>{Math.abs(reading.voltage).toFixed(2)} V</b>
          </p>
          <p>
            Power <b>{(reading.power * 1000).toFixed(0)} mW</b>
          </p>
          {reading.warning && <p className="warning-text">{reading.warning}</p>}
        </div>
      )}

      <div className="card-buttons">
        <button className="btn small" onClick={onRotate}>
          Rotate (R)
        </button>
        <button className="btn small red-text" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
