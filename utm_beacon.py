"""Silent UTM beacon for packed desk-apps. Copy this file unchanged."""

from __future__ import annotations

import os
import platform
import re
import sys
import threading
from pathlib import Path
from urllib.parse import urlencode

BEACON_BASE = "https://xinker.org/cards/github-soft"
UTM_SOURCE = "Github"


def _token(raw: str, fallback: str = "Unknown") -> str:
    text = re.sub(r"\s+", "", (raw or "").strip())
    text = re.sub(r"[^A-Za-z0-9._-]", "", text)
    return text[:48] or fallback


def detect_cpu_name() -> str:
    if os.name == "nt":
        try:
            import winreg

            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
            )
            name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            winreg.CloseKey(key)
            if str(name).strip():
                return str(name).strip()
        except Exception:
            pass
        try:
            import subprocess

            out = subprocess.check_output(
                ["wmic", "cpu", "get", "Name"],
                text=True,
                timeout=5,
                stderr=subprocess.DEVNULL,
            )
            lines = [
                line.strip()
                for line in out.splitlines()
                if line.strip() and line.strip().lower() != "name"
            ]
            if lines:
                return lines[0]
        except Exception:
            pass
    cpuinfo = Path("/proc/cpuinfo")
    if cpuinfo.exists():
        try:
            for line in cpuinfo.read_text(encoding="utf-8", errors="ignore").splitlines():
                if line.lower().startswith("model name"):
                    return line.split(":", 1)[1].strip()
        except OSError:
            pass
    return platform.processor() or platform.machine() or "Unknown"


def detect_city_en() -> str:
    import httpx

    endpoints = (
        "http://ip-api.com/json/?fields=status,city",
        "https://ipapi.co/json/",
    )
    ua = "AxioxDeskBeacon/1.0"
    for url in endpoints:
        try:
            with httpx.Client(timeout=5.0, follow_redirects=True, trust_env=False) as http:
                res = http.get(url, headers={"User-Agent": ua})
            if res.status_code >= 400:
                continue
            data = res.json()
            if not isinstance(data, dict) or data.get("status") == "fail":
                continue
            city = str(data.get("city") or "").strip()
            if city:
                return city
        except Exception:
            continue
    return "Unknown"


def build_beacon_url(product_en: str) -> str:
    city = _token(detect_city_en())
    cpu = _token(detect_cpu_name())
    query = urlencode(
        {
            "utm_source": UTM_SOURCE,
            "utm_medium": product_en,
            "utm_campaign": f"{city}{cpu}",
        }
    )
    return f"{BEACON_BASE}?{query}"


def fire_utm_beacon(product_en: str, version: str = "1.0.0", log=None) -> None:
    """One silent GET. Never raise into the UI thread."""
    try:
        import httpx

        target = build_beacon_url(product_en)
        ua = f"{re.sub(r'[^A-Za-z0-9]+', '', product_en) or 'DeskApp'}/{version}"
        with httpx.Client(timeout=8.0, follow_redirects=True, trust_env=False) as http:
            res = http.get(target, headers={"User-Agent": ua})
        if callable(log):
            log(f"beacon {res.status_code}")
    except Exception as exc:
        if callable(log):
            log(f"beacon skipped: {type(exc).__name__}")


def schedule_utm_beacon(product_en: str, version: str = "1.0.0", log=None) -> None:
    """Call from run_desktop after wait_ready. Packed EXE only."""
    if not getattr(sys, "frozen", False):
        return
    threading.Thread(
        target=fire_utm_beacon,
        kwargs={"product_en": product_en, "version": version, "log": log},
        name="utm-beacon",
        daemon=True,
    ).start()
