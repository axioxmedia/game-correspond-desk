"""Game Correspond Desk — dual-axis correspondence editor and audit HTML export."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import webbrowser
import zipfile
from copy import deepcopy
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from axioxmedia import (
    AIO_SOFTWARE_NAME_EN,
    aio_logo_png,
    apply_hwnd_icon,
    axiox_window_title,
)
from utm_beacon import schedule_utm_beacon

from schema import empty_graph, merge_graphs, normalize_graph

APP_VERSION = "1.2.1"
APP_SLUG = "game-correspond-desk"


def app_root() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


def runtime_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


ROOT = app_root()
STATIC = ROOT / "static"
RUNTIME = runtime_dir()
LOG_FILE = RUNTIME / "correspond_desk.log"
PREFS_FILE = RUNTIME / "game-correspond-desk-prefs.json"
PROJECT_FILE = RUNTIME / "correspond-project.json"
EXPORT_DIR = RUNTIME / "exports"
LAST_ZIP = EXPORT_DIR / "correspond-audit.zip"

app = FastAPI(title="游戏照应台", version=APP_VERSION)
app.mount("/assets", StaticFiles(directory=STATIC), name="assets")


def write_log(message: str) -> None:
    try:
        with LOG_FILE.open("a", encoding="utf-8") as fh:
            fh.write(message.rstrip() + "\n")
    except OSError:
        pass


def default_export_root() -> str:
    if os.name == "nt":
        d = Path("D:/Projects")
        if d.exists():
            return str(d)
        return str(Path.home() / "Documents" / "CorrespondDesk")
    return str(Path.home() / "CorrespondDesk")


def default_graph() -> dict[str, Any]:
    return {
        "id": "sample-active-skill",
        "projectName": "示范项目 · 主动技能",
        "axis": "system",
        "cameras": {
            "system": {"x": 40, "y": 24, "scale": 1},
            "discipline": {"x": 40, "y": 24, "scale": 1},
        },
        "systemTree": [
            {
                "id": "sys-combat",
                "title": "战斗",
                "color": "#ff8b8b",
                "children": [
                    {
                        "id": "sys-skill",
                        "title": "技能",
                        "children": [
                            {"id": "sys-skill-active", "title": "主动技能"},
                        ],
                    }
                ],
            },
            {
                "id": "sys-ui",
                "title": "界面",
                "color": "#7ee0c6",
                "children": [
                    {"id": "sys-hud", "title": "HUD", "children": [{"id": "sys-hud-skill", "title": "技能栏"}]},
                ],
            },
            {
                "id": "sys-character",
                "title": "角色",
                "color": "#c4a6f0",
                "children": [
                    {"id": "sys-body", "title": "形体", "children": [{"id": "sys-body-anim", "title": "战斗姿态"}]},
                ],
            },
        ],
        "disciplineTree": [
            {"id": "dis-design", "title": "策划", "color": "#e7c07a", "children": [{"id": "dis-design-skill", "title": "技能数值"}]},
            {"id": "dis-ui", "title": "界面", "color": "#7ee0c6", "children": [{"id": "dis-ui-hud", "title": "HUD"}]},
            {"id": "dis-anim", "title": "动画", "color": "#f3d7a1", "children": [{"id": "dis-anim-cast", "title": "释放"}]},
            {"id": "dis-prog", "title": "程序", "color": "#8be0a6", "children": [{"id": "dis-prog-exec", "title": "执行器"}]},
            {"id": "dis-mat", "title": "材质", "color": "#7eb0e7", "children": [{"id": "dis-mat-slash", "title": "刀光"}]},
        ],
        "nodes": [
            {
                "id": "n-hud",
                "type": "correspond.item",
                "x": 120,
                "y": 280,
                "data": {
                    "title": "技能栏 HUD",
                    "summary": "战斗中展开的技能槽。点击后应与释放动画、执行器进入同一套操作。",
                    "docs": [{"label": "界面稿", "url": ""}],
                    "systemId": "sys-hud-skill",
                    "disciplineId": "dis-ui-hud",
                    "color": "#7ee0c6",
                    "pos": {"system": {"x": 120, "y": 280}, "discipline": {"x": 360, "y": 160}},
                },
            },
            {
                "id": "n-anim",
                "type": "correspond.item",
                "x": 420,
                "y": 160,
                "data": {
                    "title": "技能释放动画",
                    "summary": "角色施法/挥砍蒙太奇。与 HUD 按下、执行器判定同一拍开始。",
                    "docs": [{"label": "动画清单", "url": ""}],
                    "systemId": "sys-skill-active",
                    "disciplineId": "dis-anim-cast",
                    "color": "#f3d7a1",
                    "pos": {"system": {"x": 420, "y": 160}, "discipline": {"x": 620, "y": 160}},
                },
            },
            {
                "id": "n-exec",
                "type": "correspond.item",
                "x": 420,
                "y": 340,
                "data": {
                    "title": "技能执行器",
                    "summary": "读取技能数据、结算命中与冷却。运行时与 HUD、动画、刀光共用同一技能 ID。",
                    "docs": [{"label": "程序说明", "url": ""}],
                    "systemId": "sys-skill-active",
                    "disciplineId": "dis-prog-exec",
                    "color": "#8be0a6",
                    "pos": {"system": {"x": 420, "y": 340}, "discipline": {"x": 880, "y": 160}},
                },
            },
            {
                "id": "n-mat",
                "type": "correspond.item",
                "x": 720,
                "y": 240,
                "data": {
                    "title": "刀光材质",
                    "summary": "挥砍瞬间的刀光与残影。挂在释放动画插槽上，由执行器触发显示。",
                    "docs": [{"label": "材质实例", "url": ""}],
                    "systemId": "sys-skill-active",
                    "disciplineId": "dis-mat-slash",
                    "color": "#7eb0e7",
                    "pos": {"system": {"x": 720, "y": 240}, "discipline": {"x": 1140, "y": 160}},
                },
            },
            {
                "id": "n-data",
                "type": "correspond.item",
                "x": 120,
                "y": 140,
                "data": {
                    "title": "技能数值表",
                    "summary": "伤害、消耗、冷却。执行器与 HUD 冷却条读取同一行。",
                    "docs": [{"label": "数值表", "url": ""}],
                    "systemId": "sys-skill-active",
                    "disciplineId": "dis-design-skill",
                    "color": "#e7c07a",
                    "pos": {"system": {"x": 120, "y": 140}, "discipline": {"x": 100, "y": 160}},
                },
            },
        ],
        "links": [
            {"id": "l1", "from": "n-data", "fromSock": "out", "to": "n-hud", "toSock": "in", "label": "冷却数据"},
            {"id": "l2", "from": "n-data", "fromSock": "out", "to": "n-exec", "toSock": "in", "label": "结算数据"},
            {"id": "l3", "from": "n-hud", "fromSock": "out", "to": "n-anim", "toSock": "in", "label": "同屏按下"},
            {"id": "l4", "from": "n-hud", "fromSock": "out", "to": "n-exec", "toSock": "in", "label": "同一技能 ID"},
            {"id": "l5", "from": "n-anim", "fromSock": "out", "to": "n-mat", "toSock": "in", "label": "插槽挂载"},
            {"id": "l6", "from": "n-exec", "fromSock": "out", "to": "n-mat", "toSock": "in", "label": "触发显示"},
            {"id": "l7", "from": "n-anim", "fromSock": "out", "to": "n-exec", "toSock": "in", "label": "同一拍"},
        ],
    }


def load_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return deepcopy(fallback)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return deepcopy(fallback)


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def current_graph() -> dict[str, Any]:
    data = load_json(PROJECT_FILE, default_graph())
    if not isinstance(data, dict) or ("nodes" not in data and "axes" not in data and "systemTree" not in data):
        return normalize_graph(default_graph())
    return normalize_graph(data)


class PrefsBody(BaseModel):
    model_config = ConfigDict(extra="allow")
    theme: str = "gold"
    remember: bool = True
    lastExportDir: str = ""
    lastProjectName: str = ""
    axis: str = "system"
    exportAutoLang: bool = True
    exportPreferEn: bool = True
    exportDefaultAxis: str = "system"


class GraphBody(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = ""
    projectName: str = ""
    axis: str = "system"
    cameras: dict[str, Any] = Field(default_factory=dict)
    systemTree: list[Any] = Field(default_factory=list)
    disciplineTree: list[Any] = Field(default_factory=list)
    axes: list[Any] = Field(default_factory=list)
    nodes: list[Any] = Field(default_factory=list)
    links: list[Any] = Field(default_factory=list)


class ImportBody(BaseModel):
    raw: dict[str, Any]
    mode: str = "replace"


class ExportBody(BaseModel):
    destDir: str = ""
    graph: dict[str, Any] | None = None
    autoLang: bool = True
    preferEn: bool = True
    defaultAxis: str = "system"


class FolderBody(BaseModel):
    path: str = ""


def default_prefs() -> dict[str, Any]:
    return {
        "theme": "gold",
        "remember": True,
        "lastExportDir": default_export_root(),
        "lastProjectName": "示范项目 · 主动技能",
        "axis": "system",
        "exportAutoLang": True,
        "exportPreferEn": True,
        "exportDefaultAxis": "system",
    }


@app.get("/api/defaults")
def api_defaults() -> dict[str, Any]:
    prefs = load_json(PREFS_FILE, default_prefs())
    if not isinstance(prefs, dict):
        prefs = default_prefs()
    merged = default_prefs()
    merged.update({k: v for k, v in prefs.items() if k in merged})
    return {
        "version": APP_VERSION,
        "slug": APP_SLUG,
        "nameZh": "游戏照应台",
        "nameEn": "Game Correspond Desk",
        "brand": "axioxmedia",
        "prefs": merged,
        "exportRoot": merged.get("lastExportDir") or default_export_root(),
    }


@app.get("/api/prefs")
def api_get_prefs() -> dict[str, Any]:
    return api_defaults()["prefs"]


@app.post("/api/prefs")
def api_post_prefs(body: PrefsBody) -> dict[str, Any]:
    payload = body.model_dump()
    if payload.get("theme") not in ("gold", "light"):
        payload["theme"] = "gold"
    save_json(PREFS_FILE, payload)
    return payload


@app.get("/api/node-types")
def api_node_types() -> list[dict[str, str]]:
    return [
        {
            "id": "correspond.item",
            "title_zh": "照应块",
            "title_en": "Correspondence node",
        }
    ]


@app.get("/api/graph")
def api_get_graph() -> dict[str, Any]:
    return current_graph()


@app.put("/api/graph")
def api_put_graph(body: GraphBody) -> dict[str, Any]:
    data = normalize_graph(body.model_dump())
    save_json(PROJECT_FILE, data)
    return data


@app.post("/api/project/new")
def api_new_project() -> dict[str, Any]:
    data = empty_graph()
    save_json(PROJECT_FILE, data)
    return data


@app.post("/api/import")
def api_import(body: ImportBody) -> dict[str, Any]:
    incoming = normalize_graph(body.raw)
    mode = (body.mode or "replace").strip().lower()
    if mode == "merge":
        data = merge_graphs(current_graph(), incoming)
    else:
        data = incoming
    save_json(PROJECT_FILE, data)
    return data


@app.get("/api/project")
def api_get_project() -> dict[str, Any]:
    return current_graph()


@app.post("/api/project")
def api_post_project(body: GraphBody) -> dict[str, Any]:
    return api_put_graph(body)


@app.post("/api/preview")
def api_preview(body: GraphBody) -> dict[str, Any]:
    data = normalize_graph(body.model_dump())
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    html_path = EXPORT_DIR / "preview.html"
    html_path.write_text(build_viewer_html(data, preview=True), encoding="utf-8")
    return {"ok": True, "path": str(html_path)}


def _export_options(body: ExportBody) -> dict[str, Any]:
    axis = str(body.defaultAxis or "system").strip().lower()
    if axis in ("disciplines", "discipline"):
        axis = "discipline"
    elif axis in ("modes", "mode"):
        axis = "mode"
    else:
        axis = "system"
    return {
        "autoLang": bool(body.autoLang),
        "preferEn": bool(body.preferEn),
        "defaultAxis": axis,
    }


def write_export_pack(graph: dict[str, Any], dest: Path, options: dict[str, Any]) -> dict[str, Any]:
    dest.mkdir(parents=True, exist_ok=True)
    slug = _safe_slug(str(graph.get("projectNameEn") or graph.get("projectName") or "correspond-audit"))
    pack_dir = dest / slug
    pack_dir.mkdir(parents=True, exist_ok=True)
    html_path = pack_dir / "index.html"
    json_path = pack_dir / f"{slug}.json"
    html_path.write_text(build_viewer_html(graph, preview=False, options=options), encoding="utf-8")
    json_path.write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding="utf-8")
    zip_path = dest / f"{slug}-audit.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(html_path, f"{slug}/index.html")
        zf.write(json_path, f"{slug}/{json_path.name}")
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    try:
        LAST_ZIP.write_bytes(zip_path.read_bytes())
    except OSError:
        pass
    return {
        "ok": True,
        "html": str(html_path),
        "json": str(json_path),
        "zip": str(zip_path),
        "folder": str(pack_dir),
        "parent": str(dest),
        "slug": slug,
    }


@app.post("/api/export")
def api_export(body: ExportBody) -> dict[str, Any]:
    graph = normalize_graph(body.graph) if isinstance(body.graph, dict) else current_graph()
    dest = Path(body.destDir.strip() or default_export_root()).expanduser()
    options = _export_options(body)
    result = write_export_pack(graph, dest, options)
    prefs = load_json(PREFS_FILE, default_prefs())
    if isinstance(prefs, dict):
        prefs["lastExportDir"] = str(dest)
        prefs["lastProjectName"] = graph.get("projectName") or ""
        prefs["exportAutoLang"] = options["autoLang"]
        prefs["exportPreferEn"] = options["preferEn"]
        prefs["exportDefaultAxis"] = options["defaultAxis"]
        save_json(PREFS_FILE, prefs)
    return result


def _sse(event: str, **payload: Any) -> str:
    body = json.dumps({"event": event, **payload}, ensure_ascii=False)
    return f"data: {body}\n\n"


@app.post("/api/export/stream")
def api_export_stream(body: ExportBody) -> StreamingResponse:
    graph = normalize_graph(body.graph) if isinstance(body.graph, dict) else current_graph()
    dest = Path(body.destDir.strip() or default_export_root()).expanduser()
    options = _export_options(body)

    def stream():
        try:
            yield _sse("log", level="info", message="Prepare export folder", stage="prepare")
            dest.mkdir(parents=True, exist_ok=True)
            yield _sse("log", level="info", message="Write bilingual HTML viewer", stage="html")
            yield _sse("log", level="info", message="Write project JSON sidecar", stage="json")
            yield _sse("log", level="info", message="Pack HTML zip", stage="zip")
            result = write_export_pack(graph, dest, options)
            prefs = load_json(PREFS_FILE, default_prefs())
            if isinstance(prefs, dict):
                prefs["lastExportDir"] = str(dest)
                prefs["lastProjectName"] = graph.get("projectName") or ""
                prefs["exportAutoLang"] = options["autoLang"]
                prefs["exportPreferEn"] = options["preferEn"]
                prefs["exportDefaultAxis"] = options["defaultAxis"]
                save_json(PREFS_FILE, prefs)
            yield _sse("log", level="ok", message=f"ZIP {result['zip']}", stage="done")
            yield _sse("done", level="ok", message="Export complete", folder=result["folder"], zip=result["zip"], html=result["html"], parent=result["parent"])
        except Exception as exc:
            yield _sse("error", level="error", message=str(exc))

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/api/export/download")
def api_export_download() -> FileResponse:
    if not LAST_ZIP.exists():
        raise HTTPException(404, "还没有导出包")
    return FileResponse(LAST_ZIP, filename="correspond-audit.zip", media_type="application/zip")


@app.post("/api/pick-folder")
def api_pick_folder() -> dict[str, Any]:
    initial = default_export_root()
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        try:
            root.attributes("-topmost", True)
        except Exception:
            pass
        chosen = filedialog.askdirectory(initialdir=initial, title="Export folder")
        try:
            root.destroy()
        except Exception:
            pass
        return {"path": str(chosen or "")}
    except Exception as exc:
        write_log(f"pick-folder fallback: {exc}")
        return {"path": "", "error": str(exc)}


@app.post("/api/open-folder")
def api_open_folder(body: FolderBody) -> dict[str, Any]:
    path = Path(body.path.strip() or default_export_root()).expanduser()
    path.mkdir(parents=True, exist_ok=True)
    try:
        if os.name == "nt":
            os.startfile(str(path))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(path)])
        else:
            subprocess.Popen(["xdg-open", str(path)])
    except OSError as exc:
        raise HTTPException(400, f"无法打开目录：{exc}") from exc
    return {"ok": True, "path": str(path)}


@app.get("/brand/logo.png")
def brand_logo() -> Response:
    return Response(content=aio_logo_png(), media_type="image/png")


@app.get("/")
def index_page() -> FileResponse:
    return FileResponse(STATIC / "index.html")


@app.get("/viewer")
def viewer_page() -> HTMLResponse:
    return HTMLResponse(build_viewer_html(current_graph(), preview=True))


def _safe_slug(name: str) -> str:
    out = []
    for ch in name.strip():
        if ch.isalnum() or ch in "-_.":
            out.append(ch)
        elif ch.isspace():
            out.append("-")
    text = "".join(out).strip("-") or "correspond-audit"
    return text[:60]


def build_viewer_html(graph: dict[str, Any], preview: bool, options: dict[str, Any] | None = None) -> str:
    canvas_js = (STATIC / "canvas.js").read_text(encoding="utf-8")
    viewer_js = (STATIC / "viewer.js").read_text(encoding="utf-8")
    viewer_css = (STATIC / "viewer.css").read_text(encoding="utf-8")
    payload = json.dumps(graph, ensure_ascii=False)
    opts = options or {"autoLang": True, "preferEn": True, "defaultAxis": graph.get("axis") or "system"}
    opt_js = json.dumps(opts, ensure_ascii=False)
    title = str(graph.get("projectNameEn") or graph.get("projectName") or "Correspond")
    flag = "true" if preview else "false"
    return f"""<!DOCTYPE html>
<html lang="en" data-theme="gold">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_html_escape(title)}</title>
  <style>{viewer_css}</style>
</head>
<body>
  <div id="app"></div>
  <script>window.__GRAPH__ = {payload}; window.__PREVIEW__ = {flag}; window.__EXPORT__ = {opt_js};</script>
  <script>{canvas_js}</script>
  <script>{viewer_js}</script>
</body>
</html>
"""


def _html_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def show_error(message: str) -> None:
    write_log(message)
    if os.name == "nt":
        try:
            import ctypes

            ctypes.windll.user32.MessageBoxW(0, message, "Game Correspond Desk", 0x10)
            return
        except Exception:
            pass
    print(message, file=sys.stderr)


def _free_port(preferred: int = 8787) -> int:
    import socket

    for port in (preferred, 8788, 8789, 8790, 0):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(("127.0.0.1", port))
            chosen = int(sock.getsockname()[1])
        except OSError:
            chosen = -1
        finally:
            sock.close()
        if chosen > 0:
            return chosen
    raise RuntimeError("没有可用的本地端口")


def ensure_stdio() -> None:
    if sys.stdout is None:
        sys.stdout = LOG_FILE.open("a", encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = LOG_FILE.open("a", encoding="utf-8")


def run_server(host: str, port: int, reload: bool = False) -> None:
    import uvicorn

    ensure_stdio()
    if reload:
        uvicorn.run(app, host=host, port=port, reload=True, log_level="warning", log_config=None)
        return
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        log_level="warning",
        log_config=None,
        lifespan="on",
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = False
    server.run()


def wait_ready(url: str, server_error: list[str], timeout: float = 30.0) -> None:
    import time

    deadline = time.time() + timeout
    while time.time() < deadline:
        if server_error:
            raise RuntimeError(server_error[0])
        try:
            with httpx.Client(timeout=0.8, trust_env=False) as http:
                if http.get(url).status_code < 500:
                    return
        except httpx.HTTPError:
            time.sleep(0.2)
    extra = f"\n服务线程错误：{server_error[0]}" if server_error else ""
    raise RuntimeError(f"本地服务启动超时：{url}{extra}\n日志：{LOG_FILE}")



class DeskJsApi:
    def __init__(self) -> None:
        self.window = None

    def bind(self, window) -> None:
        self.window = window

    def pick_folder(self) -> str:
        if self.window is None:
            return ""
        try:
            import webview

            chosen = self.window.create_file_dialog(webview.FOLDER_DIALOG)
        except Exception as exc:
            write_log(f"webview pick_folder: {exc}")
            chosen = None
        if not chosen:
            return ""
        if isinstance(chosen, (list, tuple)):
            return str(chosen[0] or "")
        return str(chosen)


def run_desktop() -> None:
    import threading
    import traceback

    write_log(f"start frozen={getattr(sys, 'frozen', False)} meipass={getattr(sys, '_MEIPASS', '')}")
    port = _free_port()
    url = f"http://127.0.0.1:{port}"
    write_log(f"bind {url}")
    server_error: list[str] = []

    def _serve() -> None:
        try:
            run_server("127.0.0.1", port, reload=False)
        except Exception:
            server_error.append(traceback.format_exc())
            write_log(server_error[-1])

    thread = threading.Thread(target=_serve, name="uvicorn", daemon=True)
    thread.start()
    wait_ready(f"{url}/api/defaults", server_error)
    schedule_utm_beacon(product_en=AIO_SOFTWARE_NAME_EN, version=APP_VERSION, log=write_log)

    try:
        import webview

        api = DeskJsApi()
        window = webview.create_window(
            title=axiox_window_title(),
            url=url,
            width=1520,
            height=940,
            min_size=(1100, 720),
            background_color="#0b0d12",
            js_api=api,
        )
        api.bind(window)

        def paint_chrome(_=None) -> None:
            if os.name != "nt":
                return
            try:
                import ctypes

                hwnd = int(window.native.Handle.ToInt32())
                apply_hwnd_icon(hwnd)
                value = ctypes.c_int(1)
                for attr in (20, 19):
                    ctypes.windll.dwmapi.DwmSetWindowAttribute(
                        hwnd, attr, ctypes.byref(value), ctypes.sizeof(value)
                    )
            except Exception as exc:
                write_log(f"dark titlebar skipped: {exc}")

        try:
            window.events.shown += paint_chrome
        except Exception:
            pass
        webview.start()
        return
    except Exception:
        write_log(traceback.format_exc())
        webbrowser.open(url)
        while thread.is_alive():
            thread.join(timeout=0.5)


if __name__ == "__main__":
    import multiprocessing
    import traceback

    multiprocessing.freeze_support()
    ensure_stdio()
    try:
        desktop = "--web" not in sys.argv and os.environ.get("CORRESPOND_DESK_WEB") != "1"
        if desktop:
            run_desktop()
        else:
            run_server("127.0.0.1", _free_port(8787), reload=not getattr(sys, "frozen", False))
    except Exception:
        show_error("启动失败：\n\n" + traceback.format_exc() + f"\n\n日志文件：{LOG_FILE}")
        raise
