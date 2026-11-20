import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-world-audio-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [attr.aria-label]="aquarium() ? 'Toggle aquarium sound' : 'Toggle ambient sound'"
      [attr.aria-pressed]="enabled()"
      [disabled]="busy()"
      (click)="soundToggle.emit()"
    >
      <span aria-hidden="true">♫</span> Sound {{ enabled() ? 'on' : 'off' }}
    </button>
    <input
      type="range"
      min="0"
      max="100"
      [value]="level()"
      aria-label="Sound volume"
      [attr.aria-valuetext]="level() + '%'"
      [title]="'Volume: ' + level() + '%'"
      (input)="changeVolume($event)"
    />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: clamp(4px, 0.8vw, 10px);
        min-height: 36px;
        padding: 0 7px;
        border: 1px solid rgba(177, 244, 224, 0.28);
        border-radius: 9px;
        background: rgba(11, 32, 37, 0.82);
        color: #e0f4eb;
      }
      button {
        border: 0;
        color: inherit;
        background: none;
        padding: 7px 2px;
        white-space: nowrap;
        font: 600 13px var(--wl-font-display, sans-serif);
        cursor: pointer;
      }
      button:hover {
        color: #b9f4d9;
      }
      input {
        width: clamp(43px, 9vw, 92px);
        margin: 0;
        accent-color: #b9f4d9;
        cursor: pointer;
      }
      :is(button, input):focus-visible {
        outline: 2px solid #b9f4d9;
        outline-offset: 2px;
      }
      @media (max-width: 560px) {
        :host {
          padding-inline: 5px;
        }
        button {
          font-size: 11px;
        }
      }
    `,
  ],
})
export class WorldAudioControlsComponent {
  readonly aquarium = input(false);
  readonly enabled = input.required<boolean>();
  readonly busy = input.required<boolean>();
  readonly level = input.required<number>();
  readonly soundToggle = output();
  readonly volumeChange = output<number>();

  changeVolume(event: Event): void {
    this.volumeChange.emit((event.target as HTMLInputElement).valueAsNumber);
  }
}
