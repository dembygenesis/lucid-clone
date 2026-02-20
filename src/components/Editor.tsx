import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Konva from 'konva';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { K8sSidebar } from './K8sSidebar';
import { PropertiesPanel } from './PropertiesPanel';
import { ExportMenu } from './ExportMenu';
import { useDiagramStore } from '../store';
import { diagramService, saveDiagramWithThumbnail } from '../services';
import { isK8sShape, K8sShapeType } from '../types';

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const stageRef = useRef<Konva.Stage>(null);

  const {
    diagramId,
    diagramName,
    shapes,
    connectors,
    settings,
    selectedShapeIds,
    setDiagram,
    setDiagramName,
    addShape,
    viewPosition,
    zoom,
  } = useDiagramStore();

  // Load diagram
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (id === 'new') {
          const diagram = await diagramService.create();
          navigate(`/edit/${diagram.id}`, { replace: true });
          return;
        }

        if (id) {
          const diagram = await diagramService.get(id);
          if (diagram) {
            setDiagram(
              diagram.id,
              diagram.name,
              diagram.shapes,
              diagram.connectors,
              diagram.settings
            );
          } else {
            navigate('/');
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate, setDiagram]);

  // Auto-save with thumbnail
  useEffect(() => {
    if (!diagramId || loading) return;

    const timeout = setTimeout(() => {
      saveDiagramWithThumbnail(
        {
          id: diagramId,
          name: diagramName,
          shapes,
          connectors,
          settings,
          createdAt: '', // Will be preserved
          updatedAt: new Date().toISOString(),
        },
        stageRef.current || undefined
      );
    }, 1000);

    return () => clearTimeout(timeout);
  }, [diagramId, diagramName, shapes, connectors, settings, loading]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle drag and drop from sidebar
  useEffect(() => {
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const shapeType = e.dataTransfer?.getData('shapeType');
      if (shapeType && isK8sShape(shapeType as any)) {
        const x = (e.clientX - viewPosition.x) / zoom;
        const y = (e.clientY - viewPosition.y) / zoom;
        addShape(shapeType as K8sShapeType, x - 40, y - 40);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [addShape, viewPosition, zoom]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDiagramName(e.target.value);
    },
    [setDiagramName]
  );

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: '#6b7280',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 100,
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          ←
        </button>
        <input
          type="text"
          value={diagramName}
          onChange={handleNameChange}
          style={{
            padding: '8px 12px',
            fontSize: 16,
            fontWeight: 500,
            border: 'none',
            borderRadius: 8,
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            outline: 'none',
            width: 200,
          }}
        />
      </div>

      <Toolbar />
      <K8sSidebar />
      <ExportMenu diagramId={diagramId} stageRef={stageRef} />
      {selectedShapeIds.length > 0 && <PropertiesPanel />}
      <Canvas width={dimensions.width} height={dimensions.height} stageRef={stageRef} />
    </div>
  );
}
