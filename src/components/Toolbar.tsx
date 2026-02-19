import { useDiagramStore } from '../store';
import { Tool } from '../types';

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pan', label: 'Pan', icon: '✋' },
  { id: 'rectangle', label: 'Rectangle', icon: '▢' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'diamond', label: 'Diamond', icon: '◇' },
  { id: 'text', label: 'Text', icon: 'T' },
];

export function Toolbar() {
  const { activeTool, setTool, zoom, setZoom, deleteSelectedShapes, selectedShapeIds } =
    useDiagramStore();

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: 8,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 100,
      }}
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setTool(tool.id)}
          title={tool.label}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            backgroundColor: activeTool === tool.id ? '#4f46e5' : '#f3f4f6',
            color: activeTool === tool.id ? 'white' : '#374151',
            transition: 'all 0.15s ease',
          }}
        >
          {tool.icon}
        </button>
      ))}

      <div style={{ width: 1, backgroundColor: '#e5e7eb', margin: '0 4px' }} />

      <button
        onClick={() => setZoom(zoom - 0.1)}
        title="Zoom Out"
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          backgroundColor: '#f3f4f6',
          color: '#374151',
        }}
      >
        −
      </button>

      <div
        style={{
          width: 60,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 500,
          color: '#374151',
        }}
      >
        {Math.round(zoom * 100)}%
      </div>

      <button
        onClick={() => setZoom(zoom + 0.1)}
        title="Zoom In"
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          backgroundColor: '#f3f4f6',
          color: '#374151',
        }}
      >
        +
      </button>

      {selectedShapeIds.length > 0 && (
        <>
          <div style={{ width: 1, backgroundColor: '#e5e7eb', margin: '0 4px' }} />
          <button
            onClick={deleteSelectedShapes}
            title="Delete Selected"
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
            }}
          >
            🗑
          </button>
        </>
      )}
    </div>
  );
}
