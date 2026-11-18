# New living worlds: Murmuration and Defensive Herd

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

## Reproducibility and performance

Both models accept fixed integer seeds, run at 60 fixed time steps per
simulation second, reject invalid timing, bound entities/inputs and expose
deterministic simulation state for unit tests. Canvas rendering never changes
domain state. The shared visual shell reuses Aquarium fullscreen/escape,
pause, speed, seed restart, tool input, responsive layout and chart rendering.

The old Predator–Prey Evolution world retains its stronger versioned
JSON export, intervention logging and checksum-verified replay.
These two new worlds currently provide **seeded resets and deterministic
model tests**, not imported/exported replay files. A future feature
could generalize experiment recording without weakening the existing
versioned format.

Test with `npm run test:ci`, `npm run test:e2e`, and the full
`docs/quality-gates.md` checklist. Consult the nearest `AGENTS.md`
before changing a world.
