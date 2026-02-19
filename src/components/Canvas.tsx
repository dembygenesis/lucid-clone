import { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Transformer, Group } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useDiagramStore } from '../store';
import { Shape } from '../types';

interface CanvasProps {
  width: number;
  height: number;
}

export function Canvas({ width, height }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const {
    shapes,
    connectors,
    settings,
    selectedShapeIds,
    activeTool,
    viewPosition,
    zoom,
    isPanning,
    addShape,
    updateShape,
    selectShape,
    clearSelection,
    setViewPosition,
    setZoom,
    setPanning,
    setTool,
  } = useDiagramStore();

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const nodes = selectedShapeIds
      .map((id) => stageRef.current?.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedShapeIds, shapes]);

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Click on empty area
      if (e.target === e.target.getStage()) {
        if (activeTool === 'select') {
          clearSelection();
        } else if (['rectangle', 'circle', 'diamond', 'text'].includes(activeTool)) {
          const stage = e.target.getStage();
          const pointerPos = stage?.getPointerPosition();
          if (pointerPos) {
            const x = (pointerPos.x - viewPosition.x) / zoom;
            const y = (pointerPos.y - viewPosition.y) / zoom;
            addShape(activeTool as Shape['type'], x, y);
            setTool('select');
          }
        }
      }
    },
    [activeTool, viewPosition, zoom, addShape, clearSelection, setTool]
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

  const handleDragStart = useCallback(() => {
    if (activeTool === 'pan') {
      setPanning(true);
    }
  }, [activeTool, setPanning]);

  const handleDragEnd = useCallback(() => {
    setPanning(false);
  }, [setPanning]);

  const handleStageDrag = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (activeTool === 'pan' || e.evt.buttons === 4) {
        setViewPosition(e.target.x(), e.target.y());
      }
    },
    [activeTool, setViewPosition]
  );

  const renderShape = (shape: Shape) => {
    const isSelected = selectedShapeIds.includes(shape.id);

    const commonProps = {
      id: shape.id,
      x: shape.x,
      y: shape.y,
      rotation: shape.rotation,
      draggable: activeTool === 'select',
      onClick: (e: KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        selectShape(shape.id, e.evt.shiftKey);
      },
      onDragEnd: (e: KonvaEventObject<DragEvent>) => {
        const { snapToGrid } = useDiagramStore.getState();
        const snapped = snapToGrid(e.target.x(), e.target.y());
        updateShape(shape.id, { x: snapped.x, y: snapped.y });
      },
      onTransformEnd: (e: KonvaEventObject<Event>) => {
        const node = e.target;
        updateShape(shape.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(20, node.width() * node.scaleX()),
          height: Math.max(20, node.height() * node.scaleY()),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      },
    };

    switch (shape.type) {
      case 'rectangle':
        return (
          <Rect
            key={shape.id}
            {...commonProps}
            width={shape.width}
            height={shape.height}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            cornerRadius={4}
          />
        );

      case 'circle':
        return (
          <Circle
            key={shape.id}
            {...commonProps}
            x={shape.x + shape.width / 2}
            y={shape.y + shape.height / 2}
            radiusX={shape.width / 2}
            radiusY={shape.height / 2}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
          />
        );

      case 'diamond':
        const points = [
          shape.width / 2, 0,
          shape.width, shape.height / 2,
          shape.width / 2, shape.height,
          0, shape.height / 2,
        ];
        return (
          <Line
            key={shape.id}
            {...commonProps}
            points={points}
            closed
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
          />
        );

      case 'text':
        return (
          <Text
            key={shape.id}
            {...commonProps}
            text={shape.text || 'Text'}
            fontSize={16}
            fill={shape.fill}
            width={shape.width}
            height={shape.height}
            align="center"
            verticalAlign="middle"
          />
        );

      default:
        return null;
    }
  };

  const renderConnector = (connector: typeof connectors[0]) => {
    const fromShape = shapes.find((s) => s.id === connector.fromShapeId);
    const toShape = shapes.find((s) => s.id === connector.toShapeId);

    if (!fromShape || !toShape) return null;

    const getAnchorPoint = (shape: Shape, anchor: string) => {
      switch (anchor) {
        case 'top':
          return { x: shape.x + shape.width / 2, y: shape.y };
        case 'bottom':
          return { x: shape.x + shape.width / 2, y: shape.y + shape.height };
        case 'left':
          return { x: shape.x, y: shape.y + shape.height / 2 };
        case 'right':
          return { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
        default:
          return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
      }
    };

    const from = getAnchorPoint(fromShape, connector.fromAnchor);
    const to = getAnchorPoint(toShape, connector.toAnchor);

    return (
      <Line
        key={connector.id}
        points={[from.x, from.y, to.x, to.y]}
        stroke={connector.stroke}
        strokeWidth={connector.strokeWidth}
        lineCap="round"
        lineJoin="round"
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
      onWheel={handleWheel}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragMove={handleStageDrag}
      style={{
        backgroundColor: settings.backgroundColor,
        cursor: activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'default',
      }}
    >
      <Layer>
        {renderGrid()}
        {connectors.map(renderConnector)}
        {shapes.map(renderShape)}
        <Transformer
          ref={transformerRef}
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
