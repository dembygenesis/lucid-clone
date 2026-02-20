// Service layer types - abstracts storage mechanism
// Can be backed by IndexedDB (local) or REST API (cloud)

import { Diagram, DiagramListItem } from '../types';

export interface DiagramService {
  list(): Promise<DiagramListItem[]>;
  get(id: string): Promise<Diagram | null>;
  create(name?: string): Promise<Diagram>;
  save(diagram: Diagram): Promise<void>;
  delete(id: string): Promise<void>;
  exportJSON(id: string): Promise<string>;
  importJSON(json: string): Promise<Diagram>;
  exportPNG(id: string, stageRef: any): Promise<Blob>;
  generateThumbnail(stageRef: any): Promise<string>;
}

export interface StorageConfig {
  type: 'local' | 'api';
  apiUrl?: string;
}

// For future real-time collaboration
export interface CollaborationService {
  connect(diagramId: string): void;
  disconnect(): void;
  onShapeUpdate(callback: (update: any) => void): void;
  onUserCursor(callback: (cursor: any) => void): void;
  sendShapeUpdate(update: any): void;
  sendCursorPosition(x: number, y: number): void;
}
