<div align="center">

# Game Correspond Desk

**Packed via Axiox Media**

A local editor that lays out a dual-axis game correspondence map and exports a standalone HTML audit page for the development team.

<p>
  <a href="docs/README-zh.md"><img src="https://img.shields.io/badge/中文说明-README--zh-e7c07a?style=for-the-badge" alt="Chinese README" /></a>
</p>

<p>
  <a href="#install">Install</a> ·
  <a href="#features">Features</a> ·
  <a href="#requirements">Requirements</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#documentation">FAQ</a>
</p>

<p>
  <img src="https://img.shields.io/badge/platform-Windows_10%2F11-0b0d12?style=flat-square" alt="Windows" />
  <img src="https://img.shields.io/badge/python-3.11%2B-e7c07a?style=flat-square" alt="Python" />
  <img src="https://img.shields.io/badge/ui-zh%20%2F%20en-7ee0c6?style=flat-square" alt="i18n" />
  <img src="https://img.shields.io/badge/export-HTML_audit-c9a227?style=flat-square" alt="export" />
</p>

</div>

<div align="center">
  <img src="docs/APPCap.png" alt="Game Correspond Desk preview" width="100%" />
</div>

> [!NOTE]
> The packed EXE is unsigned. Windows Defender may warn on first launch. Source run via `start.bat` does not require packing.

---

## At a glance

| Item | Value |
| --- | --- |
| Product | Game Correspond Desk / 游戏照应台 |
| Editor | Dual-axis infinite canvas |
| Export | One self-contained HTML + project JSON |
| Completion ticks | Stored in the audit page `localStorage` |
| UI | zh / en, gold default, light invert |

## Install

Install with [GitHub Deploy Desk](https://github.com/axioxmedia/github-deployer) if you keep this repository on GitHub.

| Platform | Action |
| --- | --- |
| Windows 10 / 11 | Unzip, then double-click `build_exe.bat` |
| Source | `start.bat` after Python 3.11+ is on PATH |

```text
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe app.py
```

## Features

| Action | What it does |
| --- | --- |
| System / discipline trees | Three-level outline on the left rail |
| Correspondence nodes | Title, note, home on both axes, doc links |
| Dual layouts | Separate coordinates per axis, animated switch |
| Runtime links | Drag a port onto another block; optional label |
| Save / open | `GET/PUT /api/graph` plus `/api/project` sidecar |
| Export | Standalone audit HTML the team can open without the editor |

## Requirements

| | Minimum | Recommended |
| --- | --- | --- |
| OS | Windows 10 | Windows 11 |
| Python | 3.11 | 3.12 |
| Display | 1280 × 720 | 1520 × 940 |

## Architecture

```text
pywebview window
    -> FastAPI on 127.0.0.1
        -> static editor (canvas.js + app.js)
        -> graph JSON sidecar
        -> exported self-contained HTML (canvas.js + viewer.js inlined)
```

## Documentation

<details>
<summary>Where do completion ticks live?</summary>

On the exported page only. They write to `localStorage` under `correspond.done.<projectId>`. They do not sync across machines.

</details>

<details>
<summary>What do the lines mean?</summary>

Runtime correspondence: the two blocks appear together in play or share data. They are not production blockers.

</details>

<details>
<summary>Where do I put the preview screenshot?</summary>

Save a capture as `docs/APPCap.png` in this folder (GitHub: upload to `docs/` on the default branch).

</details>

Packed via Axiox Media · [axiox.media](https://axiox.media)
