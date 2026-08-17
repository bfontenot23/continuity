/** Floating canvas action menu and its animation state. */
export class MenuSystem {
  private isOpened = false;
  private animationProgress = 0;
  private isAnimating = false;
  private animationDirection: 'open' | 'close' = 'open';
  private canvasHeight = 0;
  private cachedMenuWidth = 150;
  private options: { id: string; label: string; keybind?: string }[] = [
    { id: 'new-timeline', label: 'New Timeline', keybind: 'Shift + T' },
    { id: 'new-chapter', label: 'New Chapter', keybind: 'Shift + C' },
    { id: 'new-branch', label: 'New Branch', keybind: 'Shift + B' },
    { id: 'new-textbox', label: 'New Textbox', keybind: 'Shift + S' },
    { id: 'new-shape', label: 'New Shape', keybind: 'Shift + W' },
    { id: 'new-image', label: 'New Image', keybind: 'Shift + E' },
    { id: 'new-line', label: 'New Line', keybind: 'Shift + D' },
  ];

  private readonly buttonSize = 50;
  private readonly buttonPadding = 20;
  private readonly optionHeight = 40;
  private readonly optionPadding = 10;
  private readonly menuMargin = 5;

  addOption(id: string, label: string): void { this.options.push({ id, label }); }
  toggle(): void { this.isOpened ? this.close() : this.open(); }

  open(): void {
    if (!this.isOpened) {
      this.isOpened = true;
      this.isAnimating = true;
      this.animationDirection = 'open';
    }
  }

  close(): void {
    if (this.isOpened) {
      this.isOpened = false;
      this.isAnimating = true;
      this.animationDirection = 'close';
    }
  }

  isOpen(): boolean { return this.isOpened; }

  update(): boolean {
    if (!this.isAnimating) return false;
    const speed = 0.15;
    this.animationProgress = this.animationDirection === 'open'
      ? Math.min(1, this.animationProgress + speed)
      : Math.max(0, this.animationProgress - speed);
    if (this.animationProgress === 0 || this.animationProgress === 1) this.isAnimating = false;
    return this.isAnimating;
  }

  private getLayout(ctx?: CanvasRenderingContext2D, textSizeMultiplier: number = 1) {
    const buttonX = this.buttonPadding;
    const buttonY = (this.canvasHeight || 400) - this.buttonSize - this.buttonPadding;
    const scaledOptionHeight = this.optionHeight * textSizeMultiplier;
    const scaledOptionPadding = this.optionPadding * textSizeMultiplier;
    if (ctx) {
      ctx.font = `bold ${14 * textSizeMultiplier}px sans-serif`;
      let maxTextWidth = 0;
      for (const option of this.options) {
        maxTextWidth = Math.max(maxTextWidth, ctx.measureText(option.label).width);
        if (option.keybind) {
          ctx.font = `${11 * textSizeMultiplier}px sans-serif`;
          maxTextWidth = Math.max(maxTextWidth, ctx.measureText(option.keybind).width);
          ctx.font = `bold ${14 * textSizeMultiplier}px sans-serif`;
        }
      }
      this.cachedMenuWidth = Math.max(150, maxTextWidth + scaledOptionPadding * 4);
    }
    const menuWidth = this.cachedMenuWidth;
    const menuHeight = this.options.length * scaledOptionHeight + this.menuMargin * 2;
    const currentWidth = this.buttonSize + (menuWidth - this.buttonSize) * this.animationProgress;
    const currentHeight = this.buttonSize + (menuHeight - this.buttonSize) * this.animationProgress;
    const menuBottomY = buttonY + this.buttonSize;
    const menuTopY = menuBottomY - currentHeight;
    return { buttonX, buttonY, buttonSize: this.buttonSize, menuTopY, currentWidth, currentHeight,
      optionStartY: menuTopY + this.menuMargin, scaledOptionHeight, scaledOptionPadding };
  }

  isClickingButton(mouseX: number, mouseY: number): boolean {
    const layout = this.getLayout();
    return Math.hypot(mouseX - (layout.buttonX + layout.buttonSize / 2), mouseY - (layout.buttonY + layout.buttonSize / 2))
      <= layout.buttonSize / 2;
  }

  getHoveredOption(mouseX: number, mouseY: number, textSizeMultiplier: number = 1): string | null {
    if (!this.isOpened || this.animationProgress <= 0.3 || this.canvasHeight === 0) return null;
    const layout = this.getLayout(undefined, textSizeMultiplier);
    for (let index = 0; index < this.options.length; index++) {
      const optionY = layout.optionStartY + index * layout.scaledOptionHeight;
      if (mouseX >= layout.buttonX + layout.scaledOptionPadding
        && mouseX <= layout.buttonX + layout.currentWidth - layout.scaledOptionPadding
        && mouseY >= optionY && mouseY <= optionY + layout.scaledOptionHeight) return this.options[index].id;
    }
    return null;
  }

  getClickedOption(mouseX: number, mouseY: number, textSizeMultiplier: number = 1): string | null {
    return this.isOpened && this.animationProgress > 0.3
      ? this.getHoveredOption(mouseX, mouseY, textSizeMultiplier)
      : null;
  }

  render(ctx: CanvasRenderingContext2D, canvasHeight: number, hoveredOptionId: string | null, textSizeMultiplier: number = 1): void {
    this.canvasHeight = canvasHeight;
    const layout = this.getLayout(ctx, textSizeMultiplier);
    const gradient = ctx.createLinearGradient(layout.buttonX, layout.menuTopY, layout.buttonX + layout.currentWidth, layout.menuTopY + layout.currentHeight);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    this.drawRoundedRect(ctx, layout.buttonX, layout.menuTopY, layout.currentWidth, layout.currentHeight, 15);

    if (this.animationProgress < 0.3) {
      const centerX = layout.buttonX + layout.buttonSize / 2;
      const centerY = layout.buttonY + layout.buttonSize / 2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - this.animationProgress * 5})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(centerX, centerY - 12); ctx.lineTo(centerX, centerY + 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(centerX - 12, centerY); ctx.lineTo(centerX + 12, centerY); ctx.stroke();
      return;
    }

    this.options.forEach((option, index) => {
      const optionY = layout.optionStartY + index * layout.scaledOptionHeight;
      if (hoveredOptionId === option.id) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        this.drawRoundedRect(ctx, layout.buttonX + layout.scaledOptionPadding, optionY, layout.currentWidth - layout.scaledOptionPadding * 2, layout.scaledOptionHeight, 6);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 2;
        this.drawRoundedRectStroke(ctx, layout.buttonX + layout.scaledOptionPadding, optionY, layout.currentWidth - layout.scaledOptionPadding * 2, layout.scaledOptionHeight, 6);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (option.keybind) {
        ctx.fillStyle = '#ffffff'; ctx.font = `bold ${14 * textSizeMultiplier}px sans-serif`;
        ctx.fillText(option.label, layout.buttonX + layout.currentWidth / 2, optionY + layout.scaledOptionHeight / 2 - 7);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.font = `${11 * textSizeMultiplier}px sans-serif`;
        const keybindYOffset = 8 + (textSizeMultiplier - 1) * 20;
        ctx.fillText(option.keybind, layout.buttonX + layout.currentWidth / 2, optionY + layout.scaledOptionHeight / 2 + keybindYOffset);
      } else {
        ctx.fillStyle = '#ffffff'; ctx.font = `bold ${14 * textSizeMultiplier}px sans-serif`;
        ctx.fillText(option.label, layout.buttonX + layout.currentWidth / 2, optionY + layout.scaledOptionHeight / 2);
      }
    });
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath(); ctx.fill();
  }

  private drawRoundedRectStroke(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath(); ctx.stroke();
  }
}
