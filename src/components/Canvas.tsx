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
  } = useDiagramStore();

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
  }, [connectionState.isConnecting, cancelConnection, clearSelection, deleteSelectedShapes, deleteSelectedConnectors, undo, redo, copy, paste, duplicate, selectAll, setTool]);

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

    // Real-time position update during drag (for connector live updates)
    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      // Update shape position in real-time for connector updates
      updateShape(shape.id, {
        x: node.x(),
        y: node.y(),
      });
    };

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      const { snapToGrid } = useDiagramStore.getState();
      const snapped = snapToGrid(e.target.x(), e.target.y());
      updateShape(shape.id, { x: snapped.x, y: snapped.y });
      // Reset position to snapped values
      e.target.x(snapped.x);
      e.target.y(snapped.y);
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

  const renderConnector = (connector: Connector) => {
    const fromShape = shapes.find((s) => s.id === connector.fromShapeId);
    const toShape = shapes.find((s) => s.id === connector.toShapeId);

    if (!fromShape || !toShape) return null;

    // Get actual node positions from Konva stage for real-time accuracy during drag
    // This ensures connectors follow the visual position, not just the store position
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

    // Calculate anchor points using actual node positions
    const from = {
      x: fromX + (connector.fromAnchor === 'left' ? 0 : connector.fromAnchor === 'right' ? fromShape.width : fromShape.width / 2),
      y: fromY + (connector.fromAnchor === 'top' ? 0 : connector.fromAnchor === 'bottom' ? fromShape.height : fromShape.height / 2),
    };
    const to = {
      x: toX + (connector.toAnchor === 'left' ? 0 : connector.toAnchor === 'right' ? toShape.width : toShape.width / 2),
      y: toY + (connector.toAnchor === 'top' ? 0 : connector.toAnchor === 'bottom' ? toShape.height : toShape.height / 2),
    };
    const isSelected = selectedConnectorIds.includes(connector.id);

    let points: number[] = [];

    if (connector.style === 'elbow') {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;

      if (connector.fromAnchor === 'left' || connector.fromAnchor === 'right') {
        points = [from.x, from.y, midX, from.y, midX, to.y, to.x, to.y];
      } else {
        points = [from.x, from.y, from.x, midY, to.x, midY, to.x, to.y];
      }
    } else {
      points = [from.x, from.y, to.x, to.y];
    }

    return (
      <Arrow
        key={connector.id}
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

    // Calculate anchor point using actual node position
    const from = {
      x: fromX + (connectionState.fromAnchor === 'left' ? 0 : connectionState.fromAnchor === 'right' ? fromShape.width : fromShape.width / 2),
      y: fromY + (connectionState.fromAnchor === 'top' ? 0 : connectionState.fromAnchor === 'bottom' ? fromShape.height : fromShape.height / 2),
    };

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
