---
name: ponytail-gain
description: >
  Show ponytail's measured impact as a compact scoreboard: less code, less cost,
  more speed, from benchmark medians. One-shot display, not a per-repo number.
  Trigger: /ponytail-gain, "ponytail gain", "what does ponytail save", or
  "show ponytail impact".
---

Display this published benchmark scoreboard when invoked; do not change mode,
write flags, or persist anything:

  ponytail gain                     benchmark median · 5 tasks · 3 models

  Lines of code   no-skill  100%
                  ponytail  6–20%   ▼ 80–94%
  Cost            no-skill  100%
                  ponytail  23–53%  ▼ 47–77%
  Speed           ponytail  3–6× faster

These are benchmark medians, not this repo. Never invent per-repo savings.
Use ponytail-debt for counted per-repo shortcuts. One-shot display only.
