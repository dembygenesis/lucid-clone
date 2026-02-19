import { useDiagramStore } from '../store';
import { Tool } from '../types';

interface ToolConfig {
  id: Tool;
  label: string;
  icon: string;
  group: 'navigation' | 'shapes' | 'connector';
}

const tools: ToolConfig[] = [
  { id: 'select', label: 'Select (V)', icon: '↖', group: 'navigation' },
  { id: 'pan', label: 'Pan (H)', icon: '✋', group: 'navigation' },
  { id: 'connector', label: 'Connector (C)', icon: '↗', group: 'connector' },
  { id: 'rectangle', label: 'Rectangle (R)', icon: '▢', group: 'shapes' },
  { id: 'circle', label: 'Circle (O)', icon: '○', group: 'shapes' },
  { id: 'diamond', label: 'Diamond (D)', icon: '◇', group: 'shapes' },
  { id: 'text', label: 'Text (T)', icon: 'T', group: 'shapes' },
];

export function Toolbar() {
  const {
    activeTool,
    setTool,
    zoom,
    setZoom,
    deleteSelectedShapes,
    deleteSelectedConnectors,
    selectedShapeIds,
    selectedConnectorIds,
    connectionState,
    cancelConnection,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDiagramStore();

  const hasSelection = selectedShapeIds.length > 0 || selectedConnectorIds.length > 0;

  const handleDelete = () => {
    deleteSelectedShapes();
    deleteSelectedConnectors();
  };

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
      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={!canUndo()}
        title="Undo (Ctrl+Z)"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          border: 'none',
          borderRadius: 6,
          cursor: canUndo() ? 'pointer' : 'not-allowed',
          backgroundColor: '#f3f4f6',
          color: canUndo() ? '#374151' : '#9ca3af',
          opacity: canUndo() ? 1 : 0.5,
        }}
      >
        ↩
      </button>
      <button
        onClick={redo}
        disabled={!canRedo()}
        title="Redo (Ctrl+Shift+Z)"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          border: 'none',
          borderRadius: 6,
          cursor: canRedo() ? 'pointer' : 'not-allowed',
          backgroundColor: '#f3f4f6',
          color: canRedo() ? '#374151' : '#9ca3af',
          opacity: canRedo() ? 1 : 0.5,
        }}
      >
        ↪
      </button>

      <Divider />

      {/* Navigation tools */}
      {tools
        .filter((t) => t.group === 'navigation')
        .map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onClick={() => setTool(tool.id)}
          />
        ))}

      <Divider />

      {/* Connector tool */}
      {tools
        .filter((t) => t.group === 'connector')
        .map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id || connectionState.isConnecting}
            onClick={() => {
              if (connectionState.isConnecting) {
                cancelConnection();
              }
              setTool(tool.id);
            }}
            highlight={connectionState.isConnecting}
          />
        ))}

      <Divider />

      {/* Shape tools */}
      {tools
        .filter((t) => t.group === 'shapes')
        .map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onClick={() => setTool(tool.id)}
          />
        ))}

      <Divider />

      {/* Zoom controls */}
      <button
        onClick={() => setZoom(zoom - 0.1)}
        title="Zoom Out (-)"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
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
          width: 50,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 500,
          color: '#374151',
        }}
      >
        {Math.round(zoom * 100)}%
      </div>

      <button
        onClick={() => setZoom(zoom + 0.1)}
        title="Zoom In (+)"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          backgroundColor: '#f3f4f6',
          color: '#374151',
        }}
      >
        +
      </button>

      {/* Delete button */}
      {hasSelection && (
        <>
          <Divider />
          <button
            onClick={handleDelete}
            title="Delete Selected (Del)"
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
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

      {/* Connection indicator */}
      {connectionState.isConnecting && (
        <>
          <Divider />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 8px',
              fontSize: 13,
              color: '#059669',
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 10 }}>●</span>
            Drawing connection...
            <button
              onClick={cancelConnection}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ToolButton({
  tool,
  isActive,
  onClick,
  highlight,
}: {
  tool: ToolConfig;
  isActive: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={tool.label}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        backgroundColor: highlight
          ? '#dcfce7'
          : isActive
          ? '#4f46e5'
          : '#f3f4f6',
        color: highlight ? '#059669' : isActive ? 'white' : '#374151',
        transition: 'all 0.15s ease',
      }}
    >
      {tool.icon}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, backgroundColor: '#e5e7eb', margin: '0 4px' }} />;
}
