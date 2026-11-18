/** Extend this registry and the router when adding future worlds. */
export interface SimulationDefinition {
  id: string;
  number: string;
  name: string;
  description: string;
  path: string;
  tags: readonly string[];
}
export const SIMULATIONS: readonly SimulationDefinition[] = [
  {
    id: 'ecosystem',
    number: '001',
    name: 'Predator–Prey Evolution',
    description:
      'A living ecosystem that feeds, hunts, reproduces and evolves. Alter its environment and watch what emerges.',
    path: '/ecosystem',
    tags: ['Evolution', 'Natural selection', 'Interactive'],
  },
];
