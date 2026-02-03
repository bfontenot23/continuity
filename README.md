# Continuity

A lightweight, client-side story planning tool for writers managing complex narratives with multiple timelines and branching plots. Organize chapters into continuities, arcs, and interconnected timelines—all saved locally in your browser.

## Key Features

- **Multiple Timelines** – Create distinct story timelines and alternate narratives within one project
- **Interactive Canvas** – Drag-and-drop chapters, timelines, and annotations with pan and zoom controls
- **Arc Visualization** – Chapters grouped by narrative arcs with color coding
- **Rich Chapter Details** – Customizable title, timestamp, description, content, and grid width
- **Branches** – Visual connections between timelines showing narrative splits and merges
- **Annotations** – Add textboxes (markdown), lines, and visual connectors anywhere on canvas
- **Export Options** – Save as `.cty` files (JSON) or PNG images for backup and sharing
- **Keyboard Shortcuts** – Fast workflow with `Shift + [key]` shortcuts for all major actions
- **Auto-save** – Automatic local storage persistence—never lose your work
- **Lightweight** – Pure TypeScript, no frameworks or heavy dependencies

## Getting Started

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Opens automatically at `http://localhost:3000` with hot reload enabled.

### Build for Production

```bash
npm run build
```

Outputs optimized build to `dist/`.

### Type Check

```bash
npm run type-check
```

Validates TypeScript without emitting files.

## How to Use

### Create a New Project
1. Click **New Project** and enter a title
2. A project opens with one default continuity/timeline
3. Start adding chapters, arcs, and annotations

### Work with Timelines (Continuities)
Each continuity represents an independent timeline or narrative branch:
- **Add** – Press `Shift + T` or click menu button to create a new timeline
- **Edit** – Double-click a timeline name to edit title and description
- **Move** – Click and drag a timeline to reposition it on the canvas
- **Color** – Each timeline gets a unique color for easy identification

### Add Chapters
Chapters are individual story beats on your timeline:
- **Insert Mode** – Press `Shift + C` to toggle chapter insertion mode
- **Place Chapter** – While in insertion mode, click between two existing chapters to insert
- **Edit** – Double-click any chapter to edit title, description, content, and properties
- **Timestamp** – Automatically assigned to maintain story order
- **Grid Length** – Set custom chapter width (0 = auto-calculate from title length)
- **Arc Assignment** – Assign chapters to arcs via the chapter editor
- **Reorder** – Drag chapters left/right on the timeline to change order

### Organize with Arcs
Arcs group adjacent chapters into narrative sections (e.g., "Act 1", "Rising Action"):
- **Create** – Use the "Add Arc" button in the sidebar
- **Assign Chapters** – Select an arc in the chapter editor
- **Reorder** – Drag arc groups to rearrange
- **Color-Coded** – Each arc appears as a colored segment on the timeline

### Canvas Navigation
- **Pan** – Click and drag the background to move around
- **Zoom** – Scroll to zoom in/out
- **Insert Mode** – `Shift + C` for chapters, `Shift + B` for branches

### Add Annotations
**Textboxes** – Free-floating text notes with markdown support:
- **Add** – Press `Shift + S` to create a textbox at canvas center
- **Edit** – Double-click a textbox to edit content, size, and alignment
- **Move** – Click and drag to reposition anywhere on canvas
- **Resize** – Drag corner/edge handles to resize

**Lines** – Visual connectors between timeline elements:
- **Add** – Press `Shift + D` to toggle line insertion mode
- **Draw** – Click two points on the grid to create a line
- **Edit** – Double-click a line to change style (solid/dashed) and endpoints (dot/arrow/none)
- **Move** – Drag line endpoints to reposition

**Branches** – Connect chapters across different timelines:
- **Add** – Press `Shift + B` to toggle branch insertion mode
- **Draw** – Click a point on one timeline, then a point on another timeline
- **Edit** – Double-click a branch to change style and description
- **Visual** – Shows narrative branches and alternate timeline connections

### Export Your Work
Click **Export** to access export options:
- **`.cty` file** – JSON format for backup, sharing, or version control
- **PNG image** – Export the current canvas view as an image

**Import an existing project:**
1. Click **Import** on the header
2. Select a `.cty` or `.json` file
3. The project loads and becomes your active workspace

### Keyboard Shortcuts
- `Shift + T` – New Timeline
- `Shift + C` – Toggle Chapter Insertion Mode
- `Shift + B` – Toggle Branch Insertion Mode
- `Shift + S` – Add Textbox
- `Shift + D` – Toggle Line Insertion Mode

### Auto-save & Storage
- Every change instantly saves to your browser's local storage
- Closing and reopening the app restores your work
- **Backup important projects** by exporting as `.cty` files
- To clear all local storage, use browser DevTools → Application → Local Storage

## Data Model

### Project
The root container for your entire story project:
```typescript
{
  id: string;                    // Unique identifier
  title: string;                 // Project name
  description?: string;          // Optional summary
  created: number;               // Unix timestamp
  modified: number;              // Unix timestamp
  continuities: Continuity[];    // Array of timelines
  textboxes: Textbox[];          // Free-floating annotations
  lines: Line[];                 // Visual connector lines
}
```

### Continuity
An independent timeline or narrative branch within your project:
```typescript
{
  id: string;
  name: string;                  // Timeline name
  description?: string;
  color?: string;                // Hex color for UI
  x?: number;                    // Canvas X position
  y?: number;                    // Canvas Y position
  chapters: Chapter[];           // Story beats (ordered by timestamp)
  arcs: Arc[];                   // Narrative sections
  branches: Branch[];            // Connections to other timelines
}
```

### Chapter
A single story beat or scene:
```typescript
{
  id: string;
  title: string;
  description?: string;
  content?: string;              // Full chapter text
  timestamp: number;             // Order in timeline (integer)
  arcId?: string;                // Reference to parent arc (optional)
  gridLength?: number;           // Custom width on canvas (0 = auto)
}
```

### Arc
A narrative section organizing chapters visually:
```typescript
{
  id: string;
  name: string;                  // Arc title (e.g., "Act 2")
  description?: string;
  color: string;                 // Hex color for this arc
  order: number;                 // Visual order
}
```

### Textbox
Free-floating text annotation with markdown support:
```typescript
{
  id: string;
  content: string;               // Markdown content
  x: number;                     // World X position
  y: number;                     // World Y position
  width: number;                 // Width in pixels
  height: number;                // Height in pixels
  fontSize: number;              // Font size in pixels
  alignX?: 'left' | 'center' | 'right';
  alignY?: 'top' | 'middle' | 'bottom';
}
```

### Line
Visual connector line with grid-locked positions:
```typescript
{
  id: string;
  gridX1: number;                // Start grid X position
  gridY1: number;                // Start grid Y position
  gridX2: number;                // End grid X position
  gridY2: number;                // End grid Y position
  lineStyle?: 'solid' | 'dashed';
  startEndpointStyle?: 'dot' | 'arrow' | 'none';
  endEndpointStyle?: 'dot' | 'arrow' | 'none';
}
```

### Branch
Connection between chapters across different timelines:
```typescript
{
  id: string;
  description?: string;
  lineStyle?: 'solid' | 'dashed';
  startEndpointStyle?: 'dot' | 'arrow' | 'none';
  endEndpointStyle?: 'dot' | 'arrow' | 'none';
  startContinuityId: string;     // Source timeline
  startChapterId?: string;       // Source chapter (for recalc)
  startPosition: number;         // Grid position (0-based)
  endContinuityId: string;       // Target timeline
  endChapterId?: string;         // Target chapter (for recalc)
  endPosition: number;           // Grid position (0-based)
}
```

## .cty File Format

`.cty` files are JSON-serialized `Project` objects with a `.cty` extension:

```json
{
  "id": "proj_abc123xyz",
  "title": "My Epic Novel",
  "description": "A story of adventure",
  "created": 1705056000000,
  "modified": 1705140000000,
  "continuities": [
    {
      "id": "cont_xyz789abc",
      "name": "Main Timeline",
      "color": "#FF6B6B",
      "chapters": [...],
      "arcs": [...]
    }
  ]
}
```

**To create a `.cty` file manually:**
1. Create valid JSON following the `Project` schema
2. Save with `.cty` extension (or `.json` also works)
3. Import into the app via the Import button

## Deployment

Deploy to Cloudflare Pages:

```bash
npm run deploy
```

Or manually upload the `dist` directory to Cloudflare Pages, or connect your repository for automatic deployments.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Technical Stack

- **Language**: TypeScript 5.x
- **Build Tool**: Vite 5.x
- **Styling**: CSS with responsive design
- **Storage**: Browser local storage + `.cty` files
- **Deployment**: Cloudflare Pages
- **Architecture**: Pure TypeScript with listener-based state management (no frameworks)

## Development

- **No frameworks** – Custom CSS and DOM manipulation for simplicity and control
- **Type-safe** – Strict TypeScript configuration with `noUnusedLocals` and `noUnusedParameters`
- **Modular** – Clear separation between state, UI, and file management
- **Canvas-based** – HTML5 canvas for interactive timeline visualization

## License

Open source and available for personal and commercial use.

## Support & Troubleshooting

- **Lost work?** Check local storage in browser DevTools → Application → Local Storage
- **Import issues?** Verify `.cty` file format is valid JSON matching the Project schema
- **Canvas not responding?** Try clearing browser cache and reloading
- **TypeScript errors?** Run `npm run type-check` to validate the codebase
