/** Canvas-only textbox rendering used by image export. */
import type { Textbox } from './types';

/**
 * Render textboxes directly onto a canvas (used for PNG export)
 */
export function renderTextboxesToCanvas(
ctx: CanvasRenderingContext2D,
textboxes: readonly Textbox[],
zoom: number,
offsetX: number,
offsetY: number,
): void {
  const padding = 8;
  textboxes.forEach((tb) => {
    const screenX = tb.x * zoom + offsetX;
    const screenY = tb.y * zoom + offsetY;
    const width = tb.width * zoom;
    const height = tb.height * zoom;

    // Text only (no background or outline)
    ctx.save();
    if (tb.rotation) {
      ctx.translate(screenX + width / 2, screenY + height / 2);
      ctx.rotate((tb.rotation * Math.PI) / 180);
      ctx.translate(-(screenX + width / 2), -(screenY + height / 2));
    }
    ctx.beginPath();
    if (tb.shapeType === 'circle') ctx.ellipse(screenX + width / 2, screenY + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    else if (tb.shapeType === 'triangle') {
      ctx.moveTo(screenX + width / 2, screenY); ctx.lineTo(screenX + width, screenY + height); ctx.lineTo(screenX, screenY + height); ctx.closePath();
    } else ctx.rect(screenX, screenY, width, height);
    ctx.clip();

    const fontSize = tb.fontSize * zoom;
    const lineHeight = tb.fontSize * 1.4 * zoom;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#222';
    ctx.textBaseline = 'top';

    const maxTextWidth = width - padding * 2;
    const alignX = tb.alignX || (tb.shapeType ? 'center' : 'left');
    const alignY = tb.alignY || (tb.shapeType ? 'middle' : 'top');

    const raw = (tb.content || '').replace(/\r\n/g, '\n');
    const paragraphs = raw.split('\n');

    // Lay out lines first to compute total height for vertical alignment
    const lines: string[] = [];
    const measureLine = (text: string) => ctx.measureText(text).width;
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (measureLine(test) <= maxTextWidth) {
          line = test;
        } else {
          if (line) lines.push(line);
          line = word;
        }
      }
      if (line) lines.push(line);
      // Paragraph break marker as empty string to add spacing later
      lines.push('');
    }
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop(); // remove trailing spacer
    }

    const paragraphGap = lineHeight * 0.3;
    let contentHeight = 0;
    lines.forEach((text) => {
      contentHeight += text === '' ? paragraphGap : lineHeight;
    });

    const availableHeight = height - padding * 2;
    let y = screenY + padding;
    if (alignY === 'middle') {
      y = screenY + padding + Math.max(0, (availableHeight - contentHeight) / 2);
    } else if (alignY === 'bottom') {
      y = screenY + padding + Math.max(0, availableHeight - contentHeight);
    }

    for (const text of lines) {
      if (text === '') {
        y += paragraphGap;
        continue;
      }
      drawAlignedText(ctx, text, screenX, width, y, alignX as 'left' | 'center' | 'right', padding);
      y += lineHeight;
    }

    ctx.restore();
  });
}

function drawAlignedText(ctx: CanvasRenderingContext2D, text: string, boxX: number, boxWidth: number, y: number, align: 'left' | 'center' | 'right', padding: number): void {
  let x = boxX + padding;
  if (align === 'center') {
    ctx.textAlign = 'center';
    x = boxX + boxWidth / 2;
  } else if (align === 'right') {
    ctx.textAlign = 'right';
    x = boxX + boxWidth - padding;
  } else {
    ctx.textAlign = 'left';
    x = boxX + padding;
  }
  ctx.fillText(text, x, y);
}
