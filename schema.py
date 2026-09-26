"""Normalize Game Correspond Desk JSON (schema v2, backward compatible with v1)."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


def empty_graph() -> dict[str, Any]:
    return {
        "schemaVersion": 2,
        "id": "untitled",
        "projectName": "未命名项目",
        "projectNameZh": "未命名项目",
        "projectNameEn": "Untitled project",
        "axis": "system",
        "cameras": {
            "system": {"x": 40, "y": 24, "scale": 1},
            "discipline": {"x": 40, "y": 24, "scale": 1},
        },
        "axes": [
            {"id": "system", "titleZh": "系统视图", "titleEn": "Systems", "tree": []},
            {"id": "discipline", "titleZh": "工种视图", "titleEn": "Disciplines", "tree": []},
        ],
        "systemTree": [],
        "disciplineTree": [],
        "nodes": [],
        "links": [],
    }


def _as_dict(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    inner = raw.get("data")
    if isinstance(inner, dict) and any(k in inner for k in ("nodes", "axes", "systemTree", "disciplineTree")):
        return inner
    return raw


def _norm_tree(items: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or item.get("titleZh") or item.get("titleEn") or item.get("id") or "")
        node = {
            "id": str(item.get("id") or title or "cat"),
            "title": title,
            "titleZh": str(item.get("titleZh") or title),
            "titleEn": str(item.get("titleEn") or item.get("title") or title),
        }
        if item.get("color"):
            node["color"] = str(item["color"])
        kids = _norm_tree(item.get("children") or [])
        if kids:
            node["children"] = kids
        out.append(node)
    return out


def _norm_axis(item: dict[str, Any]) -> dict[str, Any]:
    axis_id = str(item.get("id") or "axis")
    title_zh = str(item.get("titleZh") or item.get("title") or axis_id)
    title_en = str(item.get("titleEn") or item.get("title") or axis_id)
    return {
        "id": axis_id,
        "titleZh": title_zh,
        "titleEn": title_en,
        "title": title_zh,
        "tree": _norm_tree(item.get("tree") or []),
    }


def normalize_graph(raw: Any) -> dict[str, Any]:
    src = _as_dict(raw)
    base = empty_graph()
    axes_in = src.get("axes")
    axes: list[dict[str, Any]] = []
    if isinstance(axes_in, list) and axes_in:
        axes = [_norm_axis(a) for a in axes_in if isinstance(a, dict) and a.get("id")]
    if not axes:
        axes = [
            {
                "id": "system",
                "titleZh": "系统视图",
                "titleEn": "Systems",
                "title": "系统视图",
                "tree": _norm_tree(src.get("systemTree") or []),
            },
            {
                "id": "discipline",
                "titleZh": "工种视图",
                "titleEn": "Disciplines",
                "title": "工种视图",
                "tree": _norm_tree(src.get("disciplineTree") or []),
            },
        ]
    extra_trees = src.get("trees")
    if isinstance(extra_trees, dict):
        known = {a["id"] for a in axes}
        for key, tree in extra_trees.items():
            if key in known:
                continue
            axes.append(
                {
                    "id": str(key),
                    "titleZh": str(key),
                    "titleEn": str(key),
                    "title": str(key),
                    "tree": _norm_tree(tree),
                }
            )
    axis_ids = [a["id"] for a in axes]
    cameras = src.get("cameras") if isinstance(src.get("cameras"), dict) else {}
    norm_cameras: dict[str, Any] = {}
    for axis_id in axis_ids:
        cam = cameras.get(axis_id) if isinstance(cameras.get(axis_id), dict) else {}
        norm_cameras[axis_id] = {
            "x": float(cam.get("x", 40) or 40),
            "y": float(cam.get("y", 24) or 24),
            "scale": float(cam.get("scale", 1) or 1),
        }
    nodes = []
    for node in src.get("nodes") or []:
        if not isinstance(node, dict):
            continue
        data = node.get("data") if isinstance(node.get("data"), dict) else {}
        homes = data.get("homes") if isinstance(data.get("homes"), dict) else {}
        if data.get("systemId") and "system" not in homes:
            homes["system"] = data.get("systemId")
        if data.get("disciplineId") and "discipline" not in homes:
            homes["discipline"] = data.get("disciplineId")
        pos = data.get("pos") if isinstance(data.get("pos"), dict) else {}
        for axis_id in axis_ids:
            if axis_id not in pos:
                pos[axis_id] = {"x": float(node.get("x") or 80), "y": float(node.get("y") or 80)}
            else:
                slot = pos[axis_id] if isinstance(pos[axis_id], dict) else {}
                pos[axis_id] = {"x": float(slot.get("x") or 0), "y": float(slot.get("y") or 0)}
        title = str(data.get("title") or data.get("titleZh") or node.get("id") or "node")
        nodes.append(
            {
                "id": str(node.get("id") or title),
                "type": str(node.get("type") or "correspond.item"),
                "x": float(node.get("x") or pos.get(axis_ids[0], {}).get("x") or 80),
                "y": float(node.get("y") or pos.get(axis_ids[0], {}).get("y") or 80),
                "data": {
                    "title": title,
                    "titleZh": str(data.get("titleZh") or title),
                    "titleEn": str(data.get("titleEn") or data.get("title") or title),
                    "summary": str(data.get("summary") or data.get("summaryZh") or ""),
                    "summaryZh": str(data.get("summaryZh") or data.get("summary") or ""),
                    "summaryEn": str(data.get("summaryEn") or ""),
                    "docs": [
                        {"label": str(d.get("label") or ""), "url": str(d.get("url") or "")}
                        for d in (data.get("docs") or [])
                        if isinstance(d, dict)
                    ],
                    "systemId": str(homes.get("system") or data.get("systemId") or ""),
                    "disciplineId": str(homes.get("discipline") or data.get("disciplineId") or ""),
                    "homes": {k: str(v) for k, v in homes.items() if v},
                    "color": str(data.get("color") or "#e7c07a"),
                    "pos": pos,
                },
            }
        )
    links = []
    for link in src.get("links") or []:
        if not isinstance(link, dict):
            continue
        if not link.get("from") or not link.get("to"):
            continue
        links.append(
            {
                "id": str(link.get("id") or f"{link.get('from')}-{link.get('to')}"),
                "from": str(link.get("from")),
                "fromSock": str(link.get("fromSock") or "out"),
                "to": str(link.get("to")),
                "toSock": str(link.get("toSock") or "in"),
                "label": str(link.get("label") or link.get("labelZh") or ""),
                "labelZh": str(link.get("labelZh") or link.get("label") or ""),
                "labelEn": str(link.get("labelEn") or ""),
            }
        )
    current_axis = str(src.get("axis") or (axis_ids[0] if axis_ids else "system"))
    if current_axis not in axis_ids and axis_ids:
        current_axis = axis_ids[0]
    name_zh = str(src.get("projectNameZh") or src.get("projectName") or "未命名项目")
    name_en = str(src.get("projectNameEn") or src.get("projectName") or "Untitled project")
    out = {
        "schemaVersion": 2,
        "id": str(src.get("id") or "project"),
        "projectName": name_zh,
        "projectNameZh": name_zh,
        "projectNameEn": name_en,
        "axis": current_axis,
        "cameras": norm_cameras,
        "axes": axes,
        "systemTree": next((a["tree"] for a in axes if a["id"] == "system"), axes[0]["tree"] if axes else []),
        "disciplineTree": next((a["tree"] for a in axes if a["id"] == "discipline"), []),
        "nodes": nodes,
        "links": links,
    }
    return out


def _merge_tree(base: list[dict[str, Any]], incoming: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {n["id"]: deepcopy(n) for n in base}
    for item in incoming:
        if item["id"] in by_id:
            cur = by_id[item["id"]]
            cur["title"] = item.get("title") or cur.get("title")
            cur["titleZh"] = item.get("titleZh") or cur.get("titleZh")
            cur["titleEn"] = item.get("titleEn") or cur.get("titleEn")
            if item.get("color"):
                cur["color"] = item["color"]
            cur["children"] = _merge_tree(cur.get("children") or [], item.get("children") or [])
        else:
            by_id[item["id"]] = deepcopy(item)
    order = [n["id"] for n in base] + [n["id"] for n in incoming if n["id"] not in {x["id"] for x in base}]
    return [by_id[i] for i in order if i in by_id]


def merge_graphs(current: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    a = normalize_graph(current)
    b = normalize_graph(incoming)
    axes_by_id = {ax["id"]: deepcopy(ax) for ax in a["axes"]}
    for ax in b["axes"]:
        if ax["id"] in axes_by_id:
            axes_by_id[ax["id"]]["tree"] = _merge_tree(axes_by_id[ax["id"]].get("tree") or [], ax.get("tree") or [])
            axes_by_id[ax["id"]]["titleZh"] = ax.get("titleZh") or axes_by_id[ax["id"]].get("titleZh")
            axes_by_id[ax["id"]]["titleEn"] = ax.get("titleEn") or axes_by_id[ax["id"]].get("titleEn")
        else:
            axes_by_id[ax["id"]] = deepcopy(ax)
    a["axes"] = list(axes_by_id.values())
    nodes_by_id = {n["id"]: n for n in a["nodes"]}
    for node in b["nodes"]:
        if node["id"] in nodes_by_id:
            old = nodes_by_id[node["id"]]
            merged_pos = dict(old["data"].get("pos") or {})
            merged_pos.update(node["data"].get("pos") or {})
            homes = dict(old["data"].get("homes") or {})
            homes.update(node["data"].get("homes") or {})
            old["data"].update(node["data"])
            old["data"]["pos"] = merged_pos
            old["data"]["homes"] = homes
        else:
            nodes_by_id[node["id"]] = node
    a["nodes"] = list(nodes_by_id.values())
    links_by_id = {l["id"]: l for l in a["links"]}
    for link in b["links"]:
        links_by_id[link["id"]] = link
    a["links"] = list(links_by_id.values())
    a["projectName"] = b.get("projectName") or a.get("projectName")
    a["projectNameZh"] = b.get("projectNameZh") or a.get("projectNameZh")
    a["projectNameEn"] = b.get("projectNameEn") or a.get("projectNameEn")
    return normalize_graph(a)
