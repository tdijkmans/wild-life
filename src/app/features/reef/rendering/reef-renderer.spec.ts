import { ReefWorld } from '../domain/reef-world';
import { ReefRenderer } from './reef-renderer';

describe('Reef Canvas initialization', () => {
  it('accepts the default world seed without a signed XOR overflow', () => {
    const canvas = {
      getContext: () => ({}),
    } as unknown as HTMLCanvasElement;
    const world = new ReefWorld(20261123, 8, 6, 2);
    expect(() => new ReefRenderer(canvas, world)).not.toThrow();
  });

  it('uses an independent valid visual seed even at uint32 extremes', () => {
    const canvas = {
      getContext: () => ({}),
    } as unknown as HTMLCanvasElement;
    const renderer = new ReefRenderer(canvas, new ReefWorld(0, 4, 2, 0));
    expect(() => renderer.setWorld(new ReefWorld(0xffffffff, 4, 2, 0))).not.toThrow();
  });
});
