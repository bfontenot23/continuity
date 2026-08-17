# Continuity Version 26.3.1 Changelog

## What's New

\+ Timeline head and tail lengths can now be configured in grid units.
\+ Lines and branches support configurable stroke widths and a one-click endpoint-style flip control.
\+ The changelog dialog now includes earlier release notes.
\+ Added markdown-enabled shapes (square, circle, and triangle) with Shift+W insertion.
\+ Added portable embedded-image insertion with Shift+E, resizing, and alternative text editing.
\+ Added configurable touch double-tap timing, tap selection/editing, hold-to-drag and hold-to-marquee interactions with a visible progress ring, one-finger canvas panning, pinch zoom, and two/three-finger undo/redo gestures.
\+ Added browser-standard undo/redo shortcuts with a local 100-step history.
\+ Added initial selection support for chapters and floating elements, including multi-select, copy/cut/paste/delete, and grouped movement for textboxes, shapes, and images.
\+ Added Shift-drag marquee selection for chapters and floating elements.
\+ Added direct branch selection with modifier-key multi-select and a blue selection highlight.
\+ Expanded canvas selection feedback to timelines and lines, with Ctrl/Cmd+A support across canvas elements and Ctrl/Cmd-drag removal from chapter, floating-element, and line marquee selections.
\+ Delete and Backspace now remove mixed chapter, branch, line, textbox, shape, and image selections as a single undoable action.
\+ Standard copy, cut, and paste now work for mixed floating textbox, shape, image, and line selections, preserving one undo step per paste or cut.
\+ Selected lines now move together, with one undo entry for the grouped move.
\+ Dragging adjacent selected chapters now reorders the contiguous group together while preserving chapter order and branch anchors.
\+ Adjacent chapter groups now move as one visual block during drag and hide every insertion boundary occupied by the group.
\+ Marquee selection now includes branches and correctly becomes a replacement selection if Shift is released before drop.
\+ Adjacent (or normalized non-adjacent) chapter selections now support copy/cut/paste into an existing timeline insertion point or a valid new-timeline location; pasted branches are intentionally excluded.
\+ Repeated clicks on overlapping textboxes, shapes, or images now cycle through the stack while retaining Shift-add and Ctrl/Cmd-remove selection behavior.
\+ Repeated clicks also cycle through overlapping free lines without affecting endpoint editing.
\+ Overlapping branches now participate in repeat-click selection cycling while preserving their click-priority over chapters.
\+ Repeat-click selection cycling now crosses object types at the same canvas point while retaining branch-first priority.
\+ Repeat-click selection cycling now also reaches overlapping timelines, chapters, and arc-title runs of the same type.
\+ Dragging a selected timeline, including one selected through its head or tail, now moves every selected timeline together in one undoable action.
\+ Clicking an arc title now selects only the contiguous on-canvas arc segment represented by that title, including for non-continuous arcs.
\+ Marquee selection now also includes fully enclosed timelines, with Shift-add and Ctrl/Cmd-remove support.
\+ Dragging a selected textbox, shape, or image now also moves any selected lines and timelines as one undoable mixed-selection action.
\+ Dragging a selected line now moves selected textboxes, shapes, images, and timelines with the same mixed-selection behavior.
\+ Dragging a selected timeline now likewise moves selected textboxes, shapes, images, and lines as one grouped action.
\+ Dragging a selected chapter from a cross-timeline or mixed selection now moves its associated timelines; same-timeline chapter-only selections continue to reorder locally.
\+ Dragging a selected branch now moves its endpoint timelines together with the rest of the associated selection.
\+ Selecting another canvas object now closes an active editor; modifier double-clicks remain selection-only.
\+ Selected timelines now support standard copy, cut, paste, and delete behavior with remapped timeline, arc, and chapter identifiers. Branches are pasted only when both endpoint timelines were copied.
\+ Timeline clipboard operations now include selected textboxes, shapes, images, and lines in the same paste and undo step.
\+ Cut chapter and floating-element selections now retain their clipboard payload after the canvas rebuilds.
\+ Selection groups now survive state-driven canvas rebuilds, and pasted timelines, chapters, and floating elements become the active selection.
\+ Branch and chapter placement on an empty, valid grid location can create a new timeline automatically.
\+ Branch and chapter placement now previews the new timeline and connection before an empty-grid click.
\+ Shapes now support RGBA fill and outline colors, configurable outline width, clipped centered text, and rotation.
\+ Edit sidebars now remain stable during live canvas redraws.
\+ Selected textboxes, images, and shapes now display persistent resize nodes and an upper-left rotation control that work with mouse and touch input.
\+ Rotation now magnetizes near common angles, with a project setting to disable snapping for unrestricted precision.
\+ Touch creation tools now display step-aware canvas guidance for timelines, chapters, branches, lines, textboxes, shapes, and images.
\+ Phone-sized touch layouts now keep newly created items selected without automatically opening the editor sheet.
\+ Ctrl/Cmd+S now opens an in-app choice to save the project as a PNG image or portable .cty file.

## Improvements

\+ The edit panel is now a 75%-height floating card on large screens.
\+ Holding Alt while resizing a textbox, shape, or image locks its original aspect ratio.
\+ Escape cancels active timeline, chapter, branch, textbox, shape, image, and line placement modes.
\+ Default textbox height is larger.
\+ Undo and redo history now retains 100 actions.
\+ Touchscreen control detection now adapts the controls on hybrid devices, while small screens use safe-area-aware sizing, an accessible compact header, and a full-height editor sheet instead of the cramped bottom panel.

## Bug Fixes

- Fixed branches incorrectly giving outdated version message when attached to the head or tail of a timeline.
- Fixed object selection being lost when the click also closed an active editor.
- Fixed group drags collapsing to a single object when dragging an object that was already selected.
- Fixed the second click in an overlap-selection cycle opening the editor instead of selecting the next object.
- Fixed Ctrl/Cmd-click arc deselection also starting an arc reorder.
- Fixed rebuilt canvases retaining stale keyboard shortcuts, resize listeners, and animation loops.
- Fixed new-timeline collision checks so they reserve space for the chapter or pasted chapter group that will be created.
- Fixed timeline-centered cuts deleting separately selected chapters or branches that were not represented in the clipboard.
- Fixed live timeline and chapter titles waiting for a later canvas refresh.
- Fixed valid branches attached to an empty timeline endpoint showing the legacy-branch warning.
- Fixed iOS zooming or shifting the page when a touch editor automatically focused a small form field.
- Fixed Shift-clicking disjoint chapters collapsing the selection before a drag actually begins.
- Fixed marquee selection around a timeline Head or Tail failing to select or deselect the complete timeline.
- Fixed branch-only Cut doing nothing; it now removes the selected branches and clears the canvas clipboard.
- Replaced intrusive browser alerts for cross-timeline chapter copy/cut attempts with a temporary red canvas notice.
- Fixed branches failing to follow their chapter anchors when an arc was reordered by dragging its title.
