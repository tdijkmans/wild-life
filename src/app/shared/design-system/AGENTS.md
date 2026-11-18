# Shared design system — local agent guidance

In addition to the repository-root `AGENTS.md`:

- Reuse the semantic `--wl-*` tokens from `src/styles.css`. Add a
  global token only for a genuinely cross-feature concept; keep unique
  ecosystem visual effects in feature CSS.
- Shared components use the `ds-` prefix and Angular standalone
  components with focused template/style files, input signals and
  adjacent unit tests.
- Use `ds-button` for actions and real links for navigation. Preserve
  button type, native click behavior, accessible names, pressed/disabled
  states, focus visibility and keyboard semantics. Do not replace
  semantic HTML with clickable noninteractive elements.
- Respect `prefers-reduced-motion`. Keep CSS inside the component
  rendering its DOM, not a parent attempting to style child internals.
- Document intended reusable variants/CSS custom properties in
  `docs/design-system.md`. Cover new component behavior in adjacent
  `*.spec.ts` and check responsive/browser behavior.
