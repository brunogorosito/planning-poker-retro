import { Router } from "express";
import type { JiraIssue } from "../types";

const router = Router();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL ?? "";
const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL ?? "";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN ?? "";

const JIRA_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

// GET /api/jira/issue/:key
router.get("/issue/:key", async (req, res) => {
  const { key } = req.params;

  if (!JIRA_KEY_RE.test(key.toUpperCase())) {
    res.status(400).json({ error: "Clave de Jira inválida" });
    return;
  }

  if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
    res.status(503).json({ error: "Integración con Jira no configurada" });
    return;
  }

  const url = `${JIRA_BASE_URL}/rest/api/3/issue/${key.toUpperCase()}?fields=summary,description,status,assignee,attachment&expand=renderedFields`;
  const credentials = Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      res.status(404).json({ error: "Issue no encontrado" });
      return;
    }
    if (!response.ok) {
      res.status(502).json({ error: "Error al consultar Jira" });
      return;
    }

    const data = await response.json() as {
      key: string;
      fields: {
        summary: string;
        status: { name: string };
        assignee: { displayName: string } | null;
        attachment: { id: string; filename: string; mimeType: string; size: number; content: string }[];
      };
      renderedFields: {
        description: string | null;
      };
    };

    const issue: JiraIssue = {
      key: data.key,
      summary: data.fields.summary,
      description: data.renderedFields.description ?? null,
      status: data.fields.status.name,
      assignee: data.fields.assignee?.displayName ?? null,
      url: `${JIRA_BASE_URL}/browse/${data.key}`,
      attachments: (data.fields.attachment ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        url: `${JIRA_BASE_URL}/browse/${data.key}`,
      })),
    };

    res.json(issue);
  } catch {
    res.status(502).json({ error: "No se pudo conectar con Jira" });
  }
});

export default router;
