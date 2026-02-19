import { useState } from 'react';
import { useDiagramStore } from '../store';
import { K8S_SHAPES, K8sShapeMeta, K8sShapeType } from '../types';
import { K8sIcon } from './K8sIcons';

const CATEGORIES = [
  { id: 'workload', label: 'Workloads' },
  { id: 'network', label: 'Network' },
  { id: 'config', label: 'Config' },
  { id: 'storage', label: 'Storage' },
  { id: 'cluster', label: 'Cluster' },
] as const;

export function K8sSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['workload', 'network'])
  );
  const { addShape, setTool } = useDiagramStore();

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, shapeType: K8sShapeType) => {
    e.dataTransfer.setData('shapeType', shapeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleShapeClick = (meta: K8sShapeMeta) => {
    // Add shape at center of viewport
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    addShape(meta.type, viewportCenterX - meta.defaultWidth / 2, viewportCenterY - meta.defaultHeight / 2);
    setTool('select');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          left: 16,
          top: 80,
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          border: 'none',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          zIndex: 100,
          fontSize: 20,
        }}
        title="Open K8s Shapes"
      >
        ☸
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        top: 80,
        width: 200,
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 100,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 12px 8px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>☸</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
            Kubernetes
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: '#6b7280',
            fontSize: 16,
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {CATEGORIES.map((category) => {
          const shapes = K8S_SHAPES.filter((s) => s.category === category.id);
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.id)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {category.label}
                <span
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  ›
                </span>
              </button>

              {/* Shapes */}
              {isExpanded && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 4,
                    padding: '4px 8px 8px',
                  }}
                >
                  {shapes.map((meta) => (
                    <ShapeButton
                      key={meta.type}
                      meta={meta}
                      onClick={() => handleShapeClick(meta)}
                      onDragStart={(e) => handleDragStart(e, meta.type)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid #e5e7eb',
          fontSize: 11,
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Click or drag to add shapes
      </div>
    </div>
  );
}

function ShapeButton({
  meta,
  onClick,
  onDragStart,
}: {
  meta: K8sShapeMeta;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      title={meta.label}
      style={{
        width: '100%',
        aspectRatio: '1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 4,
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        backgroundColor: 'white',
        cursor: 'grab',
        transition: 'all 0.15s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.backgroundColor = '#eff6ff';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.backgroundColor = 'white';
      }}
    >
      <K8sIcon type={meta.type} size={28} color={meta.color} />
      <span
        style={{
          fontSize: 9,
          color: '#6b7280',
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {meta.label}
      </span>
    </button>
  );
}
