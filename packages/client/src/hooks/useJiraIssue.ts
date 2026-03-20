import { useEffect, useState } from "react";
import type { JiraIssue } from "../../../server/src/types";

const JIRA_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

export function useJiraIssue(key: string) {
  const [issue, setIssue] = useState<JiraIssue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedKey = key.trim().toUpperCase();
  const isValid = JIRA_KEY_RE.test(normalizedKey);

  useEffect(() => {
    if (!isValid) {
      setIssue(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/jira/issue/${normalizedKey}`)
      .then((r) => r.json())
      .then((data: JiraIssue & { error?: string }) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setIssue(null);
        } else {
          setIssue(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo consultar Jira");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [normalizedKey, isValid]);

  return { issue, loading, error, isValid };
}
