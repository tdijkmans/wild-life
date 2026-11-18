import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  input,
} from '@angular/core';
import { DsEyebrowComponent } from '../../../../shared/design-system/eyebrow/eyebrow';
import { DsButtonComponent } from '../../../../shared/design-system/button/button';

@Component({
  selector: 'app-ecosystem-timeline-card',
  standalone: true,
  imports: [DsEyebrowComponent, DsButtonComponent],
  templateUrl: './ecosystem-timeline-card.html',
  styleUrl: './ecosystem-timeline-card.css',
})
export class EcosystemTimelineCardComponent implements AfterViewInit {
  readonly chartMode = input<'population' | 'traits'>('population');

  @ViewChild('popChart', { static: true }) private popChart!: ElementRef<HTMLCanvasElement>;
  @Output() readonly chartCanvasReady = new EventEmitter<HTMLCanvasElement>();
  @Output() readonly chartModeChange = new EventEmitter<'population' | 'traits'>();

  ngAfterViewInit() {
    this.chartCanvasReady.emit(this.popChart.nativeElement);
  }

  setChartMode(value: 'population' | 'traits') {
    this.chartModeChange.emit(value);
  }
}
