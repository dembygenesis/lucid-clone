import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { useDiagramStore } from '../store';
import { getDiagram, saveDiagram, createDiagram } from '../utils/db';

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const {
    diagramId,
    diagramName,
    shapes,
    connectors,
    settings,
    setDiagram,
    setDiagramName,
    deleteSelectedShapes,
  } = useDiagramStore();

  // Load diagram
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (id === 'new') {
          const diagram = await createDiagram();
          navigate(`/edit/${diagram.id}`, { replace: true });
          return;
        }

        if (id) {
          const diagram = await getDiagram(id);
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

  // Auto-save
  useEffect(() => {
    if (!diagramId || loading) return;

    const timeout = setTimeout(() => {
      saveDiagram({
        id: diagramId,
        name: diagramName,
        shapes,
        connectors,
        settings,
        createdAt: '', // Will be preserved
        updatedAt: new Date().toISOString(),
      });
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT') {
          deleteSelectedShapes();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedShapes]);

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
      <Canvas width={dimensions.width} height={dimensions.height} />
    </div>
  );
}
