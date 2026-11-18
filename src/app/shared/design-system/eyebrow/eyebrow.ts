import { Component, input } from '@angular/core';

@Component({
  selector: 'ds-eyebrow',
  standalone: true,
  templateUrl: './eyebrow.html',
  styleUrl: './eyebrow.css',
})
export class DsEyebrowComponent {
  readonly showLine = input(true);
}
