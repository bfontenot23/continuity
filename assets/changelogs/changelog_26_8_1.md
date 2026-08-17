# Continuity 26.8.1

This release makes the canvas easier to edit across desktop and touch devices, with powerful multi-selection, new shapes and images, and more flexible styling and save options.

## What's New

### Select and edit multiple items

\+ Select chapters, timelines, branches, lines, textboxes, shapes, and images individually or as a group.
\+ Use Shift to add items to a selection, Ctrl/Cmd to remove them, Shift-drag a selection box around items, or press Ctrl/Cmd+A to select all canvas items.
\+ Move, copy, cut, paste, or delete mixed selections in a single action. Pasted items are selected automatically, making it easy to position them right away.
\+ Drag selected timelines and their connected content together. Adjacent chapters can also be reordered as a group without changing their order or breaking branch connections.
\+ Click repeatedly to cycle through overlapping items, including branches, lines, chapters, timelines, arc titles, textboxes, shapes, and images.
\+ Click an arc title to select the visible, continuous section represented by that title.

When copying timelines, branches are included only if both connected timelines are part of the selection. Chapter groups can be pasted into an existing timeline or used to create a new one, but their branches are not copied.

### Touch-friendly canvas controls

\+ Tap to select or edit, hold to drag or begin a selection box, and follow the new progress ring for hold gestures.
\+ Pan with one finger, pinch to zoom, and use two- or three-finger gestures for undo and redo.
\+ Adjust the double-tap timing in project settings.
\+ Creation tools now show step-by-step guidance for timelines, chapters, branches, lines, textboxes, shapes, and images.
\+ Phone layouts now use a full-height editor sheet and keep newly created items selected without immediately opening the editor.

### Shapes, images, and styling

\+ Add markdown-enabled squares, circles, and triangles with Shift+W. Shapes support fill and outline colors, outline width, centered text, and rotation.
\+ Add portable embedded images with Shift+E, then resize them or edit their alternative text.
\+ Selected textboxes, shapes, and images now have persistent resize handles and a rotation control that work with mouse or touch.
\+ Hold Alt while resizing to preserve an item's aspect ratio.
\+ Rotation snaps near common angles by default. You can turn snapping off in project settings for precise placement.
\+ Customize line and branch width, quickly flip endpoint styles, and set timeline head and tail lengths in grid units.

### Editing and saving

\+ Undo and redo now use standard browser shortcuts and remember up to 100 actions.
\+ Press Ctrl/Cmd+S to save your project as either a PNG image or a portable `.cty` file.
\+ Placing a chapter or branch in a valid empty area can create a new timeline automatically, with a preview shown before placement.
\+ Press Escape to cancel any active placement tool.
\+ The changelog now includes notes from earlier releases.

## Improvements

- The editing panel is now a floating card on larger screens and adapts more reliably to hybrid touchscreen devices.
- Canvas selections are preserved during redraws, and editor panels remain stable while changes appear live.
- Textboxes now start at a more useful height.
- Selecting another canvas item closes the current editor, while modifier double-clicks remain selection-only.

## Bug Fixes

- Branches connected to the head or tail of a timeline no longer incorrectly display an outdated-version warning.
