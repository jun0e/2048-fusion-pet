# Legacy prototypes (not part of the current build)

- `ball-crate/` — the first version: physics drop-and-merge 2048 balls in a crate (verlet circles). `npm run test:legacy` runs its tests.
- `three-render/` — the three.js 3D renderer used by the ball-crate and lane versions (procedural low-poly crate, island, balls, enemies). It imports modules that have since moved or changed, so it is kept for reference only.
