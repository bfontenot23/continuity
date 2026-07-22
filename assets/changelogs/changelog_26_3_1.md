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
- Marquee selection now includes branches and correctly becomes a replacement selection if Shift is released before drop.
- Adjacent (or normalized non-adjacent) chapter selections now support copy/cut/paste into an existing timeline insertion point or a valid new-timeline location; pasted branches are intentionally excluded.
- Branch and chapter placement on an empty, valid grid location can create a new timeline automatically.

## Improvements

- The edit panel is now a 75%-height floating card on large screens.
- Holding Alt while resizing a textbox, shape, or image locks its original aspect ratio.
- Escape cancels active chapter, branch, and line insertion modes.
- Default textbox height is larger.

## Bug Fixes

- Fixed branches incorrectly giving outdated version message when attached to the head or tail of a timeline.
