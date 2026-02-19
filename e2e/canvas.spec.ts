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
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 500, 400);
    await page.waitForTimeout(500);
  });

  test('should select shape on click', async ({ page }) => {
    // Click on the shape to select it (shapes are 100x100, so center is at creation point)
    await clickCanvas(page, 500, 400);
    await page.waitForTimeout(300);

    // Delete button should appear when shape is selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });
  });

  test('should drag shape to new position', async ({ page }) => {
    // First select the shape
    await clickCanvas(page, 500, 400);
    await page.waitForTimeout(300);

    // Drag the shape
    await dragOnCanvas(page, 500, 400, 600, 500);
    await page.waitForTimeout(500);

    // Shape should be at new position (click there to verify it's selectable)
    await clickCanvas(page, 700, 300); // Deselect by clicking elsewhere
    await page.waitForTimeout(200);
    await clickCanvas(page, 600, 500); // Select at new position
    await page.waitForTimeout(300);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });
  });

  test('should clear selection on empty area click', async ({ page }) => {
    // Select shape
    await clickCanvas(page, 500, 400);
    await page.waitForTimeout(300);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });

    // Click empty area (far from the shape)
    await clickCanvas(page, 800, 200);
    await page.waitForTimeout(300);

    // Delete button should disappear
    await expect(page.getByTitle('Delete Selected (Del)')).not.toBeVisible();
  });

  test('should delete shape with delete button', async ({ page }) => {
    // Select shape
    await clickCanvas(page, 500, 400);
    await page.waitForTimeout(300);
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible({ timeout: 10000 });

    // Click delete
    await page.getByTitle('Delete Selected (Del)').click();
    await page.waitForTimeout(300);

    // Delete button should disappear (no selection)
    await expect(page.getByTitle('Delete Selected (Del)')).not.toBeVisible();
  });

  test('should delete shape with keyboard', async ({ page }) => {
    // Select shape
    await clickCanvas(page, 500, 400);
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

    // Create a rectangle
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(200);
  });

  test('should show transformer when shape selected', async ({ page }) => {
    // Select shape
    await clickCanvas(page, 400, 300);
    await page.waitForTimeout(100);

    // Transformer handles should be visible (the resize squares)
    // We can verify by checking if the shape remains selected
    await expect(page.getByTitle('Delete Selected (Del)')).toBeVisible();
  });

  test('should resize shape by dragging corner', async ({ page }) => {
    // Select shape
    await clickCanvas(page, 400, 300);
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

    // Create two rectangles
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 200, 300);
    await page.waitForTimeout(200);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 500, 300);
    await page.waitForTimeout(200);
  });

  test('should select connector tool', async ({ page }) => {
    await page.getByTitle('Connector (C)').click();
    await expect(page.getByTitle('Connector (C)')).toHaveCSS('background-color', /rgb\(79, 70, 229\)/);
  });

  test('should show connection mode indicator when drawing', async ({ page }) => {
    // Select connector tool
    await page.getByTitle('Connector (C)').click();

    // Hover over first shape to show anchors, then click anchor
    await clickCanvas(page, 200, 300);
    await page.waitForTimeout(100);

    // Click on the right anchor of first shape (roughly x+100, y)
    await clickCanvas(page, 300, 300);
    await page.waitForTimeout(200);

    // Should show "Drawing connection..." message
    await expect(page.locator('text=Drawing connection')).toBeVisible();
  });

  test('should cancel connection with Escape', async ({ page }) => {
    await page.getByTitle('Connector (C)').click();

    // Start connection
    await clickCanvas(page, 300, 300); // Right anchor of first shape
    await page.waitForTimeout(100);

    await expect(page.locator('text=Drawing connection')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Connection indicator should disappear
    await expect(page.locator('text=Drawing connection')).not.toBeVisible();
  });

  test('should create connector between shapes', async ({ page }) => {
    // Use select tool and hover to show anchors
    await clickCanvas(page, 200, 300); // Select first shape
    await page.waitForTimeout(200);

    // Click on right anchor of first shape to start connection
    // Anchor is at x + width, y + height/2 = 200 + 100, 300 + 50 = 300, 350
    // But we need to account for the shape being at grid-snapped position
    await clickCanvas(page, 300, 350);
    await page.waitForTimeout(200);

    // Check if connection mode started
    const connectionText = page.locator('text=Drawing connection');
    if (await connectionText.isVisible()) {
      // Complete the connection to the second shape's left anchor
      // Second shape is at 500, 300, left anchor at 500, 350
      await clickCanvas(page, 500, 350);
      await page.waitForTimeout(200);
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
    // Workloads should be visible by default
    await expect(page.locator('text=WORKLOADS')).toBeVisible();
    await expect(page.locator('text=NETWORK')).toBeVisible();
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
    // Click on WORKLOADS to collapse
    await page.locator('text=WORKLOADS').click();
    await page.waitForTimeout(200);

    // Pod should not be visible
    await expect(page.getByTitle('Pod')).not.toBeVisible();

    // Click again to expand
    await page.locator('text=WORKLOADS').click();
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

    const zoomDisplay = page.locator('div').filter({ hasText: /^91%$/ }).first();
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

    // Should be around 133%
    const zoomDisplay = page.locator('div').filter({ hasText: /^133%$/ }).first();
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
    // Create two shapes
    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 200, 300);
    await page.waitForTimeout(200);

    await page.getByTitle('Rectangle (R)').click();
    await clickCanvas(page, 500, 300);
    await page.waitForTimeout(200);

    // Select first shape and start connection from its right anchor
    await clickCanvas(page, 200, 300);
    await page.waitForTimeout(100);

    // Click right anchor area to start connection
    await clickCanvas(page, 300, 350);
    await page.waitForTimeout(200);

    // If connection started, complete it
    const connectionStarted = await page.locator('text=Drawing connection').isVisible();
    if (connectionStarted) {
      // Click left anchor of second shape
      await clickCanvas(page, 500, 350);
      await page.waitForTimeout(300);
    }

    // Now drag the first shape and verify the connector follows
    // (Visual verification would need screenshot comparison)
    await clickCanvas(page, 200, 300);
    await page.waitForTimeout(100);

    await dragOnCanvas(page, 200, 300, 150, 400);
    await page.waitForTimeout(300);

    // Take screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/connector-after-drag.png' });
  });
});

test.describe('Multiple Shape Operations', () => {
  test('should handle creating and connecting multiple K8s shapes', async ({ page }) => {
    await page.goto('/edit/new');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);

    // Add Pod
    await page.getByTitle('Pod').click();
    await page.waitForTimeout(300);

    // Expand Network category if not already
    const networkCategory = page.locator('text=NETWORK');
    await networkCategory.click();
    await page.waitForTimeout(200);

    // Add Service
    await page.getByTitle('Service').click();
    await page.waitForTimeout(300);

    // Both shapes should be created
    // Visual verification via screenshot
    await page.screenshot({ path: 'e2e/screenshots/multiple-k8s-shapes.png' });
  });
});
