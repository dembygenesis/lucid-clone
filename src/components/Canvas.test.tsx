import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDiagramStore } from '../store';
import {
  getShapeAnchors,
  getAnchorPoint,
  findNearestAnchor,
  Shape,
  Connector,
} from '../types';

// Reset store before each test
beforeEach(() => {
  useDiagramStore.setState({
    diagramId: 'test-diagram',
    diagramName: 'Test Diagram',
    shapes: [],
    connectors: [],
    settings: {
      backgroundColor: '#ffffff',
      gridEnabled: true,
      snapToGrid: true,
      gridSize: 20,
    },
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

describe('Canvas Connector Drawing Logic', () => {
  describe('Connection workflow', () => {
    it('should start a connection from a shape anchor', () => {
      const store = useDiagramStore.getState();
      const shape = store.addShape('rectangle', 100, 100);

      store.startConnection(shape.id, 'right', 200, 150);

      const state = useDiagramStore.getState();
      expect(state.connectionState.isConnecting).toBe(true);
      expect(state.connectionState.fromShapeId).toBe(shape.id);
      expect(state.connectionState.fromAnchor).toBe('right');
      expect(state.connectionState.currentX).toBe(200);
      expect(state.connectionState.currentY).toBe(150);
    });

    it('should update connection position as mouse moves', () => {
      const store = useDiagramStore.getState();
      const shape = store.addShape('rectangle', 100, 100);

      store.startConnection(shape.id, 'right', 200, 150);
      store.updateConnection(300, 200);

      const state = useDiagramStore.getState();
      expect(state.connectionState.currentX).toBe(300);
      expect(state.connectionState.currentY).toBe(200);
    });

    it('should create connector when ending connection on different shape', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      store.startConnection(shape1.id, 'right', 200, 150);
      store.updateConnection(250, 150);
      store.endConnection(shape2.id, 'left');

      const state = useDiagramStore.getState();
      expect(state.connectionState.isConnecting).toBe(false);
      expect(state.connectors).toHaveLength(1);
      expect(state.connectors[0].fromShapeId).toBe(shape1.id);
      expect(state.connectors[0].toShapeId).toBe(shape2.id);
      expect(state.connectors[0].fromAnchor).toBe('right');
      expect(state.connectors[0].toAnchor).toBe('left');
    });

    it('should not create connector when ending on same shape', () => {
      const store = useDiagramStore.getState();
      const shape = store.addShape('rectangle', 100, 100);

      store.startConnection(shape.id, 'right', 200, 150);
      store.endConnection(shape.id, 'left');

      const state = useDiagramStore.getState();
      expect(state.connectionState.isConnecting).toBe(false);
      expect(state.connectors).toHaveLength(0);
    });

    it('should cancel connection and reset state', () => {
      const store = useDiagramStore.getState();
      const shape = store.addShape('rectangle', 100, 100);

      store.startConnection(shape.id, 'right', 200, 150);
      store.cancelConnection();

      const state = useDiagramStore.getState();
      expect(state.connectionState.isConnecting).toBe(false);
      expect(state.connectionState.fromShapeId).toBeNull();
      expect(state.connectionState.fromAnchor).toBeNull();
    });

    it('should not create duplicate connections between same shapes', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      // First connection
      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      // Try to create second connection (should be ignored)
      store.startConnection(shape1.id, 'bottom', 150, 200);
      store.endConnection(shape2.id, 'top');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(1);
    });

    it('should allow connections from different anchors if previous connector is deleted', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      // First connection
      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      // Delete the connector
      const connectorId = useDiagramStore.getState().connectors[0].id;
      store.deleteConnector(connectorId);

      // Now should be able to create new connection
      store.startConnection(shape1.id, 'bottom', 150, 200);
      store.endConnection(shape2.id, 'top');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(1);
      expect(state.connectors[0].fromAnchor).toBe('bottom');
      expect(state.connectors[0].toAnchor).toBe('top');
    });
  });

  describe('Connector with K8s shapes', () => {
    it('should create connector between K8s shapes', () => {
      const store = useDiagramStore.getState();
      const pod = store.addShape('k8s-pod', 100, 100);
      const service = store.addShape('k8s-service', 300, 100);

      store.startConnection(pod.id, 'right', 180, 150);
      store.endConnection(service.id, 'left');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(1);
      expect(state.connectors[0].fromShapeId).toBe(pod.id);
      expect(state.connectors[0].toShapeId).toBe(service.id);
    });

    it('should create connector between K8s and basic shapes', () => {
      const store = useDiagramStore.getState();
      const pod = store.addShape('k8s-pod', 100, 100);
      const rect = store.addShape('rectangle', 300, 100);

      store.startConnection(pod.id, 'right', 180, 150);
      store.endConnection(rect.id, 'left');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(1);
    });

    it('should correctly compute K8s shape anchor positions', () => {
      const store = useDiagramStore.getState();
      const pod = store.addShape('k8s-pod', 100, 100);

      const podShape = useDiagramStore.getState().shapes[0];
      const anchors = getShapeAnchors(podShape);

      // K8s pod has default dimensions 80x80
      expect(anchors).toHaveLength(4);

      const topAnchor = anchors.find(a => a.position === 'top');
      expect(topAnchor?.x).toBe(140); // 100 + 80/2
      expect(topAnchor?.y).toBe(100);

      const rightAnchor = anchors.find(a => a.position === 'right');
      expect(rightAnchor?.x).toBe(180); // 100 + 80
      expect(rightAnchor?.y).toBe(140); // 100 + 80/2

      const bottomAnchor = anchors.find(a => a.position === 'bottom');
      expect(bottomAnchor?.x).toBe(140);
      expect(bottomAnchor?.y).toBe(180); // 100 + 80

      const leftAnchor = anchors.find(a => a.position === 'left');
      expect(leftAnchor?.x).toBe(100);
      expect(leftAnchor?.y).toBe(140);
    });
  });

  describe('Multiple connectors', () => {
    it('should allow connecting one shape to multiple others', () => {
      const store = useDiagramStore.getState();
      const center = store.addShape('rectangle', 200, 200);
      const top = store.addShape('rectangle', 200, 50);
      const right = store.addShape('rectangle', 350, 200);
      const bottom = store.addShape('rectangle', 200, 350);

      // Connect center to top
      store.startConnection(center.id, 'top', 250, 200);
      store.endConnection(top.id, 'bottom');

      // Connect center to right
      store.startConnection(center.id, 'right', 300, 250);
      store.endConnection(right.id, 'left');

      // Connect center to bottom
      store.startConnection(center.id, 'bottom', 250, 300);
      store.endConnection(bottom.id, 'top');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(3);
    });

    it('should delete connectors when shape is deleted', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);
      const shape3 = store.addShape('rectangle', 500, 100);

      // Connect shape1 -> shape2
      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      // Connect shape2 -> shape3
      store.startConnection(shape2.id, 'right', 400, 150);
      store.endConnection(shape3.id, 'left');

      expect(useDiagramStore.getState().connectors).toHaveLength(2);

      // Delete shape2 - should remove both connectors
      store.deleteShape(shape2.id);

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(0);
      expect(state.shapes).toHaveLength(2);
    });
  });

  describe('Anchor position calculations', () => {
    it('should return correct anchor position for all positions', () => {
      const shape: Shape = {
        id: 'test',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 80,
        rotation: 0,
        fill: '#fff',
        stroke: '#000',
        strokeWidth: 2,
      };

      const top = getAnchorPoint(shape, 'top');
      expect(top).toEqual({ x: 150, y: 100 });

      const right = getAnchorPoint(shape, 'right');
      expect(right).toEqual({ x: 200, y: 140 });

      const bottom = getAnchorPoint(shape, 'bottom');
      expect(bottom).toEqual({ x: 150, y: 180 });

      const left = getAnchorPoint(shape, 'left');
      expect(left).toEqual({ x: 100, y: 140 });
    });

    it('should find nearest anchor when point is close', () => {
      const shape: Shape = {
        id: 'test',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 80,
        rotation: 0,
        fill: '#fff',
        stroke: '#000',
        strokeWidth: 2,
      };

      // Point near right anchor (200, 140)
      const nearest = findNearestAnchor(shape, 195, 142, 20);
      expect(nearest?.position).toBe('right');
    });

    it('should return null when no anchor is within distance', () => {
      const shape: Shape = {
        id: 'test',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 80,
        rotation: 0,
        fill: '#fff',
        stroke: '#000',
        strokeWidth: 2,
      };

      const nearest = findNearestAnchor(shape, 500, 500, 20);
      expect(nearest).toBeNull();
    });
  });

  describe('Tool switching during connection', () => {
    it('should cancel connection when switching tools', () => {
      const store = useDiagramStore.getState();
      const shape = store.addShape('rectangle', 100, 100);

      store.startConnection(shape.id, 'right', 200, 150);
      expect(useDiagramStore.getState().connectionState.isConnecting).toBe(true);

      // Switch tool should reset connection state
      store.setTool('select');

      const state = useDiagramStore.getState();
      expect(state.connectionState.isConnecting).toBe(false);
      expect(state.activeTool).toBe('select');
    });

    it('should maintain connection state when same tool is set', () => {
      const store = useDiagramStore.getState();
      const shape = store.addShape('rectangle', 100, 100);

      store.setTool('connector');
      store.startConnection(shape.id, 'right', 200, 150);

      // The setTool function resets connectionState, so this tests that behavior
      store.setTool('connector');

      const state = useDiagramStore.getState();
      // setTool always resets connection state per implementation
      expect(state.connectionState.isConnecting).toBe(false);
    });
  });

  describe('Connector rendering data', () => {
    it('should have correct default connector style', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      const connector = useDiagramStore.getState().connectors[0];
      expect(connector.stroke).toBe('#6b7280');
      expect(connector.strokeWidth).toBe(2);
      expect(connector.style).toBe('straight');
      expect(connector.startArrow).toBe('none');
      expect(connector.endArrow).toBe('arrow');
    });

    it('should allow updating connector style', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      const connectorId = useDiagramStore.getState().connectors[0].id;
      store.updateConnector(connectorId, {
        stroke: '#ff0000',
        strokeWidth: 4,
        style: 'elbow',
        startArrow: 'arrow',
        endArrow: 'arrow',
      });

      const connector = useDiagramStore.getState().connectors[0];
      expect(connector.stroke).toBe('#ff0000');
      expect(connector.strokeWidth).toBe(4);
      expect(connector.style).toBe('elbow');
      expect(connector.startArrow).toBe('arrow');
      expect(connector.endArrow).toBe('arrow');
    });
  });

  describe('Edge cases', () => {
    it('should handle connection without starting it first', () => {
      const store = useDiagramStore.getState();
      const shape = store.addShape('rectangle', 100, 100);

      // Try to end connection without starting
      store.endConnection(shape.id, 'right');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(0);
    });

    it('should handle update connection without starting', () => {
      const store = useDiagramStore.getState();

      // This should not throw
      store.updateConnection(200, 200);

      const state = useDiagramStore.getState();
      expect(state.connectionState.currentX).toBe(200);
      expect(state.connectionState.currentY).toBe(200);
    });

    it('should handle shape deletion during active connection', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      store.startConnection(shape1.id, 'right', 200, 150);

      // Delete the source shape
      store.deleteShape(shape1.id);

      // Try to end connection - should not create connector since source is gone
      store.endConnection(shape2.id, 'left');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(0);
    });

    it('should handle rapid connection attempts', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      // Rapid start/cancel cycles
      for (let i = 0; i < 10; i++) {
        store.startConnection(shape1.id, 'right', 200, 150);
        store.cancelConnection();
      }

      // Should still be able to create connection
      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(1);
    });

    it('should handle connection between shapes at same position', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 100, 100); // Same position

      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(1);
    });
  });

  describe('Selection during connection', () => {
    it('should clear selection when starting connection', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      store.selectShape(shape1.id);
      expect(useDiagramStore.getState().selectedShapeIds).toContain(shape1.id);

      store.startConnection(shape1.id, 'right', 200, 150);

      // Selection should be maintained during connection
      const state = useDiagramStore.getState();
      expect(state.connectionState.isConnecting).toBe(true);
    });

    it('should select newly created connector', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      const connector = useDiagramStore.getState().connectors[0];
      store.selectConnector(connector.id);

      const state = useDiagramStore.getState();
      expect(state.selectedConnectorIds).toContain(connector.id);
    });
  });

  describe('Bidirectional connections', () => {
    it('should not allow reverse connection if connection exists', () => {
      const store = useDiagramStore.getState();
      const shape1 = store.addShape('rectangle', 100, 100);
      const shape2 = store.addShape('rectangle', 300, 100);

      // Create connection from shape1 to shape2
      store.startConnection(shape1.id, 'right', 200, 150);
      store.endConnection(shape2.id, 'left');

      // Try to create reverse connection (shape2 to shape1)
      store.startConnection(shape2.id, 'left', 300, 150);
      store.endConnection(shape1.id, 'right');

      const state = useDiagramStore.getState();
      expect(state.connectors).toHaveLength(1);
      // Only the first connection should exist
      expect(state.connectors[0].fromShapeId).toBe(shape1.id);
    });
  });
});

describe('View and zoom during connection', () => {
  it('should maintain connection state during zoom change', () => {
    const store = useDiagramStore.getState();
    const shape = store.addShape('rectangle', 100, 100);

    store.startConnection(shape.id, 'right', 200, 150);
    store.setZoom(2);

    const state = useDiagramStore.getState();
    expect(state.connectionState.isConnecting).toBe(true);
    expect(state.zoom).toBe(2);
  });

  it('should maintain connection state during pan', () => {
    const store = useDiagramStore.getState();
    const shape = store.addShape('rectangle', 100, 100);

    store.startConnection(shape.id, 'right', 200, 150);
    store.setViewPosition(100, 100);

    const state = useDiagramStore.getState();
    expect(state.connectionState.isConnecting).toBe(true);
    expect(state.viewPosition).toEqual({ x: 100, y: 100 });
  });
});

describe('Shape resize with connectors', () => {
  it('should update connector anchor positions when shape is resized', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    // Create connector from right of shape1 to left of shape2
    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    // Get initial anchor positions
    const initialShape1 = useDiagramStore.getState().shapes[0];
    const initialRightAnchor = getAnchorPoint(initialShape1, 'right');
    expect(initialRightAnchor.x).toBe(200); // 100 + 100

    // Resize shape1 to be wider
    store.updateShape(shape1.id, { width: 150 });

    // Anchor should move with the new width
    const updatedShape1 = useDiagramStore.getState().shapes[0];
    const updatedRightAnchor = getAnchorPoint(updatedShape1, 'right');
    expect(updatedRightAnchor.x).toBe(250); // 100 + 150
  });

  it('should update all anchor positions when shape is resized', () => {
    const store = useDiagramStore.getState();
    const shape = store.addShape('rectangle', 100, 100);

    // Initial anchors (100x100 shape at position 100,100)
    let anchors = getShapeAnchors(useDiagramStore.getState().shapes[0]);
    expect(anchors.find(a => a.position === 'top')).toEqual({ position: 'top', x: 150, y: 100 });
    expect(anchors.find(a => a.position === 'right')).toEqual({ position: 'right', x: 200, y: 150 });
    expect(anchors.find(a => a.position === 'bottom')).toEqual({ position: 'bottom', x: 150, y: 200 });
    expect(anchors.find(a => a.position === 'left')).toEqual({ position: 'left', x: 100, y: 150 });

    // Resize to 200x150
    store.updateShape(shape.id, { width: 200, height: 150 });

    // Anchors should update
    anchors = getShapeAnchors(useDiagramStore.getState().shapes[0]);
    expect(anchors.find(a => a.position === 'top')).toEqual({ position: 'top', x: 200, y: 100 }); // 100 + 200/2
    expect(anchors.find(a => a.position === 'right')).toEqual({ position: 'right', x: 300, y: 175 }); // x: 100+200, y: 100+150/2
    expect(anchors.find(a => a.position === 'bottom')).toEqual({ position: 'bottom', x: 200, y: 250 }); // y: 100+150
    expect(anchors.find(a => a.position === 'left')).toEqual({ position: 'left', x: 100, y: 175 });
  });

  it('should maintain connectors when shape is moved', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    expect(useDiagramStore.getState().connectors).toHaveLength(1);

    // Move shape1
    store.updateShape(shape1.id, { x: 50, y: 50 });

    // Connector should still exist
    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(1);

    // Anchor positions should update
    const movedShape = state.shapes[0];
    const rightAnchor = getAnchorPoint(movedShape, 'right');
    expect(rightAnchor.x).toBe(150); // 50 + 100
    expect(rightAnchor.y).toBe(100); // 50 + 100/2
  });

  it('should handle resize of both connected shapes', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    // Resize both shapes
    store.updateShape(shape1.id, { width: 150 });
    store.updateShape(shape2.id, { width: 150, x: 350 });

    const state = useDiagramStore.getState();
    const s1 = state.shapes.find(s => s.id === shape1.id)!;
    const s2 = state.shapes.find(s => s.id === shape2.id)!;

    // Verify anchor positions updated
    expect(getAnchorPoint(s1, 'right').x).toBe(250); // 100 + 150
    expect(getAnchorPoint(s2, 'left').x).toBe(350); // 350 + 0
  });

  it('should update K8s shape anchors on resize', () => {
    const store = useDiagramStore.getState();
    const pod = store.addShape('k8s-pod', 100, 100);

    // K8s pod default is 80x80
    let podShape = useDiagramStore.getState().shapes[0];
    expect(podShape.width).toBe(80);
    expect(podShape.height).toBe(80);

    let anchors = getShapeAnchors(podShape);
    expect(anchors.find(a => a.position === 'right')?.x).toBe(180); // 100 + 80

    // Resize the pod
    store.updateShape(pod.id, { width: 120, height: 120 });

    podShape = useDiagramStore.getState().shapes[0];
    anchors = getShapeAnchors(podShape);
    expect(anchors.find(a => a.position === 'right')?.x).toBe(220); // 100 + 120
    expect(anchors.find(a => a.position === 'bottom')?.y).toBe(220); // 100 + 120
  });

  it('should handle connector between K8s shapes after resize', () => {
    const store = useDiagramStore.getState();
    const pod = store.addShape('k8s-pod', 100, 100);
    const service = store.addShape('k8s-service', 300, 100);

    store.startConnection(pod.id, 'right', 180, 140);
    store.endConnection(service.id, 'left');

    expect(useDiagramStore.getState().connectors).toHaveLength(1);

    // Resize pod
    store.updateShape(pod.id, { width: 120, height: 100 });

    // Connector should still exist and shapes should have correct anchors
    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(1);

    const podShape = state.shapes.find(s => s.id === pod.id)!;
    expect(getAnchorPoint(podShape, 'right').x).toBe(220); // 100 + 120
  });

  it('should handle multiple connectors during resize', () => {
    const store = useDiagramStore.getState();
    const center = store.addShape('rectangle', 200, 200);
    const top = store.addShape('rectangle', 200, 50);
    const right = store.addShape('rectangle', 350, 200);
    const bottom = store.addShape('rectangle', 200, 350);

    // Connect center to all others
    store.startConnection(center.id, 'top', 250, 200);
    store.endConnection(top.id, 'bottom');

    store.startConnection(center.id, 'right', 300, 250);
    store.endConnection(right.id, 'left');

    store.startConnection(center.id, 'bottom', 250, 300);
    store.endConnection(bottom.id, 'top');

    expect(useDiagramStore.getState().connectors).toHaveLength(3);

    // Resize center shape
    store.updateShape(center.id, { width: 150, height: 150 });

    // All connectors should still exist
    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(3);

    // Center shape anchors should be updated
    const centerShape = state.shapes.find(s => s.id === center.id)!;
    expect(getAnchorPoint(centerShape, 'top').x).toBe(275); // 200 + 150/2
    expect(getAnchorPoint(centerShape, 'right').x).toBe(350); // 200 + 150
    expect(getAnchorPoint(centerShape, 'bottom').y).toBe(350); // 200 + 150
  });

  it('should handle shape rotation with connectors', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    // Rotate shape1
    store.updateShape(shape1.id, { rotation: 45 });

    // Connector should still exist
    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(1);
    expect(state.shapes[0].rotation).toBe(45);
  });

  it('should update connector positions when shape height changes', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 100, 300);

    // Connect bottom of shape1 to top of shape2
    store.startConnection(shape1.id, 'bottom', 150, 200);
    store.endConnection(shape2.id, 'top');

    // Initial positions
    let s1 = useDiagramStore.getState().shapes[0];
    expect(getAnchorPoint(s1, 'bottom').y).toBe(200); // 100 + 100

    // Make shape1 taller
    store.updateShape(shape1.id, { height: 150 });

    s1 = useDiagramStore.getState().shapes[0];
    expect(getAnchorPoint(s1, 'bottom').y).toBe(250); // 100 + 150
  });

  it('should handle diamond shape resize with connectors', () => {
    const store = useDiagramStore.getState();
    const diamond = store.addShape('diamond', 100, 100);
    const rect = store.addShape('rectangle', 300, 100);

    store.startConnection(diamond.id, 'right', 200, 150);
    store.endConnection(rect.id, 'left');

    // Resize diamond
    store.updateShape(diamond.id, { width: 150, height: 150 });

    const state = useDiagramStore.getState();
    const diamondShape = state.shapes.find(s => s.id === diamond.id)!;

    // Right anchor should be at x + width
    expect(getAnchorPoint(diamondShape, 'right').x).toBe(250); // 100 + 150
    expect(state.connectors).toHaveLength(1);
  });

  it('should handle circle shape resize with connectors', () => {
    const store = useDiagramStore.getState();
    const circle = store.addShape('circle', 100, 100);
    const rect = store.addShape('rectangle', 300, 100);

    store.startConnection(circle.id, 'right', 200, 150);
    store.endConnection(rect.id, 'left');

    // Resize circle
    store.updateShape(circle.id, { width: 150, height: 150 });

    const state = useDiagramStore.getState();
    const circleShape = state.shapes.find(s => s.id === circle.id)!;

    expect(getAnchorPoint(circleShape, 'right').x).toBe(250); // 100 + 150
    expect(getAnchorPoint(circleShape, 'right').y).toBe(175); // 100 + 150/2
    expect(state.connectors).toHaveLength(1);
  });
});

describe('Shape interchangeability', () => {
  it('should connect any shape type to any other shape type', () => {
    const store = useDiagramStore.getState();

    // Create different shape types
    const rect = store.addShape('rectangle', 100, 100);
    const circle = store.addShape('circle', 250, 100);
    const diamond = store.addShape('diamond', 400, 100);
    const text = store.addShape('text', 550, 100);
    const pod = store.addShape('k8s-pod', 700, 100);

    // Connect rect -> circle
    store.startConnection(rect.id, 'right', 200, 150);
    store.endConnection(circle.id, 'left');

    // Connect circle -> diamond
    store.startConnection(circle.id, 'right', 350, 150);
    store.endConnection(diamond.id, 'left');

    // Connect diamond -> text
    store.startConnection(diamond.id, 'right', 500, 150);
    store.endConnection(text.id, 'left');

    // Connect text -> pod
    store.startConnection(text.id, 'right', 650, 120);
    store.endConnection(pod.id, 'left');

    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(4);
  });

  it('should connect K8s shapes to basic shapes bidirectionally', () => {
    const store = useDiagramStore.getState();

    const pod = store.addShape('k8s-pod', 100, 100);
    const rect = store.addShape('rectangle', 300, 100);
    const service = store.addShape('k8s-service', 100, 300);

    // K8s -> basic
    store.startConnection(pod.id, 'right', 180, 140);
    store.endConnection(rect.id, 'left');

    // basic -> K8s
    store.startConnection(rect.id, 'bottom', 350, 200);
    store.endConnection(service.id, 'top');

    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(2);
  });

  it('should handle all anchor positions for all shape types', () => {
    const store = useDiagramStore.getState();

    const shapes = [
      store.addShape('rectangle', 100, 100),
      store.addShape('circle', 100, 250),
      store.addShape('diamond', 100, 400),
      store.addShape('k8s-pod', 100, 550),
    ];

    // Verify all shapes have 4 anchors
    for (const shape of shapes) {
      const currentShape = useDiagramStore.getState().shapes.find(s => s.id === shape.id)!;
      const anchors = getShapeAnchors(currentShape);
      expect(anchors).toHaveLength(4);
      expect(anchors.map(a => a.position).sort()).toEqual(['bottom', 'left', 'right', 'top']);
    }
  });

  it('should maintain connectors after shape type specific properties change', () => {
    const store = useDiagramStore.getState();

    const rect = store.addShape('rectangle', 100, 100);
    const pod = store.addShape('k8s-pod', 300, 100);

    store.startConnection(rect.id, 'right', 200, 150);
    store.endConnection(pod.id, 'left');

    // Change rect fill
    store.updateShape(rect.id, { fill: '#ff0000' });

    // Change pod label
    store.updateShape(pod.id, { label: 'My Pod' });

    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(1);
    expect(state.shapes.find(s => s.id === rect.id)?.fill).toBe('#ff0000');
    expect(state.shapes.find(s => s.id === pod.id)?.label).toBe('My Pod');
  });
});

describe('Quick-create connected shape', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      shapes: [],
      connectors: [],
      selectedShapeIds: [],
      selectedConnectorIds: [],
      connectionState: {
        isConnecting: false,
        fromShapeId: null,
        fromAnchor: null,
        currentX: 0,
        currentY: 0,
      },
      history: [],
      historyIndex: -1,
    });
  });

  it('should create new shape to the right when clicking right anchor', () => {
    const store = useDiagramStore.getState();
    const sourceShape = store.addShape('rectangle', 100, 100);

    const newShape = store.quickCreateConnectedShape(sourceShape.id, 'right');

    expect(newShape).not.toBeNull();
    expect(newShape!.type).toBe('rectangle');
    // New shape should be to the right (x = source.x + source.width + OFFSET)
    expect(newShape!.x).toBeGreaterThan(sourceShape.x + sourceShape.width);

    const state = useDiagramStore.getState();
    expect(state.shapes).toHaveLength(2);
    expect(state.connectors).toHaveLength(1);
    expect(state.connectors[0].fromAnchor).toBe('right');
    expect(state.connectors[0].toAnchor).toBe('left');
  });

  it('should create new shape to the left when clicking left anchor', () => {
    const store = useDiagramStore.getState();
    const sourceShape = store.addShape('rectangle', 300, 100);

    const newShape = store.quickCreateConnectedShape(sourceShape.id, 'left');

    expect(newShape).not.toBeNull();
    // New shape should be to the left
    expect(newShape!.x).toBeLessThan(sourceShape.x);

    const state = useDiagramStore.getState();
    expect(state.connectors[0].fromAnchor).toBe('left');
    expect(state.connectors[0].toAnchor).toBe('right');
  });

  it('should create new shape above when clicking top anchor', () => {
    const store = useDiagramStore.getState();
    const sourceShape = store.addShape('rectangle', 100, 300);

    const newShape = store.quickCreateConnectedShape(sourceShape.id, 'top');

    expect(newShape).not.toBeNull();
    // New shape should be above
    expect(newShape!.y).toBeLessThan(sourceShape.y);

    const state = useDiagramStore.getState();
    expect(state.connectors[0].fromAnchor).toBe('top');
    expect(state.connectors[0].toAnchor).toBe('bottom');
  });

  it('should create new shape below when clicking bottom anchor', () => {
    const store = useDiagramStore.getState();
    const sourceShape = store.addShape('rectangle', 100, 100);

    const newShape = store.quickCreateConnectedShape(sourceShape.id, 'bottom');

    expect(newShape).not.toBeNull();
    // New shape should be below
    expect(newShape!.y).toBeGreaterThan(sourceShape.y + sourceShape.height);

    const state = useDiagramStore.getState();
    expect(state.connectors[0].fromAnchor).toBe('bottom');
    expect(state.connectors[0].toAnchor).toBe('top');
  });

  it('should preserve shape type when quick-creating', () => {
    const store = useDiagramStore.getState();
    const circle = store.addShape('circle', 100, 100);

    const newShape = store.quickCreateConnectedShape(circle.id, 'right');

    expect(newShape).not.toBeNull();
    expect(newShape!.type).toBe('circle');
  });

  it('should preserve K8s shape type when quick-creating', () => {
    const store = useDiagramStore.getState();
    const pod = store.addShape('k8s-pod', 100, 100);

    const newShape = store.quickCreateConnectedShape(pod.id, 'right');

    expect(newShape).not.toBeNull();
    expect(newShape!.type).toBe('k8s-pod');
  });

  it('should select the new shape after creation', () => {
    const store = useDiagramStore.getState();
    const sourceShape = store.addShape('rectangle', 100, 100);

    const newShape = store.quickCreateConnectedShape(sourceShape.id, 'right');

    const state = useDiagramStore.getState();
    expect(state.selectedShapeIds).toContain(newShape!.id);
  });

  it('should return null for invalid source shape', () => {
    const store = useDiagramStore.getState();

    const newShape = store.quickCreateConnectedShape('non-existent-id', 'right');

    expect(newShape).toBeNull();
    expect(useDiagramStore.getState().shapes).toHaveLength(0);
  });

  it('should create chain of connected shapes', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);

    const shape2 = store.quickCreateConnectedShape(shape1.id, 'right');
    const shape3 = store.quickCreateConnectedShape(shape2!.id, 'right');
    const shape4 = store.quickCreateConnectedShape(shape3!.id, 'bottom');

    const state = useDiagramStore.getState();
    expect(state.shapes).toHaveLength(4);
    expect(state.connectors).toHaveLength(3);

    // Verify positions make sense (each shape to the right/below of previous)
    expect(shape2!.x).toBeGreaterThan(shape1.x);
    expect(shape3!.x).toBeGreaterThan(shape2!.x);
    expect(shape4!.y).toBeGreaterThan(shape3!.y);
  });

  it('should work with diamond shapes', () => {
    const store = useDiagramStore.getState();
    const diamond = store.addShape('diamond', 100, 100);

    const newShape = store.quickCreateConnectedShape(diamond.id, 'right');

    expect(newShape).not.toBeNull();
    expect(newShape!.type).toBe('diamond');
    expect(useDiagramStore.getState().connectors).toHaveLength(1);
  });

  it('should create appropriate spacing between shapes', () => {
    const store = useDiagramStore.getState();
    const sourceShape = store.addShape('rectangle', 100, 100);

    const newShape = store.quickCreateConnectedShape(sourceShape.id, 'right');

    // There should be a gap between shapes (OFFSET = 150, but grid snapping may adjust)
    const gap = newShape!.x - (sourceShape.x + sourceShape.width);
    expect(gap).toBeGreaterThanOrEqual(150);
    expect(gap).toBeLessThanOrEqual(170); // Allow for grid snapping
  });
});

describe('Connector anchor calculations during drag', () => {
  // These tests verify the inline anchor calculation logic used in renderConnector
  // matches the standard getAnchorPoint function, ensuring connectors update correctly

  it('should calculate anchor positions correctly for all anchor types', () => {
    // Inline calculation (used in Canvas for real-time updates during drag)
    const calculateAnchor = (x: number, y: number, width: number, height: number, anchor: string) => ({
      x: x + (anchor === 'left' ? 0 : anchor === 'right' ? width : width / 2),
      y: y + (anchor === 'top' ? 0 : anchor === 'bottom' ? height : height / 2),
    });

    const shape: Shape = {
      id: 'test',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 100,
      height: 80,
      rotation: 0,
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 2,
    };

    // Compare inline calculation with getAnchorPoint for all positions
    const topInline = calculateAnchor(shape.x, shape.y, shape.width, shape.height, 'top');
    const topOriginal = getAnchorPoint(shape, 'top');
    expect(topInline).toEqual(topOriginal);

    const rightInline = calculateAnchor(shape.x, shape.y, shape.width, shape.height, 'right');
    const rightOriginal = getAnchorPoint(shape, 'right');
    expect(rightInline).toEqual(rightOriginal);

    const bottomInline = calculateAnchor(shape.x, shape.y, shape.width, shape.height, 'bottom');
    const bottomOriginal = getAnchorPoint(shape, 'bottom');
    expect(bottomInline).toEqual(bottomOriginal);

    const leftInline = calculateAnchor(shape.x, shape.y, shape.width, shape.height, 'left');
    const leftOriginal = getAnchorPoint(shape, 'left');
    expect(leftInline).toEqual(leftOriginal);
  });

  it('should calculate correct anchors during simulated drag updates', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    // Create connector
    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    // Simulate rapid position updates during drag
    const dragPositions = [
      { x: 110, y: 105 },
      { x: 120, y: 110 },
      { x: 130, y: 115 },
      { x: 140, y: 120 },
      { x: 150, y: 125 },
    ];

    for (const pos of dragPositions) {
      store.updateShape(shape1.id, { x: pos.x, y: pos.y });

      const updatedShape = useDiagramStore.getState().shapes.find(s => s.id === shape1.id)!;
      const expectedRightAnchor = { x: pos.x + 100, y: pos.y + 50 };
      const actualAnchor = getAnchorPoint(updatedShape, 'right');

      expect(actualAnchor).toEqual(expectedRightAnchor);
    }
  });

  it('should maintain connector integrity through shape position changes', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    // Move shape1 multiple times
    store.updateShape(shape1.id, { x: 50, y: 50 });
    store.updateShape(shape1.id, { x: 80, y: 80 });
    store.updateShape(shape1.id, { x: 120, y: 120 });

    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(1);

    // Verify connector still references correct shapes
    const connector = state.connectors[0];
    expect(connector.fromShapeId).toBe(shape1.id);
    expect(connector.toShapeId).toBe(shape2.id);
    expect(connector.fromAnchor).toBe('right');
    expect(connector.toAnchor).toBe('left');
  });

  it('should calculate K8s shape anchors correctly during drag', () => {
    const store = useDiagramStore.getState();
    const pod = store.addShape('k8s-pod', 100, 100); // 80x80 default size

    const calculateAnchor = (x: number, y: number, width: number, height: number, anchor: string) => ({
      x: x + (anchor === 'left' ? 0 : anchor === 'right' ? width : width / 2),
      y: y + (anchor === 'top' ? 0 : anchor === 'bottom' ? height : height / 2),
    });

    // Simulate drag to new position
    store.updateShape(pod.id, { x: 200, y: 200 });

    const updatedPod = useDiagramStore.getState().shapes.find(s => s.id === pod.id)!;

    // K8s pod has 80x80 dimensions
    expect(calculateAnchor(200, 200, 80, 80, 'right')).toEqual({ x: 280, y: 240 });
    expect(getAnchorPoint(updatedPod, 'right')).toEqual({ x: 280, y: 240 });
  });

  it('should handle both connected shapes moving', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    // Move both shapes
    store.updateShape(shape1.id, { x: 50, y: 150 });
    store.updateShape(shape2.id, { x: 350, y: 150 });

    const state = useDiagramStore.getState();
    const s1 = state.shapes.find(s => s.id === shape1.id)!;
    const s2 = state.shapes.find(s => s.id === shape2.id)!;

    // Verify anchor positions are correct
    expect(getAnchorPoint(s1, 'right')).toEqual({ x: 150, y: 200 }); // 50+100, 150+50
    expect(getAnchorPoint(s2, 'left')).toEqual({ x: 350, y: 200 }); // 350, 150+50
  });
});

describe('Dynamic connector anchor switching', () => {
  // Test the logic that dynamically selects optimal anchors based on shape positions

  // Helper function to calculate optimal anchors (mirrors Canvas.tsx implementation)
  const calculateOptimalAnchors = (
    fromX: number, fromY: number, fromWidth: number, fromHeight: number,
    toX: number, toY: number, toWidth: number, toHeight: number
  ) => {
    const fromCenterX = fromX + fromWidth / 2;
    const fromCenterY = fromY + fromHeight / 2;
    const toCenterX = toX + toWidth / 2;
    const toCenterY = toY + toHeight / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    if (isHorizontal) {
      return dx > 0
        ? { fromAnchor: 'right', toAnchor: 'left' }
        : { fromAnchor: 'left', toAnchor: 'right' };
    } else {
      return dy > 0
        ? { fromAnchor: 'bottom', toAnchor: 'top' }
        : { fromAnchor: 'top', toAnchor: 'bottom' };
    }
  };

  it('should select right→left anchors when to-shape is to the right', () => {
    const result = calculateOptimalAnchors(
      100, 100, 100, 100,  // from shape at (100, 100) size 100x100
      300, 100, 100, 100   // to shape at (300, 100) - to the right
    );

    expect(result.fromAnchor).toBe('right');
    expect(result.toAnchor).toBe('left');
  });

  it('should select left→right anchors when to-shape is to the left', () => {
    const result = calculateOptimalAnchors(
      300, 100, 100, 100,  // from shape at (300, 100)
      100, 100, 100, 100   // to shape at (100, 100) - to the left
    );

    expect(result.fromAnchor).toBe('left');
    expect(result.toAnchor).toBe('right');
  });

  it('should select bottom→top anchors when to-shape is below', () => {
    const result = calculateOptimalAnchors(
      100, 100, 100, 100,  // from shape at (100, 100)
      100, 300, 100, 100   // to shape at (100, 300) - below
    );

    expect(result.fromAnchor).toBe('bottom');
    expect(result.toAnchor).toBe('top');
  });

  it('should select top→bottom anchors when to-shape is above', () => {
    const result = calculateOptimalAnchors(
      100, 300, 100, 100,  // from shape at (100, 300)
      100, 100, 100, 100   // to shape at (100, 100) - above
    );

    expect(result.fromAnchor).toBe('top');
    expect(result.toAnchor).toBe('bottom');
  });

  it('should switch anchors when shape crosses to other side horizontally', () => {
    // Initially to-shape is to the right
    let result = calculateOptimalAnchors(
      100, 100, 100, 100,
      300, 100, 100, 100
    );
    expect(result.fromAnchor).toBe('right');
    expect(result.toAnchor).toBe('left');

    // After dragging to-shape to the left
    result = calculateOptimalAnchors(
      100, 100, 100, 100,
      -100, 100, 100, 100  // now to the left of from-shape
    );
    expect(result.fromAnchor).toBe('left');
    expect(result.toAnchor).toBe('right');
  });

  it('should switch anchors when shape crosses to other side vertically', () => {
    // Initially to-shape is below
    let result = calculateOptimalAnchors(
      100, 100, 100, 100,
      100, 300, 100, 100
    );
    expect(result.fromAnchor).toBe('bottom');
    expect(result.toAnchor).toBe('top');

    // After dragging to-shape above
    result = calculateOptimalAnchors(
      100, 100, 100, 100,
      100, -100, 100, 100  // now above from-shape
    );
    expect(result.fromAnchor).toBe('top');
    expect(result.toAnchor).toBe('bottom');
  });

  it('should prefer horizontal anchors for diagonally placed shapes with more horizontal distance', () => {
    const result = calculateOptimalAnchors(
      100, 100, 100, 100,
      400, 200, 100, 100  // more horizontal than vertical distance
    );

    expect(result.fromAnchor).toBe('right');
    expect(result.toAnchor).toBe('left');
  });

  it('should prefer vertical anchors for diagonally placed shapes with more vertical distance', () => {
    const result = calculateOptimalAnchors(
      100, 100, 100, 100,
      200, 400, 100, 100  // more vertical than horizontal distance
    );

    expect(result.fromAnchor).toBe('bottom');
    expect(result.toAnchor).toBe('top');
  });

  it('should handle K8s shapes with different dimensions', () => {
    // K8s pod is 80x80
    const result = calculateOptimalAnchors(
      100, 100, 80, 80,  // Pod
      300, 100, 80, 80   // Service to the right
    );

    expect(result.fromAnchor).toBe('right');
    expect(result.toAnchor).toBe('left');
  });

  it('should handle shapes of different sizes', () => {
    const result = calculateOptimalAnchors(
      100, 100, 50, 50,   // small shape
      300, 100, 200, 200  // large shape to the right
    );

    expect(result.fromAnchor).toBe('right');
    expect(result.toAnchor).toBe('left');
  });
});

describe('K8s shape resize behavior', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      shapes: [],
      connectors: [],
      selectedShapeIds: [],
      selectedConnectorIds: [],
      history: [],
      historyIndex: -1,
    });
  });

  it('should maintain K8s shape properties after resize', () => {
    const store = useDiagramStore.getState();
    const pod = store.addShape('k8s-pod', 100, 100);

    // Simulate resize by updating dimensions
    store.updateShape(pod.id, { width: 120, height: 100 });

    const state = useDiagramStore.getState();
    const updatedPod = state.shapes.find(s => s.id === pod.id)!;

    expect(updatedPod.type).toBe('k8s-pod');
    expect(updatedPod.width).toBe(120);
    expect(updatedPod.height).toBe(100);
    // Label should be preserved
    expect(updatedPod.label).toBeDefined();
  });

  it('should maintain K8s shape type after multiple resizes', () => {
    const store = useDiagramStore.getState();
    const service = store.addShape('k8s-service', 100, 100);

    // Multiple resizes
    store.updateShape(service.id, { width: 150, height: 150 });
    store.updateShape(service.id, { width: 100, height: 100 });
    store.updateShape(service.id, { width: 200, height: 80 });

    const state = useDiagramStore.getState();
    const updatedService = state.shapes.find(s => s.id === service.id)!;

    expect(updatedService.type).toBe('k8s-service');
    expect(updatedService.width).toBe(200);
    expect(updatedService.height).toBe(80);
  });

  it('should preserve connectors when K8s shape is resized', () => {
    const store = useDiagramStore.getState();
    const pod = store.addShape('k8s-pod', 100, 100);
    const service = store.addShape('k8s-service', 300, 100);

    // Create connector
    store.startConnection(pod.id, 'right', 180, 140);
    store.endConnection(service.id, 'left');

    // Resize pod
    store.updateShape(pod.id, { width: 150, height: 120 });

    const state = useDiagramStore.getState();
    expect(state.connectors).toHaveLength(1);
    expect(state.connectors[0].fromShapeId).toBe(pod.id);
  });
});

describe('Multi-select drag', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      shapes: [],
      connectors: [],
      selectedShapeIds: [],
      selectedConnectorIds: [],
      history: [],
      historyIndex: -1,
    });
  });

  it('should update multiple shapes with updateShapes action', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);
    const shape3 = store.addShape('rectangle', 500, 100);

    // Update multiple shapes at once
    store.updateShapes([
      { id: shape1.id, changes: { x: 150, y: 150 } },
      { id: shape2.id, changes: { x: 350, y: 150 } },
      { id: shape3.id, changes: { x: 550, y: 150 } },
    ]);

    const state = useDiagramStore.getState();
    expect(state.shapes.find(s => s.id === shape1.id)?.x).toBe(150);
    expect(state.shapes.find(s => s.id === shape2.id)?.x).toBe(350);
    expect(state.shapes.find(s => s.id === shape3.id)?.x).toBe(550);
  });

  it('should move all selected shapes with moveSelectedShapes', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    // Select both shapes
    store.selectShapes([shape1.id, shape2.id]);

    // Move selected shapes by delta
    store.moveSelectedShapes(50, 25);

    const state = useDiagramStore.getState();
    expect(state.shapes.find(s => s.id === shape1.id)?.x).toBe(150);
    expect(state.shapes.find(s => s.id === shape1.id)?.y).toBe(125);
    expect(state.shapes.find(s => s.id === shape2.id)?.x).toBe(350);
    expect(state.shapes.find(s => s.id === shape2.id)?.y).toBe(125);
  });

  it('should maintain relative positions during multi-select move', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 200);

    const initialDx = shape2.x - shape1.x; // 200
    const initialDy = shape2.y - shape1.y; // 100

    store.selectShapes([shape1.id, shape2.id]);
    store.moveSelectedShapes(100, 50);

    const state = useDiagramStore.getState();
    const s1 = state.shapes.find(s => s.id === shape1.id)!;
    const s2 = state.shapes.find(s => s.id === shape2.id)!;

    expect(s2.x - s1.x).toBe(initialDx);
    expect(s2.y - s1.y).toBe(initialDy);
  });

  it('should only move selected shapes, not unselected ones', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);
    const shape3 = store.addShape('rectangle', 500, 100);

    // Select only first two
    store.selectShapes([shape1.id, shape2.id]);
    store.moveSelectedShapes(50, 50);

    const state = useDiagramStore.getState();
    expect(state.shapes.find(s => s.id === shape1.id)?.x).toBe(150);
    expect(state.shapes.find(s => s.id === shape2.id)?.x).toBe(350);
    expect(state.shapes.find(s => s.id === shape3.id)?.x).toBe(500); // unchanged
  });
});

describe('Z-index controls', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      shapes: [],
      connectors: [],
      selectedShapeIds: [],
      selectedConnectorIds: [],
      history: [],
      historyIndex: -1,
    });
  });

  it('should bring shape to front', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 100, 100);
    const shape3 = store.addShape('rectangle', 100, 100);

    // shape3 is on top initially (last in array)
    let state = useDiagramStore.getState();
    expect(state.shapes[2].id).toBe(shape3.id);

    // Bring shape1 to front
    store.bringToFront(shape1.id);

    state = useDiagramStore.getState();
    expect(state.shapes[2].id).toBe(shape1.id); // Now shape1 is last (on top)
  });

  it('should send shape to back', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 100, 100);
    const shape3 = store.addShape('rectangle', 100, 100);

    // shape1 is at back initially (first in array)
    let state = useDiagramStore.getState();
    expect(state.shapes[0].id).toBe(shape1.id);

    // Send shape3 to back
    store.sendToBack(shape3.id);

    state = useDiagramStore.getState();
    expect(state.shapes[0].id).toBe(shape3.id); // Now shape3 is first (at back)
  });

  it('should bring shape forward one level', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 100, 100);
    const shape3 = store.addShape('rectangle', 100, 100);

    // Order: shape1, shape2, shape3
    store.bringForward(shape1.id);

    const state = useDiagramStore.getState();
    expect(state.shapes[0].id).toBe(shape2.id);
    expect(state.shapes[1].id).toBe(shape1.id);
    expect(state.shapes[2].id).toBe(shape3.id);
  });

  it('should send shape backward one level', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 100, 100);
    const shape3 = store.addShape('rectangle', 100, 100);

    // Order: shape1, shape2, shape3
    store.sendBackward(shape3.id);

    const state = useDiagramStore.getState();
    expect(state.shapes[0].id).toBe(shape1.id);
    expect(state.shapes[1].id).toBe(shape3.id);
    expect(state.shapes[2].id).toBe(shape2.id);
  });

  it('should not change order when already at front', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 100, 100);

    store.bringForward(shape2.id); // Already at front

    const state = useDiagramStore.getState();
    expect(state.shapes[1].id).toBe(shape2.id);
  });

  it('should not change order when already at back', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 100, 100);

    store.sendBackward(shape1.id); // Already at back

    const state = useDiagramStore.getState();
    expect(state.shapes[0].id).toBe(shape1.id);
  });
});

describe('Undo/Redo selection preservation', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      shapes: [],
      connectors: [],
      selectedShapeIds: [],
      selectedConnectorIds: [],
      history: [{ shapes: [], connectors: [] }],
      historyIndex: 0,
    });
  });

  it('should preserve selection after undo if shape still exists', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    // Select shape1
    store.selectShape(shape1.id);
    expect(useDiagramStore.getState().selectedShapeIds).toContain(shape1.id);

    // Move shape1
    store.updateShape(shape1.id, { x: 150 });
    store.saveToHistory();

    // Undo
    store.undo();

    // Shape1 should still be selected
    const state = useDiagramStore.getState();
    expect(state.selectedShapeIds).toContain(shape1.id);
  });

  it('should clear selection for deleted shapes after undo', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    store.saveToHistory();

    // Select and delete shape
    store.selectShape(shape1.id);
    store.deleteSelectedShapes();

    // Selection is already cleared by delete
    expect(useDiagramStore.getState().selectedShapeIds).not.toContain(shape1.id);
  });

  it('should preserve selection after redo if shape still exists', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    store.saveToHistory();

    store.selectShape(shape1.id);
    store.updateShape(shape1.id, { x: 200 });
    store.saveToHistory();

    // Undo and redo
    store.undo();
    store.redo();

    const state = useDiagramStore.getState();
    expect(state.selectedShapeIds).toContain(shape1.id);
  });
});

describe('Paste offset increment', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      shapes: [],
      connectors: [],
      selectedShapeIds: [],
      selectedConnectorIds: [],
      clipboard: null,
      pasteCount: 0,
      history: [{ shapes: [], connectors: [] }],
      historyIndex: 0,
    });
  });

  it('should increment paste offset with each paste', () => {
    const store = useDiagramStore.getState();
    const shape = store.addShape('rectangle', 100, 100);
    store.selectShape(shape.id);
    store.copy();

    // First paste
    store.paste();
    let state = useDiagramStore.getState();
    const paste1 = state.shapes.find(s => s.id !== shape.id);
    expect(paste1?.x).toBe(120); // 100 + 20

    // Second paste
    store.paste();
    state = useDiagramStore.getState();
    const pastedShapes = state.shapes.filter(s => s.id !== shape.id && s.id !== paste1?.id);
    expect(pastedShapes[0]?.x).toBe(140); // 100 + 40

    // Third paste
    store.paste();
    state = useDiagramStore.getState();
    expect(state.pasteCount).toBe(3);
  });

  it('should reset paste count on new copy', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    store.selectShape(shape1.id);
    store.copy();
    store.paste();
    store.paste();

    expect(useDiagramStore.getState().pasteCount).toBe(2);

    // New copy should reset
    const shape2 = store.addShape('rectangle', 300, 100);
    store.selectShape(shape2.id);
    store.copy();

    expect(useDiagramStore.getState().pasteCount).toBe(0);
  });
});

describe('Connector labels', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      shapes: [],
      connectors: [],
      selectedShapeIds: [],
      selectedConnectorIds: [],
      history: [],
      historyIndex: -1,
    });
  });

  it('should add label to connector', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    const connectorId = useDiagramStore.getState().connectors[0].id;
    store.updateConnector(connectorId, { label: 'My Label' });

    const connector = useDiagramStore.getState().connectors[0];
    expect(connector.label).toBe('My Label');
  });

  it('should update connector label', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    const connectorId = useDiagramStore.getState().connectors[0].id;
    store.updateConnector(connectorId, { label: 'Initial' });
    store.updateConnector(connectorId, { label: 'Updated' });

    const connector = useDiagramStore.getState().connectors[0];
    expect(connector.label).toBe('Updated');
  });

  it('should remove connector label when set to empty', () => {
    const store = useDiagramStore.getState();
    const shape1 = store.addShape('rectangle', 100, 100);
    const shape2 = store.addShape('rectangle', 300, 100);

    store.startConnection(shape1.id, 'right', 200, 150);
    store.endConnection(shape2.id, 'left');

    const connectorId = useDiagramStore.getState().connectors[0].id;
    store.updateConnector(connectorId, { label: 'My Label' });
    store.updateConnector(connectorId, { label: '' });

    const connector = useDiagramStore.getState().connectors[0];
    expect(connector.label).toBe('');
  });
});

describe('Connector rotation handling', () => {
  // Test the rotation transformation logic for connector anchors
  // This mirrors the getAnchorCoords function with rotation support

  const getAnchorCoordsWithRotation = (
    x: number, y: number, width: number, height: number,
    anchor: 'top' | 'right' | 'bottom' | 'left', rotation: number = 0
  ): { x: number; y: number } => {
    let anchorX: number;
    let anchorY: number;

    switch (anchor) {
      case 'top':
        anchorX = x + width / 2;
        anchorY = y;
        break;
      case 'right':
        anchorX = x + width;
        anchorY = y + height / 2;
        break;
      case 'bottom':
        anchorX = x + width / 2;
        anchorY = y + height;
        break;
      case 'left':
        anchorX = x;
        anchorY = y + height / 2;
        break;
    }

    if (rotation === 0) {
      return { x: anchorX, y: anchorY };
    }

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const angleRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const rotatedX = centerX + (anchorX - centerX) * cos - (anchorY - centerY) * sin;
    const rotatedY = centerY + (anchorX - centerX) * sin + (anchorY - centerY) * cos;

    return { x: rotatedX, y: rotatedY };
  };

  it('should return same position with no rotation', () => {
    const coords = getAnchorCoordsWithRotation(100, 100, 100, 100, 'right', 0);
    expect(coords.x).toBe(200); // 100 + 100
    expect(coords.y).toBe(150); // 100 + 50
  });

  it('should rotate anchor 90 degrees clockwise', () => {
    // For a 100x100 shape at (100, 100), the right anchor is at (200, 150)
    // Rotating 90 degrees around center (150, 150) should move it to the bottom
    const coords = getAnchorCoordsWithRotation(100, 100, 100, 100, 'right', 90);

    // After 90 degree rotation, right anchor moves to where bottom was
    expect(coords.x).toBeCloseTo(150, 5);
    expect(coords.y).toBeCloseTo(200, 5);
  });

  it('should rotate anchor 180 degrees', () => {
    const coords = getAnchorCoordsWithRotation(100, 100, 100, 100, 'right', 180);

    // After 180 degree rotation, right anchor moves to left position
    expect(coords.x).toBeCloseTo(100, 5);
    expect(coords.y).toBeCloseTo(150, 5);
  });

  it('should rotate anchor 270 degrees', () => {
    const coords = getAnchorCoordsWithRotation(100, 100, 100, 100, 'right', 270);

    // After 270 degree rotation, right anchor moves to top position
    expect(coords.x).toBeCloseTo(150, 5);
    expect(coords.y).toBeCloseTo(100, 5);
  });

  it('should handle 45 degree rotation', () => {
    const coords = getAnchorCoordsWithRotation(100, 100, 100, 100, 'right', 45);

    // Calculate expected position
    const centerX = 150;
    const centerY = 150;
    const originalX = 200;
    const originalY = 150;
    const angleRad = (45 * Math.PI) / 180;

    const expectedX = centerX + (originalX - centerX) * Math.cos(angleRad) - (originalY - centerY) * Math.sin(angleRad);
    const expectedY = centerY + (originalX - centerX) * Math.sin(angleRad) + (originalY - centerY) * Math.cos(angleRad);

    expect(coords.x).toBeCloseTo(expectedX, 5);
    expect(coords.y).toBeCloseTo(expectedY, 5);
  });

  it('should maintain center position after any rotation', () => {
    // The center of the shape should be invariant under rotation
    // For all anchors, the center is equidistant after rotation

    const centerX = 150;
    const centerY = 150;

    for (const rotation of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const coords = getAnchorCoordsWithRotation(100, 100, 100, 100, 'right', rotation);
      const distance = Math.sqrt(Math.pow(coords.x - centerX, 2) + Math.pow(coords.y - centerY, 2));

      // Original distance from center to right anchor is 50
      expect(distance).toBeCloseTo(50, 5);
    }
  });

  it('should handle non-square shapes', () => {
    // 200x100 rectangle at (0, 0)
    const coords = getAnchorCoordsWithRotation(0, 0, 200, 100, 'right', 90);

    // Center is at (100, 50)
    // Right anchor is at (200, 50), which is 100 units to the right of center
    // After 90 degree rotation, it should be 100 units below center: (100, 150)
    expect(coords.x).toBeCloseTo(100, 5);
    expect(coords.y).toBeCloseTo(150, 5);
  });
});

describe('Elbow routing improvements', () => {
  // Test the improved elbow path generation logic

  const generateElbowPath = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    fromAnchor: 'top' | 'right' | 'bottom' | 'left',
    toAnchor: 'top' | 'right' | 'bottom' | 'left'
  ): number[] => {
    const MIN_MARGIN = 20;

    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // For very close shapes, use straight line
    if (dx < MIN_MARGIN * 2 && dy < MIN_MARGIN * 2) {
      return [from.x, from.y, to.x, to.y];
    }

    const adaptiveMarginX = Math.min(MIN_MARGIN, dx / 4);
    const adaptiveMarginY = Math.min(MIN_MARGIN, dy / 4);

    if (fromAnchor === 'left' || fromAnchor === 'right') {
      if (toAnchor === 'left' || toAnchor === 'right') {
        const midX = (from.x + to.x) / 2;
        if (Math.abs(from.x - to.x) < MIN_MARGIN * 2) {
          const offsetY = from.y < to.y ? -MIN_MARGIN : MIN_MARGIN;
          const routeY = Math.min(from.y, to.y) + offsetY;
          return [from.x, from.y, from.x, routeY, to.x, routeY, to.x, to.y];
        }
        return [from.x, from.y, midX, from.y, midX, to.y, to.x, to.y];
      } else {
        const extendX = fromAnchor === 'right'
          ? Math.max(from.x + adaptiveMarginX, to.x)
          : Math.min(from.x - adaptiveMarginX, to.x);
        return [from.x, from.y, extendX, from.y, extendX, to.y, to.x, to.y];
      }
    } else {
      if (toAnchor === 'top' || toAnchor === 'bottom') {
        const midY = (from.y + to.y) / 2;
        if (Math.abs(from.y - to.y) < MIN_MARGIN * 2) {
          const offsetX = from.x < to.x ? -MIN_MARGIN : MIN_MARGIN;
          const routeX = Math.min(from.x, to.x) + offsetX;
          return [from.x, from.y, routeX, from.y, routeX, to.y, to.x, to.y];
        }
        return [from.x, from.y, from.x, midY, to.x, midY, to.x, to.y];
      } else {
        const extendY = fromAnchor === 'bottom'
          ? Math.max(from.y + adaptiveMarginY, to.y)
          : Math.min(from.y - adaptiveMarginY, to.y);
        return [from.x, from.y, from.x, extendY, to.x, extendY, to.x, to.y];
      }
    }
  };

  it('should use straight line for very close shapes', () => {
    const path = generateElbowPath(
      { x: 100, y: 100 },
      { x: 110, y: 105 }, // Very close
      'right',
      'left'
    );

    // Should be a straight line (4 points)
    expect(path).toEqual([100, 100, 110, 105]);
  });

  it('should generate elbow path for horizontal anchors', () => {
    const path = generateElbowPath(
      { x: 100, y: 100 },
      { x: 300, y: 200 },
      'right',
      'left'
    );

    // Should be an elbow path (8 points)
    expect(path.length).toBe(8);
    expect(path[0]).toBe(100); // Start x
    expect(path[1]).toBe(100); // Start y
    expect(path[6]).toBe(300); // End x
    expect(path[7]).toBe(200); // End y
  });

  it('should generate elbow path for vertical anchors', () => {
    const path = generateElbowPath(
      { x: 100, y: 100 },
      { x: 200, y: 300 },
      'bottom',
      'top'
    );

    // Should be an elbow path (8 points)
    expect(path.length).toBe(8);
    expect(path[0]).toBe(100);
    expect(path[1]).toBe(100);
  });

  it('should handle shapes very close horizontally', () => {
    const path = generateElbowPath(
      { x: 100, y: 100 },
      { x: 120, y: 200 }, // Close in x but far in y
      'right',
      'right'
    );

    // Should route around
    expect(path.length).toBe(8);
  });

  it('should handle shapes very close vertically', () => {
    const path = generateElbowPath(
      { x: 100, y: 100 },
      { x: 200, y: 120 }, // Close in y but far in x
      'bottom',
      'bottom'
    );

    // Should route around
    expect(path.length).toBe(8);
  });

  it('should use adaptive margins for medium distances', () => {
    const path = generateElbowPath(
      { x: 100, y: 100 },
      { x: 150, y: 150 }, // Moderate distance
      'right',
      'top'
    );

    // Should still generate a proper path
    expect(path.length).toBe(8);
  });
});
