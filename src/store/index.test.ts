import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagramStore } from './index';
import { DEFAULT_SETTINGS } from '../types';

describe('DiagramStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDiagramStore.setState({
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
      connectionState: {
        isConnecting: false,
        fromShapeId: null,
        fromAnchor: null,
        currentX: 0,
        currentY: 0,
      },
    });
  });

  // ============================================
  // SHAPE TESTS
  // ============================================

  describe('addShape', () => {
    it('should add a rectangle shape', () => {
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 100, 100);

      expect(shape.type).toBe('rectangle');
      expect(shape.x).toBe(100);
      expect(shape.y).toBe(100);
      expect(shape.width).toBe(100);
      expect(shape.height).toBe(100);
      expect(useDiagramStore.getState().shapes).toHaveLength(1);
    });

    it('should add a circle shape', () => {
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('circle', 50, 50);

      expect(shape.type).toBe('circle');
      expect(shape.width).toBe(100);
      expect(shape.height).toBe(100);
    });

    it('should add a diamond shape', () => {
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('diamond', 0, 0);

      expect(shape.type).toBe('diamond');
    });

    it('should add a text shape with default text', () => {
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('text', 50, 50);

      expect(shape.type).toBe('text');
      expect(shape.text).toBe('Text');
      expect(shape.height).toBe(40); // Text shapes are shorter
    });

    it('should add a K8s pod shape', () => {
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('k8s-pod', 100, 100);

      expect(shape.type).toBe('k8s-pod');
      expect(shape.width).toBe(80);
      expect(shape.height).toBe(80);
      expect(shape.fill).toBe('#326CE5');
      expect(shape.label).toBe('Pod');
    });

    it('should add a K8s deployment shape', () => {
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('k8s-deployment', 0, 0);

      expect(shape.type).toBe('k8s-deployment');
      expect(shape.label).toBe('Deployment');
    });

    it('should add all K8s shape types', () => {
      const { addShape } = useDiagramStore.getState();
      const k8sTypes = [
        'k8s-pod', 'k8s-deployment', 'k8s-service', 'k8s-ingress',
        'k8s-configmap', 'k8s-secret', 'k8s-pv', 'k8s-pvc',
        'k8s-statefulset', 'k8s-daemonset', 'k8s-job', 'k8s-cronjob',
        'k8s-namespace', 'k8s-node', 'k8s-hpa', 'k8s-networkpolicy'
      ] as const;

      for (const type of k8sTypes) {
        const shape = addShape(type, 0, 0);
        expect(shape.type).toBe(type);
        expect(shape.label).toBeDefined();
      }

      expect(useDiagramStore.getState().shapes).toHaveLength(16);
    });

    it('should use custom label for K8s shapes', () => {
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('k8s-pod', 0, 0, 'my-nginx-pod');

      expect(shape.label).toBe('my-nginx-pod');
    });

    it('should snap to grid when enabled', () => {
      useDiagramStore.setState({
        settings: { ...DEFAULT_SETTINGS, snapToGrid: true, gridSize: 20 },
      });
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 25, 33);

      expect(shape.x).toBe(20);
      expect(shape.y).toBe(40);
    });

    it('should not snap when disabled', () => {
      useDiagramStore.setState({
        settings: { ...DEFAULT_SETTINGS, snapToGrid: false },
      });
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 25, 33);

      expect(shape.x).toBe(25);
      expect(shape.y).toBe(33);
    });

    it('should generate unique IDs', () => {
      const { addShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 0, 0);

      expect(shape1.id).not.toBe(shape2.id);
    });
  });

  describe('updateShape', () => {
    it('should update shape position', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      updateShape(shape.id, { x: 200, y: 300 });

      const updated = useDiagramStore.getState().shapes[0];
      expect(updated.x).toBe(200);
      expect(updated.y).toBe(300);
    });

    it('should update shape dimensions', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      updateShape(shape.id, { width: 150, height: 200 });

      const updated = useDiagramStore.getState().shapes[0];
      expect(updated.width).toBe(150);
      expect(updated.height).toBe(200);
    });

    it('should update shape fill color', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape = addShape('circle', 0, 0);

      updateShape(shape.id, { fill: '#ff0000' });

      const updated = useDiagramStore.getState().shapes[0];
      expect(updated.fill).toBe('#ff0000');
    });

    it('should update shape stroke', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      updateShape(shape.id, { stroke: '#00ff00', strokeWidth: 5 });

      const updated = useDiagramStore.getState().shapes[0];
      expect(updated.stroke).toBe('#00ff00');
      expect(updated.strokeWidth).toBe(5);
    });

    it('should update shape rotation', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      updateShape(shape.id, { rotation: 45 });

      const updated = useDiagramStore.getState().shapes[0];
      expect(updated.rotation).toBe(45);
    });

    it('should update text content', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape = addShape('text', 0, 0);

      updateShape(shape.id, { text: 'Hello World' });

      const updated = useDiagramStore.getState().shapes[0];
      expect(updated.text).toBe('Hello World');
    });

    it('should update K8s shape label', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape = addShape('k8s-pod', 0, 0);

      updateShape(shape.id, { label: 'nginx-deployment' });

      const updated = useDiagramStore.getState().shapes[0];
      expect(updated.label).toBe('nginx-deployment');
    });

    it('should not affect other shapes', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 100, 100);

      updateShape(shape1.id, { x: 50 });

      const shapes = useDiagramStore.getState().shapes;
      expect(shapes[0].x).toBe(50);
      expect(shapes[1].x).toBe(100);
    });
  });

  describe('deleteShape', () => {
    it('should remove shape from shapes array', () => {
      const { addShape, deleteShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      expect(useDiagramStore.getState().shapes).toHaveLength(1);

      deleteShape(shape.id);

      expect(useDiagramStore.getState().shapes).toHaveLength(0);
    });

    it('should remove shape from selection', () => {
      const { addShape, selectShape, deleteShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      selectShape(shape.id);

      expect(useDiagramStore.getState().selectedShapeIds).toContain(shape.id);

      deleteShape(shape.id);

      expect(useDiagramStore.getState().selectedShapeIds).not.toContain(shape.id);
    });

    it('should remove connected connectors', () => {
      const { addShape, addConnector, deleteShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      addConnector(shape1.id, shape2.id, 'right', 'left');

      expect(useDiagramStore.getState().connectors).toHaveLength(1);

      deleteShape(shape1.id);

      expect(useDiagramStore.getState().connectors).toHaveLength(0);
    });

    it('should remove connectors when target shape is deleted', () => {
      const { addShape, addConnector, deleteShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      addConnector(shape1.id, shape2.id, 'right', 'left');

      deleteShape(shape2.id);

      expect(useDiagramStore.getState().connectors).toHaveLength(0);
    });

    it('should not affect other shapes', () => {
      const { addShape, deleteShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 100, 100);

      deleteShape(shape1.id);

      const shapes = useDiagramStore.getState().shapes;
      expect(shapes).toHaveLength(1);
      expect(shapes[0].id).toBe(shape2.id);
    });
  });

  describe('deleteSelectedShapes', () => {
    it('should delete all selected shapes', () => {
      const { addShape, selectShapes, deleteSelectedShapes } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 100, 0);
      const shape3 = addShape('rectangle', 200, 0);

      selectShapes([shape1.id, shape2.id]);
      deleteSelectedShapes();

      const shapes = useDiagramStore.getState().shapes;
      expect(shapes).toHaveLength(1);
      expect(shapes[0].id).toBe(shape3.id);
    });

    it('should clear selection after delete', () => {
      const { addShape, selectShape, deleteSelectedShapes } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      selectShape(shape.id);

      deleteSelectedShapes();

      expect(useDiagramStore.getState().selectedShapeIds).toHaveLength(0);
    });

    it('should remove connectors attached to deleted shapes', () => {
      const { addShape, addConnector, selectShape, deleteSelectedShapes } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const shape3 = addShape('rectangle', 400, 0);
      addConnector(shape1.id, shape2.id, 'right', 'left');
      addConnector(shape2.id, shape3.id, 'right', 'left');

      selectShape(shape2.id);
      deleteSelectedShapes();

      expect(useDiagramStore.getState().connectors).toHaveLength(0);
    });
  });

  // ============================================
  // CONNECTOR TESTS
  // ============================================

  describe('addConnector', () => {
    it('should add a connector between two shapes', () => {
      const { addShape, addConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);

      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      expect(connector.fromShapeId).toBe(shape1.id);
      expect(connector.toShapeId).toBe(shape2.id);
      expect(connector.fromAnchor).toBe('right');
      expect(connector.toAnchor).toBe('left');
      expect(useDiagramStore.getState().connectors).toHaveLength(1);
    });

    it('should use default connector styles', () => {
      const { addShape, addConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);

      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      expect(connector.style).toBe('straight');
      expect(connector.endArrow).toBe('arrow');
      expect(connector.startArrow).toBe('none');
    });

    it('should throw error when connecting shape to itself', () => {
      const { addShape, addConnector } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      expect(() => addConnector(shape.id, shape.id, 'right', 'left')).toThrow(
        'Cannot connect shape to itself'
      );
    });

    it('should throw error when connection already exists', () => {
      const { addShape, addConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);

      addConnector(shape1.id, shape2.id, 'right', 'left');

      expect(() => addConnector(shape1.id, shape2.id, 'top', 'bottom')).toThrow(
        'Connection already exists'
      );
    });

    it('should throw error for reverse duplicate connection', () => {
      const { addShape, addConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);

      addConnector(shape1.id, shape2.id, 'right', 'left');

      expect(() => addConnector(shape2.id, shape1.id, 'left', 'right')).toThrow(
        'Connection already exists'
      );
    });

    it('should generate unique IDs for connectors', () => {
      const { addShape, addConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const shape3 = addShape('rectangle', 400, 0);

      const connector1 = addConnector(shape1.id, shape2.id, 'right', 'left');
      const connector2 = addConnector(shape2.id, shape3.id, 'right', 'left');

      expect(connector1.id).not.toBe(connector2.id);
    });
  });

  describe('updateConnector', () => {
    it('should update connector stroke', () => {
      const { addShape, addConnector, updateConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      updateConnector(connector.id, { stroke: '#ff0000' });

      const updated = useDiagramStore.getState().connectors[0];
      expect(updated.stroke).toBe('#ff0000');
    });

    it('should update connector style', () => {
      const { addShape, addConnector, updateConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      updateConnector(connector.id, { style: 'elbow' });

      const updated = useDiagramStore.getState().connectors[0];
      expect(updated.style).toBe('elbow');
    });

    it('should update connector arrows', () => {
      const { addShape, addConnector, updateConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      updateConnector(connector.id, { startArrow: 'arrow', endArrow: 'none' });

      const updated = useDiagramStore.getState().connectors[0];
      expect(updated.startArrow).toBe('arrow');
      expect(updated.endArrow).toBe('none');
    });

    it('should update connector label', () => {
      const { addShape, addConnector, updateConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      updateConnector(connector.id, { label: 'Connection Label' });

      const updated = useDiagramStore.getState().connectors[0];
      expect(updated.label).toBe('Connection Label');
    });
  });

  describe('deleteConnector', () => {
    it('should remove connector', () => {
      const { addShape, addConnector, deleteConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      deleteConnector(connector.id);

      expect(useDiagramStore.getState().connectors).toHaveLength(0);
    });

    it('should remove connector from selection', () => {
      const { addShape, addConnector, selectConnector, deleteConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');
      selectConnector(connector.id);

      deleteConnector(connector.id);

      expect(useDiagramStore.getState().selectedConnectorIds).not.toContain(connector.id);
    });

    it('should not affect shapes', () => {
      const { addShape, addConnector, deleteConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      deleteConnector(connector.id);

      expect(useDiagramStore.getState().shapes).toHaveLength(2);
    });
  });

  describe('deleteSelectedConnectors', () => {
    it('should delete all selected connectors', () => {
      const { addShape, addConnector, selectConnector, deleteSelectedConnectors } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const shape3 = addShape('rectangle', 400, 0);
      const connector1 = addConnector(shape1.id, shape2.id, 'right', 'left');
      const connector2 = addConnector(shape2.id, shape3.id, 'right', 'left');

      selectConnector(connector1.id);
      selectConnector(connector2.id, true);
      deleteSelectedConnectors();

      expect(useDiagramStore.getState().connectors).toHaveLength(0);
    });
  });

  // ============================================
  // SELECTION TESTS
  // ============================================

  describe('selectShape', () => {
    it('should select a shape', () => {
      const { addShape, selectShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      selectShape(shape.id);

      expect(useDiagramStore.getState().selectedShapeIds).toContain(shape.id);
    });

    it('should replace selection by default', () => {
      const { addShape, selectShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 100, 0);

      selectShape(shape1.id);
      selectShape(shape2.id);

      const selected = useDiagramStore.getState().selectedShapeIds;
      expect(selected).toHaveLength(1);
      expect(selected).toContain(shape2.id);
    });

    it('should add to selection with addToSelection flag', () => {
      const { addShape, selectShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);

      selectShape(shape1.id);
      selectShape(shape2.id, true);

      const selected = useDiagramStore.getState().selectedShapeIds;
      expect(selected).toHaveLength(2);
      expect(selected).toContain(shape1.id);
      expect(selected).toContain(shape2.id);
    });

    it('should toggle selection with addToSelection', () => {
      const { addShape, selectShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      selectShape(shape.id);
      selectShape(shape.id, true); // Toggle off

      expect(useDiagramStore.getState().selectedShapeIds).not.toContain(shape.id);
    });

    it('should clear connector selection when selecting shape', () => {
      const { addShape, addConnector, selectConnector, selectShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      selectConnector(connector.id);
      selectShape(shape1.id);

      expect(useDiagramStore.getState().selectedConnectorIds).toHaveLength(0);
    });
  });

  describe('selectConnector', () => {
    it('should select a connector', () => {
      const { addShape, addConnector, selectConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      selectConnector(connector.id);

      expect(useDiagramStore.getState().selectedConnectorIds).toContain(connector.id);
    });

    it('should clear shape selection when selecting connector', () => {
      const { addShape, addConnector, selectShape, selectConnector } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      selectShape(shape1.id);
      selectConnector(connector.id);

      expect(useDiagramStore.getState().selectedShapeIds).toHaveLength(0);
    });
  });

  describe('clearSelection', () => {
    it('should clear shape selection', () => {
      const { addShape, selectShape, clearSelection } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      selectShape(shape.id);

      clearSelection();

      expect(useDiagramStore.getState().selectedShapeIds).toHaveLength(0);
    });

    it('should clear connector selection', () => {
      const { addShape, addConnector, selectConnector, clearSelection } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');
      selectConnector(connector.id);

      clearSelection();

      expect(useDiagramStore.getState().selectedConnectorIds).toHaveLength(0);
    });
  });

  // ============================================
  // CONNECTION STATE TESTS
  // ============================================

  describe('startConnection', () => {
    it('should start a connection', () => {
      const { addShape, startConnection } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      startConnection(shape.id, 'right', 100, 50);

      const state = useDiagramStore.getState().connectionState;
      expect(state.isConnecting).toBe(true);
      expect(state.fromShapeId).toBe(shape.id);
      expect(state.fromAnchor).toBe('right');
      expect(state.currentX).toBe(100);
      expect(state.currentY).toBe(50);
    });
  });

  describe('updateConnection', () => {
    it('should update connection position', () => {
      const { addShape, startConnection, updateConnection } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      startConnection(shape.id, 'right', 100, 50);

      updateConnection(200, 150);

      const state = useDiagramStore.getState().connectionState;
      expect(state.currentX).toBe(200);
      expect(state.currentY).toBe(150);
    });
  });

  describe('endConnection', () => {
    it('should create connector and end connection', () => {
      const { addShape, startConnection, endConnection } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      startConnection(shape1.id, 'right', 100, 50);

      endConnection(shape2.id, 'left');

      expect(useDiagramStore.getState().connectors).toHaveLength(1);
      expect(useDiagramStore.getState().connectionState.isConnecting).toBe(false);
    });

    it('should not create connector when connecting to same shape', () => {
      const { addShape, startConnection, endConnection } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      startConnection(shape.id, 'right', 100, 50);

      endConnection(shape.id, 'left');

      expect(useDiagramStore.getState().connectors).toHaveLength(0);
    });

    it('should reset connection state', () => {
      const { addShape, startConnection, endConnection } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      startConnection(shape1.id, 'right', 100, 50);

      endConnection(shape2.id, 'left');

      const state = useDiagramStore.getState().connectionState;
      expect(state.isConnecting).toBe(false);
      expect(state.fromShapeId).toBeNull();
      expect(state.fromAnchor).toBeNull();
    });
  });

  describe('cancelConnection', () => {
    it('should cancel connection without creating connector', () => {
      const { addShape, startConnection, cancelConnection } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      startConnection(shape.id, 'right', 100, 50);

      cancelConnection();

      expect(useDiagramStore.getState().connectors).toHaveLength(0);
      expect(useDiagramStore.getState().connectionState.isConnecting).toBe(false);
    });
  });

  // ============================================
  // TOOL & VIEW TESTS
  // ============================================

  describe('setTool', () => {
    it('should set active tool', () => {
      const { setTool } = useDiagramStore.getState();

      setTool('pan');
      expect(useDiagramStore.getState().activeTool).toBe('pan');

      setTool('connector');
      expect(useDiagramStore.getState().activeTool).toBe('connector');

      setTool('k8s-pod');
      expect(useDiagramStore.getState().activeTool).toBe('k8s-pod');
    });

    it('should cancel active connection when changing tool', () => {
      const { addShape, startConnection, setTool } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      startConnection(shape.id, 'right', 100, 50);

      setTool('pan');

      expect(useDiagramStore.getState().connectionState.isConnecting).toBe(false);
    });
  });

  describe('snapToGrid', () => {
    it('should snap coordinates to grid when enabled', () => {
      useDiagramStore.setState({
        settings: { ...DEFAULT_SETTINGS, snapToGrid: true, gridSize: 20 },
      });

      const { snapToGrid } = useDiagramStore.getState();
      const result = snapToGrid(25, 33);

      expect(result.x).toBe(20);
      expect(result.y).toBe(40);
    });

    it('should not snap when disabled', () => {
      useDiagramStore.setState({
        settings: { ...DEFAULT_SETTINGS, snapToGrid: false, gridSize: 20 },
      });

      const { snapToGrid } = useDiagramStore.getState();
      const result = snapToGrid(25, 33);

      expect(result.x).toBe(25);
      expect(result.y).toBe(33);
    });

    it('should handle different grid sizes', () => {
      useDiagramStore.setState({
        settings: { ...DEFAULT_SETTINGS, snapToGrid: true, gridSize: 10 },
      });

      const { snapToGrid } = useDiagramStore.getState();
      const result = snapToGrid(23, 27);

      expect(result.x).toBe(20);
      expect(result.y).toBe(30);
    });

    it('should handle negative coordinates', () => {
      useDiagramStore.setState({
        settings: { ...DEFAULT_SETTINGS, snapToGrid: true, gridSize: 20 },
      });

      const { snapToGrid } = useDiagramStore.getState();
      const result = snapToGrid(-25, -33);

      expect(result.x).toBe(-20);
      expect(result.y).toBe(-40);
    });
  });

  describe('zoom', () => {
    it('should set zoom within bounds', () => {
      const { setZoom } = useDiagramStore.getState();

      setZoom(2);
      expect(useDiagramStore.getState().zoom).toBe(2);

      setZoom(0.05); // Below minimum
      expect(useDiagramStore.getState().zoom).toBe(0.1);

      setZoom(5); // Above maximum
      expect(useDiagramStore.getState().zoom).toBe(3);
    });

    it('should handle edge cases', () => {
      const { setZoom } = useDiagramStore.getState();

      setZoom(0.1);
      expect(useDiagramStore.getState().zoom).toBe(0.1);

      setZoom(3);
      expect(useDiagramStore.getState().zoom).toBe(3);
    });
  });

  describe('setViewPosition', () => {
    it('should update view position', () => {
      const { setViewPosition } = useDiagramStore.getState();

      setViewPosition(100, 200);

      const { viewPosition } = useDiagramStore.getState();
      expect(viewPosition.x).toBe(100);
      expect(viewPosition.y).toBe(200);
    });

    it('should handle negative positions', () => {
      const { setViewPosition } = useDiagramStore.getState();

      setViewPosition(-500, -300);

      const { viewPosition } = useDiagramStore.getState();
      expect(viewPosition.x).toBe(-500);
      expect(viewPosition.y).toBe(-300);
    });
  });

  // ============================================
  // UTILITY TESTS
  // ============================================

  describe('getShapeById', () => {
    it('should return shape by ID', () => {
      const { addShape, getShapeById } = useDiagramStore.getState();
      const shape = addShape('rectangle', 100, 100);

      const found = getShapeById(shape.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(shape.id);
    });

    it('should return undefined for non-existent ID', () => {
      const { getShapeById } = useDiagramStore.getState();

      const found = getShapeById('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getConnectorById', () => {
    it('should return connector by ID', () => {
      const { addShape, addConnector, getConnectorById } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      const connector = addConnector(shape1.id, shape2.id, 'right', 'left');

      const found = getConnectorById(connector.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(connector.id);
    });

    it('should return undefined for non-existent ID', () => {
      const { getConnectorById } = useDiagramStore.getState();

      const found = getConnectorById('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('setDiagram', () => {
    it('should load a complete diagram', () => {
      const { setDiagram } = useDiagramStore.getState();

      const shapes = [
        { id: '1', type: 'rectangle' as const, x: 0, y: 0, width: 100, height: 100, rotation: 0, fill: '#000', stroke: '#000', strokeWidth: 2 },
        { id: '2', type: 'k8s-pod' as const, x: 200, y: 0, width: 80, height: 80, rotation: 0, fill: '#326CE5', stroke: '#000', strokeWidth: 2, label: 'Pod' },
      ];
      const connectors = [
        { id: 'c1', fromShapeId: '1', toShapeId: '2', fromAnchor: 'right' as const, toAnchor: 'left' as const, stroke: '#000', strokeWidth: 2, style: 'straight' as const, startArrow: 'none' as const, endArrow: 'arrow' as const },
      ];

      setDiagram('diagram-1', 'My K8s Diagram', shapes, connectors, DEFAULT_SETTINGS);

      const state = useDiagramStore.getState();
      expect(state.diagramId).toBe('diagram-1');
      expect(state.diagramName).toBe('My K8s Diagram');
      expect(state.shapes).toHaveLength(2);
      expect(state.connectors).toHaveLength(1);
    });

    it('should clear selection when loading diagram', () => {
      const { addShape, selectShape, setDiagram } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      selectShape(shape.id);

      setDiagram('new-diagram', 'New', [], [], DEFAULT_SETTINGS);

      expect(useDiagramStore.getState().selectedShapeIds).toHaveLength(0);
      expect(useDiagramStore.getState().selectedConnectorIds).toHaveLength(0);
    });
  });
});
