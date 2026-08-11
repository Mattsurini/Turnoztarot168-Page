"""Local MCP adapter for BooM Reading Status Notion data source.

Loads credentials from the project .env and exposes safe, narrow tools to Hermes.
Never prints credentials or raw Notion authorization data.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env"
NOTION_VERSION = "2025-09-03"


def load_env_file() -> dict[str, str]:
    values: dict[str, str] = {}
    if ENV_PATH.exists():
        for raw in ENV_PATH.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    values.update({k: v for k, v in os.environ.items() if k.startswith("NOTION_")})
    return values


CONFIG = load_env_file()
API_KEY = CONFIG.get("NOTION_API_KEY", "")
DATA_SOURCE_ID = CONFIG.get("NOTION_DATA_SOURCE_ID", "")
if not DATA_SOURCE_ID:
    # Resolve once from the verified database ID when the project env only has the DB ID.
    DATA_SOURCE_ID = "37d60f08-01b5-800a-b7ca-000b06c3e9ad"

mcp = FastMCP("boom-reading-notion")


def notion_request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    if not API_KEY:
        raise RuntimeError("NOTION_API_KEY is missing from the project .env")
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{path.lstrip('/')}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:500]
        raise RuntimeError(f"Notion API HTTP {exc.code}: {detail}") from exc


def plain(prop: dict[str, Any]) -> Any:
    kind = prop.get("type")
    value = prop.get(kind, {}) if kind else {}
    if kind == "title":
        return "".join(x.get("plain_text", "") for x in value).strip()
    if kind == "rich_text":
        return "".join(x.get("plain_text", "") for x in value).strip()
    if kind in {"select", "status"}:
        return (value or {}).get("name")
    if kind == "multi_select":
        return [x.get("name") for x in value]
    if kind == "date":
        return (value or {}).get("start")
    if kind == "people":
        return [(x.get("name") or x.get("id")) for x in value]
    if kind == "number":
        return value
    if kind == "checkbox":
        return value
    return value


def page_summary(page: dict[str, Any]) -> dict[str, Any]:
    props = page.get("properties", {})
    result = {"page_id": page.get("id"), "url": page.get("url")}
    for name, prop in props.items():
        result[name or "Title"] = plain(prop)
    return result


@mcp.tool()
def list_reading_status(status: str = "") -> dict[str, Any]:
    """List Reading Status records. Optionally filter by Status name."""
    payload: dict[str, Any] = {"page_size": 100}
    if status.strip():
        payload["filter"] = {"property": "Status", "status": {"equals": status.strip()}}
    data = notion_request("POST", f"data_sources/{DATA_SOURCE_ID}/query", payload)
    return {"count": len(data.get("results", [])), "results": [page_summary(p) for p in data.get("results", [])]}


@mcp.tool()
def get_reading_status(page_id: str) -> dict[str, Any]:
    """Get one Reading Status record by its Notion page ID."""
    return page_summary(notion_request("GET", f"pages/{page_id.strip()}"))


@mcp.tool()
def update_reading_status(page_id: str, status: str = "", due_date: str = "") -> dict[str, Any]:
    """Update Status and/or Delivery Date. Date must be YYYY-MM-DD."""
    properties: dict[str, Any] = {}
    if status.strip():
        properties["Status"] = {"status": {"name": status.strip()}}
    if due_date.strip():
        date.fromisoformat(due_date.strip())
        properties["Delivery Date"] = {"date": {"start": due_date.strip()}}
    if not properties:
        raise ValueError("Provide status or due_date")
    return page_summary(notion_request("PATCH", f"pages/{page_id.strip()}", {"properties": properties}))


@mcp.tool()
def create_reading_status(
    title: str,
    package: str = "",
    status: str = "",
    due_date: str = "",
    priority: str = "",
    platform: str = "",
) -> dict[str, Any]:
    """Create a Reading Status record using the current Notion columns."""
    properties: dict[str, Any] = {"Booking Code": {"title": [{"text": {"content": title.strip()}}]}}
    if package.strip():
        properties["Package Name"] = {"multi_select": [{"name": package.strip()}]}
    if status.strip():
        properties["Status"] = {"status": {"name": status.strip()}}
    if due_date.strip():
        date.fromisoformat(due_date.strip())
        properties["Delivery Date"] = {"date": {"start": due_date.strip()}}
    if priority.strip():
        properties["Priority"] = {"multi_select": [{"name": priority.strip()}]}
    if platform.strip():
        properties["Flatform"] = {"multi_select": [{"name": platform.strip()}]}
    page = notion_request("POST", "pages", {"parent": {"data_source_id": DATA_SOURCE_ID}, "properties": properties})
    return page_summary(page)


if __name__ == "__main__":
    mcp.run(transport="stdio")
