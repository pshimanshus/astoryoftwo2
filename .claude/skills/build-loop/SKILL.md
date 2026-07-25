---
name: build-loop
description: The maker/verifier development workflow for this project — how any feature gets planned, built, independently verified, and shipped. Load this BEFORE starting any multi-step feature, refactor, or release, and whenever asked "how should we build X", to set up the loop. Defines maker roles, the five verifiers (design, function, rights, a11y/perf, copy), the pass/fail gates, loop limits, and escalation. Triggers: build a feature, plan a release, "set up the workflow", "what's the process", verification failing repeatedly, or preparing to merge.
---

# The build loop

Work moves through **three gates** with a **maker↔verifier loop** in the middle.
Nothing merges that a verifier hasn't independently passed.

```
  ┌──────────┐      ┌───────────────────────────┐      ┌──────────┐
  │  GATE 1  │      │   THE LOOP  (max 3 turns) │      │  GATE 3  │
  │   PLAN   │─────▶│  maker ──▶ verifiers ──┐  │─────▶│   SHIP   │
  │          │      │    ▲                   │  │      │          │
  └──────────┘      │    └── fail: fix ──────┘  │      └──────────┘
                    └───────────────────────────┘
                              │ 3 fails
                              ▼
                         ESCALATE to human
```

The rule that makes this work: **a verifier never shares context with the maker
it checks.** Spawn verifiers as fresh subagents. A maker reviewing its own work
re-reads its intent, not its output, and will pass broken code.

## Gate 1 — Plan

Before any code, produce and get sign-off on:

1. **The slice** — one user-visible outcome, shippable on its own. If it can't
   be demoed in a sentence, it's too big; split it.
2. **Acceptance criteria** — GIVEN/WHEN/THEN, testable by someone who didn't
   build it. This is what the function verifier will run against.
3. **Which verifiers apply** — see the table below. Rights and a11y are not
   optional for anything touching music data or UI.
4. **Rollback** — feature flag name, or "revert the commit" if that is honestly
   sufficient.

Update `docs/PRD.md` if the slice changes scope. Plans that drift from the PRD
without updating it are how a product loses its shape.

## The loop

### Makers

| Maker | Owns | Must load first |
|---|---|---|
| `product-maker` | PRD, specs, scope decisions | `prd-writer` |
| `design-maker` | screens, components, cover artwork | **`mixtape-brand`** |
| `build-maker` | app logic, API layer, data model | `docs/TECH-SPEC.md` |
| `copy-maker` | all user-visible strings | `mixtape-brand` (copy voice) |

A maker finishes a turn by producing: the diff, a one-paragraph "what I did and
what I'm unsure about", and the command a verifier should run to see it working.
That last part is not optional — "run the app and look" is not a handoff.

### Verifiers

Each returns **PASS** or **FAIL + specific, reproducible findings**. A verifier
that returns vague dissatisfaction ("feels off") has failed at its own job; it
must name the file, the line, or the pixel.

| Verifier | Checks | Blocking for |
|---|---|---|
| `design-verifier` | renders every changed screen + every cover theme, critiques against the `mixtape-brand` checklist | any UI change |
| `function-verifier` | drives the real flow end-to-end in Chromium against the acceptance criteria; asserts zero console errors | any behaviour change |
| `rights-verifier` | music/licensing compliance — see `references/rights-checklist.md` | **anything touching music, artwork, sharing, or export** |
| `a11y-perf-verifier` | axe pass, keyboard path, contrast, Lighthouse budget, bundle delta | any UI change |
| `copy-verifier` | voice, lowercase warmth, no "Submit"/"Success!" | any new string |

Run verifiers **in parallel** — they're independent and it's the difference
between a 2-minute and a 10-minute loop.

### Loop limits

- **Max 3 maker↔verifier rounds** per slice.
- On the 3rd failure: **stop and escalate.** Hand the human the diff, all
  verifier reports, and a specific question. Three failures means the plan is
  wrong, not the code — grinding a 4th round wastes tokens and buries the real
  problem.
- A verifier that flip-flops (passes something it previously failed, with no
  relevant change) is a broken verifier. Fix the checklist, don't re-roll.

## Gate 3 — Ship

- [ ] All applicable verifiers PASS on the final diff — not on an earlier one
- [ ] `docs/` updated if behaviour or scope changed
- [ ] `DESIGN.md` iteration log appended if the look changed
- [ ] Rollback path confirmed
- [ ] Commit message explains *why*, not just what

## Running it

Spawn verifiers as independent subagents only when the user has asked for
subagent-based work; otherwise run the same checklists inline in a fresh pass,
re-reading the actual artifacts rather than your memory of writing them.

Concrete commands, render harness setup and the Playwright/`NODE_PATH` recipe
live in `references/verifier-playbook.md`. The rights checklist — the one most
likely to be skipped and most expensive to get wrong — is in
`references/rights-checklist.md`.

## Why this shape

The mixtape app has three failure modes that ordinary code review misses, and
each has a dedicated verifier:

1. **It looks wrong in a way source doesn't show.** Collisions, tilt, tracking
   drift, truncation — only a render reveals these. → `design-verifier`
2. **It quietly breaks a rights boundary.** Baking album art into a downloadable
   PNG, hosting an audio file, dropping an attribution badge. These don't fail
   tests; they fail letters from lawyers. → `rights-verifier`
3. **It works for the builder and nobody else.** Long titles, no network, a
   keyboard, a screen reader. → `function-verifier` + `a11y-perf-verifier`
