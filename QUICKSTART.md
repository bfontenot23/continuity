# Continuity - Quick Start Guide

Get started with Continuity in just 5 minutes!

## 1. Start the Development Server

```bash
cd /Users/beaufontenot/continuity
npm run dev
```

Your browser will open at **http://localhost:3000**

## 2. Create Your First Project

1. Click **"New Project"**
2. Enter a project title (e.g., "My Story World")
3. Click confirm

## 3. Add a Continuity (Story Timeline)

1. Click the **"+"** button next to "Continuities" in the left sidebar
2. Enter a name (e.g., "Main Timeline")
3. Your first continuity is created!

## 4. Add an Arc (Story Structure)

1. Click **"Add Arc"** in the timeline panel
2. Name it something like "Act One"
3. Repeat to create "Act Two", "Act Three", etc.

## 5. Add Your First Chapter

1. Click **"Add Chapter"**
2. Select a chapter in the grid to edit it
3. Enter chapter details:
   - **Title**: Chapter name
   - **Timeline Position**: Numeric order
   - **Description**: Brief summary
   - **Content**: Full chapter text

## 6. Explore Features

### Manage Chapters
- Click any chapter card to edit it
- Change title, position, description, and content
- Click "Delete" to remove it

### Add More Continuities
- Click the "+" button for another story timeline
- Perfect for alternate timelines or parallel stories

### Save Your Work

**Automatic**: Your project is auto-saved to browser storage

**Manual**: Click **"Export"** to download a `.cty` file for backup

## 7. Import Previous Work

1. Click **"Import"**
2. Select a `.cty` file
3. Your project loads instantly

## Example Actions

### Create an Alternate Timeline
```
1. Add another continuity: "Alternate Timeline"
2. Add different chapters
3. See both timelines in the sidebar
```

### Organize Chapters in Arcs
```
1. Create Arc: "Introduction"
2. Add Chapter 1, 2, 3
3. Create Arc: "Climax"
4. Add Chapter 4, 5
5. Chapters group automatically
```

### Export Your Work
```
1. Click "Export"
2. File downloads as: Project-Title-[timestamp].cty
3. Save in your project folder
4. Load anytime with "Import"
```

## Keyboard Tips

- **Tab**: Navigate between fields
- **Escape**: Close dialogs
- **Cmd/Ctrl+S**: Browser save (saves to local storage)

## Troubleshooting

### App Won't Start
```bash
npm install
npm run dev
```

### Lost Your Work
- Projects are stored in browser local storage
- Export to `.cty` file for backup
- Clear cache if you see old data

### Want to Deploy to Web
See `DEPLOYMENT.md` for Firebase hosting setup

## File Locations

```
/Users/beaufontenot/continuity/
├── src/                  # Source code
├── public/               # Web assets
├── example-project.cty   # Sample project
├── README.md             # Full documentation
└── DEPLOYMENT.md         # Deployment guide
```

## Common Workflows

### Planning a Series
1. Create project: "My Series"
2. Add continuity per book
3. Create arcs for story structure
4. Add chapters for each scene
5. Export after each session

### Managing Branches
1. Create main timeline
2. Add alternate timeline for "what if"
3. Mark chapters where stories diverge
4. Compare timelines in visual view

### Collaborating
1. Export your work as .cty
2. Share file with collaborator
3. They import and modify
4. Merge changes manually or recreate

## Next Steps

- **Read**: [Full Documentation](README.md)
- **Deploy**: [Firebase Setup](DEPLOYMENT.md)
- **Learn More**: Check [Project Summary](PROJECT_SUMMARY.md)
- **View Example**: Import `example-project.cty`

## Pro Tips

1. **Regular Exports**: Export weekly as backup
2. **Arc Planning**: Plan arcs before chapters
3. **Timeline Positions**: Use consistent numbering
4. **Descriptions**: Write helpful chapter descriptions
5. **Color**: Each continuity has a unique color

## Support

- Check the browser console for errors (F12)
- Verify .cty files are valid JSON
- Try the example project to confirm setup
- Read detailed docs in README.md

---

**Ready to start writing?** Open http://localhost:3000 now!

Questions? See the full [README.md](README.md) for comprehensive documentation.
