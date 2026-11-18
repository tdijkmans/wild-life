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

To add another experiment: register it in `src/app/features/home/simulation-catalog.ts` and register a lazily loaded route in `src/app/app.routes.ts`.

## Feature-oriented architecture

- `src/app/features/home/`: catalogue and live-preview landing page.
- `src/app/features/ecosystem/domain/`: framework-independent ecological engine and regression tests.
- `src/app/features/ecosystem/rendering/`: canvas world renderer and charts.
- `src/app/features/ecosystem/components/`: feature-specific insights and timeline UI.
- `src/app/features/ecosystem/ecosystem.ts`: route-level orchestration.
- `src/app/shared/design-system/`: UI primitives shared by multiple features.

See `docs/architecture.md` for module boundaries and a checklist for future experiments. The simulation runner and further UI extraction belong to subsequent roadmap steps, not this behavior-preserving move.

Angular component styles are already locally scoped (style encapsulation), which is the framework-native equivalent of CSS modules.

## Validation

```bash
npm run build
npm test -- --watch=false
```
