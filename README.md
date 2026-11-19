# WILD LIFE

> **Living worlds. Gentle influence. Unexpected emergence.**

WILD LIFE is a collection of autonomous, interactive digital worlds exploring
**evolution, ecology, population dynamics, collective behavior and self-organization**.
Simple local rules give rise to complex, surprising patterns. Organisms and systems
grow, interact, cooperate, compete, adapt and sometimes disappear.

**Observe. Influence. Discover.** There is no winning, shooting or direct control
of individual creatures. Visitors gently alter the conditions of a world—flow,
light, warmth, nutrients, habitat or terrain—and discover what emerges.

## The experience

- **Aquarium — experience life.** An immersive, visually spectacular world that
  remains interesting without interaction. The interface recedes; subtle gestures
  can shape events without interrupting the atmosphere.
  Shared worlds offer three Aquarium stats levels: None, Few (two key metrics),
  or All. Predator–Prey Evolution offers individual information cards.
- **Laboratory — understand life.** The same underlying world, with visible
  mechanisms, statistics, populations, histories, experiments and deterministic
  replay where supported.

These are two ways of experiencing **one real simulation**, not separate scripted
animations.

## Principles for every world

1. **Autonomy first.** It must develop meaningfully without a visitor.
2. **Emergence over choreography.** Complex behavior should arise from local
   interactions, not predetermined visual sequences.
3. **Influence, don't command.** Give visitors environmental tools, not weapons,
   direct orders or guaranteed outcomes.
4. **Time matters.** Growth, learning, reproduction, succession or changing
   relationships create a history with consequences.
5. **Beauty reveals behavior.** Movement, light, color, density and form should
   make the underlying dynamics both beautiful and more legible.
6. **Be clear about the model.** Distinguish emergent art, biology-inspired
   abstractions and scientifically validated models. Beauty is not evidence
   of biological accuracy.

A proposed simulation should satisfy these principles before it becomes part
of the collection.

## Living worlds

**Available**

- **001 · Predator–Prey Evolution** (`/ecosystem`) — a seeded ecological world
  of grazers, hunters, food, reproduction and inherited traits. Influence it
  through food, currents and localized warming or cooling.
- **002 · Murmuration** (`/murmuration`) — hundreds of independently moving
  starlings align, separate and cohere into living flocks. A roaming raptor
  creates disturbance; soft wind, thermals and still air change trajectories.
- **003 · Defensive Herd** (`/defensive-herd`) — grazing adults gather and face
  outward around young when predators approach. A protective ring forms through
  individual social rules; gaps remain dangerous. Influence grazing, predator
  scent and breeze.
- **004 · Canopy** (`/canopy`) — branches grow, leaves expand and insect
  herbivores consume foliage. Trees compete for water and light; influence
  rainfall, sunbeams and insect-attracting wildflowers.
- **005 · Abyssal Bloom** (`/abyssal-bloom`) — luminous phytoplankton grow,
  drift and reproduce in a nutrient-rich water column, while zooplankton graze.
  Influence ocean currents, upwelling and sunlight.
- **006 · Synchrony** (`/synchrony`) — individually flashing fireflies
  synchronize through local coupling. Shift local rhythms, movement and
  connectivity with warmth, breeze and shade.
- **007 · Reef** (`/reef`) — branching coral colonies depend on symbiotic
  algae; heat stress, algal competition and grazing fish reshape their
  future. Influence cooling, nutrients and currents.
- **008 · Microbial Commons** (`/microbial-commons`) — three microbial
  strategies compete for habitat and exchange metabolites. Shape growth
  with nutrients, oxygen and gentle chemical buffering.

- **009 · Neuroplasticity** (`/neuroplasticity`) — firing neurons reinforce
  coactive connections, sprout pathways and prune weak synapses. Influence
  activity with stimulus, nourishment and quiet.
- **010 · Morphogenesis** (`/morphogenesis`) — progenitor cells divide and
  commit to tissue fates as activator and inhibitor signals diffuse. Shape
  local growth factors, inhibition and renewal.
- **011 · Chromatic Commons** (`/chromatic-commons`) — four reproducing,
  heritable color populations gather by affinity and exchange energy across
  boundaries. Influence nutrients, mixing and stillness.
- **012 · Island Evolution** (`/island-evolution`) — isolated populations
  inherit and mutate traits under distinct habitat pressures. Open temporary
  passages, restore isolation or add rain to explore divergence and gene flow.
- **013 · Vascular Garden** (`/vascular-garden`) — tissue oxygen demand
  guides vessel sprouts, loop formation, perfusion and flow-dependent remodeling.
  Influence demand, oxygen and rest.

- **014 · Pollen Paths** (`/pollen-paths`) — shared pollinators carry pollen on different contact surfaces; shape the meadow with sunlight and rain.
- **015 · Night Chorus** (`/night-chorus`) — inherited calls and listening windows shape pairings in a shared pond; influence their timing with warmth and shade.
- **016 · Silver Shoals** (`/silver-shoals`) — two parent forms meet at a tidal confluence and produce viable, sterile hybrids; influence encounters with current and shelter.

**Future concepts — not yet implemented**

- **Living Networks** — slime-mold-inspired networks explore, reinforce useful
  connections and retract others. Influence food and moisture gradients.

Living Networks remains a concept, **not an implemented feature or promise of
scientific fidelity**. Every world should have a distinct mechanism, visual
identity and gentle interaction vocabulary.

## Development

WILD LIFE is an Angular 22 / TypeScript application with feature-owned domain
models, Canvas rendering, a shared fixed-step runner and a central catalogue.

```bash
npm ci
npm start
```

Open `http://localhost:4200/`. Current routes are `/`, `/ecosystem`,
`/murmuration`, `/defensive-herd`, `/canopy`, `/abyssal-bloom`,
`/synchrony`, `/reef`, `/microbial-commons`, `/neuroplasticity`,
`/morphogenesis`, `/chromatic-commons`, `/island-evolution`, `/vascular-garden`, `/pollen-paths`, `/night-chorus` and `/silver-shoals`.

**Optional procedural sound:** all sixteen worlds offer distinct, quiet,
ethereal synthesized ambience and model-driven event accents. Soft attacks,
filtered tones, diffuse reverberation and spaced cues keep the sound unobtrusive.
Audio is muted by default and starts only after the visitor explicitly enables
Sound (or presses M); it follows pause, hidden-tab and component teardown.

Add new worlds as feature folders and register them **once** in
[`src/app/simulations/simulation-catalog.ts`](src/app/simulations/simulation-catalog.ts).
Routes, homepage metadata and optional lazy previews derive from that registry;
do not register future concepts before they have working implementations.

## Quality and agent guidance

[**AGENTS.md**](AGENTS.md) is the canonical coding-agent contract. It explicitly
requires agents to follow this product direction and the nearest feature-specific
instructions. All repository-facing text, documentation, UI copy and code comments
must be **in English**.

```bash
npm run agent:check
npm run typecheck
npm run lint
npm run format:check
npm run test:ci
npm run build
```

For UI, navigation, Canvas and experiment import/export changes, also run
`npm run test:e2e` after installing Playwright Chromium.

See [new world models](docs/new-worlds.md),
[architecture](docs/architecture.md),
[simulation catalogue](docs/simulation-catalog.md),
[reproducible experiments](docs/experiments.md) and
[quality gates](docs/quality-gates.md) for implementation details.
