export type ShapeType = 'rectangle' | 'circle' | 'diamond' | 'text';

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
}

export interface Connector {
  id: string;
  fromShapeId: string;
  toShapeId: string;
  fromAnchor: 'top' | 'right' | 'bottom' | 'left';
  toAnchor: 'top' | 'right' | 'bottom' | 'left';
  stroke: string;
  strokeWidth: number;
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
}

export type Tool = 'select' | 'rectangle' | 'circle' | 'diamond' | 'text' | 'connector' | 'pan';

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
