import { useState, useEffect } from "react";
import { useJiraIssue } from "../hooks/useJiraIssue";
import { JiraDescription } from "./JiraDescription";
import type { JiraAttachment } from "../../../server/src/types";

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  return "📎";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  onSubmit: (storyName: string, jiraKey?: string) => void;
  compact?: boolean;
}

export function NewRoundForm({ onSubmit, compact = false }: Props) {
  const [jiraKey, setJiraKey] = useState("");
  const [storyName, setStoryName] = useState("");
  const { issue, loading, error: jiraError, isValid: keyIsValid } = useJiraIssue(jiraKey);

  // Auto-completar con el título del issue al obtenerlo
  useEffect(() => {
    if (issue) setStoryName(issue.summary);
  }, [issue]);

  function handleSubmit() {
    if (!storyName.trim()) return;
    onSubmit(storyName.trim(), issue?.key);
    setJiraKey("");
    setStoryName("");
  }

  if (compact) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={storyName}
          onChange={(e) => setStoryName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Nueva historia…"
          className="flex-1 border border-[#ededed] rounded-lg px-3 py-2 text-sm text-[#32373c] focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
        />
        <button
          onClick={handleSubmit}
          disabled={!storyName.trim()}
          className="bg-[#ff7427] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition text-sm whitespace-nowrap"
        >
          Nueva ronda
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Campo Jira */}
      <div>
        <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
          Clave Jira <span className="text-gray-400 font-normal normal-case tracking-normal">(opcional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={jiraKey}
            onChange={(e) => setJiraKey(e.target.value.toUpperCase())}
            placeholder="Ej: HIGYRUS-40766"
            className={[
              "w-full border rounded-lg px-4 py-2.5 font-mono text-sm text-[#32373c] focus:outline-none focus:ring-2 focus:border-transparent transition pr-10",
              issue ? "border-green-400 focus:ring-green-400" : "border-[#ededed] focus:ring-[#ff7427]",
            ].join(" ")}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
            {loading && (
              <span className="w-4 h-4 border-2 border-[#ff7427] border-t-transparent rounded-full animate-spin inline-block" />
            )}
            {!loading && issue && <span className="text-green-500">✓</span>}
            {!loading && jiraError && <span className="text-red-400">✗</span>}
          </span>
        </div>

        {/* Preview del issue */}
        {issue && (
          <div className="mt-2 space-y-2">
            {/* Cabecera: key, status, título, asignado */}
            <div className="bg-[#f5f5f5] border border-[#ededed] rounded-lg p-3 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2">
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-[#ff7427] hover:underline"
                >
                  {issue.key}
                </a>
                <span className="text-xs bg-white border border-[#ededed] text-[#4a5057] px-2 py-0.5 rounded">
                  {issue.status}
                </span>
              </div>
              <p className="font-medium text-[#32373c] leading-snug">{issue.summary}</p>
              {issue.assignee && (
                <p className="text-xs text-[#4a5057]">Asignado: {issue.assignee}</p>
              )}
            </div>

            {/* Descripción completa */}
            {issue.description && (
              <div className="bg-[#f5f5f5] border border-[#ededed] rounded-lg p-3">
                <p className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                  Descripción
                </p>
                <JiraDescription html={issue.description} />
              </div>
            )}

            {/* Adjuntos */}
            {issue.attachments.length > 0 && (
              <div className="bg-[#f5f5f5] border border-[#ededed] rounded-lg p-3">
                <p className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                  Adjuntos ({issue.attachments.length})
                </p>
                <ul className="space-y-1">
                  {issue.attachments.map((a: JiraAttachment) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span className="text-[#4a5057]">{fileIcon(a.mimeType)}</span>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#ff7427] hover:underline truncate"
                      >
                        {a.filename}
                      </a>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatSize(a.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {jiraError && keyIsValid && (
          <p className="mt-1 text-xs text-red-500">{jiraError}</p>
        )}
      </div>

      {/* Nombre de la historia */}
      <div>
        <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
          Historia a estimar
        </label>
        <input
          type="text"
          value={storyName}
          onChange={(e) => setStoryName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ej: US-42 – Login con SSO"
          className="w-full border border-[#ededed] rounded-lg px-4 py-2.5 text-[#32373c] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition text-sm"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!storyName.trim()}
        className="w-full bg-[#ff7427] text-white py-2.5 rounded-lg font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition"
      >
        Iniciar ronda
      </button>
    </div>
  );
}
