import type { Organism, WorldEngine } from '../domain/engine';

export type Tool = 'bloom' | 'current' | 'heat' | 'cold' | 'inspect';

type Point = { x: number; y: number };

export interface PointerViewport {
  zoom: number;
  pointer: Point | null;
  hover: boolean;
  screenToWorld(clientX: number, clientY: number): Point;
}

export interface PointerInteractionContext {
  getWorld(): WorldEngine;
  getViewport(): PointerViewport;
  getTool(): Tool;
  isPaused(): boolean;
  canInteract(): boolean;
  onInspect(organism: Organism | null): void;
  onZoom(zoom: number): void;
  onDismissGuide(): void;
}

/**
 * Translates pointer/touch gestures into ecological interventions.
 * All UI state is supplied by the feature page through a small callback boundary.
 */
export class WorldPointerController {
  private readonly pointers = new Map<number, Point>();
  private pointerXY: Point | null = null;
  private movingFrom: Point | null = null;
  private interactionTimer = 0;
  private pinchDistance = 0;
  private pinchZoom = 1;

  constructor(private readonly context: PointerInteractionContext) {}

  reset(): void {
    this.pointers.clear();
    this.pointerXY = null;
    this.movingFrom = null;
    this.interactionTimer = 0;
    this.pinchDistance = 0;
    this.pinchZoom = 1;
    const viewport = this.context.getViewport();
    viewport.hover = false;
    viewport.pointer = null;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (!this.context.canInteract()) return;
    const viewport = this.context.getViewport();
    viewport.zoom = Math.max(1, Math.min(2.8, viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
    this.context.onZoom(viewport.zoom);
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.context.canInteract()) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const viewport = this.context.getViewport();
    if (this.pointers.size === 2) {
      const points = [...this.pointers.values()];
      this.pinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      this.pinchZoom = viewport.zoom;
      return;
    }
    const position = viewport.screenToWorld(event.clientX, event.clientY);
    this.pointerXY = position;
    this.movingFrom = position;
    viewport.pointer = position;
    viewport.hover = true;
    this.interactionTimer = 0;
    this.applyInteraction(position, 0, 0, true);
    this.context.onDismissGuide();
  }

  onPointerMove(event: PointerEvent): void {
    const viewport = this.context.getViewport();
    if (!this.context.canInteract()) {
      viewport.hover = false;
      return;
    }
    const position = viewport.screenToWorld(event.clientX, event.clientY);
    viewport.pointer = position;
    viewport.hover = true;
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size > 1) {
      const points = [...this.pointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (this.pinchDistance) {
        viewport.zoom = Math.max(
          1,
          Math.min(2.8, (this.pinchZoom * distance) / this.pinchDistance),
        );
        this.context.onZoom(viewport.zoom);
      }
      return;
    }
    const previous = this.movingFrom ?? position;
    this.pointerXY = position;
    this.movingFrom = position;
    this.applyInteraction(position, position.x - previous.x, position.y - previous.y, false);
  }

  onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    this.movingFrom = null;
    this.interactionTimer = 0;
    if (this.pointers.size === 0) this.pointerXY = null;
    if (this.pointers.size === 1) {
      const point = [...this.pointers.values()][0];
      this.movingFrom = this.context.getViewport().screenToWorld(point.x, point.y);
    }
  }

  onPointerLeave(): void {
    this.context.getViewport().hover = false;
  }

  tick(deltaSeconds: number): void {
    if (
      this.pointers.size !== 1 ||
      this.context.isPaused() ||
      !this.pointerXY ||
      !this.context.canInteract()
    ) {
      return;
    }
    this.interactionTimer += deltaSeconds;
    const mode = this.context.getTool();
    const world = this.context.getWorld();
    if (mode === 'bloom' && this.interactionTimer > 0.13) {
      world.bloom(this.pointerXY.x, this.pointerXY.y, 4);
      this.interactionTimer = 0;
    }
    if ((mode === 'heat' || mode === 'cold') && this.interactionTimer > 0.4) {
      world.climate(this.pointerXY.x, this.pointerXY.y, mode);
      this.interactionTimer = 0;
    }
  }

  private applyInteraction(position: Point, dx: number, dy: number, first: boolean): void {
    const mode = this.context.getTool();
    if (this.context.isPaused() && mode !== 'inspect') return;
    const world = this.context.getWorld();
    switch (mode) {
      case 'bloom':
        world.bloom(position.x, position.y, first ? 15 : 2);
        break;
      case 'current':
        if (!first) world.flow(position.x, position.y, dx, dy);
        break;
      case 'heat':
      case 'cold':
        if (first || this.interactionTimer > 0.15) {
          world.climate(position.x, position.y, mode);
          this.interactionTimer = 0;
        }
        break;
      case 'inspect':
        if (first) this.context.onInspect(world.findNearest(position.x, position.y, 48));
        break;
    }
  }
}
