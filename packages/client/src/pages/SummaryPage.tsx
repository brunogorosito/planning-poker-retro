import { useEffect, useState } from "react";
import { socket } from "../socket";
import { CLIENT_EVENTS } from "../../../server/src/events";
import type { Session, Vote } from "../../../server/src/types";
import { overallAvg } from "../lib/fibonacci";

interface HistoryEntry {
  session: Session;
  votes: Vote[];
}

interface Props {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

export function SummaryPage({ roomId, roomName, onClose }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rooms/${roomId}/history`)
      .then((r) => r.json())
      .then((data: { history: HistoryEntry[] }) => {
        // Orden cronológico (más vieja primero)
        setHistory([...data.history].reverse());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  function handleCloseSession() {
    socket.emit(CLIENT_EVENTS.CLOSE_QUEUE);
    onClose();
  }

  function handlePrint() {
    window.print();
  }

  const devAvgs = history.map((e) => e.session.devResult ?? null);
  const qaAvgs = history.map((e) => e.session.qaResult ?? null);

  const now = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <>
      {/* Estilos solo para impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #summary-printable, #summary-printable * { visibility: visible; }
          #summary-printable { position: fixed; top: 0; left: 0; width: 100%; }
          #summary-printable .no-print { visibility: hidden !important; }
        }
      `}</style>

      <div id="summary-printable" className="min-h-screen bg-[#f5f5f5] flex flex-col">
        {/* Header */}
        <header className="bg-[#32373c] shadow no-print">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-[#ff7427] rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">SP</span>
              </div>
              <span className="text-white font-semibold">{roomName}</span>
              <span className="text-xs text-[#ededed] opacity-60">· Resumen de sesión</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="text-xs bg-[#4a5057] hover:bg-[#ff7427] text-white px-3 py-1.5 rounded transition font-semibold"
              >
                Imprimir / PDF
              </button>
              <button
                onClick={handleCloseSession}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition font-semibold"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">

          {/* Encabezado del resumen (visible en impresión) */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#32373c]">Resumen de estimaciones</h1>
              <p className="text-sm text-[#4a5057] mt-1">{roomName} · {now}</p>
            </div>
            {/* Botones solo en pantalla */}
            <div className="flex gap-2 no-print">
              <button
                onClick={handlePrint}
                className="text-sm border border-[#ededed] bg-white text-[#32373c] px-4 py-2 rounded-lg hover:bg-[#f5f5f5] transition font-medium"
              >
                🖨 Imprimir / Exportar PDF
              </button>
              <button
                onClick={handleCloseSession}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#ff7427] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#ededed] shadow-sm p-8 text-center">
              <p className="text-[#4a5057]">No hay historias estimadas en esta sesión.</p>
            </div>
          ) : (
            <>
              {/* Tabla principal */}
              <div className="bg-white rounded-xl border border-[#ededed] shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#32373c] text-white">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">#</th>
                      <th className="text-left px-4 py-3 font-semibold">Historia</th>
                      <th className="text-center px-4 py-3 font-semibold text-blue-300">Dev</th>
                      <th className="text-center px-4 py-3 font-semibold text-green-300">QA</th>
                      <th className="text-center px-4 py-3 font-semibold text-[#ff7427]">Consenso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(({ session }, idx) => {
                      const devA = session.devResult;
                      const qaA = session.qaResult;
                      return (
                        <tr
                          key={session.id}
                          className="border-t border-[#ededed] hover:bg-[#fafafa] transition"
                        >
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 text-[#32373c]">
                            {session.jiraKey && (
                              <span className="font-mono text-[#ff7427] font-semibold mr-1.5">
                                {session.jiraKey} ·
                              </span>
                            )}
                            {session.storyName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {devA && devA !== "0" ? (
                              <span className="inline-block bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded font-bold">
                                {devA}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {qaA && qaA !== "0" ? (
                              <span className="inline-block bg-green-100 text-green-700 px-2.5 py-0.5 rounded font-bold">
                                {qaA}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block bg-[#ff7427] text-white px-2.5 py-0.5 rounded font-bold">
                              {session.result}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Fila de totales */}
                  <tfoot className="border-t-2 border-[#ededed] bg-[#f5f5f5]">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-[#32373c] uppercase tracking-wider">
                        Promedio general
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded font-bold text-sm">
                          {overallAvg(devAvgs) !== "—" ? overallAvg(devAvgs) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-green-100 text-green-700 px-2.5 py-0.5 rounded font-bold text-sm">
                          {overallAvg(qaAvgs) !== "—" ? overallAvg(qaAvgs) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">
                        {history.length} {history.length === 1 ? "historia" : "historias"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Detalle de votos por historia */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-[#32373c] uppercase tracking-wider">
                  Detalle de votos
                </h2>
                {history.map(({ session, votes }) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-xl border border-[#ededed] shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-[#32373c]">
                        {session.jiraKey && (
                          <span className="font-mono text-[#ff7427] mr-1.5">{session.jiraKey} ·</span>
                        )}
                        {session.storyName}
                      </p>
                      <div className="flex items-center gap-2">
                        {session.devResult && session.devResult !== "0" && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs">
                            Dev {session.devResult}
                          </span>
                        )}
                        {session.qaResult && session.qaResult !== "0" && (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold text-xs">
                            QA {session.qaResult}
                          </span>
                        )}
                        <span className="bg-[#ff7427] text-white px-3 py-0.5 rounded font-bold text-sm">
                          {session.result}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {votes.map((v) => (
                        <div key={v.id} className="flex items-center gap-1.5">
                          <span
                            className={`text-xs text-white px-1.5 py-0.5 rounded font-semibold ${
                              v.participantRole === "Dev"
                                ? "bg-blue-500"
                                : v.participantRole === "QA"
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          >
                            {v.participantRole ?? "Otro"}
                          </span>
                          <span className="text-xs text-[#4a5057]">{v.participantName}</span>
                          <span className="text-xs font-bold text-[#32373c]">{v.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        <footer className="text-center py-4 text-xs text-gray-400 border-t border-[#ededed] no-print">
          Aune · Rosario Derivados S.A.
        </footer>
      </div>
    </>
  );
}
