import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  input,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WorldEvent, WorldStats } from '../../../../pages/ecosystem/sim/engine';

@Component({
  selector: 'app-ecosystem-insights-panel',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './ecosystem-insights-panel.html',
  styleUrl: './ecosystem-insights-panel.css',
})
export class EcosystemInsightsPanelComponent implements AfterViewInit {
  readonly stats = input.required<WorldStats>();
  readonly events = input.required<WorldEvent[]>();
  readonly generationLabel = input.required<string>();

  @ViewChild('preySpark', { static: true }) private preySpark!: ElementRef<HTMLCanvasElement>;
  @ViewChild('predatorSpark', { static: true })
  private predatorSpark!: ElementRef<HTMLCanvasElement>;
  @Output() readonly sparkCanvasesReady = new EventEmitter<{
    prey: HTMLCanvasElement;
    predator: HTMLCanvasElement;
  }>();

  ngAfterViewInit() {
    this.sparkCanvasesReady.emit({
      prey: this.preySpark.nativeElement,
      predator: this.predatorSpark.nativeElement,
    });
  }
}
