import { describe, it, expect } from 'vitest';
import {
  getShapeAnchors,
  getAnchorPoint,
  findNearestAnchor,
  isK8sShape,
  getK8sShapeMeta,
  K8S_SHAPES,
  Shape,
  DEFAULT_SETTINGS,
  DEFAULT_SHAPE_STYLE,
  DEFAULT_CONNECTOR_STYLE,
} from './index';

describe('Type helpers', () => {
  const mockShape: Shape = {
    id: 'test-shape',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 100,
    height: 80,
    rotation: 0,
    fill: '#4f46e5',
    stroke: '#3730a3',
    strokeWidth: 2,
  };

  describe('getShapeAnchors', () => {
    it('should return 4 anchor points', () => {
      const anchors = getShapeAnchors(mockShape);
      expect(anchors).toHaveLength(4);
    });

    it('should return correct top anchor', () => {
      const anchors = getShapeAnchors(mockShape);
      const top = anchors.find((a) => a.position === 'top');
      expect(top).toEqual({ position: 'top', x: 150, y: 100 });
    });

    it('should return correct right anchor', () => {
      const anchors = getShapeAnchors(mockShape);
      const right = anchors.find((a) => a.position === 'right');
      expect(right).toEqual({ position: 'right', x: 200, y: 140 });
    });

    it('should return correct bottom anchor', () => {
      const anchors = getShapeAnchors(mockShape);
      const bottom = anchors.find((a) => a.position === 'bottom');
      expect(bottom).toEqual({ position: 'bottom', x: 150, y: 180 });
    });

    it('should return correct left anchor', () => {
      const anchors = getShapeAnchors(mockShape);
      const left = anchors.find((a) => a.position === 'left');
      expect(left).toEqual({ position: 'left', x: 100, y: 140 });
    });

    it('should handle shapes at origin', () => {
      const originShape: Shape = { ...mockShape, x: 0, y: 0 };
      const anchors = getShapeAnchors(originShape);
      const top = anchors.find((a) => a.position === 'top');
      expect(top).toEqual({ position: 'top', x: 50, y: 0 });
    });

    it('should handle shapes with different dimensions', () => {
      const wideShape: Shape = { ...mockShape, width: 200, height: 50 };
      const anchors = getShapeAnchors(wideShape);
      const right = anchors.find((a) => a.position === 'right');
      expect(right).toEqual({ position: 'right', x: 300, y: 125 });
    });
  });

  describe('getAnchorPoint', () => {
    it('should return top anchor point', () => {
      const point = getAnchorPoint(mockShape, 'top');
      expect(point).toEqual({ x: 150, y: 100 });
    });

    it('should return right anchor point', () => {
      const point = getAnchorPoint(mockShape, 'right');
      expect(point).toEqual({ x: 200, y: 140 });
    });

    it('should return bottom anchor point', () => {
      const point = getAnchorPoint(mockShape, 'bottom');
      expect(point).toEqual({ x: 150, y: 180 });
    });

    it('should return left anchor point', () => {
      const point = getAnchorPoint(mockShape, 'left');
      expect(point).toEqual({ x: 100, y: 140 });
    });
  });

  describe('findNearestAnchor', () => {
    it('should find nearest anchor within default distance', () => {
      const nearest = findNearestAnchor(mockShape, 152, 102);
      expect(nearest?.position).toBe('top');
    });

    it('should return null if no anchor within distance', () => {
      const nearest = findNearestAnchor(mockShape, 0, 0);
      expect(nearest).toBeNull();
    });

    it('should respect custom max distance', () => {
      const nearest = findNearestAnchor(mockShape, 180, 100, 50);
      expect(nearest?.position).toBe('top');
    });

    it('should find closest anchor when multiple are nearby', () => {
      // Point near the right anchor
      const nearest = findNearestAnchor(mockShape, 195, 140);
      expect(nearest?.position).toBe('right');
    });

    it('should handle edge cases with zero distance', () => {
      const nearest = findNearestAnchor(mockShape, 150, 100, 0);
      expect(nearest).toBeNull();
    });

    it('should find anchor exactly at the point', () => {
      const nearest = findNearestAnchor(mockShape, 150, 100, 1);
      expect(nearest?.position).toBe('top');
    });
  });

  describe('isK8sShape', () => {
    it('should return true for K8s shape types', () => {
      expect(isK8sShape('k8s-pod')).toBe(true);
      expect(isK8sShape('k8s-deployment')).toBe(true);
      expect(isK8sShape('k8s-service')).toBe(true);
      expect(isK8sShape('k8s-ingress')).toBe(true);
      expect(isK8sShape('k8s-configmap')).toBe(true);
      expect(isK8sShape('k8s-secret')).toBe(true);
      expect(isK8sShape('k8s-pv')).toBe(true);
      expect(isK8sShape('k8s-pvc')).toBe(true);
      expect(isK8sShape('k8s-statefulset')).toBe(true);
      expect(isK8sShape('k8s-daemonset')).toBe(true);
      expect(isK8sShape('k8s-job')).toBe(true);
      expect(isK8sShape('k8s-cronjob')).toBe(true);
      expect(isK8sShape('k8s-namespace')).toBe(true);
      expect(isK8sShape('k8s-node')).toBe(true);
      expect(isK8sShape('k8s-hpa')).toBe(true);
      expect(isK8sShape('k8s-networkpolicy')).toBe(true);
    });

    it('should return false for basic shape types', () => {
      expect(isK8sShape('rectangle')).toBe(false);
      expect(isK8sShape('circle')).toBe(false);
      expect(isK8sShape('diamond')).toBe(false);
      expect(isK8sShape('text')).toBe(false);
    });
  });

  describe('getK8sShapeMeta', () => {
    it('should return metadata for valid K8s shapes', () => {
      const podMeta = getK8sShapeMeta('k8s-pod');
      expect(podMeta).toBeDefined();
      expect(podMeta?.label).toBe('Pod');
      expect(podMeta?.category).toBe('workload');
      expect(podMeta?.color).toBe('#326CE5');
    });

    it('should return correct categories', () => {
      expect(getK8sShapeMeta('k8s-deployment')?.category).toBe('workload');
      expect(getK8sShapeMeta('k8s-service')?.category).toBe('network');
      expect(getK8sShapeMeta('k8s-configmap')?.category).toBe('config');
      expect(getK8sShapeMeta('k8s-pv')?.category).toBe('storage');
      expect(getK8sShapeMeta('k8s-namespace')?.category).toBe('cluster');
    });

    it('should return undefined for non-K8s shapes', () => {
      // @ts-expect-error - Testing invalid input
      const meta = getK8sShapeMeta('rectangle');
      expect(meta).toBeUndefined();
    });
  });

  describe('K8S_SHAPES constant', () => {
    it('should have all 16 K8s shapes', () => {
      expect(K8S_SHAPES).toHaveLength(16);
    });

    it('should have shapes in all categories', () => {
      const categories = new Set(K8S_SHAPES.map((s) => s.category));
      expect(categories.size).toBe(5);
      expect(categories).toContain('workload');
      expect(categories).toContain('network');
      expect(categories).toContain('config');
      expect(categories).toContain('storage');
      expect(categories).toContain('cluster');
    });

    it('should have valid dimensions for all shapes', () => {
      for (const shape of K8S_SHAPES) {
        expect(shape.defaultWidth).toBeGreaterThan(0);
        expect(shape.defaultHeight).toBeGreaterThan(0);
      }
    });

    it('should have valid colors for all shapes', () => {
      for (const shape of K8S_SHAPES) {
        expect(shape.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('Default constants', () => {
    it('should have valid DEFAULT_SETTINGS', () => {
      expect(DEFAULT_SETTINGS.backgroundColor).toBe('#ffffff');
      expect(DEFAULT_SETTINGS.gridEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.snapToGrid).toBe(true);
      expect(DEFAULT_SETTINGS.gridSize).toBe(20);
    });

    it('should have valid DEFAULT_SHAPE_STYLE', () => {
      expect(DEFAULT_SHAPE_STYLE.fill).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(DEFAULT_SHAPE_STYLE.stroke).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(DEFAULT_SHAPE_STYLE.strokeWidth).toBeGreaterThan(0);
    });

    it('should have valid DEFAULT_CONNECTOR_STYLE', () => {
      expect(DEFAULT_CONNECTOR_STYLE.stroke).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(DEFAULT_CONNECTOR_STYLE.strokeWidth).toBeGreaterThan(0);
      expect(DEFAULT_CONNECTOR_STYLE.style).toBe('straight');
      expect(DEFAULT_CONNECTOR_STYLE.startArrow).toBe('none');
      expect(DEFAULT_CONNECTOR_STYLE.endArrow).toBe('arrow');
    });
  });
});
