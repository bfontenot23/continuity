# 📖 Continuity - Complete Project Architecture

## 🏗️ Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTINUITY APP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   UI Layer (ui.ts)                        │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐   │  │
│  │  │ Header/Nav   │ │ Sidebar      │ │ Timeline View   │   │  │
│  │  │ - New Project│ │ - Projects   │ │ - Arcs          │   │  │
│  │  │ - Export     │ │ - Continuity │ │ - Chapters      │   │  │
│  │  │ - Import     │ │   List       │ │ - Branch View   │   │  │
│  │  └──────────────┘ └──────────────┘ └─────────────────┘   │  │
│  │  ┌───────────────────────────────────────────────────┐   │  │
│  │  │      Editor Panel (Right Side)                   │   │  │
│  │  │ - Chapter Editor                                 │   │  │
│  │  │ - Arc Editor                                     │   │  │
│  │  │ - Chapter Content                                │   │  │
│  │  └───────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            ▲                                    │
│                            │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         State Management Layer (state.ts)               │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │  │
│  │  │ Project      │ │ Continuity   │ │ Chapter/Arc      │ │  │
│  │  │ Selection    │ │ Selection    │ │ Operations       │ │  │
│  │  │              │ │              │ │                  │ │  │
│  │  │ Actions:     │ │ Auto-saves   │ │ CRUD operations  │ │  │
│  │  │ - setProject │ │ to local     │ │                  │ │  │
│  │  │ - add/remove │ │ storage      │ │                  │ │  │
│  │  │ - update     │ │              │ │                  │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            ▲                                    │
│                            │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Data Models (types.ts)                       │  │
│  │                                                            │  │
│  │  Project ────┬──> Continuity ────┬──> Chapter            │  │
│  │              │                    │                       │  │
│  │              └──> Arc <───────────┴──> (assigned to)      │  │
│  │              │                                             │  │
│  │              └──> ContinuityBranch (future feature)       │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            ▲                                    │
│                            │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         I/O & Storage Layer (fileManager.ts)            │  │
│  │                                                            │  │
│  │  ┌─────────────────┐        ┌─────────────────────┐       │  │
│  │  │ .cty File I/O   │        │ Local Storage       │       │  │
│  │  │                 │        │                     │       │  │
│  │  │ - Export        │        │ - Auto-save         │       │  │
│  │  │ - Import        │        │ - Load on startup   │       │  │
│  │  │ - Parse JSON    │        │ - Projects list     │       │  │
│  │  │ - Validate      │        │ - Delete project    │       │  │
│  │  └─────────────────┘        └─────────────────────┘       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow

```
User Action (Click Button)
    ↓
UI Event Handler (ui.ts)
    ↓
State Manager Method (state.ts)
    ↓
Update State + Data Model
    ↓
Notify Listeners (UI Components)
    ↓
Auto-save to Local Storage (fileManager.ts)
    ↓
Render UI (ui.ts) → Update Browser DOM
    ↓
Visual Update on Screen
```

## 🗂️ Project File Structure

```
continuity/
│
├── src/                          # TypeScript Source Code
│   ├── main.ts                  # Entry point, initialization
│   ├── types.ts                 # Data models & interfaces
│   ├── state.ts                 # State management system
│   ├── fileManager.ts           # File I/O operations
│   └── ui.ts                    # UI components & styling
│
├── public/                       # Web Assets
│   ├── index.html               # Main HTML template
│   └── dist/                    # Built files (production)
│       ├── index.html
│       └── assets/
│           └── index-[hash].js
│
├── config files                 # Build & Deploy Config
│   ├── vite.config.ts          # Vite build configuration
│   ├── tsconfig.json           # TypeScript settings
│   ├── tsconfig.node.json      # TypeScript for build tools
│   └── firebase.json           # Firebase hosting config
│
├── dependencies                 # Project Metadata
│   ├── package.json            # npm dependencies & scripts
│   ├── package-lock.json       # Locked dependency versions
│   └── .gitignore              # Git exclusions
│
└── documentation               # User Guides
    ├── README.md               # Full documentation
    ├── QUICKSTART.md           # 5-minute setup guide
    ├── DEPLOYMENT.md           # Firebase deployment
    ├── PROJECT_SUMMARY.md      # Project overview
    └── example-project.cty     # Sample project file
```

## 🔄 Component Interaction Flow

```
┌─────────────────────────────────────────────────────┐
│ main.ts - Application Bootstrap                     │
│ - Initializes app container                         │
│ - Creates state manager                             │
│ - Loads styles                                      │
│ - Sets up event handlers                            │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ state.ts - State Manager                            │
│ - Manages application state                         │
│ - Provides methods for state updates                │
│ - Notifies listeners of changes                     │
│ - Auto-saves to localStorage                        │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ fileManager.ts - Storage Operations                 │
│ - .cty file import/export                           │
│ - localStorage read/write                           │
│ - JSON parsing & validation                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ types.ts - Data Models                              │
│ - Project interface                                 │
│ - Continuity interface                              │
│ - Chapter interface                                 │
│ - Arc interface                                     │
│ - Helper functions                                  │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ ui.ts - User Interface                              │
│ - Renders all components                            │
│ - Handles user interactions                         │
│ - Updates DOM based on state                        │
│ - Styles application                                │
└─────────────────────────────────────────────────────┘
```

## 📱 Key Features & Implementation

| Feature | Implementation | File(s) | Status |
|---------|----------------|---------|--------|
| Project Management | Create, load, save projects | state.ts, main.ts | ✅ |
| Continuities | Multiple timelines per project | types.ts, ui.ts | ✅ |
| Chapters | Individual story beats | types.ts, state.ts | ✅ |
| Arcs | Chapter grouping | types.ts, state.ts | ✅ |
| Auto-save | localStorage integration | fileManager.ts | ✅ |
| Import/Export | .cty file handling | fileManager.ts | ✅ |
| UI Rendering | Dynamic component creation | ui.ts | ✅ |
| Timeline View | Visual chapter display | ui.ts | ✅ |
| Branch View | Story divergence visualization | ui.ts | ✅ |
| Responsive Design | Mobile-friendly layout | ui.ts | ✅ |
| State Management | Reactive updates | state.ts | ✅ |

## 🚀 Deployment Pipeline

```
Development                  Production
─────────────────           ──────────────
npm run dev                 npm run build
    ↓                            ↓
Vite Dev Server         Vite Production Build
    ↓                            ↓
http://localhost:3000   public/dist/ folder
    ↓                            ↓
Hot reload              Minified JS/HTML
    ↓                            ↓
Source maps             Optimized bundle
                              ↓
                        firebase deploy
                              ↓
                        Firebase Hosting
                              ↓
                        https://your-app.web.app
```

## 💾 Data Persistence Layers

```
1. In-Memory (Current Session)
   ↓ State Manager holds data in RAM
   ↓
2. Local Storage (Automatic)
   ↓ Auto-saved on every change
   ↓
3. Browser Disk Cache
   ↓ .cty file in downloads
   ↓
4. Cloud Storage (Manual)
   ↓ Firebase, Google Drive, GitHub
```

## 🔌 API Overview

### Main Functions (public interface)

```typescript
// Project Management
createProject(title: string): Project
createContinuity(name: string): Continuity

// State Operations
stateManager.setProject(project)
stateManager.addContinuity(continuity)
stateManager.selectContinuity(continuityId)
stateManager.addChapter(continuityId, chapter)
stateManager.updateChapter(continuityId, chapterId, updates)

// File Operations
ContinuityFileManager.exportProject(project)
ContinuityFileManager.importProject(file)
LocalStorageManager.saveProject(project)
LocalStorageManager.loadProject(projectId)

// UI Components
UIComponents.createHeader(...)
UIComponents.createSidebar(...)
UIComponents.createMainContent(...)
UIComponents.createTimeline(...)
UIComponents.createStyles()
```

## 🎯 Key Design Decisions

1. **No External Frameworks**: Custom CSS and vanilla TypeScript for simplicity
2. **JSON-based .cty Format**: Human-readable, version-control friendly
3. **Local-First Approach**: All data stored locally, no server required
4. **Modular Architecture**: Each concern in separate file (separation of concerns)
5. **Type Safety**: Strict TypeScript for preventing bugs
6. **Auto-save**: Prevents data loss, no manual save needed
7. **Static Hosting**: Firebase Hosting for zero-cost deployment

## 🔮 Future Architecture Considerations

```
Current (Phase 1):          Future (Phase 2+):
─────────────────          ─────────────────

Local Storage      ─┐      Cloud Sync
    ↓              │           ↑
.cty Files    ←────┼────→  Real-time DB
    ↓              │           ↑
State Manager ─────┘      Collaboration
    ↓                           ↑
Browser Only            Multi-user Support
```

---

**Architecture created for scalability, maintainability, and rapid development.**

For implementation details, see individual files in `src/`.
