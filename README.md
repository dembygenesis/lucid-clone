# Lucid Clone

Real-time collaborative diagramming tool. Pure frontend with Rust WebAssembly core.

## Quick Start

### Prerequisites

- Node.js 18+
- Rust + wasm-pack (for WASM development)

```bash
# Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
cargo install wasm-pack

# Add WASM target
rustup target add wasm32-unknown-unknown
```

### Running Locally

```bash
# Clone the repo
git clone https://github.com/dembygenesis/lucid-clone.git
cd lucid-clone

# Install dependencies
npm install

# Build WASM module (first time / when Rust code changes)
npm run wasm:build

# Start dev server
npm run dev
```

Open http://localhost:5173

### Development Commands

```bash
# Start dev server
npm run dev

# Build WASM (one-time)
npm run wasm:build

# Watch WASM changes (requires cargo-watch)
npm run wasm:dev

# Run tests
npm test

# Build for production
npm run build
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  React + Konva.js (UI)                                       │
│    └── Zustand (State)                                       │
│          └── Rust WASM (Core Logic)                          │
│                └── IndexedDB (Persistence)                   │
└─────────────────────────────────────────────────────────────┘
```

**No backend required.** Everything runs in the browser:
- **Rust WASM**: Core diagram engine (shapes, connectors, snapping)
- **React + Konva**: Canvas rendering and UI
- **IndexedDB**: Local persistence (diagrams saved in browser)
- **Zustand**: State management

## Features

- Infinite canvas with pan/zoom
- Shapes: Rectangle, Circle, Diamond, Text
- Drag, resize, rotate shapes
- Grid snapping
- Auto-save to IndexedDB
- Export diagrams as JSON

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 18 + TypeScript |
| Canvas | Konva.js (React-Konva) |
| State | Zustand |
| Core | Rust -> WebAssembly |
| Storage | IndexedDB (idb) |
| Build | Vite + wasm-pack |

## Project Structure

```
lucid-clone/
├── src/
│   ├── components/       # React components
│   │   ├── Canvas.tsx    # Konva canvas
│   │   ├── Toolbar.tsx   # Tool selection
│   │   ├── Editor.tsx    # Diagram editor page
│   │   └── Dashboard.tsx # Diagram list
│   ├── store/            # Zustand store
│   ├── types/            # TypeScript types
│   ├── utils/            # IndexedDB helpers
│   └── wasm/pkg/         # Built WASM module
├── wasm/
│   ├── Cargo.toml
│   └── src/lib.rs        # Rust WASM core
├── package.json
└── vite.config.ts
```

## License

MIT
