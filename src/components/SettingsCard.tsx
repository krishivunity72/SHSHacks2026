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

      {part.type === 'arduino' && (
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>
            Spawn Pins on Board:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
            {PART_INFO.arduino.pins.map((pin) => {
              const active = part.activePins ?? ['5v', 'gnd', 'd13'];
              const isSpawned = active.includes(pin.name);
              return (
                <button
                  key={pin.name}
                  className="btn small"
                  style={{
                    padding: '3px 7px',
                    fontSize: '11px',
                    fontWeight: isSpawned ? 'bold' : 'normal',
                    backgroundColor: isSpawned ? '#00878F' : '#ECEFF1',
                    color: isSpawned ? '#FFFFFF' : '#37474F',
                    borderColor: isSpawned ? '#005C62' : '#CFD8DC',
                  }}
                  onClick={() => {
                    const nextActive = isSpawned
                      ? active.filter((p) => p !== pin.name)
                      : [...active, pin.name];
                    onChangePart({ activePins: nextActive });
                  }}
                >
                  {pin.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>
            Arduino C++ Code:
          </label>
          <textarea
            rows={8}
            value={part.code ?? ''}
            onChange={(e) => onChangePart({ code: e.target.value })}
            placeholder="void setup() { ... }"
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '11px',
              backgroundColor: '#1E1E1E',
              color: '#00E676',
              border: '1px solid #37474F',
              borderRadius: '6px',
              padding: '8px',
              resize: 'vertical',
            }}
          />
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['d13', 'd12', 'd11', 'd10', 'd9', 'd8', 'd7', 'd6', 'd5', 'd4', 'd3', 'd2', 'd1', 'd0'].map((dPin) => {
              const active = part.activePins ?? ['5v', 'gnd', 'd13'];
              if (!active.includes(dPin)) return null;
              const val = (part.pinOutputs?.[dPin] ?? (dPin === 'd13' ? 5 : 0)) > 0 ? 5 : 0;
              return (
                <button
                  key={dPin}
                  className="btn small"
                  style={{ fontSize: '11px', padding: '3px 6px' }}
                  onClick={() => {
                    const nextVal = val > 0 ? 0 : 5;
                    onChangePart({
                      pinOutputs: { ...(part.pinOutputs ?? {}), [dPin]: nextVal },
                    });
                  }}
                >
                  {dPin.toUpperCase()}: {val > 0 ? 'HIGH (5V)' : 'LOW (0V)'}
                </button>
              );
            })}
          </div>
        </div>
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
