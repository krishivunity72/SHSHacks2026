import { PART_INFO, PART_TYPES, defaultSettings } from '../parts';
import type { Part, PartType } from '../parts';
import PartDrawing from './PartDrawing';

type Props = {
  onClickPart: (type: PartType) => void;
};

export default function PartsPanel({ onClickPart }: Props) {
  return (
    <aside className="parts-panel">
      <h2>Components</h2>
      <p className="hint">Drag onto the workplane, or click to add</p>

      <div className="parts-grid">
        {PART_TYPES.map((type) => {
          const info = PART_INFO[type];
          const preview: Part = { id: 'preview', type, x: 0, y: 0, rotation: 0, ...defaultSettings(type) };

          return (
            <button
              key={type}
              className="part-tile"
              data-type={type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('part-type', type)}
              onClick={() => onClickPart(type)}
            >
              <svg viewBox={`-10 -16 ${info.width + 20} ${info.height + 26}`} className="part-preview">
                <PartDrawing part={preview} />
              </svg>
              <span>{info.name}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
