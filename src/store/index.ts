import { create } from 'zustand';
import { Shape, Connector, DiagramSettings, Tool, DEFAULT_SETTINGS, DEFAULT_SHAPE_STYLE } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface DiagramState {
  // Diagram data
  diagramId: string | null;
  diagramName: string;
  shapes: Shape[];
  connectors: Connector[];
  settings: DiagramSettings;

  // UI state
  selectedShapeIds: string[];
  activeTool: Tool;
  isPanning: boolean;
  viewPosition: { x: number; y: number };
  zoom: number;

  // Actions
  setDiagram: (id: string, name: string, shapes: Shape[], connectors: Connector[], settings: DiagramSettings) => void;
  setDiagramName: (name: string) => void;

  // Shape actions
  addShape: (type: Shape['type'], x: number, y: number) => Shape;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;

  // Selection
  selectShape: (id: string, addToSelection?: boolean) => void;
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;

  // Connector actions
  addConnector: (fromId: string, toId: string, fromAnchor: Connector['fromAnchor'], toAnchor: Connector['toAnchor']) => Connector;
  deleteConnector: (id: string) => void;

  // Tool & View
  setTool: (tool: Tool) => void;
  setViewPosition: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  setPanning: (isPanning: boolean) => void;

  // Settings
  updateSettings: (settings: Partial<DiagramSettings>) => void;

  // Utility
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  diagramId: null,
  diagramName: 'Untitled',
  shapes: [],
  connectors: [],
  settings: DEFAULT_SETTINGS,
  selectedShapeIds: [],
  activeTool: 'select',
  isPanning: false,
  viewPosition: { x: 0, y: 0 },
  zoom: 1,

  setDiagram: (id, name, shapes, connectors, settings) => {
    set({
      diagramId: id,
      diagramName: name,
      shapes,
      connectors,
      settings,
      selectedShapeIds: [],
    });
  },

  setDiagramName: (name) => set({ diagramName: name }),

  addShape: (type, x, y) => {
    const state = get();
    const pos = state.snapToGrid(x, y);
    const shape: Shape = {
      id: uuidv4(),
      type,
      x: pos.x,
      y: pos.y,
      width: 100,
      height: type === 'text' ? 40 : 100,
      rotation: 0,
      ...DEFAULT_SHAPE_STYLE,
      text: type === 'text' ? 'Text' : undefined,
    };
    set({ shapes: [...state.shapes, shape] });
    return shape;
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },

  deleteShape: (id) => {
    set((state) => ({
      shapes: state.shapes.filter((s) => s.id !== id),
      connectors: state.connectors.filter(
        (c) => c.fromShapeId !== id && c.toShapeId !== id
      ),
      selectedShapeIds: state.selectedShapeIds.filter((sid) => sid !== id),
    }));
  },

  deleteSelectedShapes: () => {
    const { selectedShapeIds } = get();
    set((state) => ({
      shapes: state.shapes.filter((s) => !selectedShapeIds.includes(s.id)),
      connectors: state.connectors.filter(
        (c) =>
          !selectedShapeIds.includes(c.fromShapeId) &&
          !selectedShapeIds.includes(c.toShapeId)
      ),
      selectedShapeIds: [],
    }));
  },

  selectShape: (id, addToSelection = false) => {
    set((state) => ({
      selectedShapeIds: addToSelection
        ? state.selectedShapeIds.includes(id)
          ? state.selectedShapeIds.filter((sid) => sid !== id)
          : [...state.selectedShapeIds, id]
        : [id],
    }));
  },

  selectShapes: (ids) => set({ selectedShapeIds: ids }),

  clearSelection: () => set({ selectedShapeIds: [] }),

  addConnector: (fromId, toId, fromAnchor, toAnchor) => {
    const connector: Connector = {
      id: uuidv4(),
      fromShapeId: fromId,
      toShapeId: toId,
      fromAnchor,
      toAnchor,
      stroke: '#6b7280',
      strokeWidth: 2,
    };
    set((state) => ({ connectors: [...state.connectors, connector] }));
    return connector;
  },

  deleteConnector: (id) => {
    set((state) => ({
      connectors: state.connectors.filter((c) => c.id !== id),
    }));
  },

  setTool: (tool) => set({ activeTool: tool }),

  setViewPosition: (x, y) => set({ viewPosition: { x, y } }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),

  setPanning: (isPanning) => set({ isPanning }),

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  snapToGrid: (x, y) => {
    const { settings } = get();
    if (!settings.snapToGrid) return { x, y };
    const { gridSize } = settings;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  },
}));
