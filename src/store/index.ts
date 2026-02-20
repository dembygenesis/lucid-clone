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

// History entry for undo/redo
interface HistoryEntry {
  shapes: Shape[];
  connectors: Connector[];
}

// Clipboard data
interface ClipboardData {
  shapes: Shape[];
  connectors: Connector[];
}

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

  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  clipboard: ClipboardData | null;
  pasteCount: number;

  // Actions
  setDiagram: (id: string, name: string, shapes: Shape[], connectors: Connector[], settings: DiagramSettings) => void;
  setDiagramName: (name: string) => void;

  // Shape actions
  addShape: (type: Shape['type'], x: number, y: number, label?: string) => Shape;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  updateShapes: (updates: { id: string; changes: Partial<Shape> }[]) => void;
  moveSelectedShapes: (dx: number, dy: number) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;

  // Z-index actions
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // Selection
  selectShape: (id: string, addToSelection?: boolean) => void;
  selectShapes: (ids: string[]) => void;
  selectAll: () => void;
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

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Copy/Paste/Duplicate
  copy: () => void;
  paste: () => void;
  duplicate: () => void;

  // Quick create connected shape (Lucidchart-style)
  quickCreateConnectedShape: (sourceShapeId: string, fromAnchor: AnchorPosition) => Shape | null;
}

const initialConnectionState: ConnectionState = {
  isConnecting: false,
  fromShapeId: null,
  fromAnchor: null,
  currentX: 0,
  currentY: 0,
};

const MAX_HISTORY = 50;

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
  history: [],
  historyIndex: -1,
  clipboard: null,
  pasteCount: 0,

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
      history: [{ shapes, connectors }],
      historyIndex: 0,
    });
  },

  setDiagramName: (name) => set({ diagramName: name }),

  saveToHistory: () => {
    const { shapes, connectors, history, historyIndex } = get();
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ shapes: [...shapes], connectors: [...connectors] });
    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex, selectedShapeIds, selectedConnectorIds } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      const prevShapeIds = new Set(prevState.shapes.map(s => s.id));
      const prevConnectorIds = new Set(prevState.connectors.map(c => c.id));

      // Preserve selection for shapes/connectors that still exist after undo
      set({
        shapes: [...prevState.shapes],
        connectors: [...prevState.connectors],
        historyIndex: historyIndex - 1,
        selectedShapeIds: selectedShapeIds.filter(id => prevShapeIds.has(id)),
        selectedConnectorIds: selectedConnectorIds.filter(id => prevConnectorIds.has(id)),
      });
    }
  },

  redo: () => {
    const { history, historyIndex, selectedShapeIds, selectedConnectorIds } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      const nextShapeIds = new Set(nextState.shapes.map(s => s.id));
      const nextConnectorIds = new Set(nextState.connectors.map(c => c.id));

      // Preserve selection for shapes/connectors that still exist after redo
      set({
        shapes: [...nextState.shapes],
        connectors: [...nextState.connectors],
        historyIndex: historyIndex + 1,
        selectedShapeIds: selectedShapeIds.filter(id => nextShapeIds.has(id)),
        selectedConnectorIds: selectedConnectorIds.filter(id => nextConnectorIds.has(id)),
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  copy: () => {
    const { shapes, connectors, selectedShapeIds, selectedConnectorIds } = get();
    const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));

    // Also copy connectors that connect selected shapes
    const selectedConnectors = connectors.filter(c =>
      selectedConnectorIds.includes(c.id) ||
      (selectedShapeIds.includes(c.fromShapeId) && selectedShapeIds.includes(c.toShapeId))
    );

    if (selectedShapes.length > 0) {
      set({
        clipboard: {
          shapes: selectedShapes,
          connectors: selectedConnectors,
        },
        pasteCount: 0, // Reset paste count on new copy
      });
    }
  },

  paste: () => {
    const { clipboard, saveToHistory, pasteCount } = get();
    if (!clipboard || clipboard.shapes.length === 0) return;

    const BASE_OFFSET = 20;
    const offset = BASE_OFFSET * (pasteCount + 1); // Increment offset for each paste

    // Create ID mapping for shapes
    const idMap = new Map<string, string>();
    const newShapes: Shape[] = clipboard.shapes.map(shape => {
      const newId = uuidv4();
      idMap.set(shape.id, newId);
      return {
        ...shape,
        id: newId,
        x: shape.x + offset,
        y: shape.y + offset,
      };
    });

    // Create connectors with new IDs
    const newConnectors: Connector[] = clipboard.connectors
      .filter(c => idMap.has(c.fromShapeId) && idMap.has(c.toShapeId))
      .map(connector => ({
        ...connector,
        id: uuidv4(),
        fromShapeId: idMap.get(connector.fromShapeId)!,
        toShapeId: idMap.get(connector.toShapeId)!,
      }));

    set(state => ({
      shapes: [...state.shapes, ...newShapes],
      connectors: [...state.connectors, ...newConnectors],
      selectedShapeIds: newShapes.map(s => s.id),
      selectedConnectorIds: [],
      pasteCount: state.pasteCount + 1,
    }));

    saveToHistory();
  },

  duplicate: () => {
    const { copy, paste } = get();
    copy();
    paste();
  },

  addShape: (type, x, y, label) => {
    const state = get();
    const pos = state.snapToGrid(x, y);

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
    state.saveToHistory();
    return shape;
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
    // Don't save to history on every update (would flood history during drag)
    // History is saved on drag end via the Canvas component
  },

  updateShapes: (updates) => {
    set((state) => ({
      shapes: state.shapes.map((s) => {
        const update = updates.find((u) => u.id === s.id);
        return update ? { ...s, ...update.changes } : s;
      }),
    }));
  },

  moveSelectedShapes: (dx, dy) => {
    const { selectedShapeIds } = get();
    if (selectedShapeIds.length === 0) return;

    set((state) => ({
      shapes: state.shapes.map((s) =>
        selectedShapeIds.includes(s.id)
          ? { ...s, x: s.x + dx, y: s.y + dy }
          : s
      ),
    }));
  },

  deleteShape: (id) => {
    const { saveToHistory } = get();
    set((state) => ({
      shapes: state.shapes.filter((s) => s.id !== id),
      connectors: state.connectors.filter(
        (c) => c.fromShapeId !== id && c.toShapeId !== id
      ),
      selectedShapeIds: state.selectedShapeIds.filter((sid) => sid !== id),
    }));
    saveToHistory();
  },

  deleteSelectedShapes: () => {
    const { selectedShapeIds, saveToHistory } = get();
    if (selectedShapeIds.length === 0) return;

    set((state) => ({
      shapes: state.shapes.filter((s) => !selectedShapeIds.includes(s.id)),
      connectors: state.connectors.filter(
        (c) =>
          !selectedShapeIds.includes(c.fromShapeId) &&
          !selectedShapeIds.includes(c.toShapeId)
      ),
      selectedShapeIds: [],
    }));
    saveToHistory();
  },

  // Z-index actions (shapes are rendered in array order, last = on top)
  bringToFront: (id) => {
    set((state) => {
      const shape = state.shapes.find((s) => s.id === id);
      if (!shape) return state;
      return {
        shapes: [...state.shapes.filter((s) => s.id !== id), shape],
      };
    });
    get().saveToHistory();
  },

  sendToBack: (id) => {
    set((state) => {
      const shape = state.shapes.find((s) => s.id === id);
      if (!shape) return state;
      return {
        shapes: [shape, ...state.shapes.filter((s) => s.id !== id)],
      };
    });
    get().saveToHistory();
  },

  bringForward: (id) => {
    set((state) => {
      const index = state.shapes.findIndex((s) => s.id === id);
      if (index === -1 || index === state.shapes.length - 1) return state;
      const newShapes = [...state.shapes];
      [newShapes[index], newShapes[index + 1]] = [newShapes[index + 1], newShapes[index]];
      return { shapes: newShapes };
    });
    get().saveToHistory();
  },

  sendBackward: (id) => {
    set((state) => {
      const index = state.shapes.findIndex((s) => s.id === id);
      if (index <= 0) return state;
      const newShapes = [...state.shapes];
      [newShapes[index - 1], newShapes[index]] = [newShapes[index], newShapes[index - 1]];
      return { shapes: newShapes };
    });
    get().saveToHistory();
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

  selectAll: () => {
    const { shapes, connectors } = get();
    set({
      selectedShapeIds: shapes.map(s => s.id),
      selectedConnectorIds: connectors.map(c => c.id),
    });
  },

  clearSelection: () => set({ selectedShapeIds: [], selectedConnectorIds: [] }),

  setHoveredShape: (id) => set({ hoveredShapeId: id }),

  addConnector: (fromId, toId, fromAnchor, toAnchor) => {
    if (fromId === toId) {
      throw new Error('Cannot connect shape to itself');
    }

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

    const { saveToHistory } = get();
    set((state) => ({ connectors: [...state.connectors, connector] }));
    saveToHistory();
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
    const { saveToHistory } = get();
    set((state) => ({
      connectors: state.connectors.filter((c) => c.id !== id),
      selectedConnectorIds: state.selectedConnectorIds.filter((cid) => cid !== id),
    }));
    saveToHistory();
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
    const { selectedConnectorIds, saveToHistory } = get();
    if (selectedConnectorIds.length === 0) return;

    set((state) => ({
      connectors: state.connectors.filter((c) => !selectedConnectorIds.includes(c.id)),
      selectedConnectorIds: [],
    }));
    saveToHistory();
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

  quickCreateConnectedShape: (sourceShapeId, fromAnchor) => {
    const { shapes, addShape, addConnector, selectShape } = get();
    const sourceShape = shapes.find(s => s.id === sourceShapeId);

    if (!sourceShape) return null;

    // Calculate offset based on anchor direction
    const OFFSET = 150; // Distance between shapes
    let newX = sourceShape.x;
    let newY = sourceShape.y;
    let toAnchor: AnchorPosition;

    switch (fromAnchor) {
      case 'top':
        newY = sourceShape.y - sourceShape.height - OFFSET;
        toAnchor = 'bottom';
        break;
      case 'right':
        newX = sourceShape.x + sourceShape.width + OFFSET;
        toAnchor = 'left';
        break;
      case 'bottom':
        newY = sourceShape.y + sourceShape.height + OFFSET;
        toAnchor = 'top';
        break;
      case 'left':
        newX = sourceShape.x - sourceShape.width - OFFSET;
        toAnchor = 'right';
        break;
      default:
        toAnchor = 'left';
    }

    // Create new shape of same type
    const newShape = addShape(sourceShape.type, newX, newY, sourceShape.label);

    // Connect source to new shape
    try {
      addConnector(sourceShapeId, newShape.id, fromAnchor, toAnchor);
    } catch (e) {
      // Connection might fail if duplicate, but shape is still created
      console.warn('Quick create connector failed:', e);
    }

    // Select the new shape
    selectShape(newShape.id);

    return newShape;
  },
}));
