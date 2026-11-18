import { routes } from './app.routes';
import { SIMULATIONS } from './pages/home/simulation-catalog';

describe('WILD LIFE catalogue and routes', () => {
  it('starts at the experiment catalogue', () => {
    expect(routes[0].path).toBe('');
    expect(routes[0].loadComponent).toBeDefined();
  });

  it('offers Predator–Prey Evolution as the first world', () => {
    expect(SIMULATIONS).toHaveLength(1);
    expect(SIMULATIONS[0].id).toBe('ecosystem');
    expect(routes.some(route => route.path === 'ecosystem')).toBe(true);
  });
});
