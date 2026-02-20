// Local storage implementation using IndexedDB
// Can be swapped for API-based service later

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Diagram, DiagramListItem, DEFAULT_SETTINGS } from '../types';
import { DiagramService } from './types';
import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';

interface LucidDB extends DBSchema {
  diagrams: {
    key: string;
    value: Diagram & { thumbnail?: string };
    indexes: { 'by-updated': string };
  };
}

let dbPromise: Promise<IDBPDatabase<LucidDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<LucidDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LucidDB>('lucid-clone', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('diagrams', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
        }
        // Version 2: Added thumbnail field (no schema change needed for IndexedDB)
      },
    });
  }
  return dbPromise;
}

export const localDiagramService: DiagramService = {
  async list(): Promise<DiagramListItem[]> {
    const db = await getDB();
    const diagrams = await db.getAllFromIndex('diagrams', 'by-updated');
    return diagrams
      .reverse()
      .map(({ id, name, updatedAt, thumbnail }) => ({
        id,
        name,
        updatedAt,
        thumbnail,
      }));
  },

  async get(id: string): Promise<Diagram | null> {
    const db = await getDB();
    const diagram = await db.get('diagrams', id);
    return diagram || null;
  },

  async create(name: string = 'Untitled Diagram'): Promise<Diagram> {
    const db = await getDB();
    const now = new Date().toISOString();
    const diagram: Diagram = {
      id: uuidv4(),
      name,
      shapes: [],
      connectors: [],
      settings: DEFAULT_SETTINGS,
      createdAt: now,
      updatedAt: now,
    };
    await db.put('diagrams', diagram);
    return diagram;
  },

  async save(diagram: Diagram): Promise<void> {
    const db = await getDB();
    const updated = {
      ...diagram,
      updatedAt: new Date().toISOString(),
    };
    await db.put('diagrams', updated);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('diagrams', id);
  },

  async exportJSON(id: string): Promise<string> {
    const diagram = await this.get(id);
    if (!diagram) throw new Error('Diagram not found');
    return JSON.stringify(diagram, null, 2);
  },

  async importJSON(json: string): Promise<Diagram> {
    const data = JSON.parse(json);
    const diagram: Diagram = {
      ...data,
      id: uuidv4(), // Generate new ID to avoid conflicts
      updatedAt: new Date().toISOString(),
    };
    const db = await getDB();
    await db.put('diagrams', diagram);
    return diagram;
  },

  async exportPNG(_id: string, stageRef: Konva.Stage): Promise<Blob> {
    if (!stageRef) throw new Error('Stage reference required');

    return new Promise((resolve, reject) => {
      try {
        stageRef.toBlob({
          callback: (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate PNG'));
            }
          },
          mimeType: 'image/png',
          pixelRatio: 2, // Higher quality
        });
      } catch (e) {
        reject(e);
      }
    });
  },

  async generateThumbnail(stageRef: Konva.Stage): Promise<string> {
    if (!stageRef) return '';

    try {
      // Generate smaller thumbnail
      const dataUrl = stageRef.toDataURL({
        pixelRatio: 0.3, // Lower quality for thumbnail
        mimeType: 'image/jpeg',
        quality: 0.6,
      });
      return dataUrl;
    } catch (e) {
      console.warn('Failed to generate thumbnail:', e);
      return '';
    }
  },
};

// Helper to save diagram with thumbnail
export async function saveDiagramWithThumbnail(
  diagram: Diagram,
  stageRef?: Konva.Stage
): Promise<void> {
  const db = await getDB();
  let thumbnail: string | undefined;

  if (stageRef) {
    try {
      thumbnail = await localDiagramService.generateThumbnail(stageRef);
    } catch (e) {
      // Thumbnail generation failed, continue without it
    }
  }

  const updated = {
    ...diagram,
    thumbnail,
    updatedAt: new Date().toISOString(),
  };
  await db.put('diagrams', updated);
}
