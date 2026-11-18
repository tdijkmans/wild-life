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

- **001 · Predator–Prey Evolution** — a seeded ecological world of grazers,
  hunters, food, reproduction and inherited traits. Influence it through food,
  currents and localized warming or cooling.

**Future concepts — not yet implemented**

- **Murmuration** — thousands of agents form flowing flocks through local
  alignment, cohesion and separation. Shape their motion with wind and thermals.
- **Canopy** — trees branch, unfold leaves and develop overlapping crowns.
  Light competition, water availability, insect herbivory and regrowth shape
  a living canopy. Gently change light, rain, warmth or nutrient gradients.
- **Defensive Herd** — grazing animals coordinate when predators approach.
  Local sensing and social behavior can produce an outward-facing protective
  ring around vulnerable young, reducing predation risk without scripted
  formation commands. Influence movement through terrain, food, wind or scent.
- **Abyssal Bloom** — plankton populations, nutrient cycles and ocean currents
  create luminous underwater blooms. Influence light, temperature and flow.
- **Living Networks** — slime-mold-inspired networks explore, reinforce useful
  connections and retract others. Influence food and moisture gradients.
- **Synchrony** — locally coupled organisms gradually synchronize their
  pulses into waves of light. Influence local rhythms and coupling.
- **Reef** — coral growth, algae, grazers, competition and symbiosis gradually
  transform an underwater habitat. Influence environmental conditions.
- **Microbial Commons** — colonies grow, compete and exchange resources across
  chemical gradients. Influence nutrients, oxygen and spatial barriers.

These are directions, **not promises of scientific fidelity or completed features**.
Each world should have a distinct mechanism, visual identity and gentle interaction
vocabulary.

## Development

WILD LIFE is an Angular 22 / TypeScript application with feature-owned domain
models, Canvas rendering, a shared fixed-step runner and a central catalogue.

```bash
npm ci
npm start
```

Open `http://localhost:4200/`. The current routes are the collection at
`/` and Predator–Prey Evolution at `/ecosystem`.

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

See [architecture](docs/architecture.md),
[simulation catalogue](docs/simulation-catalog.md),
[reproducible experiments](docs/experiments.md) and
[quality gates](docs/quality-gates.md) for implementation details.
