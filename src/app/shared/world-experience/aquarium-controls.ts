import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
  ElementRef,
} from '@angular/core';
import { WorldAudioControlsComponent } from './world-audio-controls';
import type { AquariumCardOption, AquariumPreset, DisplayPreset } from './aquarium.controller';

export interface AquariumTool {
  readonly id: string;
  readonly title: string;
  readonly symbol: string;
  readonly description: string;
}

@Component({
  selector: 'app-aquarium-controls',
  imports: [WorldAudioControlsComponent],
  templateUrl: './aquarium-controls.html',
  styleUrl: './aquarium-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AquariumControlsComponent {
  readonly idle = input.required<boolean>();
  readonly open = input.required<boolean>();
  readonly preset = input.required<AquariumPreset>();
  readonly cards = input.required<Readonly<Record<string, boolean>>>();
  readonly cardOptions = input.required<readonly AquariumCardOption[]>();
  readonly interaction = input.required<boolean>();
  readonly tools = input.required<readonly AquariumTool[]>();
  readonly tool = input.required<string>();
  readonly soundAvailable = input(true);
  readonly soundEnabled = input.required<boolean>();
  readonly soundBusy = input.required<boolean>();
  readonly displayToggle = output();
  readonly exit = output();
  readonly soundToggle = output();
  readonly interactionToggle = output();
  readonly cardToggle = output<string>();
  readonly toolSelect = output<string>();
  readonly presetSelect = output<DisplayPreset>();
  private readonly displayButton = viewChild.required<ElementRef<HTMLButtonElement>>('display');

  readonly presets: readonly { id: DisplayPreset; title: string; symbol: string }[] = [
    { id: 'zen', title: 'Zen', symbol: '◌' },
    { id: 'glance', title: 'Glance', symbol: '◐' },
    { id: 'discover', title: 'Discover', symbol: '✦' },
  ];

  close(): void {
    this.displayToggle.emit();
    this.displayButton().nativeElement.focus();
  }
}
