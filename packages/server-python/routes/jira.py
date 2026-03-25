import base64
import os
import re

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

JIRA_BASE_URL = os.environ.get("JIRA_BASE_URL", "")
JIRA_USER_EMAIL = os.environ.get("JIRA_USER_EMAIL", "")
JIRA_API_TOKEN = os.environ.get("JIRA_API_TOKEN", "")

JIRA_KEY_RE = re.compile(r"^[A-Z][A-Z0-9]+-\d+$")


@router.get("/issue/{key}")
async def get_jira_issue(key: str):
    upper_key = key.upper()

    if not JIRA_KEY_RE.match(upper_key):
        raise HTTPException(status_code=400, detail="Clave de Jira inválida")

    if not JIRA_BASE_URL or not JIRA_USER_EMAIL or not JIRA_API_TOKEN:
        raise HTTPException(status_code=503, detail="Integración con Jira no configurada")

    url = (
        f"{JIRA_BASE_URL}/rest/api/3/issue/{upper_key}"
        "?fields=summary,description,status,assignee,attachment&expand=renderedFields"
    )
    credentials = base64.b64encode(f"{JIRA_USER_EMAIL}:{JIRA_API_TOKEN}".encode()).decode()

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Accept": "application/json",
                },
                timeout=10.0,
            )
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="No se pudo conectar con Jira")

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Issue no encontrado")
    if not response.is_success:
        raise HTTPException(status_code=502, detail="Error al consultar Jira")

    data = response.json()
    fields = data.get("fields", {})
    rendered = data.get("renderedFields", {})

    return {
        "key": data["key"],
        "summary": fields.get("summary", ""),
        "description": rendered.get("description"),
        "status": fields.get("status", {}).get("name", ""),
        "assignee": (
            fields["assignee"]["displayName"] if fields.get("assignee") else None
        ),
        "url": f"{JIRA_BASE_URL}/browse/{data['key']}",
        "attachments": [
            {
                "id": a["id"],
                "filename": a["filename"],
                "mimeType": a["mimeType"],
                "size": a["size"],
                "url": f"{JIRA_BASE_URL}/browse/{data['key']}",
            }
            for a in fields.get("attachment", [])
        ],
    }
