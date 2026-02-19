import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Diagram, DiagramListItem, DEFAULT_SETTINGS } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface LucidDB extends DBSchema {
  diagrams: {
    key: string;
    value: Diagram;
    indexes: { 'by-updated': string };
  };
}

let dbPromise: Promise<IDBPDatabase<LucidDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<LucidDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LucidDB>('lucid-clone', 1, {
      upgrade(db) {
        const store = db.createObjectStore('diagrams', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

export async function listDiagrams(): Promise<DiagramListItem[]> {
  const db = await getDB();
  const diagrams = await db.getAllFromIndex('diagrams', 'by-updated');
  return diagrams
    .reverse()
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }));
}

export async function getDiagram(id: string): Promise<Diagram | undefined> {
  const db = await getDB();
  return db.get('diagrams', id);
}

export async function createDiagram(name: string = 'Untitled Diagram'): Promise<Diagram> {
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
}

export async function saveDiagram(diagram: Diagram): Promise<void> {
  const db = await getDB();
  diagram.updatedAt = new Date().toISOString();
  await db.put('diagrams', diagram);
}

export async function deleteDiagram(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('diagrams', id);
}

export async function exportDiagram(id: string): Promise<string> {
  const diagram = await getDiagram(id);
  if (!diagram) throw new Error('Diagram not found');
  return JSON.stringify(diagram, null, 2);
}

export async function importDiagram(json: string): Promise<Diagram> {
  const diagram: Diagram = JSON.parse(json);
  diagram.id = uuidv4(); // Generate new ID to avoid conflicts
  diagram.updatedAt = new Date().toISOString();
  const db = await getDB();
  await db.put('diagrams', diagram);
  return diagram;
}
