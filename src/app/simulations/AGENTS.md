# Simulation catalogue — local agent guidance

In addition to the repository-root `AGENTS.md`:

- `simulation-catalog.ts` is the **single source of truth** for world
  identity, titles, tags, routes, featured world and optional preview.
- Add a world by registering **one** `SimulationDefinition` in
  `SIMULATIONS`; `app.routes.ts` and Home derive their routes/cards
  from the registry. Do not edit the router or hard-code Home links.
- Use dynamic `import()` loaders for standalone route components and
  optional preview components. Do not import a world's domain/Canvas code
  eagerly into the catalogue.
- Keep IDs and route paths unique and valid. Every world is eligible for
  random featured selection. A preview is optional for working navigation.
- Add tests to `simulation-catalog.spec.ts` for metadata, route
  generation, invalid registrations and featured behavior.
- See `docs/simulation-catalog.md` before creating a new world.
