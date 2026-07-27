# Continuity Version 26.3.1 Changelog

## What's New

- Timeline head and tail lengths can now be configured in grid units.
- Lines and branches support configurable stroke widths and a one-click endpoint-style flip control.
- The changelog dialog now includes earlier release notes.
- Added markdown-enabled shapes (square, circle, and triangle) with Shift+W insertion.
- Added portable embedded-image insertion with Shift+E, resizing, and alternative text editing.
- Added configurable touch double-tap timing, one-finger touch interaction, two-finger pan/pinch zoom, and two/three-finger undo/redo gestures.
- Added browser-standard undo/redo shortcuts with a local 20-step history.
- Added initial selection support for chapters and floating elements, including multi-select, copy/cut/paste/delete, and grouped movement for textboxes, shapes, and images.
- Added Shift-drag marquee selection for chapters and floating elements.
- Added direct branch selection with modifier-key multi-select and a blue selection highlight.
- Expanded canvas selection feedback to timelines and lines, with Ctrl/Cmd+A support across canvas elements and Ctrl/Cmd-drag removal from chapter, floating-element, and line marquee selections.
- Delete and Backspace now remove mixed chapter, branch, line, textbox, shape, and image selections as a single undoable action.
- Standard copy, cut, and paste now work for mixed floating textbox, shape, image, and line selections, preserving one undo step per paste or cut.
- Selected lines now move together, with one undo entry for the grouped move.
- Dragging adjacent selected chapters now reorders the contiguous group together while preserving chapter order and branch anchors.
- Adjacent chapter groups now move as one visual block during drag and hide every insertion boundary occupied by the group.
- Marquee selection now includes branches and correctly becomes a replacement selection if Shift is released before drop.
- Adjacent (or normalized non-adjacent) chapter selections now support copy/cut/paste into an existing timeline insertion point or a valid new-timeline location; pasted branches are intentionally excluded.
- Repeated clicks on overlapping textboxes, shapes, or images now cycle through the stack while retaining Shift-add and Ctrl/Cmd-remove selection behavior.
- Repeated clicks also cycle through overlapping free lines without affecting endpoint editing.
- Overlapping branches now participate in repeat-click selection cycling while preserving their click-priority over chapters.
- Repeat-click selection cycling now crosses object types at the same canvas point while retaining branch-first priority.
- Repeat-click selection cycling now also reaches overlapping timelines, chapters, and arc-title runs of the same type.
- Dragging a selected timeline, including one selected through its head or tail, now moves every selected timeline together in one undoable action.
- Clicking an arc title now selects only the contiguous on-canvas arc segment represented by that title, including for non-continuous arcs.
- Marquee selection now also includes fully enclosed timelines, with Shift-add and Ctrl/Cmd-remove support.
- Dragging a selected textbox, shape, or image now also moves any selected lines and timelines as one undoable mixed-selection action.
- Dragging a selected line now moves selected textboxes, shapes, images, and timelines with the same mixed-selection behavior.
- Dragging a selected timeline now likewise moves selected textboxes, shapes, images, and lines as one grouped action.
- Dragging a selected chapter from a cross-timeline or mixed selection now moves its associated timelines; same-timeline chapter-only selections continue to reorder locally.
- Dragging a selected branch now moves its endpoint timelines together with the rest of the associated selection.
- Selecting another canvas object now closes an active editor; modifier double-clicks remain selection-only.
- Selected timelines now support standard copy, cut, paste, and delete behavior with remapped timeline, arc, and chapter identifiers. Branches are pasted only when both endpoint timelines were copied.
- Timeline clipboard operations now include selected textboxes, shapes, images, and lines in the same paste and undo step.
- Cut chapter and floating-element selections now retain their clipboard payload after the canvas rebuilds.
- Selection groups now survive state-driven canvas rebuilds, and pasted timelines, chapters, and floating elements become the active selection.
- Branch and chapter placement on an empty, valid grid location can create a new timeline automatically.

## Improvements

- The edit panel is now a 75%-height floating card on large screens.
- Holding Alt while resizing a textbox, shape, or image locks its original aspect ratio.
- Escape cancels active chapter, branch, and line insertion modes.
- Default textbox height is larger.

## Bug Fixes

- Fixed branches incorrectly giving outdated version message when attached to the head or tail of a timeline.
- Fixed object selection being lost when the click also closed an active editor.
- Fixed group drags collapsing to a single object when dragging an object that was already selected.
- Fixed the second click in an overlap-selection cycle opening the editor instead of selecting the next object.
- Fixed Ctrl/Cmd-click arc deselection also starting an arc reorder.
- Fixed rebuilt canvases retaining stale keyboard shortcuts, resize listeners, and animation loops.
- Fixed new-timeline collision checks so they reserve space for the chapter or pasted chapter group that will be created.
- Fixed timeline-centered cuts deleting separately selected chapters or branches that were not represented in the clipboard.
