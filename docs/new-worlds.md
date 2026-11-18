# Biology-inspired living worlds

These are **biology-inspired** emergent simulations, not calibrated field
models. They use the shared fixed-step `SimulationRunner`, deterministic
`SeededRandom` and a common `WorldExperienceComponent` for UI. The actual
models and drawings belong to their feature folders.

## Murmuration (`/murmuration`)

Each starling only reads its local neighborhood, using alignment, cohesion,
separation, bounded flight speed and environmental acceleration. A free-moving
raptor creates a repulsion signal; individual birds evade and regroup.
Birds age, reproduce with small inherited variations in their flight traits
and may be caught. A spatial grid limits neighbor queries.

- **Breeze:** drag to create a decaying directional air field.
- **Thermal:** add a localized rising/vortical current.
- **Stillness:** soften motion in a localized pocket.
- **Aquarium:** twilight sky, translucent atmospheric bands, flight trails,
  wing motion, starling silhouettes and a distinct raptor.
- **Laboratory:** number of starlings, nearby neighbors, locally dense groups,
  birth history and recent population/cohesion trends.

The model does not claim to reproduce empirical starling trajectories,
actual aerodynamics or predator capture rates.

## Defensive Herd (`/defensive-herd`)

Grazers forage at regrowing pasture sites. Calves prefer the group center
when threatened; adults independently steer toward a protective distance
from nearby calves, separate from neighbors and orient outward. There are
**no preassigned ring positions or sequenced formation animations**. The
collective result can resemble the defensive rings of musk oxen.

Predators pursue calves. Adults positioned along the physical approach
between predator and calf can prevent an attack, while weak or incomplete
coverage leaves openings. Calves mature and new calves may be born.

- **Pasture:** increase food available in a chosen area.
- **Scent:** create a temporary field that predators prefer to avoid.
- **Breeze:** apply a gentle directional influence to the herd.
- **Aquarium:** moonlit meadow, living pasture, grazing silhouettes,
  luminous calves, predators and an optional halo derived from actual
  defensive stress.
- **Laboratory:** adult/young counts, outward-facing ring coverage,
  predation losses and recent calf/ring trends.

This is a simplified collective-defense model, not a claim that any real
species forms a perfect or invulnerable ring.

## Canopy (`/canopy`)

The model grows real branching structures over time. Each branch follows
the growing endpoint of its parent; attached leaves expand, contribute to
tree energy and exhibit visible health and bite damage. Trees compete for
light as neighboring crowns overlap and consume water while growing.

Insects independently search local leaf positions using a spatial index;
feeding reduces leaf health, and heavily damaged leaves are lost. Water,
shade and insect activity influence future growth and regeneration.

- **Rain:** temporary localized moisture that improves tree water reserves.
- **Sunbeam:** localized light that improves leaf production.
- **Wildflowers:** insect-attracting habitat that changes local herbivore movement.
- **Aquarium:** sunlit, layered forest, actual growing branches and leaves,
  leaf-vein details, insect flight and water/illumination fields.
- **Laboratory:** total foliage, trees, insects, leaves eaten, and population trends.
- **Sound:** opt-in forest wind ambience and restrained rain, leaf growth and
  insect rustling cues tied to actual model events.

Tree physiology, branch architecture and insect feeding are simplified
biology-inspired dynamics, not calibrated forest-growth predictions.

## Abyssal Bloom (`/abyssal-bloom`)

Phytoplankton gain energy through **light and local nutrient concentration**,
move with currents, divide and eventually die. Zooplankton independently
seek and consume producers, obtain energy and reproduce. Nutrients move and
diffuse through a simulated water column. Grazing changes biomass and can
drive population cycles.

- **Current:** move water and resident organisms through a directional field.
- **Upwelling:** bring nutrients into a region of the water column.
- **Light:** increase localized photosynthetic production.
- **Aquarium:** deep ocean gradient, sunshafts, softly glowing phytoplankton,
  feeding zooplankton, biological shimmer and faint flow lines.
- **Laboratory:** producers, grazers, nutrient reserve, luminosity and trends.
- **Sound:** opt-in underwater wash and quiet bloom, bubble and shimmer events
  derived from nutrient injection, population growth and feeding.

The water column is a stylized plankton food web. Bioluminescence and
nutrient cycles are not scientifically calibrated.

## Synchrony (`/synchrony`)

Fireflies independently maintain internal flashing phases and frequencies.
They couple only to nearby insects through a Kuramoto-inspired local phase
rule, with finite speed and moving neighborhoods. Synchronization and
traveling flash clusters emerge from these interactions; **there is no
central clock or scripted global flash**. Inherited period/coupling
variation, natural turnover and soft environment fields change the dynamics.

- **Warmth:** accelerates local oscillator frequency.
- **Breeze:** moves insects and changes who interacts with whom.
- **Shade:** softens local coupling and phase speed.
- **Aquarium:** nocturnal wetland, luminous individual fireflies and
  actual phase-linked flashing clusters.
- **Laboratory:** number of fireflies, global order parameter, local
  phase agreement and active flashes.
- **Sound:** an opt-in twilight hush with occasional soft pulse and
  chorus accents based on actual environmental fields or synchronization.

It is a local-coupled-oscillator abstraction, not a calibrated biological
model of any particular flashing firefly species.

## Reef (`/reef`)

Coral colonies extend real branching structures using energy gained
through light-dependent photosymbiosis. Local warming causes bleaching
(symbiont loss) and energy decline, while cooler water supports recovery.
Algae compete for illuminated space near corals and actively feeding
grazers consume algae; both modify coral outcomes over time. Coral
recruitment and new grazers are possible under favorable conditions.

- **Cool water:** relieves localized coral heat stress.
- **Nutrients:** promotes algae; additional food can increase competition.
- **Current:** changes water flow and grazer movement.
- **Aquarium:** colorful, growing coral architecture, changing symbiotic
  coloration, algae fronds and individually swimming grazers.
- **Laboratory:** branch count, average symbiont retention, number of
  bleached colonies and grazing fish.
- **Sound:** opt-in filtered water ambience with restrained coral growth,
  grazing, current and heat-stress accents.

The model is not a validated forecast of coral growth, disease,
bleaching thresholds, fish trophic effects or climate resilience.

## Microbial Commons (`/microbial-commons`)

A spatial resource model represents **three metabolic strategies** on a
finite agar-like habitat. Producers consume nutrient and secrete a
diffusible metabolite; cross-feeders use that metabolite; competitors
consume common nutrients while secreting inhibitors. Cells grow and
colonize adjacent empty sites when local resources permit. Gradients,
chemical diffusion and inherited tolerance variation produce
contingent colony boundaries—not pre-drawn patterns.

- **Nutrients:** improve the local nutrient field.
- **Oxygen:** increase local oxygen availability.
- **Buffer:** reduce local inhibitor concentration.
- **Aquarium:** luminous microscopic colony fronts inside a glass Petri
  dish, visualizing biomass, metabolite and inhibitor distributions.
- **Laboratory:** live producer, cross-feeder and competitor counts,
  metabolic exchanges and occupied-habitat trends.
- **Sound:** opt-in microscopic, low-level wash with occasional subtle
  division, exchange and neutralization cues.

No specific organisms, pathogens, culturing recipes or empirically
calibrated kinetics are represented. This is an abstract computational
ecology model, not a biological laboratory protocol.

## Procedural sound and listening consent

Shared `WorldExperienceComponent` worlds may provide a `soundProfile`.
`WorldSoundscape` uses the browser Web Audio API to synthesize quiet,
original ambient textures and short non-musical event accents. Audio is
**muted by default** and no `AudioContext` is created until a deliberate
Sound button or keyboard (M) activation.

- Sound stays separate from simulation physics and never consumes the model PRNG.
- Semantic events are emitted in bounded queues; the presentation layer
  de-duplicates them by increasing IDs and rate-limits audio playback.
- Pause and background visibility suspend audio; navigation and component
  destruction close the context. User can mute at any moment.
- No third-party audio files, streamed media, tracking or autoplay.
- Procedural sound currently covers worlds 002–008. Predator–Prey
  Evolution continues to use its original interface without sound.

## Reproducibility and performance

All seven newer models accept fixed integer seeds, run at 60 fixed time steps per
simulation second, reject invalid timing, bound entities/inputs and expose
deterministic simulation state for unit tests. Canvas rendering never changes
domain state. The shared visual shell reuses Aquarium fullscreen/escape,
pause, speed, seed restart, tool input, responsive layout and chart rendering.

The old Predator–Prey Evolution world retains its stronger versioned
JSON export, intervention logging and checksum-verified replay.
These seven newer worlds currently provide **seeded resets and deterministic
model tests**, not imported/exported replay files. A future feature
could generalize experiment recording without weakening the existing
versioned format.

Test with `npm run test:ci`, `npm run test:e2e`, and the full
`docs/quality-gates.md` checklist. Consult the nearest `AGENTS.md`
before changing a world.
