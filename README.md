# WILD LIFE

An Angular 22 laboratory for interactive artificial ecosystems.

## Development

```bash
npm ci
npm start
```

Open the app at `http://localhost:4200/`.

## Pages

- **`/`**: collection homepage with a living preview and experiment selection.
- **`/ecosystem`**: the Predator–Prey Evolution world with live statistics, touch/mouse interventions, and immersive Aquarium mode.

To add another experiment: register it in `src/app/pages/home/simulation-catalog.ts` and register a lazily loaded route in `src/app/app.routes.ts`.

## Scalable UI structure

- `src/app/shared/design-system/`: reusable design primitives (for example `button`, `eyebrow`, and `live-indicator`).
- `src/app/features/ecosystem/components/`: ecosystem feature components, split by responsibility (timeline card, insights panel, etc.).
- Page-level components keep orchestration/state, while feature components render focused UI blocks.

Angular component styles are already locally scoped (style encapsulation), which is the framework-native equivalent of CSS modules.

## Validation

```bash
npm run build
npm test -- --watch=false
```
