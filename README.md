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

To add another experiment, add its feature page and register its metadata, lazy-loaded route and optional preview in `src/app/simulations/simulation-catalog.ts`. The router and homepage both derive from that registration.

## Feature-oriented architecture

- `src/app/features/home/`: catalogue-driven, presentation-only landing page.
- `src/app/simulations/simulation-catalog.ts`: single source of truth for worlds, routes and lazy previews.
- `src/app/features/ecosystem/preview/`: ecosystem-owned, lazily loaded homepage Canvas preview.
- `src/app/features/ecosystem/domain/`: framework-independent ecological engine and regression tests.
- `src/app/features/ecosystem/rendering/`: canvas world renderer and charts.
- `src/app/features/ecosystem/components/`: feature-specific insights and timeline UI.
- `src/app/features/ecosystem/ecosystem.ts`: route-level orchestration.
- `src/app/shared/design-system/`: UI primitives shared by multiple features.

See `docs/architecture.md` and `docs/simulation-catalog.md` for module boundaries, registration and preview contracts.

Angular component styles are already locally scoped (style encapsulation), which is the framework-native equivalent of CSS modules.

## Validation

```bash
npm run build
npm test -- --watch=false
```
