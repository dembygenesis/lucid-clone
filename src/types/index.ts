// Basic shape types
export type BasicShapeType = 'rectangle' | 'circle' | 'diamond' | 'text';

// Kubernetes shape types
export type K8sShapeType =
  | 'k8s-pod'
  | 'k8s-deployment'
  | 'k8s-service'
  | 'k8s-ingress'
  | 'k8s-configmap'
  | 'k8s-secret'
  | 'k8s-pv'
  | 'k8s-pvc'
  | 'k8s-statefulset'
  | 'k8s-daemonset'
  | 'k8s-job'
  | 'k8s-cronjob'
  | 'k8s-namespace'
  | 'k8s-node'
  | 'k8s-hpa'
  | 'k8s-networkpolicy';

export type ShapeType = BasicShapeType | K8sShapeType;

export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

export interface AnchorPoint {
  position: AnchorPosition;
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  label?: string; // For K8s shapes - the name shown below icon
}

export type ConnectorStyle = 'straight' | 'elbow' | 'curved';
export type ArrowHead = 'none' | 'arrow' | 'diamond' | 'circle';

export interface Connector {
  id: string;
  fromShapeId: string;
  toShapeId: string;
  fromAnchor: AnchorPosition;
  toAnchor: AnchorPosition;
  stroke: string;
  strokeWidth: number;
  style: ConnectorStyle;
  startArrow: ArrowHead;
  endArrow: ArrowHead;
  label?: string;
}

export interface DiagramSettings {
  backgroundColor: string;
  gridEnabled: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface Diagram {
  id: string;
  name: string;
  shapes: Shape[];
  connectors: Connector[];
  settings: DiagramSettings;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramListItem {
  id: string;
  name: string;
  updatedAt: string;
  thumbnail?: string;
}

export type Tool =
  | 'select'
  | 'pan'
  | 'connector'
  | BasicShapeType
  | K8sShapeType;

// Connection state for drawing connectors
export interface ConnectionState {
  isConnecting: boolean;
  fromShapeId: string | null;
  fromAnchor: AnchorPosition | null;
  currentX: number;
  currentY: number;
}

export const DEFAULT_SETTINGS: DiagramSettings = {
  backgroundColor: '#ffffff',
  gridEnabled: true,
  snapToGrid: true,
  gridSize: 20,
};

export const DEFAULT_SHAPE_STYLE = {
  fill: '#4f46e5',
  stroke: '#3730a3',
  strokeWidth: 2,
};

export const DEFAULT_CONNECTOR_STYLE = {
  stroke: '#6b7280',
  strokeWidth: 2,
  style: 'straight' as ConnectorStyle,
  startArrow: 'none' as ArrowHead,
  endArrow: 'arrow' as ArrowHead,
};

// K8s shape metadata
export interface K8sShapeMeta {
  type: K8sShapeType;
  label: string;
  category: 'workload' | 'network' | 'config' | 'storage' | 'cluster';
  defaultWidth: number;
  defaultHeight: number;
  color: string;
}

export const K8S_SHAPES: K8sShapeMeta[] = [
  // Workloads
  { type: 'k8s-pod', label: 'Pod', category: 'workload', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-deployment', label: 'Deployment', category: 'workload', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-statefulset', label: 'StatefulSet', category: 'workload', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-daemonset', label: 'DaemonSet', category: 'workload', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-job', label: 'Job', category: 'workload', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-cronjob', label: 'CronJob', category: 'workload', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  // Network
  { type: 'k8s-service', label: 'Service', category: 'network', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-ingress', label: 'Ingress', category: 'network', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-networkpolicy', label: 'NetworkPolicy', category: 'network', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  // Config
  { type: 'k8s-configmap', label: 'ConfigMap', category: 'config', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-secret', label: 'Secret', category: 'config', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  // Storage
  { type: 'k8s-pv', label: 'PersistentVolume', category: 'storage', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  { type: 'k8s-pvc', label: 'PVC', category: 'storage', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
  // Cluster
  { type: 'k8s-namespace', label: 'Namespace', category: 'cluster', defaultWidth: 100, defaultHeight: 100, color: '#326CE5' },
  { type: 'k8s-node', label: 'Node', category: 'cluster', defaultWidth: 100, defaultHeight: 100, color: '#326CE5' },
  { type: 'k8s-hpa', label: 'HPA', category: 'cluster', defaultWidth: 80, defaultHeight: 80, color: '#326CE5' },
];

// Helper to get K8s shape metadata
export function getK8sShapeMeta(type: K8sShapeType): K8sShapeMeta | undefined {
  return K8S_SHAPES.find(s => s.type === type);
}

// Helper to check if shape type is K8s
export function isK8sShape(type: ShapeType): type is K8sShapeType {
  return type.startsWith('k8s-');
}

// Helper to calculate anchor points for a shape
export function getShapeAnchors(shape: Shape): AnchorPoint[] {
  const { x, y, width, height } = shape;
  return [
    { position: 'top', x: x + width / 2, y: y },
    { position: 'right', x: x + width, y: y + height / 2 },
    { position: 'bottom', x: x + width / 2, y: y + height },
    { position: 'left', x: x, y: y + height / 2 },
  ];
}

// Helper to get specific anchor point
export function getAnchorPoint(shape: Shape, anchor: AnchorPosition): { x: number; y: number } {
  const { x, y, width, height } = shape;
  switch (anchor) {
    case 'top':
      return { x: x + width / 2, y: y };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    case 'left':
      return { x: x, y: y + height / 2 };
  }
}

// Helper to find nearest anchor to a point
export function findNearestAnchor(
  shape: Shape,
  pointX: number,
  pointY: number,
  maxDistance: number = 20
): AnchorPoint | null {
  const anchors = getShapeAnchors(shape);
  let nearest: AnchorPoint | null = null;
  let minDist = maxDistance;

  for (const anchor of anchors) {
    const dist = Math.sqrt(
      Math.pow(anchor.x - pointX, 2) + Math.pow(anchor.y - pointY, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = anchor;
    }
  }

  return nearest;
}
