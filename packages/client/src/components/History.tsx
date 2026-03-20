import { useEffect, useState } from "react";
import type { Session, Vote } from "../../../server/src/types";

interface HistoryEntry {
  session: Session;
  votes: Vote[];
}

interface Props {
  roomId: string;
}

function avg(values: string[]): number | null {
  const nums = values.filter((v) => v !== "?").map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function History({ roomId }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/rooms/${roomId}/history`)
      .then((r) => r.json())
      .then((data: { history: HistoryEntry[] }) => setHistory(data.history))
      .catch(console.error);
  }, [open, roomId]);

  const hasDevOrQa = history.some((e) =>
    e.votes.some((v) => v.participantRole === "Dev" || v.participantRole === "QA")
  );

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-[#ff7427] font-semibold hover:text-[#e6631a] transition flex items-center gap-1"
      >
        <span>{open ? "▲" : "▼"}</span>
        {open ? "Ocultar historial" : "Ver historial de la sala"}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">Sin historias votadas aún.</p>
          ) : (
            <>
              {/* Resumen toggle */}
              {hasDevOrQa && (
                <button
                  onClick={() => setShowSummary((v) => !v)}
                  className="text-xs text-[#ff7427] font-semibold hover:text-[#e6631a] transition flex items-center gap-1"
                >
                  <span>{showSummary ? "▲" : "▼"}</span>
                  {showSummary ? "Ocultar resumen" : "Ver resumen por rol"}
                </button>
              )}

              {/* Tabla resumen */}
              {showSummary && (
                <div className="overflow-x-auto rounded-lg border border-[#ededed]">
                  <table className="w-full text-xs">
                    <thead className="bg-[#32373c] text-white">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Historia</th>
                        <th className="text-center px-3 py-2 font-semibold text-blue-300">Dev</th>
                        <th className="text-center px-3 py-2 font-semibold text-green-300">QA</th>
                        <th className="text-center px-3 py-2 font-semibold">Consenso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...history].reverse().map(({ session, votes }) => {
                        const devAvg = avg(
                          votes.filter((v) => v.participantRole === "Dev").map((v) => v.value)
                        );
                        const qaAvg = avg(
                          votes.filter((v) => v.participantRole === "QA").map((v) => v.value)
                        );
                        return (
                          <tr key={session.id} className="border-t border-[#ededed] hover:bg-[#fafafa]">
                            <td className="px-3 py-2 text-[#32373c]">
                              {session.jiraKey && (
                                <span className="font-mono text-[#ff7427] font-semibold mr-1">
                                  {session.jiraKey} ·
                                </span>
                              )}
                              {session.storyName}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {devAvg !== null ? (
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                                  {devAvg}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {qaAvg !== null ? (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
                                  {qaAvg}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="bg-[#ff7427] text-white px-2 py-0.5 rounded font-semibold">
                                {session.result}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Detalle por historia */}
              {history.map(({ session, votes }) => (
                <div
                  key={session.id}
                  className="bg-[#f5f5f5] border border-[#ededed] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[#32373c] text-sm">
                      {session.jiraKey && (
                        <span className="font-mono text-[#ff7427] mr-1">{session.jiraKey} ·</span>
                      )}
                      {session.storyName}
                    </span>
                    <span className="text-sm bg-[#ff7427] text-white px-3 py-0.5 rounded font-bold">
                      {session.result}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {votes.map((v) => (
                      <span key={v.id} className="text-xs text-[#4a5057]">
                        {v.participantName}
                        {v.participantRole && (
                          <span
                            className={`ml-1 px-1 py-0.5 rounded text-white font-semibold ${
                              v.participantRole === "Dev"
                                ? "bg-blue-500"
                                : v.participantRole === "QA"
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          >
                            {v.participantRole}
                          </span>
                        )}
                        {": "}
                        <strong className="text-[#32373c]">{v.value}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
