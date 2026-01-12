# Continuity - Story Planner & Timeline Manager

A web app for planning interconnected stories with branching continuities, arcs, and chapters. Perfect for writers managing complex narrative structures with multiple timelines and story branches.

## Features

- **Multiple Continuities**: Create and manage multiple story timelines within a single project
- **Visual Timelines**: See chapters organized into arcs with a clean visual interface
- **Chapter Management**: Add, edit, and organize chapters with titles, descriptions, and content
- **Arc Organization**: Group chapters into story arcs for better structure
- **Custom File Format**: Save projects as `.cty` files (JSON-based format)
- **Import/Export**: Easily import existing projects and export your work
- **Local Storage**: Auto-saves progress to browser local storage
- **Responsive Design**: Works on desktop and tablet devices
- **No Database Required**: All data stored locally or in .cty files

## Project Structure

```
continuity/
├── src/
│   ├── main.ts          # Application entry point
│   ├── types.ts         # Core data models and interfaces
│   ├── state.ts         # State management system
│   ├── fileManager.ts   # File import/export and storage
│   └── ui.ts            # UI component builders and styling
├── public/
│   └── index.html       # Main HTML template
├── firebase.json        # Firebase hosting configuration
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
└── example-project.cty  # Example project file
```

## Quick Start

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

This starts a Vite dev server on `http://localhost:3000` with hot module reloading.

### Building

Build for production:

```bash
npm run build
```

Output is generated in `public/dist/`

### Type Checking

Check for TypeScript errors:

```bash
npm run type-check
```

## Usage

### Creating a Project

1. Click "New Project" to create a new project
2. Give your project a title
3. Click "New Continuity" to add a story timeline
4. Add chapters to your continuity
5. Organize chapters into arcs

### Working with Continuities

Each continuity represents an independent or branching timeline:

- **Create**: Click the "+" button to add a new continuity
- **Edit**: Click on a continuity to select it
- **Delete**: (Right-click or delete button in continuity options)
- **Color**: Each continuity has a unique color for easy visual identification

### Managing Chapters

Chapters are the individual story beats:

- **Add**: Click "Add Chapter" to create a new chapter
- **Edit**: Select a chapter to edit its properties
- **Timeline Position**: Use the timestamp field to order chapters non-linearly
- **Arcs**: Assign chapters to different story arcs
- **Content**: Write and store chapter content directly in the app

### Managing Arcs

Arcs are visual groupings of chapters (e.g., "Introduction", "Rising Action", "Climax"):

- **Add**: Click "Add Arc" to create a new arc within a continuity
- **Organize**: Chapters are displayed under their parent arc
- **Custom Names**: Give arcs meaningful names for your story structure

### Exporting & Importing

**Export**: Click "Export" to download your project as a `.cty` file
- Format: JSON with `.cty` extension
- Contains: All continuities, chapters, arcs, and metadata
- Use: Backup, share with collaborators, or version control

**Import**: Click "Import" to load a previously saved `.cty` file
- Supports: `.cty` and `.json` files
- Effect: Loads the project and makes it the active project

### Viewing Timeline

The main timeline view shows:

- All arcs in the selected continuity
- All chapters organized by arc
- Visual chapter cards with title and timeline position
- Click any chapter to edit its details in the right panel

### Editor Panel

The right panel allows editing selected chapter details:

- **Title**: Chapter name
- **Timeline Position**: Numeric position for ordering
- **Description**: Brief summary of the chapter
- **Content**: Full chapter content/notes

## Data Model

### Project
```typescript
{
  id: string;
  title: string;
  description?: string;
  created: number;        // Unix timestamp
  modified: number;       // Unix timestamp
  continuities: Continuity[];
}
```

### Continuity
```typescript
{
  id: string;
  name: string;
  description?: string;
  color?: string;         // Hex color code
  chapters: Chapter[];
  arcs: Arc[];
  branches: ContinuityBranch[];  // Future feature
}
```

### Chapter
```typescript
{
  id: string;
  title: string;
  description?: string;
  content?: string;
  timestamp: number;      // Timeline position
  arcId: string;          // Reference to parent arc
  order: number;
}
```

### Arc
```typescript
{
  id: string;
  name: string;
  description?: string;
  order: number;          // Visual order
}
```

## .cty File Format

`.cty` files are JSON documents containing the complete project structure:

```json
{
  "id": "project-id",
  "title": "Project Title",
  "created": 1705056000000,
  "modified": 1705056000000,
  "continuities": [...]
}
```

To manually create a `.cty` file:
1. Create a JSON file with valid Project structure
2. Rename with `.cty` extension
3. Import into the app

## Deployment

This project is configured for Firebase Hosting:

### Prerequisites
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project initialized

### Deploy

```bash
npm run build
firebase deploy
```

Your app will be live at your Firebase hosting URL.

## Local Storage

The app automatically saves your current project to browser local storage. To manually manage:

- **Auto-save**: Happens on every change
- **Clear**: Use browser dev tools to clear local storage
- **Export**: Always export important projects as `.cty` files

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Features

- **Branch & Merge Visualization**: Visual representation of story branches and merge points
- **Collaboration**: Real-time collaborative editing
- **Publishing**: Export to multiple formats (PDF, EPUB, etc.)
- **Analytics**: Statistics about your project (word counts, chapter distribution)
- **Templates**: Pre-built project templates and story structures
- **Version History**: Track changes over time
- **Advanced Search**: Find chapters by content or metadata

## Technical Stack

- **Frontend**: TypeScript, Vite
- **Styling**: CSS with responsive design
- **Storage**: Browser Local Storage + .cty files
- **Deployment**: Firebase Hosting
- **Build Tool**: Vite 5.x
- **Language**: TypeScript 5.x

## Development Notes

- No external UI frameworks; custom CSS for simplicity and control
- Modular architecture with separation of concerns
- Type-safe with strict TypeScript configuration
- Responsive design that adapts to screen sizes

## License

This project is open source and available for personal and commercial use.

## Contributing

To contribute to this project:

1. Create a branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request with a description of changes

## Support

For issues or questions:
1. Check the example project file
2. Review the data model in `src/types.ts`
3. Check browser console for error messages
4. Verify `.cty` file format is valid JSON
