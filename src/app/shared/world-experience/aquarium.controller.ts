import { signal } from '@angular/core';

export type DisplayPreset = 'zen' | 'glance' | 'discover';
export type AquariumPreset = DisplayPreset | 'custom';

export interface AquariumCardOption {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly glance?: boolean;
}

interface AquariumCallbacks {
  onEnter(): void;
  onExit(): void;
  onInteractionDisabled(): void;
  onResize(): void;
  onDisplayChanged(): void;
}

/** Owns Aquarium display state, fullscreen lifecycle and auto-hidden controls. */
export class AquariumController {
  readonly active = signal(false);
  readonly settingsOpen = signal(false);
  readonly idle = signal(false);
  readonly interactionEnabled = signal(false);
  readonly preset = signal<AquariumPreset>('zen');
  readonly cards = signal<Readonly<Record<string, boolean>>>({});

  private frame?: HTMLElement;
  private fullscreenIsNative = false;
  private priorBodyOverflow: string | null = null;
  private chromeTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;

  constructor(
    private readonly callbacks: AquariumCallbacks,
    readonly cardOptions: readonly AquariumCardOption[],
  ) {
    this.cards.set(this.cardsFor('zen'));
  }

  private cardsFor(preset: DisplayPreset): Record<string, boolean> {
    return Object.fromEntries(
      this.cardOptions.map((card) => [
        card.id,
        preset === 'discover' || (preset === 'glance' && !!card.glance),
      ]),
    );
  }

  get usingNativeFullscreen(): boolean {
    return this.fullscreenIsNative;
  }

  attach(frame: HTMLElement): void {
    this.frame = frame;
    document.addEventListener('fullscreenchange', this.fullscreenHandler);
  }

  private readonly fullscreenHandler = (): void => {
    if (this.fullscreenIsNative && document.fullscreenElement !== this.frame) {
      this.finishExit();
    }
    this.requestResize();
  };

  private requestResize(): void {
    requestAnimationFrame(() => {
      if (!this.disposed) this.callbacks.onResize();
    });
  }

  async toggle(): Promise<void> {
    if (this.active()) {
      this.exit();
      return;
    }
    if (this.disposed || !this.frame) return;

    this.callbacks.onEnter();
    this.interactionEnabled.set(false);
    this.settingsOpen.set(false);
    this.priorBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.active.set(true);
    this.wake();

    if (this.frame.requestFullscreen) {
      try {
        await this.frame.requestFullscreen();
        this.fullscreenIsNative = this.active() && document.fullscreenElement === this.frame;
      } catch {
        // Native fullscreen can be denied (notably on iOS); CSS remains immersive.
        this.fullscreenIsNative = false;
      }
    }
    this.requestResize();
  }

  exit(): void {
    if (!this.active()) return;
    if (document.fullscreenElement === this.frame && document.exitFullscreen) {
      void document.exitFullscreen().then(
        () => this.finishExit(),
        () => this.finishExit(),
      );
    } else {
      this.finishExit();
    }
  }

  private finishExit(): void {
    if (!this.active()) return;
    if (this.priorBodyOverflow !== null) {
      document.body.style.overflow = this.priorBodyOverflow;
      this.priorBodyOverflow = null;
    }
    this.active.set(false);
    this.settingsOpen.set(false);
    this.idle.set(false);
    this.interactionEnabled.set(false);
    this.fullscreenIsNative = false;
    clearTimeout(this.chromeTimer);
    this.callbacks.onExit();
    this.requestResize();
  }

  wake(): void {
    if (!this.active()) return;
    this.idle.set(false);
    clearTimeout(this.chromeTimer);
    if (!this.settingsOpen()) {
      this.chromeTimer = setTimeout(() => this.idle.set(true), 4200);
    }
  }

  toggleSettings(): void {
    this.settingsOpen.update((value) => !value);
    this.wake();
  }

  setPreset(value: DisplayPreset): void {
    this.preset.set(value);
    this.cards.set(this.cardsFor(value));
    this.callbacks.onDisplayChanged();
  }

  toggleCard(card: string): void {
    if (!this.cardOptions.some((option) => option.id === card)) return;
    this.preset.set('custom');
    this.cards.update((previous) => ({ ...previous, [card]: !previous[card] }));
    this.callbacks.onDisplayChanged();
  }

  toggleInteraction(): void {
    this.interactionEnabled.update((value) => !value);
    if (!this.interactionEnabled()) this.callbacks.onInteractionDisabled();
    this.wake();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    document.removeEventListener('fullscreenchange', this.fullscreenHandler);
    clearTimeout(this.chromeTimer);
    if (document.fullscreenElement === this.frame && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => {});
    }
    if (this.priorBodyOverflow !== null) {
      document.body.style.overflow = this.priorBodyOverflow;
      this.priorBodyOverflow = null;
    }
    this.fullscreenIsNative = false;
    this.active.set(false);
  }
}
