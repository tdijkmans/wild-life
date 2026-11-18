import { NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'subtle' | 'icon' | 'primary' | 'segmented';

@Component({
  selector: 'ds-button',
  standalone: true,
  imports: [NgClass],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class DsButtonComponent {
  readonly variant = input<ButtonVariant>('subtle');
  readonly className = input('');
  readonly title = input('');
  readonly ariaLabel = input('');
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly pressed = input<boolean | null>(null);

  readonly classes = computed(() => ({
    [this.className()]: !!this.className(),
    'ds-button--subtle': this.variant() === 'subtle',
    'ds-button--icon': this.variant() === 'icon',
    'ds-button--primary': this.variant() === 'primary',
    'ds-button--segmented': this.variant() === 'segmented',
  }));
}
