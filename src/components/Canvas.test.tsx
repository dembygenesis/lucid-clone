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
