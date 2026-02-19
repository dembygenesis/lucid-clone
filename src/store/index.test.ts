import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagramStore } from './index';

describe('DiagramStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDiagramStore.setState({
      diagramId: null,
      diagramName: 'Untitled',
      shapes: [],
      connectors: [],
      selectedShapeIds: [],
      activeTool: 'select',
      isPanning: false,
      viewPosition: { x: 0, y: 0 },
      zoom: 1,
    });
  });

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

    it('should add a text shape with default text', () => {
      const { addShape } = useDiagramStore.getState();
      const shape = addShape('text', 50, 50);

      expect(shape.type).toBe('text');
      expect(shape.text).toBe('Text');
      expect(shape.height).toBe(40); // Text shapes are shorter
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

    it('should update shape fill color', () => {
      const { addShape, updateShape } = useDiagramStore.getState();
      const shape = addShape('circle', 0, 0);

      updateShape(shape.id, { fill: '#ff0000' });

      const updated = useDiagramStore.getState().shapes[0];
      expect(updated.fill).toBe('#ff0000');
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

    it('should also remove connected connectors', () => {
      const { addShape, addConnector, deleteShape } = useDiagramStore.getState();
      const shape1 = addShape('rectangle', 0, 0);
      const shape2 = addShape('rectangle', 200, 0);
      addConnector(shape1.id, shape2.id, 'right', 'left');

      expect(useDiagramStore.getState().connectors).toHaveLength(1);

      deleteShape(shape1.id);

      expect(useDiagramStore.getState().connectors).toHaveLength(0);
    });
  });

  describe('selection', () => {
    it('should select a shape', () => {
      const { addShape, selectShape } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);

      selectShape(shape.id);

      expect(useDiagramStore.getState().selectedShapeIds).toContain(shape.id);
    });

    it('should add to selection with shift key', () => {
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

    it('should clear selection', () => {
      const { addShape, selectShape, clearSelection } = useDiagramStore.getState();
      const shape = addShape('rectangle', 0, 0);
      selectShape(shape.id);

      clearSelection();

      expect(useDiagramStore.getState().selectedShapeIds).toHaveLength(0);
    });
  });

  describe('snapToGrid', () => {
    it('should snap coordinates to grid when enabled', () => {
      useDiagramStore.setState({
        settings: { backgroundColor: '#fff', gridEnabled: true, snapToGrid: true, gridSize: 20 },
      });

      const { snapToGrid } = useDiagramStore.getState();
      const result = snapToGrid(25, 33);

      expect(result.x).toBe(20);
      expect(result.y).toBe(40);
    });

    it('should not snap when disabled', () => {
      useDiagramStore.setState({
        settings: { backgroundColor: '#fff', gridEnabled: true, snapToGrid: false, gridSize: 20 },
      });

      const { snapToGrid } = useDiagramStore.getState();
      const result = snapToGrid(25, 33);

      expect(result.x).toBe(25);
      expect(result.y).toBe(33);
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
  });
});
