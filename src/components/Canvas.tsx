import { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Transformer, Group, Arrow, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useDiagramStore } from '../store';
import {
  Shape,
  Connector,
  AnchorPosition,
  getShapeAnchors,
  getAnchorPoint,
  isK8sShape,
  K8sShapeType,
} from '../types';
import { getK8sIconPath, K8S_LABELS } from './K8sIcons';

interface CanvasProps {
  width: number;
  height: number;
  stageRef?: React.RefObject<Konva.Stage>;
}

const ANCHOR_RADIUS = 6;
const ANCHOR_HIT_RADIUS = 12;

export function Canvas({ width, height, stageRef: externalStageRef }: CanvasProps) {
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;
  const transformerRef = useRef<Konva.Transformer>(null);

  const {
    shapes,
    connectors,
    settings,
    selectedShapeIds,
    selectedConnectorIds,
    activeTool,
    viewPosition,
    zoom,
    isPanning,
    hoveredShapeId,
    connectionState,
    addShape,
    updateShape,
    updateShapes,
    moveSelectedShapes,
    selectShape,
    selectConnector,
    clearSelection,
    setViewPosition,
    setZoom,
    setPanning,
    setTool,
    setHoveredShape,
    startConnection,
    updateConnection,
    endConnection,
    cancelConnection,
    deleteSelectedShapes,
    deleteSelectedConnectors,
    quickCreateConnectedShape,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    saveToHistory,
  } = useDiagramStore();

  // Track drag start positions for multi-select drag
  const dragStartRef = useRef<{ shapeId: string; startX: number; startY: number } | null>(null);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const nodes = selectedShapeIds
      .map((id) => stageRef.current?.findOne(`#shape-${id}`))
      .filter(Boolean) as Konva.Node[];

    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedShapeIds, shapes]);

  // Get undo/redo/copy/paste/duplicate/selectAll from store
  const { undo, redo, copy, paste, duplicate, selectAll } = useDiagramStore();

  // Handle keyboard shortcuts (Lucidchart-like)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input
      if (document.activeElement?.tagName === 'INPUT') return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Escape - cancel connection or clear selection
      if (e.key === 'Escape') {
        if (connectionState.isConnecting) {
          cancelConnection();
        } else {
          clearSelection();
        }
        return;
      }

      // Delete/Backspace - delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedShapes();
        deleteSelectedConnectors();
        return;
      }

      // Ctrl/Cmd + Z - Undo
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
      if ((isMeta && e.key === 'z' && e.shiftKey) || (isMeta && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl/Cmd + C - Copy
      if (isMeta && e.key === 'c') {
        e.preventDefault();
        copy();
        return;
      }

      // Ctrl/Cmd + V - Paste
      if (isMeta && e.key === 'v') {
        e.preventDefault();
        paste();
        return;
      }

      // Ctrl/Cmd + D - Duplicate
      if (isMeta && e.key === 'd') {
        e.preventDefault();
        duplicate();
        return;
      }

      // Ctrl/Cmd + A - Select All
      if (isMeta && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // Arrow keys - nudge selected shapes
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedShapeIds.length > 0) {
          e.preventDefault();
          const nudgeAmount = e.shiftKey ? 10 : (settings.snapToGrid ? settings.gridSize : 1);
          let dx = 0, dy = 0;
          switch (e.key) {
            case 'ArrowUp': dy = -nudgeAmount; break;
            case 'ArrowDown': dy = nudgeAmount; break;
            case 'ArrowLeft': dx = -nudgeAmount; break;
            case 'ArrowRight': dx = nudgeAmount; break;
          }
          moveSelectedShapes(dx, dy);
          saveToHistory();
        }
        return;
      }

      // Cmd/Ctrl + ] - Bring forward
      if (isMeta && e.key === ']') {
        e.preventDefault();
        if (selectedShapeIds.length === 1) {
          bringForward(selectedShapeIds[0]);
        }
        return;
      }

      // Cmd/Ctrl + [ - Send backward
      if (isMeta && e.key === '[') {
        e.preventDefault();
        if (selectedShapeIds.length === 1) {
          sendBackward(selectedShapeIds[0]);
        }
        return;
      }

      // Cmd/Ctrl + Shift + ] - Bring to front
      if (isMeta && e.shiftKey && e.key === '}') {
        e.preventDefault();
        if (selectedShapeIds.length === 1) {
          bringToFront(selectedShapeIds[0]);
        }
        return;
      }

      // Cmd/Ctrl + Shift + [ - Send to back
      if (isMeta && e.shiftKey && e.key === '{') {
        e.preventDefault();
        if (selectedShapeIds.length === 1) {
          sendToBack(selectedShapeIds[0]);
        }
        return;
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') {
        setTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setTool('pan');
      } else if (e.key === 'c' && !isMeta) {
        setTool('connector');
      } else if (e.key === 'r' || e.key === 'R') {
        setTool('rectangle');
      } else if (e.key === 'o' || e.key === 'O') {
        setTool('circle');
      } else if (e.key === 'd' && !isMeta) {
        setTool('diamond');
      } else if (e.key === 't' || e.key === 'T') {
        setTool('text');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectionState.isConnecting, cancelConnection, clearSelection, deleteSelectedShapes, deleteSelectedConnectors, undo, redo, copy, paste, duplicate, selectAll, setTool, selectedShapeIds, settings, moveSelectedShapes, saveToHistory, bringForward, sendBackward, bringToFront, sendToBack]);

  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return {
      x: (pos.x - viewPosition.x) / zoom,
      y: (pos.y - viewPosition.y) / zoom,
    };
  }, [viewPosition, zoom]);

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        if (connectionState.isConnecting) {
          cancelConnection();
        } else if (activeTool === 'select') {
          clearSelection();
        } else if (activeTool !== 'pan' && activeTool !== 'connector') {
          const pos = getPointerPosition();
          addShape(activeTool, pos.x, pos.y);
          setTool('select');
        }
      }
    },
    [activeTool, connectionState.isConnecting, addShape, clearSelection, setTool, cancelConnection, getPointerPosition]
  );

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (connectionState.isConnecting) {
        const pos = getPointerPosition();
        updateConnection(pos.x, pos.y);
      }
    },
    [connectionState.isConnecting, updateConnection, getPointerPosition]
  );

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.1;
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.1, Math.min(3, newScale));

      const mousePointTo = {
        x: (pointer.x - viewPosition.x) / oldScale,
        y: (pointer.y - viewPosition.y) / oldScale,
      };

      setZoom(clampedScale);
      setViewPosition(
        pointer.x - mousePointTo.x * clampedScale,
        pointer.y - mousePointTo.y * clampedScale
      );
    },
    [zoom, viewPosition, setZoom, setViewPosition]
  );

  const handleStageDrag = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (activeTool === 'pan') {
        setViewPosition(e.target.x(), e.target.y());
      }
    },
    [activeTool, setViewPosition]
  );

  const handleAnchorClick = useCallback(
    (shapeId: string, anchor: AnchorPosition, x: number, y: number) => {
      if (connectionState.isConnecting) {
        // Complete existing connection
        endConnection(shapeId, anchor);
      } else if (activeTool === 'connector') {
        // Connector tool: start drag-to-connect flow
        startConnection(shapeId, anchor, x, y);
      } else if (activeTool === 'select') {
        // Select tool: quick-create connected shape (Lucidchart-style)
        quickCreateConnectedShape(shapeId, anchor);
      }
    },
    [connectionState.isConnecting, activeTool, startConnection, endConnection, quickCreateConnectedShape]
  );

  // Render anchor points for a shape
  // anchorOffset: if the shape group is positioned, we need relative coords
  const renderAnchors = (shape: Shape, useRelativeCoords = false) => {
    const showAnchors =
      activeTool === 'connector' ||
      selectedShapeIds.includes(shape.id) ||
      hoveredShapeId === shape.id ||
      connectionState.isConnecting;

    if (!showAnchors) return null;

    const anchors = getShapeAnchors(shape);

    return anchors.map((anchor) => {
      const x = useRelativeCoords ? anchor.x - shape.x : anchor.x;
      const y = useRelativeCoords ? anchor.y - shape.y : anchor.y;

      return (
        <Circle
          key={`anchor-${shape.id}-${anchor.position}`}
          x={x}
          y={y}
          radius={ANCHOR_RADIUS}
          fill={connectionState.isConnecting ? '#22c55e' : '#3b82f6'}
          stroke="#fff"
          strokeWidth={2}
          hitStrokeWidth={ANCHOR_HIT_RADIUS}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            handleAnchorClick(shape.id, anchor.position, anchor.x, anchor.y);
          }}
          onMouseUp={(e) => {
            e.cancelBubble = true;
            if (connectionState.isConnecting && connectionState.fromShapeId !== shape.id) {
              endConnection(shape.id, anchor.position);
            }
          }}
          style={{ cursor: 'crosshair' }}
        />
      );
    });
  };

  const renderShape = (shape: Shape) => {
    const isSelected = selectedShapeIds.includes(shape.id);

    // Common handlers for all shapes - applied to the outer Group
    const handleClick = (e: KonvaEventObject<MouseEvent>) => {
      if (connectionState.isConnecting) return;
      e.cancelBubble = true;
      selectShape(shape.id, e.evt.shiftKey);
    };

    // Track drag start for multi-select
    const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      dragStartRef.current = {
        shapeId: shape.id,
        startX: node.x(),
        startY: node.y(),
      };
    };

    // Real-time position update during drag (for connector live updates)
    // Supports multi-select: moves all selected shapes together
    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const currentX = node.x();
      const currentY = node.y();

      if (selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id) && dragStartRef.current) {
        // Multi-select drag: calculate delta and move all selected shapes
        const dx = currentX - dragStartRef.current.startX;
        const dy = currentY - dragStartRef.current.startY;

        // Update all selected shapes
        const updates = selectedShapeIds.map(id => {
          const s = shapes.find(sh => sh.id === id);
          if (!s) return null;
          if (id === shape.id) {
            return { id, changes: { x: currentX, y: currentY } };
          }
          return { id, changes: { x: s.x + dx, y: s.y + dy } };
        }).filter(Boolean) as { id: string; changes: Partial<Shape> }[];

        updateShapes(updates);

        // Update drag start reference for next delta calculation
        dragStartRef.current.startX = currentX;
        dragStartRef.current.startY = currentY;
      } else {
        // Single shape drag
        updateShape(shape.id, { x: currentX, y: currentY });
      }
    };

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      const { snapToGrid, saveToHistory } = useDiagramStore.getState();
      const node = e.target;

      if (selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id)) {
        // Multi-select: snap all selected shapes to grid
        const snapped = snapToGrid(node.x(), node.y());
        const dx = snapped.x - node.x();
        const dy = snapped.y - node.y();

        const updates = selectedShapeIds.map(id => {
          const s = shapes.find(sh => sh.id === id);
          if (!s) return null;
          const snapPos = snapToGrid(s.x + dx, s.y + dy);
          return { id, changes: { x: snapPos.x, y: snapPos.y } };
        }).filter(Boolean) as { id: string; changes: Partial<Shape> }[];

        updateShapes(updates);
        node.x(snapped.x);
        node.y(snapped.y);
      } else {
        // Single shape: snap to grid
        const snapped = snapToGrid(node.x(), node.y());
        updateShape(shape.id, { x: snapped.x, y: snapped.y });
        node.x(snapped.x);
        node.y(snapped.y);
      }

      dragStartRef.current = null;
      saveToHistory();
    };

    // Real-time size update during transform (for connector live updates)
    const handleTransform = (e: KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Calculate new dimensions
      const newWidth = Math.max(20, shape.width * scaleX);
      const newHeight = Math.max(20, shape.height * scaleY);

      // Reset scale immediately to prevent icon/text distortion
      node.scaleX(1);
      node.scaleY(1);

      // Update shape in real-time with new dimensions
      updateShape(shape.id, {
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
      });
    };

    const handleTransformEnd = (e: KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      updateShape(shape.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, shape.width * scaleX),
        height: Math.max(20, shape.height * scaleY),
        rotation: node.rotation(),
      });

      // Reset scale after applying to dimensions
      node.scaleX(1);
      node.scaleY(1);
    };

    const groupProps = {
      id: `shape-${shape.id}`,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      rotation: shape.rotation,
      draggable: activeTool === 'select' && !connectionState.isConnecting,
      onClick: handleClick,
      onMouseEnter: () => setHoveredShape(shape.id),
      onMouseLeave: () => setHoveredShape(null),
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onTransform: handleTransform,
      onTransformEnd: handleTransformEnd,
    };

    // Render K8s shapes
    if (isK8sShape(shape.type)) {
      const iconPath = getK8sIconPath(shape.type as K8sShapeType);
      const label = shape.label || K8S_LABELS[shape.type as K8sShapeType];

      return (
        <Group key={shape.id} {...groupProps}>
          <Rect
            width={shape.width}
            height={shape.height}
            fill="#fff"
            stroke={isSelected ? '#3b82f6' : shape.stroke}
            strokeWidth={isSelected ? 3 : shape.strokeWidth}
            cornerRadius={8}
            shadowColor="rgba(0,0,0,0.1)"
            shadowBlur={8}
            shadowOffset={{ x: 0, y: 2 }}
          />
          <Path
            data={iconPath}
            fill={shape.fill}
            x={shape.width / 2 - 24}
            y={10}
            scaleX={1}
            scaleY={1}
          />
          <Text
            text={label}
            x={0}
            y={shape.height - 20}
            width={shape.width}
            height={20}
            fontSize={11}
            fontStyle="bold"
            fill="#374151"
            align="center"
            verticalAlign="middle"
          />
          {renderAnchors(shape, true)}
        </Group>
      );
    }

    // Render basic shapes - all use Group with relative children
    switch (shape.type) {
      case 'rectangle':
        return (
          <Group key={shape.id} {...groupProps}>
            <Rect
              width={shape.width}
              height={shape.height}
              fill={shape.fill}
              stroke={isSelected ? '#3b82f6' : shape.stroke}
              strokeWidth={isSelected ? 3 : shape.strokeWidth}
              cornerRadius={4}
            />
            {renderAnchors(shape, true)}
          </Group>
        );

      case 'circle':
        return (
          <Group key={shape.id} {...groupProps}>
            <Circle
              x={shape.width / 2}
              y={shape.height / 2}
              radiusX={shape.width / 2}
              radiusY={shape.height / 2}
              fill={shape.fill}
              stroke={isSelected ? '#3b82f6' : shape.stroke}
              strokeWidth={isSelected ? 3 : shape.strokeWidth}
            />
            {renderAnchors(shape, true)}
          </Group>
        );

      case 'diamond':
        const points = [
          shape.width / 2, 0,
          shape.width, shape.height / 2,
          shape.width / 2, shape.height,
          0, shape.height / 2,
        ];
        return (
          <Group key={shape.id} {...groupProps}>
            <Line
              points={points}
              closed
              fill={shape.fill}
              stroke={isSelected ? '#3b82f6' : shape.stroke}
              strokeWidth={isSelected ? 3 : shape.strokeWidth}
            />
            {renderAnchors(shape, true)}
          </Group>
        );

      case 'text':
        return (
          <Group key={shape.id} {...groupProps}>
            <Rect
              width={shape.width}
              height={shape.height}
              fill="transparent"
            />
            <Text
              text={shape.text || 'Text'}
              fontSize={16}
              fill={shape.fill}
              width={shape.width}
              height={shape.height}
              align="center"
              verticalAlign="middle"
            />
            {renderAnchors(shape, true)}
          </Group>
        );

      default:
        return null;
    }
  };

  // Calculate optimal anchors based on relative shape positions
  const calculateOptimalAnchors = (
    fromX: number, fromY: number, fromWidth: number, fromHeight: number,
    toX: number, toY: number, toWidth: number, toHeight: number
  ): { fromAnchor: AnchorPosition; toAnchor: AnchorPosition } => {
    // Calculate shape centers
    const fromCenterX = fromX + fromWidth / 2;
    const fromCenterY = fromY + fromHeight / 2;
    const toCenterX = toX + toWidth / 2;
    const toCenterY = toY + toHeight / 2;

    // Calculate direction vector
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    // Determine primary direction (horizontal or vertical)
    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    let fromAnchor: AnchorPosition;
    let toAnchor: AnchorPosition;

    if (isHorizontal) {
      // Shapes are more horizontally separated
      if (dx > 0) {
        // To shape is to the right
        fromAnchor = 'right';
        toAnchor = 'left';
      } else {
        // To shape is to the left
        fromAnchor = 'left';
        toAnchor = 'right';
      }
    } else {
      // Shapes are more vertically separated
      if (dy > 0) {
        // To shape is below
        fromAnchor = 'bottom';
        toAnchor = 'top';
      } else {
        // To shape is above
        fromAnchor = 'top';
        toAnchor = 'bottom';
      }
    }

    return { fromAnchor, toAnchor };
  };

  // Calculate anchor point coordinates with rotation support
  const getAnchorCoords = (
    x: number, y: number, width: number, height: number, anchor: AnchorPosition, rotation: number = 0
  ): { x: number; y: number } => {
    // Calculate anchor position relative to shape top-left
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

    // If no rotation, return the simple coordinates
    if (rotation === 0) {
      return { x: anchorX, y: anchorY };
    }

    // Apply rotation transformation around shape center
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const angleRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const rotatedX = centerX + (anchorX - centerX) * cos - (anchorY - centerY) * sin;
    const rotatedY = centerY + (anchorX - centerX) * sin + (anchorY - centerY) * cos;

    return { x: rotatedX, y: rotatedY };
  };

  // Generate smart elbow path that avoids going through shapes
  const generateElbowPath = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    fromAnchor: AnchorPosition,
    toAnchor: AnchorPosition
  ): number[] => {
    const MIN_MARGIN = 20; // Minimum distance from shape edges

    // Calculate distance between endpoints
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // For very close shapes (less than 2x margin), use straight line
    if (dx < MIN_MARGIN * 2 && dy < MIN_MARGIN * 2) {
      return [from.x, from.y, to.x, to.y];
    }

    // Calculate adaptive margin based on available space
    const adaptiveMarginX = Math.min(MIN_MARGIN, dx / 4);
    const adaptiveMarginY = Math.min(MIN_MARGIN, dy / 4);

    // For horizontal anchors (left/right)
    if (fromAnchor === 'left' || fromAnchor === 'right') {
      if (toAnchor === 'left' || toAnchor === 'right') {
        // Both horizontal - use midpoint
        const midX = (from.x + to.x) / 2;

        // Check if shapes are very close horizontally
        if (Math.abs(from.x - to.x) < MIN_MARGIN * 2) {
          // Route around by going up/down first
          const offsetY = from.y < to.y ? -MIN_MARGIN : MIN_MARGIN;
          const routeY = Math.min(from.y, to.y) + offsetY;
          return [from.x, from.y, from.x, routeY, to.x, routeY, to.x, to.y];
        }

        return [from.x, from.y, midX, from.y, midX, to.y, to.x, to.y];
      } else {
        // From horizontal, to vertical
        const extendX = fromAnchor === 'right'
          ? Math.max(from.x + adaptiveMarginX, to.x)
          : Math.min(from.x - adaptiveMarginX, to.x);
        return [from.x, from.y, extendX, from.y, extendX, to.y, to.x, to.y];
      }
    } else {
      // For vertical anchors (top/bottom)
      if (toAnchor === 'top' || toAnchor === 'bottom') {
        // Both vertical - use midpoint
        const midY = (from.y + to.y) / 2;

        // Check if shapes are very close vertically
        if (Math.abs(from.y - to.y) < MIN_MARGIN * 2) {
          // Route around by going left/right first
          const offsetX = from.x < to.x ? -MIN_MARGIN : MIN_MARGIN;
          const routeX = Math.min(from.x, to.x) + offsetX;
          return [from.x, from.y, routeX, from.y, routeX, to.y, to.x, to.y];
        }

        return [from.x, from.y, from.x, midY, to.x, midY, to.x, to.y];
      } else {
        // From vertical, to horizontal
        const extendY = fromAnchor === 'bottom'
          ? Math.max(from.y + adaptiveMarginY, to.y)
          : Math.min(from.y - adaptiveMarginY, to.y);
        return [from.x, from.y, from.x, extendY, to.x, extendY, to.x, to.y];
      }
    }
  };

  const renderConnector = (connector: Connector) => {
    const fromShape = shapes.find((s) => s.id === connector.fromShapeId);
    const toShape = shapes.find((s) => s.id === connector.toShapeId);

    if (!fromShape || !toShape) return null;

    // Get actual node positions from Konva stage for real-time accuracy during drag
    const stage = stageRef.current;
    let fromX = fromShape.x;
    let fromY = fromShape.y;
    let toX = toShape.x;
    let toY = toShape.y;

    if (stage) {
      const fromNode = stage.findOne(`#shape-${connector.fromShapeId}`);
      const toNode = stage.findOne(`#shape-${connector.toShapeId}`);

      if (fromNode) {
        fromX = fromNode.x();
        fromY = fromNode.y();
      }
      if (toNode) {
        toX = toNode.x();
        toY = toNode.y();
      }
    }

    // Get rotation values (also check Konva nodes for current rotation during transform)
    let fromRotation = fromShape.rotation || 0;
    let toRotation = toShape.rotation || 0;

    if (stage) {
      const fromNode = stage.findOne(`#shape-${connector.fromShapeId}`);
      const toNode = stage.findOne(`#shape-${connector.toShapeId}`);
      if (fromNode) {
        fromRotation = fromNode.rotation() || 0;
      }
      if (toNode) {
        toRotation = toNode.rotation() || 0;
      }
    }

    // Calculate optimal anchors based on current positions (dynamic routing)
    const { fromAnchor, toAnchor } = calculateOptimalAnchors(
      fromX, fromY, fromShape.width, fromShape.height,
      toX, toY, toShape.width, toShape.height
    );

    // Calculate anchor point coordinates with rotation
    const from = getAnchorCoords(fromX, fromY, fromShape.width, fromShape.height, fromAnchor, fromRotation);
    const to = getAnchorCoords(toX, toY, toShape.width, toShape.height, toAnchor, toRotation);

    const isSelected = selectedConnectorIds.includes(connector.id);

    let points: number[] = [];

    if (connector.style === 'elbow') {
      points = generateElbowPath(from, to, fromAnchor, toAnchor);
    } else {
      // Straight line
      points = [from.x, from.y, to.x, to.y];
    }

    // Calculate label position (midpoint of connector)
    let labelX = (from.x + to.x) / 2;
    let labelY = (from.y + to.y) / 2;

    // For elbow connectors, use the middle segment's midpoint
    if (connector.style === 'elbow' && points.length >= 8) {
      // Middle segment is between points[2,3] and points[4,5]
      labelX = (points[2] + points[4]) / 2;
      labelY = (points[3] + points[5]) / 2;
    }

    return (
      <Group key={connector.id}>
        <Arrow
          points={points}
          stroke={isSelected ? '#3b82f6' : connector.stroke}
          strokeWidth={isSelected ? 3 : connector.strokeWidth}
          lineCap="round"
          lineJoin="round"
          pointerLength={connector.endArrow === 'arrow' ? 10 : 0}
          pointerWidth={connector.endArrow === 'arrow' ? 10 : 0}
          pointerAtBeginning={connector.startArrow === 'arrow'}
          onClick={(e) => {
            e.cancelBubble = true;
            selectConnector(connector.id, e.evt.shiftKey);
          }}
          hitStrokeWidth={10}
        />
        {connector.label && (
          <Group x={labelX} y={labelY}>
            <Rect
              x={-connector.label.length * 3.5 - 4}
              y={-10}
              width={connector.label.length * 7 + 8}
              height={20}
              fill="white"
              stroke={isSelected ? '#3b82f6' : '#e5e7eb'}
              strokeWidth={1}
              cornerRadius={4}
            />
            <Text
              text={connector.label}
              fontSize={12}
              fill="#374151"
              align="center"
              verticalAlign="middle"
              offsetX={connector.label.length * 3.5}
              offsetY={6}
            />
          </Group>
        )}
      </Group>
    );
  };

  const renderConnectionLine = () => {
    if (!connectionState.isConnecting || !connectionState.fromShapeId || !connectionState.fromAnchor) {
      return null;
    }

    const fromShape = shapes.find((s) => s.id === connectionState.fromShapeId);
    if (!fromShape) return null;

    // Get actual node position from Konva stage for real-time accuracy
    const stage = stageRef.current;
    let fromX = fromShape.x;
    let fromY = fromShape.y;

    if (stage) {
      const fromNode = stage.findOne(`#shape-${connectionState.fromShapeId}`);
      if (fromNode) {
        fromX = fromNode.x();
        fromY = fromNode.y();
      }
    }

    // Get rotation from Konva node for real-time accuracy
    let fromRotation = fromShape.rotation || 0;
    if (stage) {
      const fromNode = stage.findOne(`#shape-${connectionState.fromShapeId}`);
      if (fromNode) {
        fromRotation = fromNode.rotation() || 0;
      }
    }

    // Calculate anchor point using actual node position with rotation
    const from = getAnchorCoords(
      fromX, fromY, fromShape.width, fromShape.height,
      connectionState.fromAnchor, fromRotation
    );

    return (
      <Line
        points={[from.x, from.y, connectionState.currentX, connectionState.currentY]}
        stroke="#3b82f6"
        strokeWidth={2}
        dash={[5, 5]}
        lineCap="round"
      />
    );
  };

  const renderGrid = () => {
    if (!settings.gridEnabled) return null;

    const gridLines = [];
    const { gridSize } = settings;
    const stageWidth = width / zoom + Math.abs(viewPosition.x / zoom) + 200;
    const stageHeight = height / zoom + Math.abs(viewPosition.y / zoom) + 200;
    const startX = Math.floor(-viewPosition.x / zoom / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-viewPosition.y / zoom / gridSize) * gridSize - gridSize;

    for (let x = startX; x < stageWidth + startX; x += gridSize) {
      gridLines.push(
        <Line
          key={`v-${x}`}
          points={[x, startY, x, stageHeight + startY]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      );
    }

    for (let y = startY; y < stageHeight + startY; y += gridSize) {
      gridLines.push(
        <Line
          key={`h-${y}`}
          points={[startX, y, stageWidth + startX, y]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      );
    }

    return <>{gridLines}</>;
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={viewPosition.x}
      y={viewPosition.y}
      draggable={activeTool === 'pan'}
      onClick={handleStageClick}
      onMouseMove={handleStageMouseMove}
      onWheel={handleWheel}
      onDragStart={() => activeTool === 'pan' && setPanning(true)}
      onDragEnd={() => setPanning(false)}
      onDragMove={handleStageDrag}
      style={{
        backgroundColor: settings.backgroundColor,
        cursor: connectionState.isConnecting
          ? 'crosshair'
          : activeTool === 'pan'
          ? isPanning
            ? 'grabbing'
            : 'grab'
          : activeTool === 'connector'
          ? 'crosshair'
          : 'default',
      }}
    >
      <Layer>
        {renderGrid()}
        {connectors.map(renderConnector)}
        {renderConnectionLine()}
        {shapes.map(renderShape)}
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}
