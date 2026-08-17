export interface SaveShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  preventDefault(): void;
}

/** Route the platform-standard save shortcut into Continuity's export chooser. */
export function handleSaveShortcut(
  event: SaveShortcutEvent,
  hasProject: boolean,
  openExportChooser: () => void,
): boolean {
  if (!hasProject || (!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 's') return false;
  event.preventDefault();
  openExportChooser();
  return true;
}
