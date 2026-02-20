import { useState, RefObject } from 'react';
import Konva from 'konva';
import { diagramService } from '../services';

interface ExportMenuProps {
  diagramId: string | null;
  stageRef: RefObject<Konva.Stage>;
}

export function ExportMenu({ diagramId, stageRef }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportPNG = async () => {
    if (!stageRef.current || !diagramId) return;

    setExporting(true);
    try {
      const blob = await diagramService.exportPNG(diagramId, stageRef.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagram-${diagramId}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Failed to export PNG');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    if (!diagramId) return;

    setExporting(true);
    try {
      const json = await diagramService.exportJSON(diagramId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagram-${diagramId}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to export JSON:', err);
      alert('Failed to export JSON');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 100,
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          backgroundColor: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          color: '#374151',
        }}
        title="Export"
      >
        ↓
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 52,
            right: 0,
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            minWidth: 160,
          }}
        >
          <button
            onClick={handleExportPNG}
            disabled={exporting}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              cursor: exporting ? 'not-allowed' : 'pointer',
              backgroundColor: 'white',
              color: '#374151',
              textAlign: 'left',
            }}
            onMouseOver={(e) => {
              if (!exporting) e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <span style={{ fontSize: 16 }}>🖼️</span>
            Export as PNG
          </button>
          <button
            onClick={handleExportJSON}
            disabled={exporting}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: exporting ? 'not-allowed' : 'pointer',
              backgroundColor: 'white',
              color: '#374151',
              textAlign: 'left',
            }}
            onMouseOver={(e) => {
              if (!exporting) e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <span style={{ fontSize: 16 }}>📄</span>
            Export as JSON
          </button>
        </div>
      )}
    </div>
  );
}
