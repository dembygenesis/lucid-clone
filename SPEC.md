# Lucid Clone - MVP Specification

A real-time collaborative diagramming tool with settings backend.

---

## Overview

Lightweight Lucidchart alternative with real-time collaboration, shape manipulation, and persistent storage.

---

## MVP Features

### Canvas & Shapes
- [ ] Infinite canvas with pan/zoom
- [ ] Basic shapes: Rectangle, Circle, Diamond, Text
- [ ] Connectors/arrows between shapes
- [ ] Drag, resize, rotate shapes
- [ ] Multi-select and group operations
- [ ] Shape styling (fill color, stroke color, stroke width)

### Real-time Collaboration
- [ ] WebSocket-based sync
- [ ] See other users' cursors
- [ ] Live shape updates across clients
- [ ] Conflict resolution (last-write-wins for MVP)

### Settings Backend
- [ ] Save/load diagrams
- [ ] Diagram list (dashboard)
- [ ] Auto-save
- [ ] Export as PNG/JSON

### Auth (Simple)
- [ ] Anonymous sessions with shareable links
- [ ] Optional: Simple username for cursor labels

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Canvas | Konva.js (React-Konva) |
| State | Zustand |
| Real-time | Socket.io |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (simple, no setup) |
| ORM | Drizzle ORM |
| Testing | Vitest (frontend) + Jest (backend) |

---

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│                 │◄──────────────────►│                 │
│  React Client   │                    │  Express Server │
│  (Konva Canvas) │     REST API       │  (Socket.io)    │
│                 │◄──────────────────►│                 │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │     SQLite      │
                                       │   (diagrams,    │
                                       │    settings)    │
                                       └─────────────────┘
```

---

## Data Models

### Diagram
```typescript
interface Diagram {
  id: string;           // UUID
  name: string;
  shapes: Shape[];
  connectors: Connector[];
  settings: DiagramSettings;
  createdAt: Date;
  updatedAt: Date;
}
```

### Shape
```typescript
interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'diamond' | 'text';
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
```

### Connector
```typescript
interface Connector {
  id: string;
  fromShapeId: string;
  toShapeId: string;
  fromAnchor: 'top' | 'right' | 'bottom' | 'left';
  toAnchor: 'top' | 'right' | 'bottom' | 'left';
  stroke: string;
  strokeWidth: number;
}
```

### DiagramSettings
```typescript
interface DiagramSettings {
  backgroundColor: string;
  gridEnabled: boolean;
  snapToGrid: boolean;
  gridSize: number;
}
```

---

## API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/diagrams` | List all diagrams |
| POST | `/api/diagrams` | Create new diagram |
| GET | `/api/diagrams/:id` | Get diagram by ID |
| PUT | `/api/diagrams/:id` | Update diagram |
| DELETE | `/api/diagrams/:id` | Delete diagram |
| GET | `/api/diagrams/:id/export` | Export as PNG/JSON |

### WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join-diagram` | Client→Server | `{ diagramId }` | Join diagram room |
| `leave-diagram` | Client→Server | `{ diagramId }` | Leave diagram room |
| `shape-add` | Bidirectional | `Shape` | New shape added |
| `shape-update` | Bidirectional | `Partial<Shape>` | Shape modified |
| `shape-delete` | Bidirectional | `{ id }` | Shape removed |
| `cursor-move` | Bidirectional | `{ userId, x, y }` | Cursor position |
| `sync-state` | Server→Client | `Diagram` | Full state sync |

---

## Project Structure

```
lucid-clone/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/
│   │   │   ├── Toolbar/
│   │   │   ├── Sidebar/
│   │   │   └── Dashboard/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/
│   │   ├── socket/
│   │   ├── db/
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
├── shared/                 # Shared types
│   └── types.ts
├── SPEC.md
└── README.md
```

---

## Development Phases

### Phase 1: Foundation
1. Project setup (monorepo structure)
2. Basic Express server with SQLite
3. Basic React app with Konva canvas
4. Draw and move rectangles

### Phase 2: Core Features
1. All shape types
2. Shape styling panel
3. Connectors between shapes
4. Save/load diagrams (REST API)

### Phase 3: Real-time
1. Socket.io integration
2. Live shape sync
3. Cursor presence
4. Auto-save

### Phase 4: Polish
1. Dashboard view
2. Export functionality
3. Keyboard shortcuts
4. Undo/redo

---

## Running Locally

```bash
# Install dependencies
npm install

# Start development (runs both client and server)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Success Criteria (MVP)

1. Can create shapes on canvas
2. Can style and connect shapes
3. Multiple users see real-time updates
4. Diagrams persist after refresh
5. Tests pass
