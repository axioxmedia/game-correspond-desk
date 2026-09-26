---
name: game-correspond-map
description: Interview a game design in steps, then write or revise a Game Correspond Desk JSON map of systems, disciplines, custom axes, nodes, and runtime correspondence links. Use when the user wants 照应图 JSON, 游戏对照图, correspond desk import, dual-axis architecture audit, or to fill Game Correspond Desk from a spoken game idea.
metadata:
  type: workflow
  version: "1.1"
  desk: game-correspond-desk
---

# Game Correspond Map

Turn a spoken game idea (and optional existing JSON) into one file the Game Correspond Desk can import.

Do not build the desktop app in this skill. Output JSON only, then tell the user to use 导入 JSON.

## When activated

Ask in this order. Wait for answers. Do not skip to writing JSON until step 05 is answered.

### 01 Game shape

Ask, in the user's language

- working title (or a category label if they forbid a real title)
- genre / perspective / platforms
- one-sentence loop (input → resolve → feedback → re-enter)
- what "done" means for a block (shipped in play, not a production gate)

### 02 Systems

Ask which play or content systems exist. Examples only if they are stuck — combat, character, UI, world, narrative, economy. Record their nouns, not yours.

### 03 Disciplines

Ask which workstreams own runtime pieces. Typical set is design, UI, animation, program, material, audio. Accept custom names.

### 04 Extra axes (optional)

Ask whether they need more outline axes besides system and discipline (chapter, map, mode, milestone). Each extra axis becomes another left-rail tab.

### 05 Existing JSON

Ask once, as two parts

1. Do you already have a Correspond Desk JSON (or any close graph JSON)?
2. If yes — should this run **modify** that file (keep ids, merge or replace trees/nodes) or only use it as **reference** (new ids allowed, structure inspired by it)?

If they attach a file, read it. Run it through the v2 shape in `references/schema.md`. Never drop unknown custom axes.

## Write rules

- One UTF-8 JSON file under `/home/workdir/artifacts/` named `{project-slug}.correspond.json`.
- Root is the graph object. No markdown fence inside the file. `{"data":{...}}` wrapper is allowed; the desk normalizes it.
- `schemaVersion` is `2`.
- Every axis the user named appears in `axes[]` with `id`, `titleZh`, `titleEn`, `tree`.
- Keep `systemTree` / `disciplineTree` in sync when those two ids exist (desk mirrors them).
- Nodes are discipline-owned deliverables, not whole features. Example — skill HUD, skill montage, skill executor, slash material are four nodes, linked as runtime correspondence.
- Each node has `data.homes.{axisId}` and `data.pos.{axisId}`. Give both system and discipline layouts at minimum.
- System layout must not stack groups on top of each other. Use one column band per top-level system. Inner grid 300×156. Group band width 680. Gap between bands 180. Start at x=80, y=100. Scale the system camera to about 0.55 so a large map still opens readable.
- Links mean runtime correspondence (same screen or shared data), never build-order blockers.
- Fill `titleZh` / `titleEn` and `summaryZh` / `summaryEn` when you know both languages; otherwise copy the known language into both.
- Do not invent studio names or shipped titles if the user did not give them.
- Invented filler goes into a short `readyNote` string on the graph root so the user can see what was guessed.

## After writing

Reply with

- file path
- axis ids created
- node / link counts
- whether the run was blank / modify / reference
- import hint — open Game Correspond Desk, 导入 JSON, choose `replace` to overwrite or `merge` to combine

Do not paste the full JSON unless they ask.

## Refuse to expand

Do not add account sync, NL-to-diagram generation, production Gantt fields, or a second canvas runtime.
