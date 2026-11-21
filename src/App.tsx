import { useEffect, useMemo, useRef, useState } from 'react';
import { PART_INFO, WIRE_COLORS, defaultSettings } from './parts';
import type { Part, PartType, Wire } from './parts';
import { makeId, snapToGrid } from './helpers';
import { runSimulation } from './simulator';
import { readSketch } from './visionApi';
import { convertSketch } from './sketchConverter';
import Workplane from './components/Workplane';
import PartsPanel from './components/PartsPanel';
import SettingsCard from './components/SettingsCard';

export default function App() {
  const [parts, setParts] = useState<Part[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingSketch, setLoadingSketch] = useState(false);

  const jsonInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const simulation = useMemo(() => (isSimulating ? runSimulation(parts, wires) : null), [isSimulating, parts, wires]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (!isSimulating || !simulation) {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch {}
        oscillatorRef.current = null;
      }
      return;
    }

    const buzzerPart = parts.find((p) => p.type === 'buzzer');
    const reading = buzzerPart ? simulation.readings[buzzerPart.id] : null;
    const isBuzzing = reading && (reading.brightness > 0.005 || Math.abs(reading.voltage) > 0.1 || Math.abs(reading.current) > 0.0005);

    if (isBuzzing) {
      if (!audioCtxRef.current) {
        const AudioClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (!oscillatorRef.current) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscillatorRef.current = osc;
      }
    } else {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch {}
        oscillatorRef.current = null;
      }
    }
  }, [isSimulating, simulation, parts]);

  useEffect(() => {
    if (!isSimulating) return;

    const arduino = parts.find((p) => p.type === 'arduino');
    if (!arduino || !arduino.code) return;

    const code = arduino.code;
    const actions: { pin: string; high: boolean; delay: number }[] = [];

    const regex = /digitalWrite\s*\(\s*(\d+|[a-zA-Z0-9_]+)\s*,\s*(HIGH|LOW|1|0)\s*\)[\s\S]*?(?:delay\s*\(\s*(\d+)\s*\))?/gi;
    let match;
    while ((match = regex.exec(code)) !== null) {
      const rawPin = match[1].toLowerCase().replace(/^d/, '');
      const isHigh = match[2].toUpperCase() === 'HIGH' || match[2] === '1';
      const delayMs = match[3] ? parseInt(match[3], 10) : 500;
      actions.push({
        pin: `d${rawPin}`,
        high: isHigh,
        delay: Math.max(delayMs, 100), 
      });
    }

    if (actions.length === 0) return;

    let stepIndex = 0;
    let timer: number | null = null;

    function runStep() {
      const step = actions[stepIndex];
      setParts((prevParts) =>
        prevParts.map((p) => {
          if (p.id !== arduino!.id) return p;
          return {
            ...p,
            pinOutputs: {
              ...(p.pinOutputs ?? {}),
              [step.pin]: step.high ? 5 : 0,
            },
          };
        }),
      );

      stepIndex = (stepIndex + 1) % actions.length;
      timer = window.setTimeout(runStep, step.delay);
    }

    runStep();

    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [isSimulating, parts.find((p) => p.type === 'arduino')?.code]);

  const selectedPart = parts.find((p) => p.id === selectedPartId);
  const selectedWire = wires.find((w) => w.id === selectedWireId);
  function addPart(type: PartType, x: number, y: number) {
    const info = PART_INFO[type];
    const newPart: Part = {
      id: makeId(type),
      type,
      x: snapToGrid(x - info.width / 2), 
      y: snapToGrid(y - info.height / 2),
      rotation: 0,
      ...defaultSettings(type),
    };
    setParts([...parts, newPart]);
    selectPart(newPart.id);
  }

  function movePart(id: string, x: number, y: number) {
    setParts(parts.map((p) => (p.id === id ? { ...p, x: snapToGrid(x), y: snapToGrid(y) } : p)));
  }

  function changePart(id: string, changes: Partial<Part>) {
    setParts(parts.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  function addWire(fromPart: string, fromPin: string, toPart: string, toPin: string) {
    const newWire: Wire = {
      id: makeId('wire'),
      fromPart,
      fromPin,
      toPart,
      toPin,
      color: WIRE_COLORS[wires.length % WIRE_COLORS.length],
    };
    setWires([...wires, newWire]);
  }

  function rotateSelected() {
    if (selectedPart) changePart(selectedPart.id, { rotation: (selectedPart.rotation + 90) % 360 });
  }

  function deleteSelected() {
    if (selectedPartId) {
      setParts(parts.filter((p) => p.id !== selectedPartId));
      setWires(wires.filter((w) => w.fromPart !== selectedPartId && w.toPart !== selectedPartId));
    }
    if (selectedWireId) {
      setWires(wires.filter((w) => w.id !== selectedWireId));
    }
    selectPart(null);
  }

  function selectPart(id: string | null) {
    setSelectedPartId(id);
    setSelectedWireId(null);
  }

  function selectWire(id: string | null) {
    setSelectedWireId(id);
    setSelectedPartId(null);
  }

  function clearAll() {
    if (parts.length > 0 && !window.confirm('Delete everything?')) return;
    setParts([]);
    setWires([]);
    selectPart(null);
  }
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const typingInBox = ['INPUT', 'SELECT'].includes((e.target as HTMLElement).tagName);
      if (typingInBox) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if (e.key === 'r' || e.key === 'R') rotateSelected();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(''), 6000);
  }

  function loadCircuit(data: { parts?: Part[]; wires?: Wire[] }) {
    const newParts = (data.parts ?? [])
      .filter((p) => PART_INFO[p.type]) 
      .map((p, i) => ({
        ...defaultSettings(p.type),
        ...p,
        id: p.id ?? makeId(p.type),
        rotation: p.rotation ?? 0,
        x: p.x ?? 120 + (i % 4) * 160,
        y: p.y ?? 120 + Math.floor(i / 4) * 160,
      }));

    const partExists = (id: string) => newParts.some((p) => p.id === id);
    const newWires = (data.wires ?? [])
      .filter((w) => partExists(w.fromPart) && partExists(w.toPart))
      .map((w, i) => ({ ...w, id: w.id ?? makeId('wire'), color: w.color ?? WIRE_COLORS[i % WIRE_COLORS.length] }));

    setParts(newParts);
    setWires(newWires);
    selectPart(null);
  }

  function exportCircuit() {
    const file = new Blob([JSON.stringify({ parts, wires }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = 'circuit.json';
    link.click();
  }

  async function importCircuit(file: File) {
    try {
      loadCircuit(JSON.parse(await file.text()));
      showMessage('Circuit loaded!');
    } catch {
      showMessage("That file isn't a valid circuit.");
    }
  }

  async function uploadSketch(photo: File) {
    setLoadingSketch(true);
    try {
      const sketch = convertSketch(await readSketch(photo));
      if (sketch.parts.length === 0) {
        throw new Error("Couldn't find any parts in that photo. Try a clearer picture.");
      }
      loadCircuit(sketch);

      let text = `Found ${sketch.parts.length} parts and ${sketch.wires.length} wires. Double-check them and fix anything that looks wrong.`;
      if (sketch.skipped.length > 0) {
        text += ` Skipped (not supported yet): ${sketch.skipped.join(', ')}.`;
      }
      showMessage(text);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
    setLoadingSketch(false);
  }

  return (
    <div className="app">
      <header className="toolbar">
        <div className="logo">Circuit Sandbox</div>

        <div className="button-group">
          <button className="btn" onClick={rotateSelected} disabled={!selectedPart}>
            Rotate
          </button>
          <button className="btn" onClick={deleteSelected} disabled={!selectedPart && !selectedWire}>
            Delete
          </button>
          <button className="btn" onClick={clearAll}>
            Clear
          </button>
        </div>

        <div className="button-group">
          <button className="btn" onClick={() => photoInput.current?.click()} disabled={loadingSketch}>
            {loadingSketch ? 'Reading sketch...' : 'Upload Sketch'}
          </button>
          <button className="btn" onClick={() => jsonInput.current?.click()}>
            Import
          </button>
          <button className="btn" onClick={exportCircuit}>
            Export
          </button>
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) uploadSketch(e.target.files[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={jsonInput}
          type="file"
          accept=".json"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) importCircuit(e.target.files[0]);
            e.target.value = '';
          }}
        />

        <button className={isSimulating ? 'btn sim-button running' : 'btn sim-button'} onClick={() => setIsSimulating(!isSimulating)}>
          {isSimulating ? '■ Stop Simulation' : '▶ Start Simulation'}
        </button>
      </header>
      <main className="main">
        <div className="workplane-area">
          <Workplane
            parts={parts}
            wires={wires}
            selectedPartId={selectedPartId}
            selectedWireId={selectedWireId}
            readings={simulation?.readings ?? null}
            onSelectPart={selectPart}
            onSelectWire={selectWire}
            onAddPart={addPart}
            onMovePart={movePart}
            onAddWire={addWire}
            onFlipSwitch={(id) => changePart(id, { isOn: !parts.find((p) => p.id === id)?.isOn })}
          />

          <SettingsCard
            part={selectedPart}
            wire={selectedWire}
            reading={selectedPart ? simulation?.readings[selectedPart.id] : undefined}
            onChangePart={(changes) => selectedPart && changePart(selectedPart.id, changes)}
            onChangeWireColor={(color) =>
              setWires(wires.map((w) => (w.id === selectedWireId ? { ...w, color } : w)))
            }
            onRotate={rotateSelected}
            onDelete={deleteSelected}
          />

          {isSimulating && (
            <div className="sim-status">
              {simulation && simulation.warnings.length > 0 ? (
                simulation.warnings.map((warning, i) => (
                  <div key={i} className="warning">
                    ⚠ {warning}
                  </div>
                ))
              ) : (
                <div className="all-good">Simulation running</div>
              )}
            </div>
          )}

          {message && <div className="message">{message}</div>}

          <div className="help-text">
            Click a pin, then another pin to make a wire · Drag the background to move around · Scroll to zoom
          </div>
        </div>

        <PartsPanel onClickPart={(type) => addPart(type, 250 + parts.length * 30, 250 + parts.length * 20)} />
      </main>
    </div>
  );
}
