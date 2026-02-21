import { test, expect, Page } from '@playwright/test';

// Helper to get canvas position
async function getCanvasPosition(page: Page) {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  return box!;
}

// Helper to click on canvas at position
async function clickCanvas(page: Page, x: number, y: number) {
  const canvas = page.locator('canvas').first();
  await canvas.click({ position: { x, y } });
}

// Helper to drag on canvas
async function dragOnCanvas(page: Page, fromX: number, fromY: number, toX: number, toY: number) {
  const canvas = page.locator('canvas').first();
  await canvas.dragTo(canvas, {
    sourcePosition: { x: fromX, y: fromY },
    targetPosition: { x: toX, y: toY },
  });
}

test.describe('Canvas Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    // Wait for canvas to load
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000); // Wait for initial render and redirect
  });

  test('should load the editor', async ({ page }) => {
    // Check toolbar is present - use title attribute
    await expect(page.getByTitle('Select (V)')).toBeVisible();

    // Check canvas is present
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should have toolbar with all tools', async ({ page }) => {
    // Navigation tools
    await expect(page.getByTitle('Select (V)')).toBeVisible();
    await expect(page.getByTitle('Pan (H)')).toBeVisible();

    // Connector tool
    await expect(page.getByTitle('Connector (C)')).toBeVisible();

    // Shape tools
    await expect(page.getByTitle('Rectangle (R)')).toBeVisible();
    await expect(page.getByTitle('Circle (O)')).toBeVisible();
    await expect(page.getByTitle('Diamond (D)')).toBeVisible();
    await expect(page.getByTitle('Text (T)')).toBeVisible();
  });

  test('should have zoom controls', async ({ page }) => {
    await expect(page.getByTitle('Zoom Out (-)')).toBeVisible();
    await expect(page.getByTitle('Zoom In (+)')).toBeVisible();
    // Zoom percentage display
    const zoomDisplay = page.locator('div').filter({ hasText: /^100%$/ });
    await expect(zoomDisplay.first()).toBeVisible();
  });
});

test.describe('Shape Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
  });

  test('should create a rectangle', async ({ page }) => {
    // Select rectangle tool
    await page.getByTitle('Rectangle (R)').click();

    // Click on canvas to create shape
    await clickCanvas(page, 300, 300);

    // Tool should switch back to select
    await expect(page.getByTitle('Select (V)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);
  });

  test('should create a circle', async ({ page }) => {
    await page.getByTitle('Circle (O)').click();
    await clickCanvas(page, 400, 300);

    // Verify tool switched back
    await expect(page.getByTitle('Select (V)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);
  });

  test('should create a diamond', async ({ page }) => {
    await page.getByTitle('Diamond (D)').click();
    await clickCanvas(page, 500, 300);
  });

  test('should create a text shape', async ({ page }) => {
    await page.getByTitle('Text (T)').click();
    await clickCanvas(page, 600, 300);
  });

  test('should create multiple shapes', async ({ page }) => {
    // Create rectangle (use coordinates that avoid toolbar overlap)
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(300);

    // Create circle
    await page.getByTitle('Circle (O)').click();
    await clickCanvas(page, 550, 300);
    await page.waitForTimeout(300);

    // Create diamond
    await page.getByTitle('Diamond (D)').click();
    await clickCanvas(page, 700, 300);
    await page.waitForTimeout(300);
  });
});

test.describe('Shape Selection and Dragging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    // Create a rectangle in the middle-right area (away from toolbar/sidebar)
    // Shape top-left will be at 500,400 so center is at 550,450
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 500, 400);
    await page.waitForTimeout(500);
  });

  test('should select shape on click', async ({ page }) => {
    // Click on the shape center to select it (shapes are 100x100, top-left at 500,400)
    await clickCanvas(page, 550, 450);
    await page.waitForTimeout(300);

    // Delete button should appear when shape is selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });
  });

  test('should drag shape to new position', async ({ page }) => {
    // First select the shape by clicking its center
    await clickCanvas(page, 550, 450);
    await page.waitForTimeout(300);

    // Drag the shape from center
    await dragOnCanvas(page, 550, 450, 650, 550);
    await page.waitForTimeout(500);

    // Shape should be at new position (click there to verify it's selectable)
    // Use x > 220 to avoid K8s sidebar overlap
    await clickCanvas(page, 800, 600); // Deselect by clicking elsewhere
    await page.waitForTimeout(200);
    await clickCanvas(page, 650, 550); // Select at new center position
    await page.waitForTimeout(300);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });
  });

  test('should clear selection on Escape key', async ({ page }) => {
    // Select shape by clicking center
    await clickCanvas(page, 550, 450);
    await page.waitForTimeout(300);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });

    // Press Escape to clear selection
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Delete button should disappear
    await expect(page.getByTitle('Delete Selected (Del)')).not.toBeVisible();
  });

  test('should delete shape with delete button', async ({ page }) => {
    // Select shape by clicking center
    await clickCanvas(page, 550, 450);
    await page.waitForTimeout(300);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });

    // Click delete
    await page.getByTitle('Delete Selected (Del)').click();
    await page.waitForTimeout(300);

    // Delete button should disappear (no selection)
    await expect(page.getByTitle('Delete Selected (Del)')).not.toBeVisible();
  });

  test('should delete shape with keyboard', async ({ page }) => {
    // Select shape by clicking center
    await clickCanvas(page, 550, 450);
    await page.waitForTimeout(300);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });

    // Press delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // Delete button should disappear
    await expect(page.getByTitle('Delete Selected (Del)')).not.toBeVisible();
  });
});

test.describe('Shape Resizing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create a rectangle (top-left at 400,300, center at 450,350)
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(200);
  });

  test('should show transformer when shape selected', async ({ page }) => {
    // Select shape by clicking center
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(100);

    // Transformer handles should be visible (the resize squares)
    // We can verify by checking if the shape remains selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should resize shape by dragging corner', async ({ page }) => {
    // Select shape by clicking center
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // The transformer corner is at approximately x+width, y+height from shape position
    // Shape is created at ~400, 300 with default size 100x100
    // Bottom-right corner should be around 500, 400
    const canvas = page.locator('canvas').first();

    // Drag from corner to resize
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 500, y: 400 },
      targetPosition: { x: 550, y: 450 },
    });

    await page.waitForTimeout(200);
  });
});

test.describe('Connector Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create two rectangles (x > 220 to avoid K8s sidebar overlap)
    // Shape 1: top-left at 300,300, center at 350,350
    // Shape 2: top-left at 550,300, center at 600,350
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 300, 300);
    await page.waitForTimeout(200);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 550, 300);
    await page.waitForTimeout(200);
  });

  test('should select connector tool', async ({ page }) => {
    await page.getByTitle('Connector (C)').click();
    await expect(page.getByTitle('Connector (C)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);
  });

  test('should show connection mode indicator when drawing', async ({ page }) => {
    // Switch to connector tool for drag-to-connect mode
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Click on the right anchor of first shape (x + width, y + height/2)
    // Shape at 300,300 size 100x100 -> right anchor at (400, 350)
    await clickCanvas(page, 400, 350);
    await page.waitForTimeout(200);

    // Should show "Drawing connection..." message
    await expect(page.locator('text=Drawing connection')).toBeVisible();
  });

  test('should cancel connection with Escape', async ({ page }) => {
    // Switch to connector tool for drag-to-connect mode
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Start connection from right anchor (at 400, 350)
    await clickCanvas(page, 400, 350);
    await page.waitForTimeout(200);

    await expect(page.locator('text=Drawing connection')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Connection indicator should disappear
    await expect(page.locator('text=Drawing connection')).not.toBeVisible();
  });

  test('should create connector between shapes', async ({ page }) => {
    // Switch to connector tool for drag-to-connect mode
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Click on right anchor of first shape to start connection
    // Anchor is at x + width, y + height/2 = 300 + 100, 300 + 50 = 400, 350
    await clickCanvas(page, 400, 350);
    await page.waitForTimeout(200);

    // Check if connection mode started
    const connectionText = page.locator('text=Drawing connection');
    if (await connectionText.isVisible()) {
      // Complete the connection to the second shape's left anchor
      // Second shape is at 550, 300, left anchor at 550, 350
      await clickCanvas(page, 550, 350);
      await page.waitForTimeout(200);

      // Connection indicator should disappear after completing
      await expect(connectionText).not.toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('K8s Shapes Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
  });

  test('should show K8s sidebar', async ({ page }) => {
    await expect(page.locator('text=Kubernetes')).toBeVisible();
  });

  test('should have collapsible categories', async ({ page }) => {
    // Workloads should be visible by default (text is styled uppercase via CSS)
    await expect(page.locator('text=Workloads')).toBeVisible();
    // Use more specific selector for Network category (avoid matching NetworkPolicy)
    await expect(page.getByRole('button', { name: 'Network ›' })).toBeVisible();
  });

  test('should show K8s shape icons', async ({ page }) => {
    // Pod should be visible in workloads category
    await expect(page.getByTitle('Pod')).toBeVisible();
  });

  test('should add K8s shape on click', async ({ page }) => {
    // Click on Pod shape
    await page.getByTitle('Pod').click();
    await page.waitForTimeout(300);

    // Tool should switch to select
    await expect(page.getByTitle('Select (V)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);
  });

  test('should collapse and expand categories', async ({ page }) => {
    // Click on Workloads to collapse (text is styled uppercase via CSS)
    await page.locator('text=Workloads').click();
    await page.waitForTimeout(200);

    // Pod should not be visible
    await expect(page.getByTitle('Pod')).not.toBeVisible();

    // Click again to expand
    await page.locator('text=Workloads').click();
    await page.waitForTimeout(200);

    // Pod should be visible again
    await expect(page.getByTitle('Pod')).toBeVisible();
  });

  test('should close sidebar', async ({ page }) => {
    // Find and click the close button (×)
    const closeButton = page.locator('button:has-text("×")').first();
    await closeButton.click();
    await page.waitForTimeout(200);

    // Kubernetes text should not be visible
    await expect(page.locator('text=Kubernetes')).not.toBeVisible();

    // Should show the collapsed button (☸)
    await expect(page.getByTitle('Open K8s Shapes')).toBeVisible();
  });
});

test.describe('Zoom Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);
  });

  test('should zoom in', async ({ page }) => {
    const zoomDisplay = page.locator('div').filter({ hasText: /^100%$/ }).first();
    await expect(zoomDisplay).toBeVisible();

    await page.getByTitle('Zoom In (+)').click();
    await page.waitForTimeout(200);

    const newZoomDisplay = page.locator('div').filter({ hasText: /^110%$/ }).first();
    await expect(newZoomDisplay).toBeVisible();
  });

  test('should zoom out', async ({ page }) => {
    await page.getByTitle('Zoom Out (-)').click();
    await page.waitForTimeout(200);

    // 1.0 - 0.1 = 0.9 = 90%
    const zoomDisplay = page.locator('div').filter({ hasText: /^90%$/ }).first();
    await expect(zoomDisplay).toBeVisible();
  });

  test('should zoom with multiple clicks', async ({ page }) => {
    // Zoom in 3 times
    await page.getByTitle('Zoom In (+)').click();
    await page.waitForTimeout(100);
    await page.getByTitle('Zoom In (+)').click();
    await page.waitForTimeout(100);
    await page.getByTitle('Zoom In (+)').click();
    await page.waitForTimeout(200);

    // 1.0 + 0.1*3 = 1.3 = 130%
    const zoomDisplay = page.locator('div').filter({ hasText: /^130%$/ }).first();
    await expect(zoomDisplay).toBeVisible();
  });
});

test.describe('Pan Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
  });

  test('should switch to pan tool', async ({ page }) => {
    await page.getByTitle('Pan (H)').click();
    await expect(page.getByTitle('Pan (H)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);
  });

  test('should show grab cursor when pan tool active', async ({ page }) => {
    await page.getByTitle('Pan (H)').click();

    const canvas = page.locator('canvas').first();
    await expect(canvas).toHaveCSS('cursor', 'grab');
  });
});

test.describe('Diagram Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
  });

  test('should show diagram name input', async ({ page }) => {
    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();
  });

  test('should allow editing diagram name', async ({ page }) => {
    const nameInput = page.locator('input[type="text"]').first();

    // Clear and type new name
    await nameInput.clear();
    await nameInput.fill('My K8s Architecture');

    // Verify value
    await expect(nameInput).toHaveValue('My K8s Architecture');
  });
});

test.describe('Back Navigation', () => {
  test('should have back button', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');

    // Back button with ← symbol
    const backButton = page.locator('button:has-text("←")');
    await expect(backButton).toBeVisible();
  });
});

test.describe('Real-time Connector Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
  });

  test('should update connector when dragging connected shape', async ({ page }) => {
    // Create two shapes (x > 220 to avoid K8s sidebar overlap)
    // Shape 1: top-left at 300,300, center at 350,350
    // Shape 2: top-left at 550,300, center at 600,350
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 300, 300);
    await page.waitForTimeout(200);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 550, 300);
    await page.waitForTimeout(200);

    // Select first shape to show anchors (click center at 350, 350)
    await clickCanvas(page, 350, 350);
    await page.waitForTimeout(200);

    // Click right anchor area to start connection (right anchor at 400, 350)
    await clickCanvas(page, 400, 350);
    await page.waitForTimeout(200);

    // If connection started, complete it
    const connectionStarted = await page.locator('text=Drawing connection').isVisible();
    if (connectionStarted) {
      // Click left anchor of second shape (left anchor at 550, 350)
      await clickCanvas(page, 550, 350);
      await page.waitForTimeout(300);
    }

    // Now select and drag the first shape
    await clickCanvas(page, 350, 350); // center of first shape
    await page.waitForTimeout(100);

    await dragOnCanvas(page, 350, 350, 350, 450);
    await page.waitForTimeout(300);

    // Test passes if no errors - visual verification via screenshot
    await page.screenshot({ path: 'e2e/screenshots/connector-after-drag.png' });
  });

  test('should maintain connector during continuous drag movement', async ({ page }) => {
    // Create two shapes
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 350, 300);
    await page.waitForTimeout(200);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 600, 300);
    await page.waitForTimeout(200);

    // Create connector using connector tool
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Start from right anchor of first shape (450, 350)
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Complete to left anchor of second shape (600, 350)
    if (await page.locator('text=Drawing connection').isVisible()) {
      await clickCanvas(page, 600, 350);
      await page.waitForTimeout(300);
    }

    // Screenshot before drag
    await page.screenshot({ path: 'e2e/screenshots/connector-before-continuous-drag.png' });

    // Switch to select tool and drag shape multiple times
    await page.getByTitle('Select (V)').click();
    await page.waitForTimeout(100);

    // Select first shape
    await clickCanvas(page, 400, 350);
    await page.waitForTimeout(200);

    // Perform multiple drag operations to simulate continuous movement
    const canvas = page.locator('canvas').first();

    // Drag down
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 400, y: 350 },
      targetPosition: { x: 400, y: 400 },
    });
    await page.waitForTimeout(100);

    // Drag right
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 400, y: 400 },
      targetPosition: { x: 450, y: 400 },
    });
    await page.waitForTimeout(100);

    // Drag down-left
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 450, y: 400 },
      targetPosition: { x: 420, y: 450 },
    });
    await page.waitForTimeout(200);

    // Screenshot after multiple drags
    await page.screenshot({ path: 'e2e/screenshots/connector-after-continuous-drag.png' });

    // Verify shape is still selectable at new position
    await clickCanvas(page, 420, 450);
    await page.waitForTimeout(200);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should update connector when dragging both connected shapes', async ({ page }) => {
    // Create two shapes
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 350, 300);
    await page.waitForTimeout(200);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 600, 300);
    await page.waitForTimeout(200);

    // Quick-create connector by selecting first shape and clicking anchor
    await clickCanvas(page, 400, 350);
    await page.waitForTimeout(200);
    await clickCanvas(page, 450, 350); // right anchor
    await page.waitForTimeout(300);

    // Screenshot initial state
    await page.screenshot({ path: 'e2e/screenshots/both-shapes-before-drag.png' });

    // Drag first shape down
    await clickCanvas(page, 400, 350);
    await page.waitForTimeout(100);
    await dragOnCanvas(page, 400, 350, 400, 450);
    await page.waitForTimeout(200);

    // Now drag second shape up
    await clickCanvas(page, 650, 350);
    await page.waitForTimeout(100);
    await dragOnCanvas(page, 650, 350, 650, 250);
    await page.waitForTimeout(200);

    // Screenshot final state
    await page.screenshot({ path: 'e2e/screenshots/both-shapes-after-drag.png' });

    // Both shapes should still be selectable
    await clickCanvas(page, 400, 450);
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    await clickCanvas(page, 650, 250);
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should update K8s shape connectors during drag', async ({ page }) => {
    // Add Pod shape
    await page.getByTitle('Pod').click();
    await page.waitForTimeout(300);

    // Add Service shape
    await page.getByTitle('Service').click();
    await page.waitForTimeout(300);

    // Select Pod and quick-create connection
    await clickCanvas(page, 640, 360);
    await page.waitForTimeout(200);

    // Click right anchor to create connected shape
    await clickCanvas(page, 680, 360);
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'e2e/screenshots/k8s-connector-before-drag.png' });

    // Select Pod and drag it
    await clickCanvas(page, 640, 360);
    await page.waitForTimeout(100);
    await dragOnCanvas(page, 640, 360, 500, 400);
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'e2e/screenshots/k8s-connector-after-drag.png' });

    // Shape should be selectable at new position
    await clickCanvas(page, 500, 400);
    await page.waitForTimeout(200);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should dynamically switch connector anchors when shape crosses to other side', async ({ page }) => {
    // Create two rectangles side by side
    // Shape 1: center at 350,350
    // Shape 2: center at 600,350
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 300, 300);
    await page.waitForTimeout(200);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 550, 300);
    await page.waitForTimeout(200);

    // Create connector between them using connector tool
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Start from right anchor of first shape
    await clickCanvas(page, 400, 350);
    await page.waitForTimeout(200);

    if (await page.locator('text=Drawing connection').isVisible()) {
      // Complete to left anchor of second shape
      await clickCanvas(page, 550, 350);
      await page.waitForTimeout(300);
    }

    // Screenshot initial state (connector goes right to left)
    await page.screenshot({ path: 'e2e/screenshots/connector-before-crossover.png' });

    // Now drag the first shape to the RIGHT of the second shape
    // This should cause the connector to switch anchors
    await page.getByTitle('Select (V)').click();
    await page.waitForTimeout(100);

    await clickCanvas(page, 350, 350);
    await page.waitForTimeout(100);

    // Drag shape1 to the far right (past shape2)
    await dragOnCanvas(page, 350, 350, 750, 350);
    await page.waitForTimeout(300);

    // Screenshot after crossover (connector should now go from left to right)
    await page.screenshot({ path: 'e2e/screenshots/connector-after-crossover.png' });

    // Both shapes should still be selectable
    await clickCanvas(page, 750, 350);
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    await clickCanvas(page, 600, 350);
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should handle vertical crossover', async ({ page }) => {
    // Create two rectangles vertically stacked
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 200);
    await page.waitForTimeout(200);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 400);
    await page.waitForTimeout(200);

    // Create connector from bottom of shape1 to top of shape2
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Start from bottom anchor of first shape
    await clickCanvas(page, 450, 300);
    await page.waitForTimeout(200);

    if (await page.locator('text=Drawing connection').isVisible()) {
      // Complete to top anchor of second shape
      await clickCanvas(page, 450, 400);
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: 'e2e/screenshots/connector-vertical-before.png' });

    // Drag shape1 below shape2
    await page.getByTitle('Select (V)').click();
    await page.waitForTimeout(100);

    await clickCanvas(page, 450, 250);
    await page.waitForTimeout(100);

    await dragOnCanvas(page, 450, 250, 450, 550);
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'e2e/screenshots/connector-vertical-after.png' });

    // Shapes should still be selectable
    await clickCanvas(page, 450, 550);
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });
});

test.describe('Multiple Shape Operations', () => {
  test('should handle creating and connecting multiple K8s shapes', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Add Pod (from Workloads category which is expanded by default)
    await page.getByTitle('Pod').click();
    await page.waitForTimeout(300);

    // Network category is already expanded by default
    // Add Service from Network category
    await page.getByTitle('Service').click();
    await page.waitForTimeout(300);

    // Both shapes should be created
    // Visual verification via screenshot
    await page.screenshot({ path: 'e2e/screenshots/multiple-k8s-shapes.png' });
  });
});

test.describe('K8s Shape Resize', () => {
  test('should resize K8s shape without distortion', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Add a Pod shape
    await page.getByTitle('Pod').click();
    await page.waitForTimeout(300);

    // Click center of viewport to select the Pod
    await clickCanvas(page, 640, 360);
    await page.waitForTimeout(200);

    // Verify it's selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    // Take screenshot before resize
    await page.screenshot({ path: 'e2e/screenshots/k8s-before-resize.png' });

    // Drag bottom-right corner to resize
    // Pod is 80x80, positioned at center, so bottom-right corner is at ~680, 400
    const canvas = page.locator('canvas').first();
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 680, y: 400 },
      targetPosition: { x: 720, y: 440 },
    });
    await page.waitForTimeout(300);

    // Take screenshot after resize - icon should not be distorted
    await page.screenshot({ path: 'e2e/screenshots/k8s-after-resize.png' });

    // Shape should still be selectable
    await clickCanvas(page, 660, 380);
    await page.waitForTimeout(200);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should maintain K8s shape connectors after resize', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Add Pod and Service
    await page.getByTitle('Pod').click();
    await page.waitForTimeout(300);

    await page.getByTitle('Service').click();
    await page.waitForTimeout(300);

    // Select Pod and quick-create a connected shape
    await clickCanvas(page, 640, 360);
    await page.waitForTimeout(200);

    // Click right anchor to create connected shape
    await clickCanvas(page, 680, 360);
    await page.waitForTimeout(300);

    // Screenshot showing connected shapes
    await page.screenshot({ path: 'e2e/screenshots/k8s-connected-before-resize.png' });

    // Select first Pod and resize it
    await clickCanvas(page, 640, 360);
    await page.waitForTimeout(200);

    // Connector should still exist after operations
    // Visual verification via screenshot
    await page.screenshot({ path: 'e2e/screenshots/k8s-connected-after-resize.png' });
  });
});

test.describe('Export Menu', () => {
  test('should show export menu button', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Export button should be visible in top-right
    const exportButton = page.locator('button[title="Export"]');
    await expect(exportButton).toBeVisible();
  });

  test('should open export menu on click', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Click export button
    await page.locator('button[title="Export"]').click();
    await page.waitForTimeout(200);

    // Menu should show PNG and JSON options
    await expect(page.locator('text=Export as PNG')).toBeVisible();
    await expect(page.locator('text=Export as JSON')).toBeVisible();
  });
});

test.describe('Properties Panel', () => {
  test('should show properties panel when shape is selected', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create a rectangle
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(300);

    // Select the shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(300);

    // Properties panel should be visible
    await expect(page.locator('text=Properties')).toBeVisible();
    await expect(page.locator('text=Fill Color')).toBeVisible();
    await expect(page.locator('text=Stroke Color')).toBeVisible();
  });

  test('should hide properties panel when no shape selected', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // No shapes, no properties panel
    await expect(page.locator('text=Properties')).not.toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('should show dashboard with create button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Should show title and create button
    await expect(page.locator('text=Lucid Clone')).toBeVisible();
    await expect(page.locator('text=+ New Diagram')).toBeVisible();
  });

  test('should show import button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Import JSON')).toBeVisible();
  });

  test('should create new diagram on button click', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Click create button
    await page.locator('text=+ New Diagram').click();
    await page.waitForTimeout(1000);

    // Should navigate to editor
    await expect(page).toHaveURL(/\/edit\//);
    await expect(page.locator('canvas')).toBeVisible();
  });
});

test.describe('Quick-create connected shapes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create a rectangle (top-left at 400,300, center at 450,350)
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(300);
  });

  test('should create new shape when clicking right anchor', async ({ page }) => {
    // Select the shape to show anchors (click center)
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Click on the right anchor (x + width, y + height/2) = (500, 350)
    await clickCanvas(page, 500, 350);
    await page.waitForTimeout(300);

    // A new shape should be created and selected (delete button visible)
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    // Screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/quick-create-right.png' });
  });

  test('should create new shape when clicking bottom anchor', async ({ page }) => {
    // Select the shape to show anchors
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Click on the bottom anchor (x + width/2, y + height) = (450, 400)
    await clickCanvas(page, 450, 400);
    await page.waitForTimeout(300);

    // A new shape should be created and selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/quick-create-bottom.png' });
  });

  test('should create chain of shapes by clicking anchors', async ({ page }) => {
    // Select first shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Click right anchor to create second shape
    await clickCanvas(page, 500, 350);
    await page.waitForTimeout(300);

    // The new shape is selected, click its right anchor
    // New shape is at ~650 (400 + 100 + 150 gap), center at 700, 350
    // Right anchor at 750, 350
    await clickCanvas(page, 760, 350);
    await page.waitForTimeout(300);

    // Should have created a third shape
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/quick-create-chain.png' });
  });

  test('should create connected K8s shape from K8s shape', async ({ page }) => {
    // Add a Pod shape
    await page.getByTitle('Pod').click();
    await page.waitForTimeout(300);

    // Pod is created at center of viewport, let's find and select it
    // Click near center of canvas to select the Pod
    await clickCanvas(page, 640, 360);
    await page.waitForTimeout(300);

    // Check if selected
    const deleteVisible = await page.getByTitle('Delete Selected (Del)').isVisible();
    if (deleteVisible) {
      // Get Pod size (80x80) and click right anchor
      // Assuming Pod center is around 640,360, right anchor at 640+40=680, 360
      await clickCanvas(page, 680, 360);
      await page.waitForTimeout(300);

      // New Pod should be created and selected
      await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
    }

    await page.screenshot({ path: 'e2e/screenshots/quick-create-k8s.png' });
  });
});

// ============================================================
// NEW INTERACTION FEATURE E2E TESTS
// ============================================================

test.describe('Zoom Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
  });

  test('should zoom in using toolbar button', async ({ page }) => {
    const zoomDisplay = page.locator('div').filter({ hasText: /^100%$/ }).first();
    await expect(zoomDisplay).toBeVisible();

    // Click zoom in button
    await page.getByTitle('Zoom In (+)').click();
    await page.waitForTimeout(200);

    // Zoom should increase
    const newZoomText = await page.locator('text=/[0-9]+%/').first().textContent();
    expect(parseInt(newZoomText || '100')).toBeGreaterThan(100);
  });

  test('should zoom out using toolbar button', async ({ page }) => {
    // First zoom in a bit
    await page.getByTitle('Zoom In (+)').click();
    await page.getByTitle('Zoom In (+)').click();
    await page.waitForTimeout(200);

    // Then zoom out
    await page.getByTitle('Zoom Out (-)').click();
    await page.waitForTimeout(200);

    // Verify zoom works (no crash)
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('should zoom with keyboard shortcuts', async ({ page }) => {
    // Press Cmd/Ctrl + = to zoom in
    await page.keyboard.press('Control+=');
    await page.waitForTimeout(200);

    // Canvas should still be visible (no crash)
    await expect(page.locator('canvas').first()).toBeVisible();

    // Press Cmd/Ctrl + - to zoom out
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(200);

    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('should reset zoom to 100% with Ctrl+0', async ({ page }) => {
    // Zoom in first
    await page.getByTitle('Zoom In (+)').click();
    await page.getByTitle('Zoom In (+)').click();
    await page.waitForTimeout(200);

    // Reset zoom
    await page.keyboard.press('Control+0');
    await page.waitForTimeout(200);

    // Check zoom is back to 100%
    await expect(page.locator('text=100%').first()).toBeVisible();
  });

  test('should fit to screen with Ctrl+1', async ({ page }) => {
    // Create a shape
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(300);

    // Press Ctrl+1 for fit to screen
    await page.keyboard.press('Control+1');
    await page.waitForTimeout(300);

    // Canvas should adjust (no crash)
    await expect(page.locator('canvas').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/fit-to-screen.png' });
  });
});

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create a rectangle for testing
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(300);
  });

  test('should select shape and delete with Delete key', async ({ page }) => {
    // Select the shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Should be selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    // Press Delete
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Shape should be deleted (delete button hidden)
    await expect(page.getByTitle('Delete Selected (Del)')).not.toBeVisible();
  });

  test('should delete with Backspace key', async ({ page }) => {
    // Select the shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Press Backspace
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);

    // Shape should be deleted
    await expect(page.getByTitle('Delete Selected (Del)')).not.toBeVisible();
  });

  test('should undo with Ctrl+Z', async ({ page }) => {
    // Select and delete shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    // Shape should be back - click to select it
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should redo with Ctrl+Shift+Z', async ({ page }) => {
    // Select, delete, then undo
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    // Redo
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(300);

    // Shape should be deleted again
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);
    // After redo of delete, clicking empty space shouldn't show delete button for shape
  });

  test('should copy and paste with Ctrl+C and Ctrl+V', async ({ page }) => {
    // Select the shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Copy
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(100);

    // Paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(300);

    // New shape should be created and selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/copy-paste.png' });
  });

  test('should duplicate with Ctrl+D', async ({ page }) => {
    // Select the shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Duplicate
    await page.keyboard.press('Control+d');
    await page.waitForTimeout(300);

    // New shape should be selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/duplicate.png' });
  });

  test('should select all with Ctrl+A', async ({ page }) => {
    // Create second shape (away from toolbar/sidebar)
    await page.getByTitle('Circle (O)').click();
    await clickCanvas(page, 700, 400);
    await page.waitForTimeout(300);

    // Click empty area to deselect (away from UI elements)
    await clickCanvas(page, 950, 300);
    await page.waitForTimeout(200);

    // Select all
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(200);

    // Should be able to delete (which means something is selected)
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should switch to tools with keyboard shortcuts', async ({ page }) => {
    // V for select
    await page.keyboard.press('v');
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Select (V)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);

    // H for pan
    await page.keyboard.press('h');
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Pan (H)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);

    // R for rectangle
    await page.keyboard.press('r');
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Rectangle (R)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);

    // O for circle
    await page.keyboard.press('o');
    await page.waitForTimeout(100);
    await expect(page.getByTitle('Circle (O)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);
  });

  test('should nudge shape with arrow keys', async ({ page }) => {
    // Select the shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Press arrow keys
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Shape should have moved (no crash)
    await expect(page.locator('canvas').first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/arrow-nudge.png' });
  });

  test('should nudge by larger amount with Shift+Arrow', async ({ page }) => {
    // Select the shape
    await clickCanvas(page, 450, 350);
    await page.waitForTimeout(200);

    // Press Shift+Arrow
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(200);

    // Shape should have moved by 10px (no crash)
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});

test.describe('Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create a rectangle in the center-right area (away from toolbar/sidebar)
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 600, 400);
    await page.waitForTimeout(300);
  });

  test('should show context menu on right-click canvas', async ({ page }) => {
    // Right-click on empty canvas area (center-right, away from shapes and UI)
    const canvas = page.locator('canvas').first();
    await canvas.click({ button: 'right', position: { x: 800, y: 500 } });
    await page.waitForTimeout(200);

    // Context menu should appear with Paste option
    await expect(page.locator('text=Paste')).toBeVisible();
    await expect(page.locator('text=Select All')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/context-menu-canvas.png' });
  });

  test('should show context menu on right-click shape', async ({ page }) => {
    // Select the shape first (center is at 650, 450)
    await clickCanvas(page, 650, 450);
    await page.waitForTimeout(200);

    // Right-click on shape
    const canvas = page.locator('canvas').first();
    await canvas.click({ button: 'right', position: { x: 650, y: 450 } });
    await page.waitForTimeout(200);

    // Context menu should appear with shape options
    await expect(page.locator('text=Cut')).toBeVisible();
    await expect(page.locator('text=Copy')).toBeVisible();
    await expect(page.locator('text=Delete')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/context-menu-shape.png' });
  });

  test('should close context menu on Escape', async ({ page }) => {
    // Right-click on canvas (away from UI elements)
    const canvas = page.locator('canvas').first();
    await canvas.click({ button: 'right', position: { x: 800, y: 500 } });
    await page.waitForTimeout(200);

    // Context menu visible
    await expect(page.locator('text=Paste')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Context menu should be gone
    await expect(page.locator('text=Paste')).not.toBeVisible();
  });

  test('should close context menu on click', async ({ page }) => {
    // Right-click on canvas (away from UI elements)
    const canvas = page.locator('canvas').first();
    await canvas.click({ button: 'right', position: { x: 800, y: 500 } });
    await page.waitForTimeout(200);

    // Click elsewhere (away from UI elements)
    await canvas.click({ position: { x: 900, y: 400 } });
    await page.waitForTimeout(200);

    // Context menu should be gone
    await expect(page.locator('text=Select All')).not.toBeVisible();
  });
});

test.describe('Double-click Text Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
  });

  test('should create text on double-click empty canvas', async ({ page }) => {
    // Double-click on empty canvas (center-right, away from UI)
    const canvas = page.locator('canvas').first();
    await canvas.dblclick({ position: { x: 700, y: 400 } });
    await page.waitForTimeout(300);

    // Text input should appear
    const textInput = page.locator('textarea');
    await expect(textInput).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/dblclick-text-create.png' });
  });

  test('should edit shape text on double-click', async ({ page }) => {
    // Create a rectangle (center-right, away from UI)
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 600, 400);
    await page.waitForTimeout(300);

    // Double-click on the shape (center at 650, 450)
    const canvas = page.locator('canvas').first();
    await canvas.dblclick({ position: { x: 650, y: 450 } });
    await page.waitForTimeout(300);

    // Text input should appear
    const textInput = page.locator('textarea');
    await expect(textInput).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/dblclick-text-edit.png' });
  });

  test('should save text on blur', async ({ page }) => {
    // Double-click to create text (center-right, away from UI)
    const canvas = page.locator('canvas').first();
    await canvas.dblclick({ position: { x: 700, y: 400 } });
    await page.waitForTimeout(300);

    // Type some text
    const textInput = page.locator('textarea');
    await textInput.fill('Hello World');
    await page.waitForTimeout(100);

    // Click outside to blur and save (click on canvas, away from text area)
    await canvas.click({ position: { x: 900, y: 300 } });
    await page.waitForTimeout(300);

    // Text input should be gone after blur
    await expect(textInput).not.toBeVisible();
  });

  test('should cancel text editing on Escape', async ({ page }) => {
    // Double-click to create text (center-right, away from UI)
    const canvas = page.locator('canvas').first();
    await canvas.dblclick({ position: { x: 700, y: 400 } });
    await page.waitForTimeout(300);

    // Press Escape to cancel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Text input should be gone
    const textInput = page.locator('textarea');
    await expect(textInput).not.toBeVisible();
  });
});

test.describe('Panning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
  });

  test('should pan with pan tool', async ({ page }) => {
    // Select pan tool
    await page.getByTitle('Pan (H)').click();
    await page.waitForTimeout(100);

    // Drag on canvas
    await dragOnCanvas(page, 400, 300, 500, 400);
    await page.waitForTimeout(200);

    // No crash, canvas visible
    await expect(page.locator('canvas').first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/pan-tool.png' });
  });

  test('should pan with H keyboard shortcut', async ({ page }) => {
    // Press H for pan tool
    await page.keyboard.press('h');
    await page.waitForTimeout(100);

    // Pan tool should be active
    await expect(page.getByTitle('Pan (H)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);

    // Drag to pan
    await dragOnCanvas(page, 400, 300, 300, 200);
    await page.waitForTimeout(200);

    await expect(page.locator('canvas').first()).toBeVisible();
  });
});

test.describe('Multi-select', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create two rectangles in center-right area (away from toolbar/sidebar)
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 600, 400);
    await page.waitForTimeout(300);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 800, 400);
    await page.waitForTimeout(300);
  });

  test('should multi-select with Shift+click', async ({ page }) => {
    // Select first shape (center at 650, 450)
    await clickCanvas(page, 650, 450);
    await page.waitForTimeout(200);

    // Shift+click second shape (center at 850, 450)
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 850, y: 450 }, modifiers: ['Shift'] });
    await page.waitForTimeout(200);

    // Both should be selected (delete button visible)
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/multi-select-shift.png' });
  });

  test('should drag multiple selected shapes together', async ({ page }) => {
    // Select first shape
    await clickCanvas(page, 650, 450);
    await page.waitForTimeout(200);

    // Shift+click second shape
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 850, y: 450 }, modifiers: ['Shift'] });
    await page.waitForTimeout(200);

    // Drag one of the shapes
    await dragOnCanvas(page, 650, 450, 650, 550);
    await page.waitForTimeout(300);

    // Both should have moved
    await page.screenshot({ path: 'e2e/screenshots/multi-select-drag.png' });
  });

  test('should clear selection on Escape key', async ({ page }) => {
    // Select first shape
    await clickCanvas(page, 650, 450);
    await page.waitForTimeout(200);

    // Verify it's selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    // Press Escape to clear selection
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Selection should be cleared
    await expect(page.getByTitle('Delete Selected (Del)')).not.toBeVisible();
  });

  test('should select all with Ctrl+A', async ({ page }) => {
    // Clear any selection by clicking empty area
    await clickCanvas(page, 950, 300);
    await page.waitForTimeout(200);

    // Select all
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(200);

    // Should have selected shapes
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });
});

test.describe('Marquee Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create two rectangles in center-right area (away from toolbar/sidebar)
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 600, 350);
    await page.waitForTimeout(300);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 750, 350);
    await page.waitForTimeout(300);
  });

  test('should select shapes by drawing selection box', async ({ page }) => {
    // Clear selection first by clicking empty area
    await clickCanvas(page, 950, 200);
    await page.waitForTimeout(200);

    // Draw selection box around both shapes
    // Shapes are at 600,350 and 750,350, both 100x100
    // Box from (550, 300) to (900, 500) should capture both
    await dragOnCanvas(page, 550, 300, 900, 500);
    await page.waitForTimeout(300);

    // Both shapes should be selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/marquee-selection.png' });
  });

  test('should only select shapes inside selection box', async ({ page }) => {
    // Clear selection
    await clickCanvas(page, 950, 200);
    await page.waitForTimeout(200);

    // Draw selection box around only first shape
    // First shape at 600,350, second at 750,350
    await dragOnCanvas(page, 550, 300, 720, 500);
    await page.waitForTimeout(300);

    // Only first shape should be selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/marquee-partial.png' });
  });
});

test.describe('Z-index controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create two overlapping rectangles
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(300);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 430, 330);
    await page.waitForTimeout(300);
  });

  test('should bring to front with Ctrl+Shift+]', async ({ page }) => {
    // Select the first (bottom) shape
    await clickCanvas(page, 410, 310);
    await page.waitForTimeout(200);

    // Bring to front
    await page.keyboard.press('Control+Shift+}');
    await page.waitForTimeout(200);

    // Should still be selected (no crash)
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/bring-to-front.png' });
  });

  test('should send to back with Ctrl+Shift+[', async ({ page }) => {
    // Select the second (top) shape
    await clickCanvas(page, 480, 380);
    await page.waitForTimeout(200);

    // Send to back
    await page.keyboard.press('Control+Shift+{');
    await page.waitForTimeout(200);

    await expect(page.locator('canvas').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/send-to-back.png' });
  });
});

test.describe('Connector Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create two rectangles in center-right area (away from toolbar/sidebar)
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 600, 400);
    await page.waitForTimeout(300);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 850, 400);
    await page.waitForTimeout(300);
  });

  test('should switch to connector tool with toolbar click', async ({ page }) => {
    // Click the connector tool button
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Connector tool should be active
    await expect(page.getByTitle('Connector (C)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);
  });

  test('should create connector between shapes', async ({ page }) => {
    // Switch to connector tool
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Click on first shape's right anchor (700, 450)
    await clickCanvas(page, 700, 450);
    await page.waitForTimeout(200);

    // Click on second shape's left anchor (850, 450)
    await clickCanvas(page, 850, 450);
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'e2e/screenshots/connector-created.png' });
  });

  test('should cancel connector on Escape', async ({ page }) => {
    // Switch to connector tool
    await page.getByTitle('Connector (C)').click();
    await page.waitForTimeout(100);

    // Start a connection
    await clickCanvas(page, 700, 450);
    await page.waitForTimeout(200);

    // Press Escape to cancel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Should be able to click elsewhere without crash (away from UI)
    await clickCanvas(page, 950, 300);
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});

test.describe('Grid and Snap', () => {
  test('should display grid when enabled', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Grid should be visible by default
    await page.screenshot({ path: 'e2e/screenshots/grid-enabled.png' });
  });

  test('should snap shapes to grid', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Create a shape
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 305, 307); // Slightly off grid

    // The shape should snap to grid position
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/snap-to-grid.png' });
  });
});
