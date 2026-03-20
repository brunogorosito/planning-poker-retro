import { useEffect, useRef, useState } from "react";
import { useRetro } from "../hooks/useRetro";
import { socket } from "../socket";
import { RETRO_CLIENT_EVENTS } from "../../../server/src/events";
import type { RetroColumn, RetroItem } from "../../../server/src/types";

interface Props {
  retroId: string;
  name: string;
  email: string;
  onLeave: () => void;
}

const COLUMN_COLORS = [
  "bg-green-500",
  "bg-[#ff7427]",
  "bg-blue-500",
  "bg-purple-500",
  "bg-teal-500",
];

const COLUMN_LIGHT_COLORS = [
  "bg-green-50 border-green-200",
  "bg-orange-50 border-orange-200",
  "bg-blue-50 border-blue-200",
  "bg-purple-50 border-purple-200",
  "bg-teal-50 border-teal-200",
];

function phaseBadge(phase: string): { label: string; className: string } {
  switch (phase) {
    case "waiting":
      return { label: "Esperando", className: "bg-gray-200 text-gray-600" };
    case "writing":
      return { label: "Escribiendo", className: "bg-blue-100 text-blue-700" };
    case "revealed":
      return { label: "Revelado", className: "bg-yellow-100 text-yellow-700" };
    case "voting":
      return { label: "Votando", className: "bg-green-100 text-green-700" };
    case "closed":
      return { label: "Cerrada", className: "bg-gray-300 text-gray-700" };
    default:
      return { label: phase, className: "bg-gray-200 text-gray-600" };
  }
}

function useCountdown(writingEndsAt: number | null): string {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!writingEndsAt) {
      setDisplay("");
      return;
    }

    function update() {
      const remaining = Math.max(0, writingEndsAt! - Date.now());
      const totalSecs = Math.ceil(remaining / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setDisplay(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    }

    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [writingEndsAt]);

  return display;
}

interface CardInputProps {
  columnId: string;
  retroId: string;
}

function CardInput({ columnId, retroId }: CardInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    socket.emit(RETRO_CLIENT_EVENTS.ADD_CARD, { retroId, columnId, content: trimmed });
    setValue("");
  }

  return (
    <div className="mt-2">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Agregar tarjeta… (Enter para guardar)"
        rows={2}
        className="w-full text-sm border border-[#ededed] rounded-lg px-3 py-2 text-[#32373c] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent resize-none transition"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="mt-1 w-full text-xs bg-[#ff7427] text-white py-1.5 rounded-lg font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition"
      >
        Agregar
      </button>
    </div>
  );
}

interface EditableCardProps {
  card: RetroItem;
  retroId: string;
}

function EditableCard({ card, retroId }: EditableCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(card.content);

  function saveEdit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    socket.emit(RETRO_CLIENT_EVENTS.EDIT_CARD, { retroId, cardId: card.id, content: trimmed });
    setEditing(false);
  }

  function deleteCard() {
    socket.emit(RETRO_CLIENT_EVENTS.DELETE_CARD, { retroId, cardId: card.id });
  }

  if (editing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-[#ededed] p-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              saveEdit();
            }
            if (e.key === "Escape") {
              setValue(card.content);
              setEditing(false);
            }
          }}
          rows={2}
          autoFocus
          className="w-full text-sm border border-[#ededed] rounded px-2 py-1 text-[#32373c] focus:outline-none focus:ring-2 focus:ring-[#ff7427] resize-none"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={saveEdit}
            className="flex-1 text-xs bg-[#ff7427] text-white py-1 rounded font-semibold hover:bg-[#e6631a] transition"
          >
            Guardar
          </button>
          <button
            onClick={() => { setValue(card.content); setEditing(false); }}
            className="flex-1 text-xs border border-[#ededed] text-[#32373c] py-1 rounded hover:bg-[#f5f5f5] transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#ededed] p-3 flex items-start gap-2 group">
      <p className="flex-1 text-sm text-[#32373c] whitespace-pre-wrap break-words">{card.content}</p>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="text-gray-400 hover:text-[#ff7427] transition p-0.5"
          title="Editar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={deleteCard}
          className="text-gray-400 hover:text-red-500 transition p-0.5"
          title="Eliminar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function RetroPage({ retroId, name, email, onLeave }: Props) {
  const { retroState, error } = useRetro({ retroId, name, email });
  const [copied, setCopied] = useState(false);

  const countdown = useCountdown(retroState?.retro.writingEndsAt ?? null);

  function handleCopyId() {
    navigator.clipboard.writeText(retroId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!retroState) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-[#32373c] text-sm opacity-60">Conectando a la retrospectiva…</div>
      </div>
    );
  }

  const { retro, columns, participants, myCards, allCards, myVotesLeft } = retroState;
  const isFacilitator = retro.facilitatorEmail === email;
  const badge = phaseBadge(retro.phase);

  function renderWaiting() {
    return (
      <div className="max-w-sm mx-auto py-16 flex flex-col items-center gap-6">
        <div className="w-full bg-white rounded-xl border border-[#ededed] shadow-sm p-5">
          <h2 className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-4">
            Participantes conectados ({participants.length})
          </h2>
          {participants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">Nadie conectado aún…</p>
          ) : (
            <ul className="space-y-2">
              {participants.map((p) => (
                <li key={p.email} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#32373c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-[#32373c]">{p.name}</span>
                  {p.isFacilitator && (
                    <span className="text-xs bg-[#ff7427] text-white px-1.5 py-0.5 rounded font-semibold ml-auto">
                      Facilitador
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {isFacilitator ? (
          <>
            <p className="text-sm text-[#4a5057] text-center">
              Cuando el equipo esté listo, iniciá el temporizador para comenzar la escritura.
            </p>
            <button
              onClick={() => socket.emit(RETRO_CLIENT_EVENTS.START_TIMER, { retroId })}
              className="bg-[#ff7427] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#e6631a] transition text-sm"
            >
              Iniciar escritura ({Math.floor(retro.timerSeconds / 60)}:{String(retro.timerSeconds % 60).padStart(2, "0")} min)
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center">
            Esperando que el facilitador inicie la retrospectiva…
          </p>
        )}
      </div>
    );
  }

  function renderWriting() {
    return (
      <div className="space-y-4">
        {/* Timer + controls bar */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-[#ededed] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#32373c]">Tiempo restante:</span>
            <span className={`font-mono text-xl font-bold ${countdown === "00:00" ? "text-red-500" : "text-[#ff7427]"}`}>
              {countdown || "--:--"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {participants.map((p) => (
                <div key={p.email} className="flex flex-col items-center" title={p.name}>
                  <div className="w-8 h-8 rounded-full bg-[#32373c] flex items-center justify-center text-white text-xs font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5">{p.cardCount}</span>
                </div>
              ))}
            </div>
            {isFacilitator && (
              <button
                onClick={() => socket.emit(RETRO_CLIENT_EVENTS.REVEAL_NOW, { retroId })}
                className="text-sm bg-[#32373c] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#454c52] transition"
              >
                Revelar ahora
              </button>
            )}
          </div>
        </div>

        {/* Participants strip */}
        <div className="flex items-center gap-2 flex-wrap">
          {participants.map((p) => (
            <div key={p.email} className="flex items-center gap-1.5 bg-white border border-[#ededed] rounded-full pl-1 pr-3 py-1">
              <div className="w-6 h-6 rounded-full bg-[#32373c] flex items-center justify-center text-white text-xs font-bold">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-[#32373c]">{p.name}</span>
              <span className="text-xs text-[#ff7427] font-bold ml-1">{p.cardCount}</span>
            </div>
          ))}
        </div>

        {/* Columns */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col: RetroColumn, idx: number) => {
            const colCards = myCards.filter((c) => c.columnId === col.id);
            return (
              <div key={col.id} className="flex-1 min-w-[220px]">
                <div className={`${COLUMN_COLORS[idx % COLUMN_COLORS.length]} rounded-t-xl px-4 py-3`}>
                  <span className="text-white font-semibold text-sm">
                    {col.emoji ? `${col.emoji} ` : ""}{col.title}
                  </span>
                  <span className="text-white/70 text-xs ml-2">({colCards.length})</span>
                </div>
                <div className={`${COLUMN_LIGHT_COLORS[idx % COLUMN_LIGHT_COLORS.length]} border rounded-b-xl p-3 space-y-2 min-h-[200px]`}>
                  {colCards.map((card) => (
                    <EditableCard key={card.id} card={card} retroId={retroId} />
                  ))}
                  <CardInput columnId={col.id} retroId={retroId} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderRevealed() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-[#ededed] px-4 py-3">
          <p className="text-sm text-[#32373c] font-medium">
            Todas las tarjetas reveladas — {allCards.length} en total
          </p>
          {isFacilitator && (
            <button
              onClick={() => socket.emit(RETRO_CLIENT_EVENTS.START_VOTING, { retroId })}
              className="text-sm bg-[#ff7427] text-white px-5 py-2 rounded-lg font-semibold hover:bg-[#e6631a] transition"
            >
              Iniciar votacion
            </button>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col: RetroColumn, idx: number) => {
            const colCards = allCards.filter((c) => c.columnId === col.id);
            return (
              <div key={col.id} className="flex-1 min-w-[220px]">
                <div className={`${COLUMN_COLORS[idx % COLUMN_COLORS.length]} rounded-t-xl px-4 py-3`}>
                  <span className="text-white font-semibold text-sm">
                    {col.emoji ? `${col.emoji} ` : ""}{col.title}
                  </span>
                  <span className="text-white/70 text-xs ml-2">({colCards.length})</span>
                </div>
                <div className={`${COLUMN_LIGHT_COLORS[idx % COLUMN_LIGHT_COLORS.length]} border rounded-b-xl p-3 space-y-2 min-h-[200px]`}>
                  {colCards.map((card) => (
                    <div key={card.id} className="bg-white rounded-lg shadow-sm border border-[#ededed] p-3">
                      <p className="text-sm text-[#32373c] whitespace-pre-wrap break-words">{card.content}</p>
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Sin tarjetas</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderVoting() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-[#ededed] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#32373c]">Tus votos disponibles:</span>
            <span className="text-lg font-bold text-[#ff7427]">{myVotesLeft}</span>
            <span className="text-xs text-gray-400">/ {retro.votesPerPerson}</span>
          </div>
          {isFacilitator && (
            <button
              onClick={() => socket.emit(RETRO_CLIENT_EVENTS.CLOSE_RETRO, { retroId })}
              className="text-sm bg-[#32373c] text-white px-5 py-2 rounded-lg font-semibold hover:bg-[#454c52] transition"
            >
              Cerrar retro
            </button>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col: RetroColumn, idx: number) => {
            const colCards = [...allCards.filter((c) => c.columnId === col.id)].sort((a, b) => b.votes - a.votes);
            return (
              <div key={col.id} className="flex-1 min-w-[220px]">
                <div className={`${COLUMN_COLORS[idx % COLUMN_COLORS.length]} rounded-t-xl px-4 py-3`}>
                  <span className="text-white font-semibold text-sm">
                    {col.emoji ? `${col.emoji} ` : ""}{col.title}
                  </span>
                  <span className="text-white/70 text-xs ml-2">({colCards.length})</span>
                </div>
                <div className={`${COLUMN_LIGHT_COLORS[idx % COLUMN_LIGHT_COLORS.length]} border rounded-b-xl p-3 space-y-2 min-h-[200px]`}>
                  {colCards.map((card) => (
                    <div key={card.id} className="bg-white rounded-lg shadow-sm border border-[#ededed] p-3">
                      <p className="text-sm text-[#32373c] whitespace-pre-wrap break-words mb-2">{card.content}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-bold text-[#ff7427]">{card.votes}</span>
                          <span className="text-xs text-gray-400">voto{card.votes !== 1 ? "s" : ""}</span>
                        </div>
                        <button
                          onClick={() => socket.emit(RETRO_CLIENT_EVENTS.VOTE_CARD, { retroId, cardId: card.id })}
                          disabled={myVotesLeft <= 0}
                          className="flex items-center gap-1 text-xs bg-green-100 text-green-700 border border-green-300 px-2.5 py-1 rounded-lg hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
                          title={myVotesLeft <= 0 ? "Sin votos disponibles" : "Votar"}
                        >
                          <span>+1</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Sin tarjetas</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderClosed() {
    const allSorted = [...allCards].sort((a, b) => b.votes - a.votes);
    const now = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

    return (
      <>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #retro-summary, #retro-summary * { visibility: visible; }
            #retro-summary { position: fixed; top: 0; left: 0; width: 100%; }
            #retro-summary .no-print { visibility: hidden !important; }
          }
        `}</style>

        <div id="retro-summary" className="space-y-6">
          {/* Header del resumen */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#32373c]">{retro.title}</h1>
              <p className="text-sm text-[#4a5057] mt-0.5">Resumen de retrospectiva · {now}</p>
            </div>
            <div className="flex gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="text-sm border border-[#ededed] bg-white text-[#32373c] px-4 py-2 rounded-lg hover:bg-[#f5f5f5] transition font-medium"
              >
                🖨 Imprimir / PDF
              </button>
              <button
                onClick={onLeave}
                className="text-sm bg-[#32373c] text-white px-4 py-2 rounded-lg hover:bg-[#454c52] transition font-semibold"
              >
                Volver al inicio
              </button>
            </div>
          </div>

          {/* Ranking global — todas las tarjetas ordenadas por votos */}
          <div className="bg-white rounded-xl border border-[#ededed] shadow-sm overflow-hidden">
            <div className="bg-[#32373c] px-5 py-3 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Entradas más votadas</span>
              <span className="text-[#ededed] opacity-60 text-xs">{allCards.length} tarjetas · {participants.length} participantes</span>
            </div>
            <div className="divide-y divide-[#ededed]">
              {allSorted.filter(c => c.votes > 0).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Nadie votó en esta sesión.</p>
              )}
              {allSorted.filter(c => c.votes > 0).map((card, idx) => {
                const col = columns.find(c => c.id === card.columnId);
                const colIdx = columns.findIndex(c => c.id === card.columnId);
                const barWidth = allSorted[0]?.votes > 0 ? Math.round((card.votes / allSorted[0].votes) * 100) : 0;
                return (
                  <div key={card.id} className="px-5 py-3 flex items-center gap-4">
                    <span className="text-gray-300 font-mono text-xs w-5 shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#32373c] whitespace-pre-wrap break-words">{card.content}</p>
                      {col && (
                        <span className={`inline-block mt-1 text-xs text-white px-1.5 py-0.5 rounded font-semibold ${COLUMN_COLORS[colIdx % COLUMN_COLORS.length]}`}>
                          {col.emoji ? `${col.emoji} ` : ""}{col.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 bg-[#f5f5f5] rounded-full h-1.5 hidden sm:block">
                        <div className="bg-[#ff7427] h-1.5 rounded-full" style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className="text-sm font-bold text-[#ff7427] w-10 text-right">
                        {card.votes} 🗳
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detalle por columna */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-[#32373c] uppercase tracking-wider">Detalle por columna</h2>
            {columns.map((col: RetroColumn, idx: number) => {
              const colCards = [...allCards.filter(c => c.columnId === col.id)].sort((a, b) => b.votes - a.votes);
              return (
                <div key={col.id} className="bg-white rounded-xl border border-[#ededed] shadow-sm overflow-hidden">
                  <div className={`${COLUMN_COLORS[idx % COLUMN_COLORS.length]} px-4 py-2.5 flex items-center gap-2`}>
                    <span className="text-white font-semibold text-sm">{col.emoji ? `${col.emoji} ` : ""}{col.title}</span>
                    <span className="text-white/70 text-xs ml-auto">{colCards.length} tarjetas</span>
                  </div>
                  <div className="divide-y divide-[#ededed]">
                    {colCards.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Sin tarjetas</p>
                    )}
                    {colCards.map((card) => (
                      <div key={card.id} className="px-4 py-2.5 flex items-start gap-3">
                        <p className="flex-1 text-sm text-[#32373c] whitespace-pre-wrap break-words">{card.content}</p>
                        {card.votes > 0 && (
                          <span className="shrink-0 text-xs font-bold text-[#ff7427]">{card.votes} voto{card.votes !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Header */}
      <header className="bg-[#32373c] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-[#ff7427] rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">SP</span>
          </div>
          <span className="text-white font-semibold tracking-wide">Scrum Poker</span>
          <span className="text-[#ededed] text-xs opacity-60 mx-1">|</span>
          <span className="text-[#ededed] text-sm font-medium truncate max-w-xs">{retro.title}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ml-1 ${badge.className}`}>
            {badge.label}
          </span>
          <button
            onClick={handleCopyId}
            title="Copiar código para compartir"
            className="flex items-center gap-1.5 font-mono text-xs bg-[#4a5057] hover:bg-[#ff7427] text-[#ededed] hover:text-white px-2.5 py-1 rounded transition ml-1"
          >
            {retroId}
            <span>{copied ? "✓" : "⎘"}</span>
          </button>
          <span className="text-[#ededed] text-xs opacity-60 ml-2">
            {participants.length} participante{participants.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={onLeave}
            className="ml-auto text-xs text-[#ededed] opacity-60 hover:opacity-100 transition px-3 py-1.5 border border-[#ededed]/30 rounded-lg hover:border-[#ededed]/60"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {retro.phase === "waiting" && renderWaiting()}
        {retro.phase === "writing" && renderWriting()}
        {retro.phase === "revealed" && renderRevealed()}
        {retro.phase === "voting" && renderVoting()}
        {retro.phase === "closed" && renderClosed()}
      </main>
    </div>
  );
}
