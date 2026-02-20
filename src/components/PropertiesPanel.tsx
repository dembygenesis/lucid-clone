import { useDiagramStore } from '../store';

const COLORS = [
  '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#374151', '#111827',
  '#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c',
  '#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c',
  '#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207',
  '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d',
  '#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490',
  '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8',
  '#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9',
  '#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf',
  '#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d',
];

const STROKE_WIDTHS = [1, 2, 3, 4, 5];

export function PropertiesPanel() {
  const { shapes, selectedShapeIds, updateShape, saveToHistory } = useDiagramStore();

  const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));

  if (selectedShapes.length === 0) return null;

  // Get common properties from first selected shape
  const firstShape = selectedShapes[0];
  const currentFill = firstShape.fill;
  const currentStroke = firstShape.stroke;
  const currentStrokeWidth = firstShape.strokeWidth;

  const handleFillChange = (color: string) => {
    selectedShapeIds.forEach(id => {
      updateShape(id, { fill: color });
    });
    saveToHistory();
  };

  const handleStrokeChange = (color: string) => {
    selectedShapeIds.forEach(id => {
      updateShape(id, { stroke: color });
    });
    saveToHistory();
  };

  const handleStrokeWidthChange = (width: number) => {
    selectedShapeIds.forEach(id => {
      updateShape(id, { strokeWidth: width });
    });
    saveToHistory();
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top: 80,
        width: 240,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600,
          fontSize: 14,
          color: '#111827',
        }}
      >
        Properties
        <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
          ({selectedShapes.length} selected)
        </span>
      </div>

      {/* Fill Color */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>
          Fill Color
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 4,
          }}
        >
          {COLORS.map((color) => (
            <button
              key={`fill-${color}`}
              onClick={() => handleFillChange(color)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                border: currentFill === color ? '2px solid #3b82f6' : '1px solid #d1d5db',
                backgroundColor: color,
                cursor: 'pointer',
                padding: 0,
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke Color */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>
          Stroke Color
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 4,
          }}
        >
          {COLORS.map((color) => (
            <button
              key={`stroke-${color}`}
              onClick={() => handleStrokeChange(color)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                border: currentStroke === color ? '2px solid #3b82f6' : '1px solid #d1d5db',
                backgroundColor: color,
                cursor: 'pointer',
                padding: 0,
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>
          Stroke Width
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              onClick={() => handleStrokeWidthChange(width)}
              style={{
                flex: 1,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                border: currentStrokeWidth === width ? '2px solid #3b82f6' : '1px solid #d1d5db',
                backgroundColor: currentStrokeWidth === width ? '#eff6ff' : 'white',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
              }}
            >
              {width}px
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
