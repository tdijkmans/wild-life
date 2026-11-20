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

## Neuroplasticity (`/neuroplasticity`)

A spatial network of excitatory and inhibitory integrate-and-fire neurons has
refractory periods and decaying activity traces. Coactive neurons reinforce
weighted connections; neighboring active neurons can sprout new connections,
while weak connections are pruned. Stimulus raises local input, Nourish supports
plasticity and Quiet reduces activity. Curved links and firing glows expose the
actual network state. Sound marks activity and structural changes.

This is a Hebbian-inspired abstraction, not a model of cognition, therapy,
clinical neuroplasticity or a specific brain region.

## Morphogenesis (`/morphogenesis`)

Activator and inhibitor signals diffuse over a bounded grid with autonomous
sources. Progenitors integrate local exposure before committing to one of two differentiated
fates; daughters inherit their parent's fate. Energy, space and age regulate
cell division and turnover. Growth factor, Inhibitor and Renewal interventions
change local conditions. Membranes, nuclei and signal haze reveal tissue state;
quiet accents mark divisions and differentiation.

Signals and fate thresholds are dimensionless artistic abstractions, not
molecularly calibrated kinetics or a real developmental protocol.

## Chromatic Commons (`/chromatic-commons`)

Four heritable color populations have short-range repulsion and longer-range
pair affinities. Like colors attract; unlike colors can attract or repel,
and compatible close neighbors exchange energy. Crowding, basal resources,
aging and inherited affinity variation regulate reproduction. Nutrients,
Mixing current and Still haven change local growth and mixing. Colored bodies
and neighbor links reveal clusters without prescribing their boundaries.

These are abstract cells; color is a categorical inherited trait, not a
claim about real cell recognition. Exchanges count individual transfer steps.

## Island Evolution (`/island-evolution`)

Three islands begin with similar trait distributions but different habitat
optima. Fitness affects energy and reproduction, offspring inherit small
mutations, and finite habitat capacity and aging regulate populations.
Passage temporarily connects islands for migration; Isolation closes nearby
passages; Rain supports resources. Trait colors and population statistics
show local adaptation and divergence. Sound marks births and migration.

This is an asexual island-population model. Divergence measures differences in
mean trait; it does not establish reproductive isolation or prove speciation.

## Vascular Garden (`/vascular-garden`)

A source-to-sink vessel network supplies tissue through pressure-driven flow.
Hypoxic tissue emits a VEGF-like signal that guides new sprouts; nearby branches
can fuse into perfused loops. Flow changes vessel radius, and unused terminal
branches regress. Demand, Oxygen and Rest modify local tissue conditions.
Glowing vessels and moving particles show actual network geometry and flow;
growth and loop formation receive soft event accents.

Pressure relaxation, radius-dependent conductance and oxygen delivery are
simplified and dimensionless. This is not a clinical blood-flow prediction.

## Reproductive isolation worlds

**Pollen Paths** models two inherited distributions of flower shape. Visitor
contact usually deposits and picks up pollen on the same body surface for a
given shape. Rare differences in contact bridge the two forms. Sunlight
changes bloom timing and foraging, and rain changes seed establishment.
Aquarium traces indicate the donor and recipient of recent deliveries.

**Night Chorus** models inherited calling rhythms, listening preferences and
activity timing. Warmth and shade move local windows forward or back. Compare
mixed encounters against successful mixed pairings. Every drawn ripple follows
a model call and the optional soundscape distinguishes low and high call patterns.

**Silver Shoals** models two parent lineages whose tidal ranges overlap.
Current and eddy shelter change local encounters. Hybrid offspring grow, swim
and age normally, but never become parents. The Laboratory retains the most
recent hybrid's parent and offspring IDs.

All three use abstract forms, seeded dynamics, fixed steps and bounded
populations. Each uses the shared Aquarium stats levels and offers an
opt-in soundscape tied to model activity.

## Membrane Tide (`/membrane-tide`)

Short, open bilayer ribbons and loose patches move in a two-dimensional
fluid field. Aligned tips can bond, and flexible ribbons can seal around a
pocket of fluid when their tips meet. Swirls advect and strain nearby patches.
A pebble drops once per press and launches a pressure wave. A sufficiently
sharp difference in pressure across a bond can open a membrane. Detached
patches stay in the world and can rejoin. The Aquarium draws opposing
rows of lipid heads. Opt-in audio marks impacts, sealing and rupture.

This is a coarse-grained model of membrane closure, inspired by the balance
between [bending energy and exposed-edge cost](https://pmc.ncbi.nlm.nih.gov/articles/PMC5449011/).
The simulation represents vesicles and omits organelles and metabolism.

## Procedural sound and listening consent

Shared `WorldExperienceComponent` worlds may provide a `soundProfile`.
`WorldSoundscape` uses the browser Web Audio API to synthesize quiet,
original ambient textures and soft, reverberant event accents. Audio is
**muted by default** and no `AudioContext` is created until a deliberate
Sound button or keyboard (M) activation.

- Sound stays separate from simulation physics and never consumes the model PRNG.
- Semantic events are emitted in bounded queues; the presentation layer
  de-duplicates them by increasing IDs and rate-limits audio playback.
- Pause and background visibility suspend audio; navigation and component
  destruction close the context. User can mute at any moment.
- No third-party audio files, streamed media, tracking or autoplay.
- All seventeen worlds have distinct sound palettes. The original ecosystem
  derives cues from birth, predation and intervention counters, preserving its
  versioned deterministic model. Murmuration and Defensive Herd also emit
  semantic event cues.

## Reproducibility and performance

All sixteen shared models accept fixed integer seeds, run at 60 fixed time steps per
simulation second, reject invalid timing, bound entities/inputs and expose
deterministic simulation state for unit tests. Canvas rendering never changes
domain state. The shared visual shell reuses Aquarium fullscreen/escape,
pause, speed, seed restart, tool input, responsive layout and chart rendering.

The old Predator–Prey Evolution world retains its stronger versioned
JSON export, intervention logging and checksum-verified replay.
These sixteen shared worlds currently provide **seeded resets and deterministic
model tests**, not imported/exported replay files. A future feature
could generalize experiment recording without weakening the existing
versioned format.

Test with `npm run test:ci`, `npm run test:e2e`, and the full
`docs/quality-gates.md` checklist. Consult the nearest `AGENTS.md`
before changing a world.
