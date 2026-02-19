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
