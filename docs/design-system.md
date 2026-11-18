# WILD LIFE design system

Use semantic tokens and UI primitives to keep future worlds consistent without
forcing every simulation to have the same visual identity.

## Source of truth

The shared palette, typography and panel values live in `src/styles.css`
under `:root`. Features consume them with `var(--wl-…)`; do not redeclare
their own copies of the same value.

- `--wl-bg`, `--wl-text`, `--wl-home-text`: shared application canvas and text.
- `--wl-accent-mint`, `--wl-accent-coral`, `--wl-live`: biological accent colors.
- `--wl-border-subtle`, `--wl-panel-radius`, `--wl-surface-button`: surfaces.
- `--wl-font-body`, `--wl-font-display`, `--wl-font-mono`: typography.

Local artistic choices (the floating Aquarium glass effects, colored lighting,
individual gradients) stay in feature CSS. Do not turn every isolated hex code
into a global token.

## Shared components

`src/app/shared/design-system/` owns the reusable primitives:

- `ds-button`: native, accessible button with `variant` (`subtle`,
  `icon`, `primary`, `segmented`), `disabled`, `type`,
  `ariaLabel`, and optional `pressed`. It delegates events naturally to
  its host and supports per-container CSS custom-property overrides.
- `ds-eyebrow`: concise mono label, optionally with decorative line.
- `ds-live-indicator`: live status and pulse, respecting reduced-motion.

The ecosystem toolbar and timeline controls use `ds-button` directly.
The homepage's main call to action remains a navigation `<a>` to preserve
link semantics; do not replace navigation with buttons.

Customize a primitive with its documented `--ds-*` properties rather than
adding a feature-specific deep selector into the shared component's shadow.

## Scope and styling budgets

CSS belongs to the component that renders the DOM. The route component
must not retain duplicate rules for child components, because Angular's
default view encapsulation prevents those parent selectors from styling
child internals. This refactor removes the obsolete timeline/insights
rules from `ecosystem.css`.

Angular production CSS budgets continue to catch accidental stylesheet
growth. Build, typecheck, lint, formatting and UI primitive tests run in CI.

For a new simulation, reuse semantic tokens and primitives, then add only
its truly distinctive presentation rules locally.
