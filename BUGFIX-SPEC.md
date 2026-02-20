# Lucid Clone - Bug Fix Specification

## Overview
This document specifies 9 bugs/missing features to be fixed to achieve seamless drag, connect, and resize behavior.

---

## 1. Multi-Select Drag (CRITICAL)

**Current Behavior:** Selecting multiple shapes and dragging only moves the clicked shape.

**Expected Behavior:** All selected shapes move together, maintaining relative positions.

**Root Cause:** `handleDragMove` in Canvas.tsx only updates the single shape being dragged, not all selected shapes.

**Fix:**
- Calculate delta (dx, dy) from drag movement
- Apply delta to ALL shapes in `selectedShapeIds`
- Connectors between selected shapes should move together
- Connectors to non-selected shapes should update dynamically

**Test Cases:**
- Select 2 shapes, drag one → both move
- Select 3 shapes with connectors between them → all move, connectors stay attached
- Select shapes connected to non-selected shapes → external connectors update

---

## 2. Connectors Ignore Rotation (CRITICAL)

**Current Behavior:** Rotating a shape doesn't affect connector anchor positions.

**Expected Behavior:** Connector anchors rotate with the shape.

**Root Cause:** `getAnchorPoint()` and `calculateOptimalAnchors()` don't apply rotation transformation.

**Fix:**
- Apply rotation matrix to anchor point calculations
- Use shape center as rotation origin
- Formula:
  ```
  rotatedX = centerX + (anchorX - centerX) * cos(angle) - (anchorY - centerY) * sin(angle)
  rotatedY = centerY + (anchorX - centerX) * sin(angle) + (anchorY - centerY) * cos(angle)
  ```

**Test Cases:**
- Rotate shape 90° → anchors at correct rotated positions
- Rotate shape 45° → connector endpoint follows rotation
- Rotate connected shapes → connectors stay attached

---

## 3. Arrow Key Nudging (HIGH)

**Current Behavior:** Arrow keys do nothing.

**Expected Behavior:**
- Arrow keys move selected shapes by 1px (or grid size if snap enabled)
- Shift+Arrow moves by 10px
- Should work for single and multi-select

**Root Cause:** Missing keyboard handler for arrow keys.

**Fix:**
- Add ArrowUp/Down/Left/Right handlers in `handleKeyDown`
- Calculate nudge amount based on shift key and snap settings
- Update all selected shapes
- Save to history after nudge

**Test Cases:**
- Select shape, press Right → moves 1px right
- Select shape, press Shift+Right → moves 10px right
- Select 2 shapes, press Down → both move down
- With snap-to-grid, nudge snaps to grid

---

## 4. Connector Labels Not Rendered (HIGH)

**Current Behavior:** Connector `label` field exists but isn't displayed.

**Expected Behavior:** Labels appear at midpoint of connector line.

**Root Cause:** `renderConnector()` doesn't render a Text element for the label.

**Fix:**
- Calculate midpoint of connector path
- Render Konva Text at midpoint
- Style: white background, centered, readable font
- Handle elbow paths (use middle segment midpoint)

**Test Cases:**
- Create connector with label → label visible at center
- Drag connected shape → label moves with connector
- Elbow connector with label → label on middle segment

---

## 5. Quick-Create Doesn't Snap to Grid (HIGH)

**Current Behavior:** Quick-created shapes are positioned at exact offset, ignoring grid.

**Expected Behavior:** New shapes snap to grid like manually placed shapes.

**Root Cause:** `quickCreateConnectedShape()` doesn't call `snapToGrid()`.

**Fix:**
- Apply `snapToGrid()` to calculated position before creating shape
- Already have the function, just need to use it

**Test Cases:**
- Quick-create with grid enabled → new shape aligned to grid
- Quick-create with snap disabled → exact offset position

---

## 6. Selection Cleared on Undo/Redo (MEDIUM)

**Current Behavior:** Undo/redo clears all selection.

**Expected Behavior:** Preserve selection or intelligently restore it.

**Root Cause:** `undo()` and `redo()` explicitly set `selectedShapeIds: []`.

**Fix:**
- Option A: Don't clear selection (keep existing selection if shapes still exist)
- Option B: Store selection in history and restore it
- Going with Option A (simpler, less memory)

**Test Cases:**
- Select shape, make change, undo → shape still selected (if exists)
- Undo shape deletion → deleted shape becomes selected
- Redo → selection preserved

---

## 7. Paste Offset Overlap (MEDIUM)

**Current Behavior:** Pasting always uses +20px offset, causing overlap on multiple pastes.

**Expected Behavior:** Smart offset that avoids overlapping existing shapes.

**Root Cause:** Hardcoded `PASTE_OFFSET = 20`.

**Fix:**
- Track paste count in session
- Increment offset for consecutive pastes (20, 40, 60...)
- Reset on new copy operation
- Or: find empty space near original

**Test Cases:**
- Paste once → +20px offset
- Paste again → +40px offset (no overlap)
- Copy new shapes → offset resets

---

## 8. Elbow Routing Overlaps Shapes (MEDIUM)

**Current Behavior:** Elbow connectors use fixed 20px margin, may overlap close shapes.

**Expected Behavior:** Elbow paths route around shapes when possible.

**Root Cause:** `generateElbowPath()` uses arbitrary MARGIN without collision detection.

**Fix:**
- Calculate minimum clearance based on shape bounds
- If shapes are too close, fall back to straight line or curved
- Add simple collision avoidance for path segments

**Test Cases:**
- Shapes 100px apart → elbow routes cleanly
- Shapes 30px apart → path doesn't overlap
- Shapes overlapping → graceful fallback

---

## 9. No Bring-to-Front/Send-to-Back (MEDIUM)

**Current Behavior:** No way to control z-order of overlapping shapes.

**Expected Behavior:** Right-click or keyboard shortcuts to change z-order.

**Root Cause:** Shapes rendered in array order, no z-index management.

**Fix:**
- Add `zIndex` field to Shape type (or use array position)
- Add store actions: `bringToFront()`, `sendToBack()`, `bringForward()`, `sendBackward()`
- Add keyboard shortcuts: Cmd+] (forward), Cmd+[ (backward)
- Sort shapes by zIndex before rendering

**Test Cases:**
- Overlap 2 shapes, bring bottom to front → now on top
- Send to back → shape behind others
- Keyboard shortcuts work

---

## Implementation Order

1. Multi-select drag (foundation for other features)
2. Arrow key nudging (quick win, improves UX)
3. Quick-create snap (easy fix)
4. Selection on undo (easy fix)
5. Paste offset (easy fix)
6. Connector labels (moderate)
7. Rotation anchors (complex math)
8. Elbow routing (moderate)
9. Z-index controls (moderate)

---

## Test Requirements

- Unit tests for each fix in Canvas.test.tsx
- Playwright e2e tests for visual verification
- All existing tests must continue passing
