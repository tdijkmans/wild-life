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

## Validation

```bash
npm run build
npm test -- --watch=false
```

The production build disables Angular's automatic font inlining so the font request cannot exceed component-style budgets. Fonts are requested directly by the page's HTML; large simulation CSS lives in `src/styles.css`.
