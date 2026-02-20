import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiagramListItem } from '../types';
import { diagramService } from '../services';

export function Dashboard() {
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDiagrams();
  }, []);

  async function loadDiagrams() {
    setLoading(true);
    try {
      const list = await diagramService.list();
      setDiagrams(list);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const diagram = await diagramService.create();
    navigate(`/edit/${diagram.id}`);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('Delete this diagram?')) {
      await diagramService.delete(id);
      loadDiagrams();
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const diagram = await diagramService.importJSON(text);
          navigate(`/edit/${diagram.id}`);
        } catch (err) {
          alert('Failed to import diagram. Invalid file format.');
        }
      }
    };
    input.click();
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        backgroundColor: '#f9fafb',
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>
            Lucid Clone
          </h1>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleImport}
              style={{
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 500,
                color: '#4f46e5',
                backgroundColor: 'white',
                border: '2px solid #4f46e5',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#eef2ff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              Import JSON
            </button>
            <button
              onClick={handleCreate}
              style={{
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 500,
                color: 'white',
                backgroundColor: '#4f46e5',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
            >
              + New Diagram
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 64,
              color: '#6b7280',
              fontSize: 18,
            }}
          >
            Loading...
          </div>
        ) : diagrams.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 64,
              backgroundColor: 'white',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              No diagrams yet
            </h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              Create your first diagram to get started
            </p>
            <button
              onClick={handleCreate}
              style={{
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 500,
                color: 'white',
                backgroundColor: '#4f46e5',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Create Diagram
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {diagrams.map((diagram) => (
              <div
                key={diagram.id}
                onClick={() => navigate(`/edit/${diagram.id}`)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  padding: 20,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                  position: 'relative',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 140,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    color: '#9ca3af',
                    overflow: 'hidden',
                  }}
                >
                  {diagram.thumbnail ? (
                    <img
                      src={diagram.thumbnail}
                      alt={diagram.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    '◇'
                  )}
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {diagram.name}
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  {formatDate(diagram.updatedAt)}
                </p>
                <button
                  onClick={(e) => handleDelete(diagram.id, e)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.color = '#dc2626';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.opacity = '0';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
