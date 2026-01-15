# Continuity - AI Coding Agent Instructions

## Project Overview
A TypeScript web app for planning interconnected stories with branching timelines. Uses vanilla TS with Vite (no frameworks), Canvas API for visualization, and localStorage for persistence. `.cty` files are JSON-based story project exports.

## Architecture

### Core Modules (public/src/)
- **types.ts**: Data models (`Project`, `Continuity`, `Arc`, `Chapter`). All entities use `generateId()` for unique IDs. Factory functions (`createProject()`, etc.) are the standard way to create entities.
- **state.ts**: `AppStateManager` is the single source of truth. All mutations go through its methods (`addChapter()`, `updateContinuity()`, etc.), which auto-notify listeners and update `project.modified` timestamp.
- **fileManager.ts**: Handles `.cty` file import/export (JSON serialization) and localStorage operations. Key pattern: `ContinuityFileManager` for files, `LocalStorageManager` for browser storage.
- **ui.ts**: Component builders return HTMLElements. No framework - direct DOM manipulation. 1,297 lines of pure UI logic.
- **canvas.ts**: `TimelineCanvas` class manages the visual timeline editor with pan/zoom. Stores viewport state (`offsetX`, `offsetY`, `zoom`).
- **main.ts**: Entry point. Creates `AppStateManager`, sets up listeners, and renders UI on state changes.

### Data Flow Pattern
```
User Action → UI Event Handler (ui.ts) → State Method (state.ts) 
→ Update Data Model → Notify Listeners → Auto-save localStorage 
→ Re-render UI → DOM Update
```

### State Management Rules
1. **Never** directly mutate `AppState` properties. Always use `AppStateManager` methods.
2. State changes trigger `notifyListeners()` which causes full UI re-renders via `renderUI()`.
3. Canvas viewport is preserved across re-renders using `lastViewport` capture/restore pattern (see [main.ts](public/src/main.ts#L60-L65)).

## Development Workflow

### Commands
```bash
npm run dev         # Vite dev server on localhost:3000 with HMR
npm run build       # TypeScript compile + Vite build → public/dist/
npm run preview     # Preview production build on localhost:4173
npm run type-check  # TypeScript validation (no emit)
```

### Build Configuration
- **Root**: `public/` directory (see [vite.config.ts](vite.config.ts#L4))
- **Output**: `public/dist/` (configured in both Vite and Firebase)
- **Entry**: `public/index.html` includes `<script type="module" src="src/main.ts"></script>`

### Deployment
Uses Firebase Hosting. Deploy with `firebase deploy` after `npm run build`. See [DEPLOYMENT.md](DEPLOYMENT.md) for full process.

## Code Patterns

### Entity Creation
```typescript
// Always use factory functions from types.ts
const project = createProject("My Story");
const continuity = createContinuity("Main Timeline");
const arc = createArc("Act 1", 0);
const chapter = createChapter("Chapter 1", arcId, timestamp, order);
```

### State Updates
```typescript
// Correct: Use state manager methods
stateManager.addChapter(continuityId, chapter);
stateManager.updateChapter(continuityId, chapterId, { title: "New Title" });

// Wrong: Direct mutation
state.currentProject.continuities[0].chapters.push(chapter); // DON'T DO THIS
```

### UI Component Pattern
UI components are functions that return HTMLElements. Event handlers are attached before returning:
```typescript
static createButton(label: string, onClick: () => void): HTMLElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
```

### Sidebar Management
Edit sidebars (right panel) are managed via `currentEditSidebar` variable. Always call `closeSidebar()` before showing a new one to prevent multiple overlays. See [main.ts](public/src/main.ts#L30-L35).

## Key Conventions

### File Paths
Source files live in `public/src/`, not root `src/`. HTML entry point is `public/index.html`.

### Styling
No CSS frameworks. All styles in `UIComponents.createStyles()` in [ui.ts](public/src/ui.ts). Uses CSS Grid for layout, custom properties for theming.

### Error Handling
File imports validate structure in `ContinuityFileManager.importProject()`. Show user-friendly error messages via modals (see `createModal()` pattern in ui.ts).

### TypeScript
Strict mode enabled. All functions have explicit return types. Interfaces (not types) for data models. Optional properties use `?:` notation.

## Testing Strategy
No automated tests currently. Manual testing workflow:
1. Run dev server
2. Test create/edit/delete operations for projects, continuities, arcs, chapters
3. Test import/export of `.cty` files
4. Verify localStorage auto-save (check browser DevTools → Application → Local Storage)
5. Test canvas pan/zoom and timeline visualization

## Common Tasks

### Adding a New Entity Type
1. Define interface in [types.ts](public/src/types.ts)
2. Add factory function (follow `createChapter` pattern)
3. Add CRUD methods to [state.ts](public/src/state.ts) `AppStateManager`
4. Create UI components in [ui.ts](public/src/ui.ts)
5. Wire event handlers in [main.ts](public/src/main.ts)

### Modifying Data Model
When changing `Project`, `Continuity`, etc. interfaces:
1. Update [types.ts](public/src/types.ts)
2. Update factory functions
3. Check migration needs for existing `.cty` files (add validation in `ContinuityFileManager.importProject()`)
4. Update example file: [example-project.cty](example-project.cty)

### Adding Firebase Features
Currently uses only Firebase Hosting. To add Auth, Firestore, etc.:
1. Update [firebase.json](firebase.json) with service config
2. Install Firebase SDK: `npm install firebase`
3. Initialize in main.ts before app render
4. Replace `LocalStorageManager` with Firestore queries

## Gotchas

- **Canvas viewport drift**: Always capture viewport before re-render, restore after canvas recreation. Pattern in [main.ts](public/src/main.ts#L63-L67).
- **Lost sidebar state**: Edit sidebars are destroyed on re-render. Preserve unsaved changes in temp state before `closeSidebar()` if needed.
- **ID collisions**: `generateId()` uses timestamp + random. Low collision risk but not cryptographically secure.
- **localStorage limits**: Browser limit ~5-10MB. Large projects may hit this. Consider chunking or external storage.
- **TypeScript path**: Vite resolves `src/` from `public/` directory, not project root.

## Resources
- Architecture details: [ARCHITECTURE.md](ARCHITECTURE.md)
- User guide: [README.md](README.md)
- Deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
- Example data: [example-project.cty](example-project.cty)
