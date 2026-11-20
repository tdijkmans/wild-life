import { AquariumController } from './aquarium.controller';

function setup() {
  const callbacks = {
    onEnter: vi.fn(),
    onExit: vi.fn(),
    onInteractionDisabled: vi.fn(),
    onResize: vi.fn(),
    onDisplayChanged: vi.fn(),
  };
  const controller = new AquariumController(callbacks, [
    { id: 'population', title: 'Population', subtitle: '', glance: true },
    { id: 'evolution', title: 'Evolution', subtitle: '' },
    { id: 'timeline', title: 'Timeline', subtitle: '' },
    { id: 'journal', title: 'Journal', subtitle: '' },
  ]);
  const frame = document.createElement('div');
  controller.attach(frame);
  return { controller, callbacks, frame };
}

describe('AquariumController', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, 'fullscreenElement');
    document.body.style.overflow = '';
  });

  it('starts in passive Zen mode with all information cards hidden', () => {
    const { controller } = setup();
    expect(controller.preset()).toBe('zen');
    expect(Object.values(controller.cards()).every((visible) => !visible)).toBe(true);
    expect(controller.interactionEnabled()).toBe(false);
    expect(controller.active()).toBe(false);
    controller.dispose();
  });

  it('applies glance and discover presets and allows custom card selection', () => {
    const { controller, callbacks } = setup();
    controller.setPreset('glance');
    expect(controller.cards()).toEqual({
      population: true,
      evolution: false,
      timeline: false,
      journal: false,
    });
    controller.setPreset('discover');
    expect(Object.values(controller.cards()).every(Boolean)).toBe(true);
    controller.toggleCard('timeline');
    expect(controller.preset()).toBe('custom');
    expect(controller.cards()['timeline']).toBe(false);
    expect(callbacks.onDisplayChanged).toHaveBeenCalledTimes(3);
    controller.dispose();
  });

  it('enters CSS Aquarium mode and restores the original body overflow on exit', async () => {
    const { controller, callbacks } = setup();
    document.body.style.overflow = 'auto';
    await controller.toggle();
    expect(controller.active()).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(controller.usingNativeFullscreen).toBe(false);
    expect(callbacks.onEnter).toHaveBeenCalledTimes(1);

    controller.exit();
    expect(controller.active()).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
    expect(callbacks.onExit).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('uses CSS Aquarium mode when native fullscreen is rejected', async () => {
    const { controller, frame } = setup();
    frame.requestFullscreen = vi.fn().mockRejectedValue(new Error('Not supported'));
    await controller.toggle();
    expect(controller.active()).toBe(true);
    expect(controller.usingNativeFullscreen).toBe(false);
    controller.dispose();
  });

  it('handles a native fullscreen exit notification without leaving the body locked', async () => {
    const { controller, callbacks, frame } = setup();
    frame.requestFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: frame,
      });
    });
    await controller.toggle();
    expect(controller.usingNativeFullscreen).toBe(true);
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(controller.active()).toBe(false);
    expect(callbacks.onExit).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('');
    controller.dispose();
  });

  it('auto-hides idle controls, but keeps settings visible when open', async () => {
    vi.useFakeTimers();
    const { controller } = setup();
    await controller.toggle();
    vi.advanceTimersByTime(4201);
    expect(controller.idle()).toBe(true);
    controller.toggleSettings();
    expect(controller.settingsOpen()).toBe(true);
    expect(controller.idle()).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(controller.idle()).toBe(false);
    controller.toggleSettings();
    vi.advanceTimersByTime(4201);
    expect(controller.idle()).toBe(true);
    controller.dispose();
  });

  it('disabling touch immediately revokes interaction and notifies its owner', async () => {
    const { controller, callbacks } = setup();
    await controller.toggle();
    controller.toggleInteraction();
    expect(controller.interactionEnabled()).toBe(true);
    controller.toggleInteraction();
    expect(controller.interactionEnabled()).toBe(false);
    expect(callbacks.onInteractionDisabled).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('disposes timers, events and body scroll state while Aquarium is active', async () => {
    vi.useFakeTimers();
    const { controller, callbacks } = setup();
    document.body.style.overflow = 'scroll';
    await controller.toggle();
    controller.dispose();
    vi.advanceTimersByTime(20_000);
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(document.body.style.overflow).toBe('scroll');
    expect(controller.active()).toBe(false);
    expect(controller.idle()).toBe(false);
    expect(callbacks.onExit).not.toHaveBeenCalled();
  });
});
