import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Transformer, Group, Arrow, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useDiagramStore } from '../store';
import {
  Shape,
  Connector,
  AnchorPosition,
  getShapeAnchors,
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

// Selection box state
interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Context menu state
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  isCanvasMenu: boolean;
}

export function Canvas({ width, height, stageRef: externalStageRef }: CanvasProps) {
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;
  const transformerRef = useRef<Konva.Transformer>(null);
  const textEditRef = useRef<HTMLTextAreaElement>(null);

  // Local UI state
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, isCanvasMenu: false });
  const [isAltDragging, setIsAltDragging] = useState(false);

  // Track previous tool for spacebar pan
  const previousToolRef = useRef<string>('select');

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
    selectShapes,
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
    copy,
    paste,
    duplicate,
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

  // Get undo/redo/selectAll from store
  const { undo, redo, selectAll } = useDiagramStore();

  // Calculate fit to screen zoom and position
  const fitToScreen = useCallback(() => {
    if (shapes.length === 0) {
      setZoom(1);
      setViewPosition(0, 0);
      return;
    }

    // Calculate bounding box of all shapes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(shape => {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 50;

    // Calculate zoom to fit
    const zoomX = (width - padding * 2) / contentWidth;
    const zoomY = (height - padding * 2) / contentHeight;
    const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.1), 1);

    // Center content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newViewX = width / 2 - centerX * newZoom;
    const newViewY = height / 2 - centerY * newZoom;

    setZoom(newZoom);
    setViewPosition(newViewX, newViewY);
  }, [shapes, width, height, setZoom, setViewPosition]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if editing text
      if (editingShapeId || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          setEditingShapeId(null);
        }
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Spacebar - temporary pan mode
      if (e.code === 'Space' && !isSpaceDown && !isMeta) {
        e.preventDefault();
        setIsSpaceDown(true);
        previousToolRef.current = activeTool;
        return;
      }

      // Escape or minus - cancel connection, clear selection, or close context menu
      if (e.key === 'Escape' || (e.key === '-' && !isMeta)) {
        if (contextMenu.visible) {
          setContextMenu({ ...contextMenu, visible: false });
        } else if (connectionState.isConnecting) {
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

      // Ctrl/Cmd + X - Cut
      if (isMeta && e.key === 'x') {
        e.preventDefault();
        copy();
        deleteSelectedShapes();
        deleteSelectedConnectors();
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

      // Ctrl/Cmd + 0 - Reset zoom to 100%
      if (isMeta && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        return;
      }

      // Ctrl/Cmd + = - Zoom in
      if (isMeta && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(Math.min(zoom * 1.2, 3));
        return;
      }

      // Ctrl/Cmd + - - Zoom out
      if (isMeta && e.key === '-') {
        e.preventDefault();
        setZoom(Math.max(zoom / 1.2, 0.1));
        return;
      }

      // Ctrl/Cmd + 1 - Fit to screen
      if (isMeta && e.key === '1') {
        e.preventDefault();
        fitToScreen();
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

      // Enter - edit text of selected shape
      if (e.key === 'Enter' && selectedShapeIds.length === 1) {
        const shape = shapes.find(s => s.id === selectedShapeIds[0]);
        if (shape) {
          e.preventDefault();
          startTextEditing(shape);
        }
        return;
      }

      // Tool shortcuts (only when not holding modifier keys)
      if (!isMeta) {
        if (e.key === 'v' || e.key === 'V') {
          setTool('select');
        } else if (e.key === 'h' || e.key === 'H') {
          setTool('pan');
        } else if (e.key === 'c') {
          setTool('connector');
        } else if (e.key === 'r' || e.key === 'R') {
          setTool('rectangle');
        } else if (e.key === 'o' || e.key === 'O') {
          setTool('circle');
        } else if (e.key === 'd') {
          setTool('diamond');
        } else if (e.key === 't' || e.key === 'T') {
          setTool('text');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpaceDown) {
        setIsSpaceDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [connectionState.isConnecting, cancelConnection, clearSelection, deleteSelectedShapes, deleteSelectedConnectors, undo, redo, copy, paste, duplicate, selectAll, setTool, selectedShapeIds, settings, moveSelectedShapes, saveToHistory, bringForward, sendBackward, bringToFront, sendToBack, zoom, setZoom, fitToScreen, isSpaceDown, activeTool, contextMenu, editingShapeId, shapes]);

  // Start text editing
  const startTextEditing = useCallback((shape: Shape) => {
    setEditingShapeId(shape.id);
    setEditingText(shape.text || shape.label || '');
    setTimeout(() => {
      textEditRef.current?.focus();
      textEditRef.current?.select();
    }, 0);
  }, []);

  // Finish text editing
  const finishTextEditing = useCallback(() => {
    if (editingShapeId) {
      updateShape(editingShapeId, { text: editingText, label: editingText });
      saveToHistory();
      setEditingShapeId(null);
      setEditingText('');
    }
  }, [editingShapeId, editingText, updateShape, saveToHistory]);

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

  // Handle stage mouse down for selection box
  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Close context menu
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }

      // Right click - show context menu
      if (e.evt.button === 2) {
        e.evt.preventDefault();
        const pos = { x: e.evt.clientX, y: e.evt.clientY };
        const isOnCanvas = e.target === e.target.getStage();
        setContextMenu({
          visible: true,
          x: pos.x,
          y: pos.y,
          isCanvasMenu: isOnCanvas,
        });
        return;
      }

      // Middle click - start pan
      if (e.evt.button === 1) {
        e.evt.preventDefault();
        setPanning(true);
        return;
      }

      // Start selection box on empty canvas
      if (e.target === e.target.getStage() && activeTool === 'select' && !isSpaceDown) {
        const pos = getPointerPosition();
        setSelectionBox({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
        setIsSelecting(true);
      }
    },
    [activeTool, getPointerPosition, isSpaceDown, contextMenu, setPanning]
  );

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        if (connectionState.isConnecting) {
          cancelConnection();
        } else if (activeTool === 'select' && !isSelecting) {
          clearSelection();
        } else if (activeTool !== 'pan' && activeTool !== 'connector' && activeTool !== 'select') {
          const pos = getPointerPosition();
          addShape(activeTool, pos.x, pos.y);
          setTool('select');
        }
      }
    },
    [activeTool, connectionState.isConnecting, addShape, clearSelection, setTool, cancelConnection, getPointerPosition, isSelecting]
  );

  // Handle double click for text editing
  const handleStageDblClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        // Double click on empty canvas - create text box
        const pos = getPointerPosition();
        const newShape = addShape('text', pos.x, pos.y);
        selectShape(newShape.id, false);
        startTextEditing(newShape);
      }
    },
    [getPointerPosition, addShape, selectShape, startTextEditing]
  );

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Update selection box
      if (isSelecting && selectionBox) {
        const pos = getPointerPosition();
        setSelectionBox({ ...selectionBox, endX: pos.x, endY: pos.y });
      }

      // Spacebar pan
      if (isSpaceDown && e.evt.buttons === 1) {
        setViewPosition(
          viewPosition.x + e.evt.movementX,
          viewPosition.y + e.evt.movementY
        );
        return;
      }

      // Middle mouse pan
      if (e.evt.buttons === 4) {
        setViewPosition(
          viewPosition.x + e.evt.movementX,
          viewPosition.y + e.evt.movementY
        );
        return;
      }

      if (connectionState.isConnecting) {
        const pos = getPointerPosition();
        updateConnection(pos.x, pos.y);
      }
    },
    [connectionState.isConnecting, updateConnection, getPointerPosition, isSelecting, selectionBox, isSpaceDown, viewPosition, setViewPosition]
  );

  const handleStageMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Finish selection box
      if (isSelecting && selectionBox) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);

        // Only select if box has meaningful size
        if (maxX - minX > 5 || maxY - minY > 5) {
          // Find shapes that intersect with selection box
          const selectedIds = shapes.filter(shape => {
            return (
              shape.x < maxX &&
              shape.x + shape.width > minX &&
              shape.y < maxY &&
              shape.y + shape.height > minY
            );
          }).map(s => s.id);

          if (e.evt.shiftKey) {
            // Add to existing selection
            selectShapes([...new Set([...selectedShapeIds, ...selectedIds])]);
          } else {
            selectShapes(selectedIds);
          }
        }

        setSelectionBox(null);
        setIsSelecting(false);
      }

      // Stop middle mouse pan
      if (isPanning) {
        setPanning(false);
      }
    },
    [isSelecting, selectionBox, shapes, selectedShapeIds, selectShapes, isPanning, setPanning]
  );

  // Handle wheel for zoom and pan
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      // Pinch-to-zoom on trackpad sends ctrlKey=true
      // Regular scroll (two-finger) does not
      if (e.evt.ctrlKey) {
        // Zoom behavior (pinch or Ctrl+scroll)
        const oldScale = zoom;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const scaleBy = 1.05;
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
      } else if (e.evt.shiftKey) {
        // Shift + scroll = horizontal pan
        setViewPosition(
          viewPosition.x - e.evt.deltaY,
          viewPosition.y
        );
      } else {
        // Regular two-finger scroll = pan
        setViewPosition(
          viewPosition.x - e.evt.deltaX,
          viewPosition.y - e.evt.deltaY
        );
      }
    },
    [zoom, viewPosition, setZoom, setViewPosition]
  );

  const handleStageDrag = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (activeTool === 'pan' || isSpaceDown) {
        setViewPosition(e.target.x(), e.target.y());
      }
    },
    [activeTool, setViewPosition, isSpaceDown]
  );

  const handleAnchorClick = useCallback(
    (shapeId: string, anchor: AnchorPosition, x: number, y: number) => {
      if (connectionState.isConnecting) {
        endConnection(shapeId, anchor);
      } else if (activeTool === 'connector') {
        startConnection(shapeId, anchor, x, y);
      } else if (activeTool === 'select') {
        quickCreateConnectedShape(shapeId, anchor);
      }
    },
    [connectionState.isConnecting, activeTool, startConnection, endConnection, quickCreateConnectedShape]
  );

  // Render anchor points with zoom-aware hit detection
  const renderAnchors = (shape: Shape, useRelativeCoords = false) => {
    const showAnchors =
      activeTool === 'connector' ||
      selectedShapeIds.includes(shape.id) ||
      hoveredShapeId === shape.id ||
      connectionState.isConnecting;

    if (!showAnchors) return null;

    const anchors = getShapeAnchors(shape);

    // Scale anchor size inversely with zoom for consistent hit detection
    const scaledRadius = Math.max(ANCHOR_RADIUS, ANCHOR_RADIUS / zoom);
    const scaledHitRadius = Math.max(ANCHOR_HIT_RADIUS, ANCHOR_HIT_RADIUS / zoom);

    return anchors.map((anchor) => {
      const x = useRelativeCoords ? anchor.x - shape.x : anchor.x;
      const y = useRelativeCoords ? anchor.y - shape.y : anchor.y;

      return (
        <Circle
          key={`anchor-${shape.id}-${anchor.position}`}
          x={x}
          y={y}
          radius={scaledRadius}
          fill={connectionState.isConnecting ? '#22c55e' : '#3b82f6'}
          stroke="#fff"
          strokeWidth={2}
          hitStrokeWidth={scaledHitRadius}
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
    const isEditing = editingShapeId === shape.id;

    const handleClick = (e: KonvaEventObject<MouseEvent>) => {
      if (connectionState.isConnecting) return;
      e.cancelBubble = true;

      // If shape is already selected and part of multi-selection, don't change selection
      // This allows dragging multiple selected shapes without deselecting them
      if (isSelected && selectedShapeIds.length > 1 && !e.evt.shiftKey) {
        return;
      }

      selectShape(shape.id, e.evt.shiftKey);
    };

    const handleDblClick = (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      startTextEditing(shape);
    };

    const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;

      // Alt+drag to duplicate
      if (e.evt.altKey && !isAltDragging) {
        setIsAltDragging(true);
        // We'll handle this through the store's duplicate functionality
        duplicate();
        return;
      }

      // Get fresh state to check if shape is currently selected
      const { selectedShapeIds: currentSelectedIds } = useDiagramStore.getState();
      const isCurrentlySelected = currentSelectedIds.includes(shape.id);

      // If dragging a shape that's not selected, select it first
      // (unless shift is held, then add to selection)
      if (!isCurrentlySelected) {
        selectShape(shape.id, e.evt.shiftKey);
      }

      dragStartRef.current = {
        shapeId: shape.id,
        startX: node.x(),
        startY: node.y(),
      };
    };

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const currentX = node.x();
      const currentY = node.y();

      // Get fresh state to avoid stale closure issues
      const { selectedShapeIds: currentSelectedIds, shapes: currentShapes } = useDiagramStore.getState();

      if (currentSelectedIds.length > 1 && currentSelectedIds.includes(shape.id) && dragStartRef.current) {
        const dx = currentX - dragStartRef.current.startX;
        const dy = currentY - dragStartRef.current.startY;

        const updates = currentSelectedIds.map(id => {
          const s = currentShapes.find(sh => sh.id === id);
          if (!s) return null;
          if (id === shape.id) {
            return { id, changes: { x: currentX, y: currentY } };
          }
          return { id, changes: { x: s.x + dx, y: s.y + dy } };
        }).filter(Boolean) as { id: string; changes: Partial<Shape> }[];

        updateShapes(updates);
        dragStartRef.current.startX = currentX;
        dragStartRef.current.startY = currentY;
      } else {
        updateShape(shape.id, { x: currentX, y: currentY });
      }
    };

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
      const { snapToGrid, saveToHistory, selectedShapeIds: currentSelectedIds, shapes: currentShapes } = useDiagramStore.getState();
      const node = e.target;

      if (currentSelectedIds.length > 1 && currentSelectedIds.includes(shape.id)) {
        const snapped = snapToGrid(node.x(), node.y());
        const dx = snapped.x - node.x();
        const dy = snapped.y - node.y();

        const updates = currentSelectedIds.map(id => {
          const s = currentShapes.find(sh => sh.id === id);
          if (!s) return null;
          const snapPos = snapToGrid(s.x + dx, s.y + dy);
          return { id, changes: { x: snapPos.x, y: snapPos.y } };
        }).filter(Boolean) as { id: string; changes: Partial<Shape> }[];

        updateShapes(updates);
        node.x(snapped.x);
        node.y(snapped.y);
      } else {
        const snapped = snapToGrid(node.x(), node.y());
        updateShape(shape.id, { x: snapped.x, y: snapped.y });
        node.x(snapped.x);
        node.y(snapped.y);
      }

      dragStartRef.current = null;
      setIsAltDragging(false);
      saveToHistory();
    };

    const handleTransform = (e: KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      const newWidth = Math.max(20, shape.width * scaleX);
      const newHeight = Math.max(20, shape.height * scaleY);

      node.scaleX(1);
      node.scaleY(1);

      // Get rotation
      const rotation = node.rotation();

      updateShape(shape.id, {
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        rotation,
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

      node.scaleX(1);
      node.scaleY(1);
      saveToHistory();
    };

    const groupProps = {
      id: `shape-${shape.id}`,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      rotation: shape.rotation,
      draggable: activeTool === 'select' && !connectionState.isConnecting && !isSpaceDown,
      onClick: handleClick,
      onDblClick: handleDblClick,
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
          {!isEditing && (
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
          )}
          {renderAnchors(shape, true)}
        </Group>
      );
    }

    // Render basic shapes
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
            {shape.text && !isEditing && (
              <Text
                text={shape.text}
                x={0}
                y={0}
                width={shape.width}
                height={shape.height}
                fontSize={14}
                fill="#374151"
                align="center"
                verticalAlign="middle"
              />
            )}
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
            {shape.text && !isEditing && (
              <Text
                text={shape.text}
                x={0}
                y={0}
                width={shape.width}
                height={shape.height}
                fontSize={14}
                fill="#374151"
                align="center"
                verticalAlign="middle"
              />
            )}
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
            {shape.text && !isEditing && (
              <Text
                text={shape.text}
                x={0}
                y={0}
                width={shape.width}
                height={shape.height}
                fontSize={14}
                fill="#374151"
                align="center"
                verticalAlign="middle"
              />
            )}
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
              stroke={isSelected ? '#3b82f6' : 'transparent'}
              strokeWidth={isSelected ? 1 : 0}
              dash={[4, 4]}
            />
            {!isEditing && (
              <Text
                text={shape.text || 'Double-click to edit'}
                fontSize={16}
                fill={shape.text ? shape.fill : '#9ca3af'}
                width={shape.width}
                height={shape.height}
                align="center"
                verticalAlign="middle"
              />
            )}
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
    const fromCenterX = fromX + fromWidth / 2;
    const fromCenterY = fromY + fromHeight / 2;
    const toCenterX = toX + toWidth / 2;
    const toCenterY = toY + toHeight / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    let fromAnchor: AnchorPosition;
    let toAnchor: AnchorPosition;

    if (isHorizontal) {
      if (dx > 0) {
        fromAnchor = 'right';
        toAnchor = 'left';
      } else {
        fromAnchor = 'left';
        toAnchor = 'right';
      }
    } else {
      if (dy > 0) {
        fromAnchor = 'bottom';
        toAnchor = 'top';
      } else {
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

  // Generate smart elbow path
  const generateElbowPath = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    fromAnchor: AnchorPosition,
    toAnchor: AnchorPosition
  ): number[] => {
    const MIN_MARGIN = 20;

    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

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

  const renderConnector = (connector: Connector) => {
    const fromShape = shapes.find((s) => s.id === connector.fromShapeId);
    const toShape = shapes.find((s) => s.id === connector.toShapeId);

    if (!fromShape || !toShape) return null;

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

    const { fromAnchor, toAnchor } = calculateOptimalAnchors(
      fromX, fromY, fromShape.width, fromShape.height,
      toX, toY, toShape.width, toShape.height
    );

    const from = getAnchorCoords(fromX, fromY, fromShape.width, fromShape.height, fromAnchor, fromRotation);
    const to = getAnchorCoords(toX, toY, toShape.width, toShape.height, toAnchor, toRotation);

    const isSelected = selectedConnectorIds.includes(connector.id);

    let points: number[] = [];

    if (connector.style === 'elbow') {
      points = generateElbowPath(from, to, fromAnchor, toAnchor);
    } else {
      points = [from.x, from.y, to.x, to.y];
    }

    let labelX = (from.x + to.x) / 2;
    let labelY = (from.y + to.y) / 2;

    if (connector.style === 'elbow' && points.length >= 8) {
      labelX = (points[2] + points[4]) / 2;
      labelY = (points[3] + points[5]) / 2;
    }

    // Scale hit area for low zoom
    const hitWidth = Math.max(10, 10 / zoom);

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
          onDblClick={(e) => {
            e.cancelBubble = true;
            // TODO: Edit connector label
          }}
          hitStrokeWidth={hitWidth}
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

    let fromRotation = fromShape.rotation || 0;
    if (stage) {
      const fromNode = stage.findOne(`#shape-${connectionState.fromShapeId}`);
      if (fromNode) {
        fromRotation = fromNode.rotation() || 0;
      }
    }

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

  // Render selection box
  const renderSelectionBox = () => {
    if (!selectionBox || !isSelecting) return null;

    const x = Math.min(selectionBox.startX, selectionBox.endX);
    const y = Math.min(selectionBox.startY, selectionBox.endY);
    const w = Math.abs(selectionBox.endX - selectionBox.startX);
    const h = Math.abs(selectionBox.endY - selectionBox.startY);

    return (
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3b82f6"
        strokeWidth={1}
        dash={[4, 4]}
      />
    );
  };

  // Get editing shape position for text overlay
  const getEditingShapeScreenPosition = () => {
    if (!editingShapeId || !stageRef.current) return null;
    const shape = shapes.find(s => s.id === editingShapeId);
    if (!shape) return null;

    return {
      x: shape.x * zoom + viewPosition.x,
      y: shape.y * zoom + viewPosition.y,
      width: shape.width * zoom,
      height: shape.height * zoom,
    };
  };

  const editingPos = getEditingShapeScreenPosition();

  // Determine cursor based on state
  const getCursor = () => {
    if (isSpaceDown) return isPanning ? 'grabbing' : 'grab';
    if (connectionState.isConnecting) return 'crosshair';
    if (activeTool === 'pan') return isPanning ? 'grabbing' : 'grab';
    if (activeTool === 'connector') return 'crosshair';
    if (isSelecting) return 'crosshair';

    // Show move cursor when hovering over selected shapes
    if (hoveredShapeId && selectedShapeIds.includes(hoveredShapeId)) {
      return 'move';
    }
    // Show pointer when hovering over any shape
    if (hoveredShapeId) {
      return 'pointer';
    }

    return 'default';
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={zoom}
        scaleY={zoom}
        x={viewPosition.x}
        y={viewPosition.y}
        draggable={activeTool === 'pan' || isSpaceDown}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        onDragStart={() => (activeTool === 'pan' || isSpaceDown) && setPanning(true)}
        onDragEnd={() => setPanning(false)}
        onDragMove={handleStageDrag}
        onContextMenu={(e) => e.evt.preventDefault()}
        style={{
          backgroundColor: settings.backgroundColor,
          cursor: getCursor(),
        }}
      >
        <Layer>
          {renderGrid()}
          {connectors.map(renderConnector)}
          {renderConnectionLine()}
          {shapes.map(renderShape)}
          {renderSelectionBox()}
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

      {/* Text editing overlay */}
      {editingShapeId && editingPos && (
        <textarea
          ref={textEditRef}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={finishTextEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditingShapeId(null);
              setEditingText('');
            } else if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              finishTextEditing();
            }
          }}
          style={{
            position: 'absolute',
            left: editingPos.x,
            top: editingPos.y,
            width: editingPos.width,
            height: editingPos.height,
            fontSize: 14 * zoom,
            fontFamily: 'inherit',
            textAlign: 'center',
            border: '2px solid #3b82f6',
            borderRadius: 4,
            padding: 4,
            resize: 'none',
            outline: 'none',
            background: 'white',
            zIndex: 1000,
          }}
        />
      )}

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 180,
            padding: '4px 0',
          }}
          onClick={() => setContextMenu({ ...contextMenu, visible: false })}
        >
          {contextMenu.isCanvasMenu ? (
            // Canvas context menu
            <>
              <ContextMenuItem label="Paste" shortcut="⌘V" onClick={() => paste()} />
              <ContextMenuItem label="Select All" shortcut="⌘A" onClick={() => selectAll()} />
              <ContextMenuDivider />
              <ContextMenuItem label="Fit to Screen" shortcut="⌘1" onClick={() => fitToScreen()} />
              <ContextMenuItem label="Reset Zoom" shortcut="⌘0" onClick={() => setZoom(1)} />
            </>
          ) : (
            // Shape context menu
            <>
              <ContextMenuItem label="Cut" shortcut="⌘X" onClick={() => { copy(); deleteSelectedShapes(); }} />
              <ContextMenuItem label="Copy" shortcut="⌘C" onClick={() => copy()} />
              <ContextMenuItem label="Paste" shortcut="⌘V" onClick={() => paste()} />
              <ContextMenuItem label="Duplicate" shortcut="⌘D" onClick={() => duplicate()} />
              <ContextMenuItem label="Delete" shortcut="⌫" onClick={() => { deleteSelectedShapes(); deleteSelectedConnectors(); }} />
              <ContextMenuDivider />
              <ContextMenuItem label="Bring to Front" shortcut="⌘⇧]" onClick={() => selectedShapeIds[0] && bringToFront(selectedShapeIds[0])} />
              <ContextMenuItem label="Bring Forward" shortcut="⌘]" onClick={() => selectedShapeIds[0] && bringForward(selectedShapeIds[0])} />
              <ContextMenuItem label="Send Backward" shortcut="⌘[" onClick={() => selectedShapeIds[0] && sendBackward(selectedShapeIds[0])} />
              <ContextMenuItem label="Send to Back" shortcut="⌘⇧[" onClick={() => selectedShapeIds[0] && sendToBack(selectedShapeIds[0])} />
              <ContextMenuDivider />
              <ContextMenuItem label="Edit Text" shortcut="Enter" onClick={() => {
                const shape = shapes.find(s => s.id === selectedShapeIds[0]);
                if (shape) startTextEditing(shape);
              }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Context menu components
function ContextMenuItem({ label, shortcut, onClick, disabled }: { label: string; shortcut?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? '#9ca3af' : '#374151',
        backgroundColor: 'transparent',
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <span>{label}</span>
      {shortcut && <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 24 }}>{shortcut}</span>}
    </div>
  );
}

function ContextMenuDivider() {
  return <div style={{ height: 1, backgroundColor: '#e5e7eb', margin: '4px 0' }} />;
}
