export type ControlScheme = 'pointer' | 'touch';

export interface ControlSchemeSignals {
  coarsePointer: boolean;
  hoverUnavailable: boolean;
  maxTouchPoints: number;
}

export function inferControlScheme(signals: ControlSchemeSignals): ControlScheme {
  return signals.maxTouchPoints > 0 && (signals.coarsePointer || signals.hoverUnavailable)
    ? 'touch'
    : 'pointer';
}

export function shouldAutoFocusEditor(autoFocus: boolean, scheme: ControlScheme | undefined): boolean {
  return autoFocus && scheme !== 'touch';
}

export function shouldAutoOpenCreationEditor(
  scheme: ControlScheme | undefined,
  viewportWidth: number,
  phoneBreakpoint = 720,
): boolean {
  return scheme !== 'touch' || viewportWidth > phoneBreakpoint;
}

export function installControlSchemeDetection(
  targetWindow: Window = window,
  targetDocument: Document = document,
): () => void {
  const coarseQuery = targetWindow.matchMedia('(pointer: coarse)');
  const hoverQuery = targetWindow.matchMedia('(hover: none)');
  let scheme = inferControlScheme({
    coarsePointer: coarseQuery.matches,
    hoverUnavailable: hoverQuery.matches,
    maxTouchPoints: targetWindow.navigator.maxTouchPoints ?? 0,
  });

  const apply = (next: ControlScheme) => {
    scheme = next;
    targetDocument.documentElement.dataset.controlScheme = next;
  };
  apply(scheme);

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') apply('touch');
    else if (event.pointerType === 'mouse') apply('pointer');
  };
  const handleMediaChange = () => apply(inferControlScheme({
    coarsePointer: coarseQuery.matches,
    hoverUnavailable: hoverQuery.matches,
    maxTouchPoints: targetWindow.navigator.maxTouchPoints ?? 0,
  }));

  targetDocument.addEventListener('pointerdown', handlePointerDown, true);
  coarseQuery.addEventListener?.('change', handleMediaChange);
  hoverQuery.addEventListener?.('change', handleMediaChange);

  return () => {
    targetDocument.removeEventListener('pointerdown', handlePointerDown, true);
    coarseQuery.removeEventListener?.('change', handleMediaChange);
    hoverQuery.removeEventListener?.('change', handleMediaChange);
  };
}
