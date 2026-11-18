import { WorldEngine, type Organism } from '../domain/engine';
import {
  WorldPointerController,
  type PointerViewport,
  type Tool,
} from './world-pointer.controller';

function pointer(id: number, x: number, y: number): PointerEvent {
  return {
    pointerId: id,
    clientX: x,
    clientY: y,
    preventDefault: vi.fn(),
    currentTarget: { setPointerCapture: vi.fn() },
  } as unknown as PointerEvent;
}

function setup(prey = 0) {
  const world = new WorldEngine(1234, prey, 0);
  const viewport: PointerViewport = {
    zoom: 1,
    hover: false,
    pointer: null,
    screenToWorld: (x, y) => ({ x, y }),
  };
  let tool: Tool = 'bloom';
  let paused = false;
  let interact = true;
  let selected: Organism | null = null;
  let zoom = 1;
  let guideDismissals = 0;

  const controller = new WorldPointerController({
    getWorld: () => world,
    getViewport: () => viewport,
    getTool: () => tool,
    isPaused: () => paused,
    canInteract: () => interact,
    onInspect: (organism) => {
      selected = organism;
    },
    onZoom: (value) => {
      zoom = value;
    },
    onDismissGuide: () => {
      guideDismissals++;
    },
  });
  return {
    controller,
    world,
    viewport,
    setTool: (value: Tool) => {
      tool = value;
    },
    setPaused: (value: boolean) => {
      paused = value;
    },
    setInteract: (value: boolean) => {
      interact = value;
    },
    getSelected: () => selected,
    getZoom: () => zoom,
    getGuideDismissals: () => guideDismissals,
  };
}

describe('WorldPointerController', () => {
  it('plants food on first touch, paints continuously while held, then stops on release', () => {
    const { controller, world, getGuideDismissals } = setup();
    const startingFood = world.food.length;
    controller.onPointerDown(pointer(1, 600, 350));
    expect(world.food.length).toBe(startingFood + 15);
    controller.tick(0.14);
    expect(world.food.length).toBe(startingFood + 19);
    controller.onPointerUp(pointer(1, 600, 350));
    controller.tick(1);
    expect(world.food.length).toBe(startingFood + 19);
    expect(getGuideDismissals()).toBe(1);
  });

  it('creates flow patches on dragging but not on a stationary touch', () => {
    const { controller, world, setTool } = setup();
    setTool('current');
    controller.onPointerDown(pointer(1, 400, 300));
    expect(world.patches).toHaveLength(0);
    controller.onPointerMove(pointer(1, 430, 310));
    expect(world.patches.some((patch) => patch.kind === 'current')).toBe(true);
  });

  it('changes climate through warm and cool tools', () => {
    const { controller, world, setTool } = setup();
    setTool('heat');
    controller.onPointerDown(pointer(1, 500, 300));
    expect(world.patches.at(-1)?.kind).toBe('heat');
    controller.onPointerUp(pointer(1, 500, 300));
    setTool('cold');
    controller.onPointerDown(pointer(2, 500, 300));
    expect(world.patches.at(-1)?.kind).toBe('cold');
  });

  it('prevents biological interventions while paused but still permits inspection', () => {
    const { controller, world, setTool, setPaused, getSelected } = setup(1);
    const organism = world.organisms[0];
    const startingFood = world.food.length;
    setPaused(true);
    controller.onPointerDown(pointer(1, 300, 300));
    expect(world.food.length).toBe(startingFood);
    controller.onPointerUp(pointer(1, 300, 300));
    setTool('inspect');
    controller.onPointerDown(pointer(2, organism.x, organism.y));
    expect(getSelected()?.id).toBe(organism.id);
  });

  it('blocks view-only Aquarium interactions including zoom and continuous tools', () => {
    const { controller, world, setInteract, viewport } = setup();
    const startingFood = world.food.length;
    setInteract(false);
    controller.onPointerDown(pointer(1, 500, 300));
    controller.tick(1);
    controller.onWheel({
      deltaY: -100,
      preventDefault: vi.fn(),
    } as unknown as WheelEvent);
    expect(world.food.length).toBe(startingFood);
    expect(viewport.zoom).toBe(1);
    expect(viewport.hover).toBe(false);
  });

  it('supports two-finger pinch zoom and clamps scroll zoom', () => {
    const { controller, viewport, getZoom } = setup();
    controller.onPointerDown(pointer(1, 200, 300));
    controller.onPointerDown(pointer(2, 300, 300));
    controller.onPointerMove(pointer(2, 400, 300));
    expect(viewport.zoom).toBe(2);
    expect(getZoom()).toBe(2);
    for (let i = 0; i < 100; i++) {
      controller.onWheel({
        deltaY: -1,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent);
    }
    expect(viewport.zoom).toBe(2.8);
  });

  it('reset clears held interactions and visual hover state', () => {
    const { controller, viewport, world } = setup();
    controller.onPointerDown(pointer(1, 500, 300));
    expect(viewport.hover).toBe(true);
    controller.reset();
    const before = world.food.length;
    controller.tick(10);
    expect(world.food.length).toBe(before);
    expect(viewport.hover).toBe(false);
    expect(viewport.pointer).toBeNull();
  });

  it('ignores hover-based pointer moves when interaction is disabled', () => {
    const { controller, viewport, setInteract } = setup();
    controller.onPointerMove(pointer(1, 450, 310));
    expect(viewport.hover).toBe(true);
    setInteract(false);
    controller.onPointerMove(pointer(1, 450, 310));
    expect(viewport.hover).toBe(false);
    controller.onPointerLeave();
    expect(viewport.hover).toBe(false);
  });
});
