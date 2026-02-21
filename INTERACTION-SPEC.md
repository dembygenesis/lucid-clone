# Canvas Interaction Specification

A production-ready specification for zoom, pan, scroll, selection, and text editing behaviors matching Lucidchart standards.

---

## Table of Contents

1. [Navigation Modes](#1-navigation-modes)
2. [Zoom Behavior](#2-zoom-behavior)
3. [Pan/Scroll Behavior](#3-panscroll-behavior)
4. [Selection Behavior](#4-selection-behavior)
5. [Text Editing](#5-text-editing)
6. [Shape Manipulation](#6-shape-manipulation)
7. [Keyboard Shortcuts](#7-keyboard-shortcuts)
8. [Production Hardening](#8-production-hardening)
9. [Current Implementation Status](#9-current-implementation-status)
10. [Fixes Required](#10-fixes-required)

---

## 1. Navigation Modes

Lucidchart supports three navigation modes that change how mouse/trackpad inputs are interpreted.

### 1.1 Mouse Mode (Default for mouse users)
| Input | Action |
|-------|--------|
| Scroll wheel | Zoom in/out |
| Right-click + drag | Pan canvas |
| Middle-click + drag | Pan canvas |

### 1.2 Trackpad Mode (Default for trackpad users)
| Input | Action |
|-------|--------|
| Two-finger scroll | Pan canvas (up/down/left/right) |
| Pinch gesture | Zoom in/out |
| Two-finger click + drag | Pan canvas |

### 1.3 Auto Mode
- Automatically detects input device and switches between Mouse/Trackpad modes
- Can be unreliable with some devices

### Current Status: NOT IMPLEMENTED
We currently only have one mode that zooms on scroll wheel.

---

## 2. Zoom Behavior

### 2.1 Zoom to Mouse Pointer (CRITICAL)
**Expected:** Zoom should center on the mouse pointer position, keeping the point under the cursor stationary.

**Formula:**
```
newViewX = pointerX - (pointerX - oldViewX) * (newZoom / oldZoom)
newViewY = pointerY - (pointerY - oldViewY) * (newZoom / oldZoom)
```

**Current Status:** PARTIALLY WORKING - Has issues, doesn't feel right

### 2.2 Zoom Levels
| Control | Action |
|---------|--------|
| Scroll wheel up | Zoom in (1.1x per tick) |
| Scroll wheel down | Zoom out (0.9x per tick) |
| Pinch out | Zoom in (trackpad) |
| Pinch in | Zoom out (trackpad) |
| Cmd/Ctrl + 0 | Reset to 100% |
| Cmd/Ctrl + = | Zoom in |
| Cmd/Ctrl + - | Zoom out |
| Fit to Screen button | Fit all content in viewport |

**Zoom Range:** 10% to 300% (0.1 to 3.0)

### 2.3 Zoom Presets
| Shortcut | Zoom Level |
|----------|------------|
| Cmd/Ctrl + 0 | 100% (actual size) |
| Cmd/Ctrl + 1 | Fit to width |
| Cmd/Ctrl + 2 | Fit to page |

**Current Status:**
- Basic scroll zoom: YES
- Zoom to pointer: BROKEN
- Keyboard shortcuts: NOT IMPLEMENTED
- Fit to screen: NOT IMPLEMENTED

---

## 3. Pan/Scroll Behavior

### 3.1 Spacebar + Drag Pan
| Input | Action |
|-------|--------|
| Hold Space + Click + Drag | Pan canvas freely |
| Hold Space (release) | Return to previous tool |

**Current Status:** NOT IMPLEMENTED (we have pan tool but not spacebar temporary pan)

### 3.2 Two-Finger Scroll (Trackpad)
| Input | Action |
|-------|--------|
| Two-finger swipe up | Pan canvas up (content moves down) |
| Two-finger swipe down | Pan canvas down (content moves up) |
| Two-finger swipe left | Pan canvas left |
| Two-finger swipe right | Pan canvas right |

**Current Status:** NOT IMPLEMENTED - Currently zooms instead

### 3.3 Modifier Key Scroll
| Input | Action |
|-------|--------|
| Shift + Scroll | Pan horizontally |
| Ctrl/Cmd + Scroll | Zoom in/out |

**Current Status:** NOT IMPLEMENTED

### 3.4 Middle Mouse / Right-Click Pan
| Input | Action |
|-------|--------|
| Middle-click + drag | Pan canvas |
| Right-click + drag | Pan canvas |

**Current Status:** NOT IMPLEMENTED

---

## 4. Selection Behavior

### 4.1 Marquee/Box Selection
**Expected:** Click and drag on empty canvas area to draw a selection rectangle.

| Behavior | Description |
|----------|-------------|
| Touch selection | Any shape touched by the selection box is selected |
| Shift + marquee | Add to existing selection |
| Alt/Option + marquee | Subtract from selection |

**Current Status:** NOT IMPLEMENTED

### 4.2 Click Selection
| Input | Action |
|-------|--------|
| Click shape | Select shape (deselect others) |
| Shift + click shape | Toggle shape in selection |
| Cmd/Ctrl + click shape | Toggle shape in selection |
| Click empty area | Deselect all |

**Current Status:** IMPLEMENTED

### 4.3 Select All
| Input | Action |
|-------|--------|
| Cmd/Ctrl + A | Select all shapes and connectors |

**Current Status:** IMPLEMENTED

---

## 5. Text Editing

### 5.1 Double-Click to Edit
| Input | Action |
|-------|--------|
| Double-click shape | Enter text edit mode |
| Double-click empty canvas | Create text box at cursor |
| Double-click connector | Edit connector label |

**Current Status:** NOT IMPLEMENTED

### 5.2 Text Box Behavior
| Feature | Description |
|---------|-------------|
| Auto-resize | Text box grows with content |
| Min size | Maintains minimum clickable area |
| Word wrap | Wraps text within bounds |
| Escape | Exit text editing |
| Click outside | Exit text editing and save |

**Current Status:** Basic text shape exists, no inline editing

### 5.3 Rich Text Features
| Feature | Shortcut |
|---------|----------|
| Bold | Cmd/Ctrl + B |
| Italic | Cmd/Ctrl + I |
| Underline | Cmd/Ctrl + U |
| Font size | Properties panel |
| Font color | Properties panel |
| Alignment | Properties panel |

**Current Status:** NOT IMPLEMENTED

---

## 6. Shape Manipulation

### 6.1 Drag to Move
| Input | Action |
|-------|--------|
| Click + drag shape | Move shape |
| Click + drag selected shapes | Move all selected together |

**Current Status:** IMPLEMENTED

### 6.2 Alt/Option + Drag to Copy
| Input | Action |
|-------|--------|
| Alt/Option + drag | Duplicate shape and drag copy |

**Current Status:** NOT IMPLEMENTED

### 6.3 Resize
| Feature | Behavior |
|---------|----------|
| Corner handles | Resize proportionally |
| Edge handles | Resize single dimension |
| Shift + resize | Maintain aspect ratio |
| Alt + resize | Resize from center |

**Current Status:** IMPLEMENTED via Transformer

### 6.4 Rotate
| Feature | Behavior |
|---------|----------|
| Rotation handle | Rotate freely |
| Shift + rotate | Snap to 15-degree increments |

**Current Status:** PARTIALLY IMPLEMENTED (no snap)

---

## 7. Keyboard Shortcuts

### 7.1 Currently Implemented
| Shortcut | Action |
|----------|--------|
| V | Select tool |
| H | Pan tool |
| R | Rectangle tool |
| O | Circle/Ellipse tool |
| D | Diamond tool |
| T | Text tool |
| C | Connector tool |
| Delete/Backspace | Delete selected |
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Shift + Z | Redo |
| Cmd/Ctrl + C | Copy |
| Cmd/Ctrl + V | Paste |
| Cmd/Ctrl + D | Duplicate |
| Cmd/Ctrl + A | Select all |
| Arrow keys | Nudge 1px (or grid size) |
| Shift + Arrow | Nudge 10px |
| Cmd/Ctrl + ] | Bring forward |
| Cmd/Ctrl + [ | Send backward |
| Cmd/Ctrl + Shift + ] | Bring to front |
| Cmd/Ctrl + Shift + [ | Send to back |
| Escape | Cancel/Deselect |

### 7.2 Missing Shortcuts
| Shortcut | Action |
|----------|--------|
| Spacebar (hold) | Temporary pan mode |
| Cmd/Ctrl + 0 | Reset zoom to 100% |
| Cmd/Ctrl + = | Zoom in |
| Cmd/Ctrl + - | Zoom out |
| Cmd/Ctrl + 1 | Fit to width |
| Cmd/Ctrl + 2 | Fit to page |
| F1 | Show shortcuts help |
| Cmd/Ctrl + G | Group selected |
| Cmd/Ctrl + Shift + G | Ungroup |
| Cmd/Ctrl + L | Lock shape |

---

## 8. Production Hardening

Critical features for a production-ready canvas application.

### 8.1 Hit Detection at All Zoom Levels

**Problem:** When zoomed out significantly, shapes become too small to click.

**Requirements:**
| Feature | Behavior |
|---------|----------|
| Minimum hit area | Shapes always have minimum 10px hit area regardless of zoom |
| Handle scaling | Resize/rotate handles stay usable size (don't shrink with zoom) |
| Connector hit area | Lines maintain minimum 8px hit width |
| Anchor points | Connection anchors remain visible/clickable at all zoom levels |

**Implementation:**
```typescript
// Scale hit areas inversely with zoom
const hitRadius = Math.max(10, ANCHOR_RADIUS / zoom);
const strokeHitWidth = Math.max(8, 4 / zoom);
```

**Current Status:** NOT IMPLEMENTED - Handles shrink with zoom

---

### 8.2 Minimap / Navigator Panel

**Purpose:** Overview of entire canvas with current viewport indicator.

**Requirements:**
| Feature | Behavior |
|---------|----------|
| Shows all shapes | Miniaturized view of entire canvas |
| Viewport rectangle | Shows current visible area |
| Click to navigate | Click anywhere on minimap to pan there |
| Drag viewport | Drag the viewport rectangle to pan |
| Auto-show | Appears when canvas is larger than viewport |
| Collapsible | Can be hidden to save space |

**Position:** Bottom-right corner, above zoom controls

**Current Status:** NOT IMPLEMENTED

---

### 8.3 Context Menu (Right-Click)

**Requirements:**
| Menu Item | Shortcut | Action |
|-----------|----------|--------|
| Cut | Cmd+X | Cut selected |
| Copy | Cmd+C | Copy selected |
| Paste | Cmd+V | Paste at cursor |
| Duplicate | Cmd+D | Duplicate in place |
| Delete | Del | Delete selected |
| --- | --- | --- |
| Bring to Front | Cmd+Shift+] | Z-index front |
| Bring Forward | Cmd+] | Z-index +1 |
| Send Backward | Cmd+[ | Z-index -1 |
| Send to Back | Cmd+Shift+[ | Z-index back |
| --- | --- | --- |
| Group | Cmd+G | Group selected |
| Ungroup | Cmd+Shift+G | Ungroup |
| Lock | Cmd+L | Lock position |
| Unlock | Cmd+Shift+L | Unlock |
| --- | --- | --- |
| Edit Text | Enter | Edit shape text |
| Add Comment | - | Add comment thread |

**Canvas Context Menu (right-click empty area):**
| Menu Item | Action |
|-----------|--------|
| Paste | Paste at cursor position |
| Select All | Select all shapes |
| Fit to Screen | Zoom to fit all content |
| Reset Zoom | Reset to 100% |

**Current Status:** NOT IMPLEMENTED

---

### 8.4 Smart Guides & Snapping

**Requirements:**
| Feature | Behavior |
|---------|----------|
| Edge alignment | Show guide when shape edge aligns with another |
| Center alignment | Show guide when shape center aligns |
| Equal spacing | Show guide when spacing matches nearby shapes |
| Snap strength | Magnetic snap within 5px of guide |
| Toggle | Can disable via View menu or hold Alt |

**Visual:**
- Guides appear as magenta/pink dashed lines
- Snap indicators show distance values

**Current Status:** Grid snap only, no smart guides

---

### 8.5 Shape Locking

**Requirements:**
| Feature | Behavior |
|---------|----------|
| Lock shape | Prevents move, resize, delete |
| Lock indicator | Shows lock icon on shape |
| Still selectable | Can select to view properties |
| Unlock shortcut | Cmd+Shift+L |
| Bulk lock/unlock | Works on multi-selection |

**Current Status:** NOT IMPLEMENTED

---

### 8.6 Infinite Canvas / Auto-Expand

**Requirements:**
| Feature | Behavior |
|---------|----------|
| No boundaries | Can drag shapes anywhere |
| Auto-pan | Dragging to edge auto-pans canvas |
| Negative coords | Shapes can have negative x/y |
| Content bounds | Track min/max bounds for fit-to-screen |

**Auto-pan zones:** 50px from each edge, accelerates as you get closer

**Current Status:** PARTIALLY IMPLEMENTED - No auto-pan at edges

---

### 8.7 Performance at Scale

**Requirements for 1000+ shapes:**

| Feature | Behavior |
|---------|----------|
| Viewport culling | Only render shapes in visible area |
| Level of detail | Simplify shapes when zoomed out (hide text < 8px) |
| Batch updates | Debounce rapid state changes |
| Virtual connectors | Don't render connectors to off-screen shapes |
| Lazy selection | Don't recompute on every frame |

**Thresholds:**
- Hide shape text when font would be < 6px
- Hide connector labels when < 8px
- Use simplified shapes when < 20px
- Cull shapes completely when off-screen by > 100px

**Current Status:** NOT IMPLEMENTED - All shapes always render

---

### 8.8 Auto-Save & Recovery

**Requirements:**
| Feature | Behavior |
|---------|----------|
| Auto-save interval | Every 30 seconds if changes exist |
| Save indicator | Show "Saving..." / "Saved" status |
| Offline support | Queue saves when offline, sync when online |
| Crash recovery | Prompt to recover unsaved work on reload |
| Version history | Keep last 10 auto-saves accessible |

**Storage:**
- IndexedDB for local persistence
- Backend sync for cloud save

**Current Status:** NOT IMPLEMENTED

---

### 8.9 Clipboard & Paste Behavior

**Requirements:**
| Feature | Behavior |
|---------|----------|
| Paste at cursor | When canvas focused, paste at mouse position |
| Paste offset | When pasting same content, offset each paste |
| Cross-tab paste | Copy in one tab, paste in another |
| External paste | Paste images from clipboard |
| Paste as text | Paste text creates text shape |

**Paste position logic:**
1. If mouse is over canvas → paste at mouse position
2. If canvas is focused → paste at center of viewport
3. Multiple pastes → increment offset (20, 40, 60...)

**Current Status:** PARTIALLY IMPLEMENTED - Offset works, no cursor paste

---

### 8.10 Touch & Gesture Support

**Requirements for tablet/touch:**
| Gesture | Action |
|---------|--------|
| Single tap | Select shape |
| Double tap | Edit text |
| Long press | Context menu |
| One-finger drag | Move shape (if selected) or pan |
| Two-finger drag | Pan canvas |
| Pinch | Zoom in/out |
| Two-finger rotate | Rotate selected shape |

**Touch targets:**
- Minimum 44px touch target for all interactive elements
- Larger resize handles on touch devices

**Current Status:** NOT IMPLEMENTED

---

### 8.11 Accessibility

**Requirements:**
| Feature | Behavior |
|---------|----------|
| Keyboard navigation | Tab through shapes, Enter to select |
| Focus indicators | Visible focus ring on selected shape |
| Screen reader | Announce shape type, position, connections |
| High contrast | Support system high contrast mode |
| Reduce motion | Respect prefers-reduced-motion |
| Zoom independence | UI scales properly at browser zoom |

**ARIA labels:**
- Canvas: `role="application"` with instructions
- Shapes: `role="img"` with descriptive label
- Toolbar: `role="toolbar"` with button labels

**Current Status:** NOT IMPLEMENTED

---

### 8.12 Error Handling & Edge Cases

**Requirements:**
| Scenario | Handling |
|----------|----------|
| Invalid paste data | Silently ignore, no error |
| Corrupted save | Attempt recovery, offer backup |
| Concurrent edits | Last-write-wins with conflict notification |
| Network failure | Queue operations, retry with backoff |
| Memory pressure | Warn user, suggest reducing shapes |
| Browser crash | Auto-recover from IndexedDB |

**User feedback:**
- Toast notifications for errors
- Never lose user work silently
- Always offer recovery options

**Current Status:** MINIMAL - Basic error catching only

---

### 8.13 Undo/Redo Robustness

**Requirements:**
| Feature | Behavior |
|---------|----------|
| Granularity | Each logical action is one undo step |
| Batching | Rapid changes (typing, dragging) batch into one step |
| History limit | Keep last 100 actions (configurable) |
| Memory efficient | Store diffs, not full snapshots |
| Cross-session | Persist undo history in save file |

**Batch triggers:**
- Typing: batch until 500ms pause or blur
- Dragging: batch until mouseup
- Resizing: batch until transform end

**Current Status:** PARTIALLY IMPLEMENTED - Works but may flood history

---

## 9. Current Implementation Status

### Working Well
- Basic shape creation and selection
- Multi-select with Shift+click
- Shape dragging (single and multi)
- Shape resize and rotation via Transformer
- Connector creation and dynamic routing
- Arrow key nudging (1px / 10px with Shift)
- Z-index controls (bring forward/back)
- Copy/paste/duplicate
- Undo/redo with selection preservation
- Grid snap
- Paste offset increment (avoids overlap)
- Connector labels

### Partially Working
- Zoom (doesn't center on pointer correctly)
- Pan (only via dedicated pan tool, not spacebar)
- Undo batching (may flood history during drag)

### Not Implemented - Core Interactions
- Navigation mode switching (Mouse/Trackpad/Auto)
- Two-finger scroll to pan (currently zooms)
- Spacebar temporary pan
- Marquee/box selection
- Double-click text editing
- Alt+drag to duplicate
- Zoom keyboard shortcuts (Cmd+0, Cmd+=, Cmd+-)
- Fit to screen/page
- Shift+scroll for horizontal pan
- Right-click/middle-click pan
- Pinch to zoom detection
- Rotation snap (Shift+rotate = 15° increments)
- Shape grouping/ungrouping

### Not Implemented - Production Features
- Hit detection scaling at low zoom levels
- Minimap/navigator panel
- Context menu (right-click)
- Smart guides & snap to other shapes
- Shape locking (prevent edits)
- Auto-pan at canvas edges
- Viewport culling (performance)
- Level of detail rendering (performance)
- Auto-save & crash recovery
- Paste at cursor position
- Touch/gesture support
- Accessibility (keyboard nav, screen reader, ARIA)
- Error recovery UI / toast notifications

---

## 10. Fixes Required

### Priority 1: Critical (Broken Core Features)

#### 10.1 Fix Zoom-to-Pointer
**Problem:** Zooming doesn't keep the mouse pointer position stationary.

**Solution:**
```typescript
const handleWheel = (e: WheelEvent) => {
  const pointer = stage.getPointerPosition();
  const pointTo = {
    x: (pointer.x - viewPosition.x) / zoom,
    y: (pointer.y - viewPosition.y) / zoom,
  };

  const newZoom = e.deltaY < 0 ? zoom * 1.1 : zoom / 1.1;

  setViewPosition({
    x: pointer.x - pointTo.x * newZoom,
    y: pointer.y - pointTo.y * newZoom,
  });
  setZoom(newZoom);
};
```

#### 10.2 Add Two-Finger Scroll Pan (Trackpad)
**Problem:** Trackpad scroll zooms instead of panning.

**Solution:**
- Detect trackpad vs mouse wheel events
- If `e.ctrlKey` is false and deltaX/deltaY present: treat as pan
- If `e.ctrlKey` is true (pinch gesture): treat as zoom

```typescript
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();

  // Pinch-to-zoom on trackpad sends ctrlKey=true
  if (e.ctrlKey) {
    // Zoom behavior
    handleZoom(e);
  } else {
    // Pan behavior (two-finger scroll)
    setViewPosition(
      viewPosition.x - e.deltaX,
      viewPosition.y - e.deltaY
    );
  }
};
```

### Priority 2: High (Major UX Improvements)

#### 10.3 Spacebar Temporary Pan
**Problem:** No way to quickly pan without switching tools.

**Solution:**
```typescript
const [isSpaceDown, setSpaceDown] = useState(false);
const previousToolRef = useRef(activeTool);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !isSpaceDown) {
      previousToolRef.current = activeTool;
      setSpaceDown(true);
      // Enable pan cursor
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setSpaceDown(false);
      // Restore previous tool
    }
  };
};
```

#### 10.4 Marquee Selection
**Problem:** Can't drag to select multiple shapes.

**Solution:**
- On mousedown on empty canvas, start selection rectangle
- Track mouse position, draw selection rectangle
- On mouseup, select all shapes intersecting rectangle

```typescript
interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Intersection check
const shapesInBox = shapes.filter(shape =>
  rectIntersects(selectionBox, {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  })
);
```

#### 10.5 Double-Click Text Editing
**Problem:** Can't edit text inline, no double-click to create text.

**Solution:**
- Add `onDblClick` handler to shapes
- On double-click: show HTML textarea overlay at shape position
- Sync textarea value with shape text
- Hide overlay on blur/escape

### Priority 3: Medium (Polish Features)

#### 10.6 Zoom Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + 0 | Reset to 100% |
| Cmd/Ctrl + = | Zoom in 10% |
| Cmd/Ctrl + - | Zoom out 10% |

#### 10.7 Fit to Screen
- Calculate bounding box of all shapes
- Calculate zoom level to fit in viewport with padding
- Center view on content

#### 10.8 Alt+Drag Duplicate
- On dragstart with Alt held: duplicate shape first, then drag the copy

#### 10.9 Shift+Rotate Snap
- During rotation, if Shift held: snap to nearest 15-degree increment

#### 10.10 Shift+Scroll Horizontal Pan
- When Shift is held during scroll: pan horizontally instead of zooming

### Priority 4: Nice to Have

#### 10.11 Navigation Mode Setting
- Add UI toggle for Mouse/Trackpad/Auto mode
- Persist preference in localStorage

#### 10.12 Right-Click Pan
- On right-click down: enter pan mode
- On right-click up: exit pan mode
- Prevent context menu during pan

#### 10.13 Shape Grouping
- Cmd/Ctrl + G to group selected shapes
- Grouped shapes move/resize together
- Cmd/Ctrl + Shift + G to ungroup

---

## Implementation Order

### Phase 1: Fix Broken Core (Do First)
1. **Fix zoom-to-pointer** - Core usability, currently broken
2. **Two-finger scroll pan** - Critical for trackpad users

### Phase 2: Essential UX (High Priority)
3. **Spacebar temporary pan** - Essential navigation workflow
4. **Marquee selection** - Basic expected feature
5. **Double-click text editing** - Basic expected feature
6. **Context menu** - Right-click for common actions

### Phase 3: Navigation Polish
7. **Zoom keyboard shortcuts** (Cmd+0, Cmd+=, Cmd+-) - Quick wins
8. **Fit to screen / Fit to selection** - Useful navigation
9. **Shift+scroll horizontal pan** - Standard behavior
10. **Right-click / middle-click pan** - Alternative pan methods

### Phase 4: Power User Features
11. **Alt+drag duplicate** - Efficient workflow
12. **Shift+rotate snap** (15° increments)
13. **Shape grouping** (Cmd+G / Cmd+Shift+G)
14. **Shape locking** (Cmd+L)
15. **Smart guides** - Snap to other shapes

### Phase 5: Production Hardening
16. **Hit detection at low zoom** - Shapes stay clickable
17. **Minimap / navigator panel** - Large canvas navigation
18. **Auto-pan at edges** - Drag shapes to edge = canvas scrolls
19. **Viewport culling** - Performance for 100+ shapes
20. **Auto-save & recovery** - Never lose work

### Phase 6: Platform Support
21. **Touch/gesture support** - Tablet/mobile
22. **Accessibility** - Keyboard nav, screen readers

---

## Test Checklist

### Zoom Tests
- [ ] Scroll up zooms in centered on mouse pointer
- [ ] Scroll down zooms out centered on mouse pointer
- [ ] Pinch to zoom works on trackpad (ctrlKey detection)
- [ ] Cmd+0 resets to 100%
- [ ] Cmd+= zooms in
- [ ] Cmd+- zooms out
- [ ] Zoom range clamped 10%-300%
- [ ] Shapes remain clickable at 10% zoom (hit detection)
- [ ] Handles/anchors remain usable at low zoom

### Pan Tests
- [ ] Two-finger scroll pans canvas (not zoom)
- [ ] Spacebar + drag pans temporarily
- [ ] Spacebar release returns to previous tool
- [ ] Pan tool (H) works
- [ ] Right-click + drag pans
- [ ] Middle-click + drag pans
- [ ] Shift + scroll pans horizontally

### Selection Tests
- [ ] Marquee selection draws rectangle on empty area drag
- [ ] Shapes touching box are selected
- [ ] Shift + marquee adds to existing selection
- [ ] Click empty area clears selection
- [ ] Selection works at all zoom levels

### Text Tests
- [ ] Double-click shape enters text edit mode
- [ ] Double-click empty canvas creates text box
- [ ] Double-click connector edits label
- [ ] Escape exits editing without save
- [ ] Click outside saves and exits
- [ ] Enter commits text (single line) or newline (multi)

### Context Menu Tests
- [ ] Right-click shape shows shape menu
- [ ] Right-click empty shows canvas menu
- [ ] All menu items work correctly
- [ ] Menu closes on click outside

### Production Hardening Tests
- [ ] Auto-save triggers after 30s of inactivity
- [ ] Crash recovery prompt on page reload
- [ ] Paste at cursor position when mouse over canvas
- [ ] Multiple pastes offset correctly
- [ ] Large canvas (100+ shapes) renders smoothly
- [ ] Off-screen shapes don't impact performance

---

*Last updated: 2026-02-20*
