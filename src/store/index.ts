import { create } from 'zustand';
import {
  Shape,
  Connector,
  DiagramSettings,
  Tool,
  AnchorPosition,
  ConnectionState,
  DEFAULT_SETTINGS,
  DEFAULT_SHAPE_STYLE,
  DEFAULT_CONNECTOR_STYLE,
  isK8sShape,
  getK8sShapeMeta,
  K8sShapeType,
} from '../types';
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
  selectedConnectorIds: string[];
  activeTool: Tool;
  isPanning: boolean;
  viewPosition: { x: number; y: number };
  zoom: number;
  hoveredShapeId: string | null;

  // Connection state
  connectionState: ConnectionState;

  // Actions
  setDiagram: (id: string, name: string, shapes: Shape[], connectors: Connector[], settings: DiagramSettings) => void;
  setDiagramName: (name: string) => void;

  // Shape actions
  addShape: (type: Shape['type'], x: number, y: number, label?: string) => Shape;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;

  // Selection
  selectShape: (id: string, addToSelection?: boolean) => void;
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;
  setHoveredShape: (id: string | null) => void;

  // Connector actions
  addConnector: (
    fromId: string,
    toId: string,
    fromAnchor: AnchorPosition,
    toAnchor: AnchorPosition
  ) => Connector;
  updateConnector: (id: string, updates: Partial<Connector>) => void;
  deleteConnector: (id: string) => void;
  selectConnector: (id: string, addToSelection?: boolean) => void;
  deleteSelectedConnectors: () => void;

  // Connection drawing
  startConnection: (shapeId: string, anchor: AnchorPosition, x: number, y: number) => void;
  updateConnection: (x: number, y: number) => void;
  endConnection: (shapeId: string, anchor: AnchorPosition) => void;
  cancelConnection: () => void;

  // Tool & View
  setTool: (tool: Tool) => void;
  setViewPosition: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  setPanning: (isPanning: boolean) => void;

  // Settings
  updateSettings: (settings: Partial<DiagramSettings>) => void;

  // Utility
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  getShapeById: (id: string) => Shape | undefined;
  getConnectorById: (id: string) => Connector | undefined;
}

const initialConnectionState: ConnectionState = {
  isConnecting: false,
  fromShapeId: null,
  fromAnchor: null,
  currentX: 0,
  currentY: 0,
};

export const useDiagramStore = create<DiagramState>((set, get) => ({
  diagramId: null,
  diagramName: 'Untitled',
  shapes: [],
  connectors: [],
  settings: DEFAULT_SETTINGS,
  selectedShapeIds: [],
  selectedConnectorIds: [],
  activeTool: 'select',
  isPanning: false,
  viewPosition: { x: 0, y: 0 },
  zoom: 1,
  hoveredShapeId: null,
  connectionState: initialConnectionState,

  setDiagram: (id, name, shapes, connectors, settings) => {
    set({
      diagramId: id,
      diagramName: name,
      shapes,
      connectors,
      settings,
      selectedShapeIds: [],
      selectedConnectorIds: [],
      connectionState: initialConnectionState,
    });
  },

  setDiagramName: (name) => set({ diagramName: name }),

  addShape: (type, x, y, label) => {
    const state = get();
    const pos = state.snapToGrid(x, y);

    // Get dimensions based on shape type
    let width = 100;
    let height = 100;
    let fill = DEFAULT_SHAPE_STYLE.fill;
    let stroke = DEFAULT_SHAPE_STYLE.stroke;

    if (type === 'text') {
      height = 40;
    } else if (isK8sShape(type)) {
      const meta = getK8sShapeMeta(type as K8sShapeType);
      if (meta) {
        width = meta.defaultWidth;
        height = meta.defaultHeight;
        fill = meta.color;
        stroke = '#1e40af';
      }
    }

    const shape: Shape = {
      id: uuidv4(),
      type,
      x: pos.x,
      y: pos.y,
      width,
      height,
      rotation: 0,
      fill,
      stroke,
      strokeWidth: DEFAULT_SHAPE_STYLE.strokeWidth,
      text: type === 'text' ? 'Text' : undefined,
      label: label || (isK8sShape(type) ? getK8sShapeMeta(type as K8sShapeType)?.label : undefined),
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
      selectedConnectorIds: addToSelection ? state.selectedConnectorIds : [],
    }));
  },

  selectShapes: (ids) => set({ selectedShapeIds: ids, selectedConnectorIds: [] }),

  clearSelection: () => set({ selectedShapeIds: [], selectedConnectorIds: [] }),

  setHoveredShape: (id) => set({ hoveredShapeId: id }),

  addConnector: (fromId, toId, fromAnchor, toAnchor) => {
    // Don't allow connecting shape to itself
    if (fromId === toId) {
      throw new Error('Cannot connect shape to itself');
    }

    // Check if connector already exists
    const existingConnector = get().connectors.find(
      (c) =>
        (c.fromShapeId === fromId && c.toShapeId === toId) ||
        (c.fromShapeId === toId && c.toShapeId === fromId)
    );
    if (existingConnector) {
      throw new Error('Connection already exists');
    }

    const connector: Connector = {
      id: uuidv4(),
      fromShapeId: fromId,
      toShapeId: toId,
      fromAnchor,
      toAnchor,
      ...DEFAULT_CONNECTOR_STYLE,
    };
    set((state) => ({ connectors: [...state.connectors, connector] }));
    return connector;
  },

  updateConnector: (id, updates) => {
    set((state) => ({
      connectors: state.connectors.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  deleteConnector: (id) => {
    set((state) => ({
      connectors: state.connectors.filter((c) => c.id !== id),
      selectedConnectorIds: state.selectedConnectorIds.filter((cid) => cid !== id),
    }));
  },

  selectConnector: (id, addToSelection = false) => {
    set((state) => ({
      selectedConnectorIds: addToSelection
        ? state.selectedConnectorIds.includes(id)
          ? state.selectedConnectorIds.filter((cid) => cid !== id)
          : [...state.selectedConnectorIds, id]
        : [id],
      selectedShapeIds: addToSelection ? state.selectedShapeIds : [],
    }));
  },

  deleteSelectedConnectors: () => {
    const { selectedConnectorIds } = get();
    set((state) => ({
      connectors: state.connectors.filter((c) => !selectedConnectorIds.includes(c.id)),
      selectedConnectorIds: [],
    }));
  },

  startConnection: (shapeId, anchor, x, y) => {
    set({
      connectionState: {
        isConnecting: true,
        fromShapeId: shapeId,
        fromAnchor: anchor,
        currentX: x,
        currentY: y,
      },
    });
  },

  updateConnection: (x, y) => {
    set((state) => ({
      connectionState: {
        ...state.connectionState,
        currentX: x,
        currentY: y,
      },
    }));
  },

  endConnection: (shapeId, anchor) => {
    const { connectionState, addConnector, shapes } = get();
    if (
      connectionState.isConnecting &&
      connectionState.fromShapeId &&
      connectionState.fromAnchor &&
      connectionState.fromShapeId !== shapeId
    ) {
      // Verify both shapes still exist
      const fromShapeExists = shapes.some(s => s.id === connectionState.fromShapeId);
      const toShapeExists = shapes.some(s => s.id === shapeId);

      if (fromShapeExists && toShapeExists) {
        try {
          addConnector(
            connectionState.fromShapeId,
            shapeId,
            connectionState.fromAnchor,
            anchor
          );
        } catch (e) {
          // Ignore duplicate connections
          console.warn('Connection failed:', e);
        }
      }
    }
    set({ connectionState: initialConnectionState });
  },

  cancelConnection: () => {
    set({ connectionState: initialConnectionState });
  },

  setTool: (tool) => {
    set({
      activeTool: tool,
      connectionState: initialConnectionState,
    });
  },

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

  getShapeById: (id) => {
    return get().shapes.find((s) => s.id === id);
  },

  getConnectorById: (id) => {
    return get().connectors.find((c) => c.id === id);
  },
}));
