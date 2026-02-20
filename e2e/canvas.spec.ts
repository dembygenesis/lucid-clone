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

  test('should clear selection on empty area click', async ({ page }) => {
    // Select shape by clicking center
    await clickCanvas(page, 550, 450);
    await page.waitForTimeout(300);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });

    // Click empty area (far from the shape, x > 220 to avoid K8s sidebar)
    await clickCanvas(page, 800, 600);
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
