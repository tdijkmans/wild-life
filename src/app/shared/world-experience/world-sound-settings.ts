import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorldAudioVolume, type SoundChannel } from './world-audio-volume';

@Component({
  selector: 'app-world-sound-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details
      #menu
      (keydown.space)="$event.stopPropagation()"
      (keydown.escape)="close($event, menu, trigger)"
    >
      <summary #trigger aria-label="Sound settings" title="Sound settings">
        <span aria-hidden="true">≋</span> <span class="label">Mix</span>
      </summary>
      <div class="panel" role="group" aria-label="Sound mix">
        @for (channel of channels; track channel.id) {
          <label>
            <span>{{ channel.label }}</span>
            <output aria-hidden="true">{{ audio.levels()[channel.id] }}%</output>
            <input
              type="range"
              min="0"
              max="100"
              [value]="audio.levels()[channel.id]"
              [attr.aria-label]="channel.label"
              [attr.aria-valuetext]="audio.levels()[channel.id] + '%'"
              (input)="setLevel(channel.id, $event)"
            />
          </label>
        }
      </div>
    </details>
  `,
  styles: `
    :host {
      display: inline-flex;
      color: #e0f4eb;
      font: 600 13px var(--wl-font-display, sans-serif);
    }
    details {
      position: relative;
    }
    summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0 8px;
      min-height: 36px;
      border: 1px solid rgba(177, 244, 224, 0.28);
      border-radius: 9px;
      background: #10282c;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary:hover,
    details[open] summary {
      color: #b9f4d9;
    }
    .panel {
      position: absolute;
      z-index: 12;
      top: calc(100% + 8px);
      right: 0;
      display: grid;
      gap: 12px;
      width: min(230px, 66vw);
      padding: 14px;
      border: 1px solid rgba(177, 244, 224, 0.38);
      border-radius: 12px;
      background: #0b2025;
      box-shadow: 0 12px 30px #030a0ce0;
    }
    label {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 3px 8px;
      align-items: center;
    }
    output {
      color: #b9f4d9;
      font-variant-numeric: tabular-nums;
    }
    input {
      grid-column: 1 / -1;
      width: 100%;
      margin: 0;
      accent-color: #b9f4d9;
      cursor: pointer;
    }
    :is(summary, input):focus-visible {
      outline: 2px solid #b9f4d9;
      outline-offset: 2px;
    }
    @media (max-width: 560px) {
      summary {
        font-size: 11px;
        padding-inline: 6px;
      }
      .panel {
        position: fixed;
        inset-inline: 12px;
        top: auto;
        width: auto;
        margin-top: 8px;
      }
    }
  `,
})
export class WorldSoundSettingsComponent {
  protected readonly audio = inject(WorldAudioVolume);
  protected readonly channels: readonly { id: SoundChannel; label: string }[] = [
    { id: 'master', label: 'Sound volume' },
    { id: 'ambience', label: 'Ambience' },
    { id: 'events', label: 'Events and interactions' },
  ];

  protected setLevel(channel: SoundChannel, event: Event): void {
    this.audio.set(channel, (event.target as HTMLInputElement).valueAsNumber);
  }

  protected close(event: Event, menu: HTMLDetailsElement, trigger: HTMLElement): void {
    if (!menu.open) return;
    event.stopPropagation();
    menu.open = false;
    trigger.focus();
  }
}
