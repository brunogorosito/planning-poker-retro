import { useState, useEffect } from "react";
import { socket } from "../socket";
import { CLIENT_EVENTS } from "../../../server/src/events";
import { useRoom } from "../hooks/useRoom";
import { CardDeck } from "../components/CardDeck";
import { ParticipantList } from "../components/ParticipantList";
import { History } from "../components/History";
import { JiraDescription } from "../components/JiraDescription";
import { SummaryPage } from "./SummaryPage";
import { useJiraIssue } from "../hooks/useJiraIssue";
import type { JoinRoomPayload, PlannedStory } from "../../../server/src/types";

interface Props {
  joinPayload: JoinRoomPayload;
  onLeave: () => void;
}

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

function ceilToFib(n: number): number {
  for (const f of FIBONACCI) {
    if (f >= n) return f;
  }
  return FIBONACCI[FIBONACCI.length - 1];
}

function calcRoleAverage(values: string[]): number | null {
  const numeric = values.filter((v) => v !== "?").map(Number).filter((n) => !isNaN(n));
  if (numeric.length === 0) return null;
  return Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10;
}

function suggestFib(avg: number | null): string {
  if (avg === null) return "0";
  return String(ceilToFib(avg));
}

function AddToQueueForm({ onAdd }: { onAdd: (storyName: string, jiraKey?: string) => void }) {
  const [jiraKey, setJiraKey] = useState("");
  const [storyName, setStoryName] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const { issue, loading } = useJiraIssue(jiraKey);

  useEffect(() => {
    if (issue) setStoryName(issue.summary);
  }, [issue]);

  useEffect(() => {
    if (!issue) setShowDetail(false);
  }, [issue]);

  function handleAdd() {
    if (!storyName.trim()) return;
    onAdd(storyName.trim(), issue?.key ?? (jiraKey.trim() || undefined));
    setJiraKey("");
    setStoryName("");
    setShowDetail(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative shrink-0 w-36">
          <input
            type="text"
            value={jiraKey}
            onChange={(e) => setJiraKey(e.target.value.toUpperCase())}
            placeholder="Clave Jira"
            className={[
              "w-full border rounded-lg px-3 py-2 font-mono text-sm text-[#32373c] focus:outline-none focus:ring-2 focus:border-transparent transition pr-8",
              issue ? "border-green-400 focus:ring-green-400" : "border-[#ededed] focus:ring-[#ff7427]",
            ].join(" ")}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs">
            {loading && <span className="w-3.5 h-3.5 border-2 border-[#ff7427] border-t-transparent rounded-full animate-spin inline-block" />}
            {!loading && issue && <span className="text-green-500">✓</span>}
          </span>
        </div>
        <input
          type="text"
          value={storyName}
          onChange={(e) => setStoryName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nombre de la historia…"
          className="flex-1 border border-[#ededed] rounded-lg px-3 py-2 text-sm text-[#32373c] focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
        />
        <button
          onClick={handleAdd}
          disabled={!storyName.trim()}
          className="bg-[#ff7427] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition whitespace-nowrap"
        >
          + Agregar
        </button>
      </div>

      {issue && (
        <div className="bg-[#f5f5f5] border border-[#ededed] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-semibold text-[#ff7427] shrink-0">{issue.key}</span>
              <span className="text-xs text-[#32373c] truncate">{issue.summary}</span>
            </div>
            <button
              onClick={() => setShowDetail((v) => !v)}
              className="text-xs text-[#ff7427] font-semibold hover:text-[#e6631a] transition shrink-0 flex items-center gap-1"
            >
              {showDetail ? "Ocultar" : "Ver detalles"}
              <span>{showDetail ? "▲" : "▼"}</span>
            </button>
          </div>

          {showDetail && (
            <div className="border-t border-[#ededed] px-3 py-3 space-y-3">
              <div className="flex flex-wrap gap-3">
                <span className="text-xs bg-white border border-[#ededed] rounded px-2 py-1 text-[#4a5057]">
                  Estado: <strong className="text-[#32373c]">{issue.status}</strong>
                </span>
                {issue.assignee && (
                  <span className="text-xs bg-white border border-[#ededed] rounded px-2 py-1 text-[#4a5057]">
                    Asignado: <strong className="text-[#32373c]">{issue.assignee}</strong>
                  </span>
                )}
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-white border border-[#ededed] rounded px-2 py-1 text-[#ff7427] hover:text-[#e6631a] transition"
                >
                  Abrir en Jira ↗
                </a>
              </div>

              {issue.description && (
                <div className="bg-white border border-[#ededed] rounded p-3 max-h-48 overflow-y-auto">
                  <JiraDescription html={issue.description} />
                </div>
              )}

              {issue.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#32373c] mb-1.5">Adjuntos ({issue.attachments.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {issue.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-white border border-[#ededed] rounded px-2 py-1 text-[#4a5057] hover:text-[#ff7427] hover:border-[#ff7427] transition truncate max-w-[180px]"
                        title={att.filename}
                      >
                        📎 {att.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StoryQueueList({
  queue,
  isModerator,
  onStart,
  onRemove,
  activeQueueId,
  compact = false,
}: {
  queue: PlannedStory[];
  isModerator: boolean;
  onStart: (id: string) => void;
  onRemove: (id: string) => void;
  activeQueueId?: string | null;
  compact?: boolean;
}) {
  if (queue.length === 0) return null;

  return (
    <ul className={compact ? "space-y-1.5" : "space-y-2"}>
      {queue.map((story, idx) => {
        const isActive = story.id === activeQueueId;
        return (
          <li
            key={story.id}
            className={[
              "rounded-lg flex items-start gap-2",
              compact ? "px-3 py-2" : "px-4 py-3",
              isActive ? "bg-orange-50 border border-orange-200" : "bg-[#f5f5f5]",
            ].join(" ")}
          >
            <span className="text-xs text-gray-400 font-mono mt-0.5 shrink-0 w-4">{idx + 1}.</span>
            <div className="flex-1 min-w-0">
              {story.jiraKey && (
                <span className="text-xs font-mono text-[#ff7427] font-semibold">{story.jiraKey} · </span>
              )}
              <span className={compact ? "text-xs text-[#32373c]" : "text-sm text-[#32373c]"}>
                {story.storyName}
              </span>
              {isActive && (
                <span className="ml-2 text-xs bg-[#ff7427] text-white px-1.5 py-0.5 rounded font-semibold">
                  Votando
                </span>
              )}
            </div>
            {isModerator && (
              <div className="flex gap-1 shrink-0">
                {!isActive && (
                  <button
                    onClick={() => onStart(story.id)}
                    title="Iniciar votación"
                    className="bg-[#ff7427] text-white text-xs px-2.5 py-1 rounded hover:bg-[#e6631a] transition font-semibold"
                  >
                    ▶ Votar
                  </button>
                )}
                <button
                  onClick={() => onRemove(story.id)}
                  title="Eliminar"
                  className="text-gray-400 hover:text-red-500 text-xs px-1.5 py-1 rounded hover:bg-red-50 transition"
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RoomPage({ joinPayload, onLeave }: Props) {
  const { roomState, error } = useRoom(joinPayload);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [devConsensus, setDevConsensus] = useState<string>("0");
  const [qaConsensus, setQaConsensus] = useState<string>("0");

  const { roomId, isModerator, name } = joinPayload;
  const session = roomState?.currentSession ?? null;
  const revealed = session?.revealedAt !== null && session?.revealedAt !== undefined;
  const resultSaved = session?.result !== null && session?.result !== undefined;
  const storyQueue = roomState?.storyQueue ?? [];
  const activeQueueId = session?.storyQueueId ?? null;

  const sessionDone = !session || session.result !== null;
  const allVoted =
    storyQueue.length > 0 && storyQueue.every((s) => s.isVoted) && sessionDone;

  // Inicializar consenso con sugerencia Fibonacci al revelar
  useEffect(() => {
    if (revealed && roomState) {
      const pMap = new Map(roomState.participants.map((p) => [p.name, p.role]));
      const dVotes = roomState.votes.filter((v) => pMap.get(v.participantName) === "Dev");
      const qVotes = roomState.votes.filter((v) => pMap.get(v.participantName) === "QA");
      setDevConsensus(suggestFib(calcRoleAverage(dVotes.map((v) => v.value))));
      setQaConsensus(suggestFib(calcRoleAverage(qVotes.map((v) => v.value))));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  // Auto-navegar al resumen cuando todas las historias están votadas
  useEffect(() => {
    if (allVoted) setShowSummary(true);
  }, [allVoted]);

  if (showSummary && roomState) {
    return (
      <SummaryPage
        roomId={roomId}
        roomName={roomState.room.name}
        onClose={() => setShowSummary(false)}
      />
    );
  }

  function handleVote(value: string) {
    if (!session) return;
    setSelectedCard(value);
    socket.emit(CLIENT_EVENTS.VOTE, { sessionId: session.id, value });
  }

  function handleReveal() {
    if (!session) return;
    socket.emit(CLIENT_EVENTS.REVEAL_VOTES, { sessionId: session.id });
  }

  function handleSaveResult() {
    if (!session) return;
    const dev = Number(devConsensus) || 0;
    const qa = Number(qaConsensus) || 0;
    const result = String(ceilToFib(dev + qa));
    socket.emit(CLIENT_EVENTS.SAVE_RESULT, {
      sessionId: session.id,
      result,
      devResult: devConsensus,
      qaResult: qaConsensus,
    });
  }

  function handleAddToQueue(storyName: string, jiraKey?: string) {
    socket.emit(CLIENT_EVENTS.ADD_TO_QUEUE, { roomId, storyName, jiraKey });
  }

  function handleRemoveFromQueue(storyId: string) {
    socket.emit(CLIENT_EVENTS.REMOVE_FROM_QUEUE, { roomId, storyId });
  }

  function handleStartFromQueue(storyId: string) {
    socket.emit(CLIENT_EVENTS.START_FROM_QUEUE, { roomId, storyId });
    setSelectedCard(null);
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!roomState) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#ff7427] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#4a5057] text-sm">Conectando a la sala…</p>
        </div>
      </div>
    );
  }

  // Group revealed votes by role
  const participantRoleMap = new Map(roomState.participants.map((p) => [p.name, p.role]));
  const devVotes = roomState.votes.filter((v) => participantRoleMap.get(v.participantName) === "Dev");
  const qaVotes = roomState.votes.filter((v) => participantRoleMap.get(v.participantName) === "QA");
  const otherVotes = roomState.votes.filter((v) => {
    const r = participantRoleMap.get(v.participantName);
    return r !== "Dev" && r !== "QA";
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Header */}
      <header className="bg-[#32373c] shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#ff7427] rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">SP</span>
            </div>
            <span className="text-white font-semibold">{roomState.room.name}</span>
            <button
              onClick={handleCopyCode}
              title="Copiar código de sala"
              className="flex items-center gap-1.5 font-mono text-xs bg-[#4a5057] hover:bg-[#ff7427] text-[#ededed] hover:text-white px-2.5 py-1 rounded transition"
            >
              {roomId}
              <span>{copied ? "✓" : "⎘"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[#ededed] flex items-center gap-2">
              {name}
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                joinPayload.role === "Dev" ? "bg-blue-500 text-white" :
                joinPayload.role === "QA" ? "bg-green-500 text-white" :
                "bg-[#4a5057] text-white"
              }`}>
                {joinPayload.role}
              </span>
              {isModerator && (
                <span className="text-xs bg-[#ff7427] text-white px-2 py-0.5 rounded font-semibold">
                  Moderador
                </span>
              )}
            </span>
            {isModerator && storyQueue.some((s) => s.isVoted) && (
              <button
                onClick={() => setShowSummary(true)}
                className="text-xs bg-[#4a5057] hover:bg-[#ff7427] text-white px-3 py-1.5 rounded transition font-semibold"
              >
                Ver resumen
              </button>
            )}
            <button
              onClick={onLeave}
              className="text-xs text-[#ededed] opacity-50 hover:opacity-100 hover:text-red-400 transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="md:col-span-2 space-y-5">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Sin sesión activa — panel de planificación */}
          {!session && (
            <div className="bg-white rounded-xl border border-[#ededed] shadow-sm overflow-hidden">
              <div className="bg-[#32373c] px-6 py-4">
                <p className="text-xs text-[#ededed] opacity-60 uppercase tracking-wider mb-0.5">Planificación</p>
                <h2 className="text-white font-semibold">Cola de historias a votar</h2>
              </div>
              <div className="p-6 space-y-5">
                {isModerator && (
                  <div>
                    <p className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                      Agregar historia
                    </p>
                    <AddToQueueForm onAdd={handleAddToQueue} />
                  </div>
                )}

                {storyQueue.length > 0 ? (
                  <div>
                    {isModerator && <div className="border-t border-[#ededed] pt-4" />}
                    <p className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-3">
                      {storyQueue.length} {storyQueue.length === 1 ? "historia" : "historias"} en cola
                    </p>
                    <StoryQueueList
                      queue={storyQueue}
                      isModerator={isModerator}
                      onStart={handleStartFromQueue}
                      onRemove={handleRemoveFromQueue}
                      activeQueueId={activeQueueId}
                    />
                  </div>
                ) : (
                  <div className="text-center py-6">
                    {isModerator ? (
                      <p className="text-sm text-gray-400">
                        Agregá las historias que se van a votar en esta sesión y luego iniciá la primera.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">
                        Esperando que el Moderador agregue historias y arranque la sesión.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sesión activa */}
          {session && (
            <div className="bg-white rounded-xl border border-[#ededed] shadow-sm overflow-hidden">
              {/* Título de sesión */}
              <div className="bg-[#32373c] px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-[#ededed] opacity-60 uppercase tracking-wider mb-0.5">
                    Historia en curso
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-white font-semibold truncate">{session.storyName}</h2>
                    {session.jiraKey && (
                      <a
                        href={`https://aunesa.atlassian.net/browse/${session.jiraKey}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono bg-[#ff7427] hover:bg-[#e6631a] text-white px-2 py-0.5 rounded transition whitespace-nowrap"
                      >
                        {session.jiraKey} ↗
                      </a>
                    )}
                  </div>
                </div>
                {revealed && roomState.average !== null && (
                  <div className="shrink-0 text-center bg-[#ff7427] rounded-xl px-4 py-2">
                    <div className="text-2xl font-bold text-white">{roomState.average}</div>
                    <div className="text-xs text-white opacity-80">promedio</div>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-6">
                {revealed ? (
                  /* Votos revelados — agrupados por rol */
                  <div className="space-y-5">
                    {devVotes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Dev</span>
                          {calcRoleAverage(devVotes.map((v) => v.value)) !== null && (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded">
                              prom. {calcRoleAverage(devVotes.map((v) => v.value))}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {devVotes.map((v) => (
                            <div key={v.id} className="flex flex-col items-center gap-1.5">
                              <div className="w-14 h-20 rounded-xl bg-blue-500 text-white flex items-center justify-center text-2xl font-bold shadow-sm">
                                {v.value}
                              </div>
                              <span className="text-xs text-[#4a5057] max-w-[56px] truncate text-center">
                                {v.participantName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {qaVotes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">QA</span>
                          {calcRoleAverage(qaVotes.map((v) => v.value)) !== null && (
                            <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded">
                              prom. {calcRoleAverage(qaVotes.map((v) => v.value))}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {qaVotes.map((v) => (
                            <div key={v.id} className="flex flex-col items-center gap-1.5">
                              <div className="w-14 h-20 rounded-xl bg-green-500 text-white flex items-center justify-center text-2xl font-bold shadow-sm">
                                {v.value}
                              </div>
                              <span className="text-xs text-[#4a5057] max-w-[56px] truncate text-center">
                                {v.participantName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {otherVotes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Otro</span>
                          {calcRoleAverage(otherVotes.map((v) => v.value)) !== null && (
                            <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded">
                              prom. {calcRoleAverage(otherVotes.map((v) => v.value))}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {otherVotes.map((v) => (
                            <div key={v.id} className="flex flex-col items-center gap-1.5">
                              <div className="w-14 h-20 rounded-xl bg-[#ff7427] text-white flex items-center justify-center text-2xl font-bold shadow-sm">
                                {v.value}
                              </div>
                              <span className="text-xs text-[#4a5057] max-w-[56px] truncate text-center">
                                {v.participantName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {roomState.votes.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-2">Nadie votó en esta ronda.</p>
                    )}

                    {isModerator && (
                      <div className="border-t border-[#ededed] pt-5 space-y-3">
                        {!resultSaved ? (
                          <div className="space-y-4">
                            {/* Selector consenso Dev */}
                            <div>
                              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                                Consenso Dev
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {["0", ...FIBONACCI.map(String)].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setDevConsensus(v)}
                                    className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                                      devConsensus === v
                                        ? "bg-blue-500 text-white shadow"
                                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                    }`}
                                  >
                                    {v}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Selector consenso QA */}
                            <div>
                              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
                                Consenso QA
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {["0", ...FIBONACCI.map(String)].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setQaConsensus(v)}
                                    className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                                      qaConsensus === v
                                        ? "bg-green-500 text-white shadow"
                                        : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                                    }`}
                                  >
                                    {v}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Resultado final calculado */}
                            <div className="flex items-center justify-between bg-[#f5f5f5] rounded-lg px-4 py-3">
                              <span className="text-sm text-[#4a5057]">
                                Resultado final <span className="text-xs text-gray-400">(Dev {devConsensus} + QA {qaConsensus} → Fibonacci)</span>
                              </span>
                              <span className="text-2xl font-bold text-[#ff7427]">
                                {ceilToFib((Number(devConsensus) || 0) + (Number(qaConsensus) || 0))}
                              </span>
                            </div>

                            <button
                              onClick={handleSaveResult}
                              className="w-full bg-[#32373c] text-white py-2.5 rounded-lg font-semibold hover:bg-[#4a5057] transition text-sm"
                            >
                              Guardar resultado
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-center text-sm text-[#ff7427] font-semibold py-1">
                              ✓ Resultado guardado: {session.result}
                            </p>
                            {storyQueue.length > 0 ? (
                              <div>
                                <p className="text-xs text-center text-[#4a5057] mb-3">
                                  Siguiente en la cola — elegí la historia para continuar:
                                </p>
                                <StoryQueueList
                                  queue={storyQueue}
                                  isModerator={isModerator}
                                  onStart={handleStartFromQueue}
                                  onRemove={handleRemoveFromQueue}
                                  activeQueueId={activeQueueId}
                                />
                              </div>
                            ) : (
                              <p className="text-xs text-center text-gray-400">
                                No hay más historias en la cola. Podés agregar más desde el panel lateral.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Votación en curso */
                  <div className="space-y-5">
                    <CardDeck
                      selected={selectedCard}
                      onSelect={handleVote}
                      disabled={false}
                    />
                    <p className="text-center text-sm text-[#4a5057]">
                      {selectedCard
                        ? `Tu voto: ${selectedCard} · Podés cambiarlo`
                        : "Seleccioná una carta para votar"}
                    </p>
                    {isModerator && (
                      <div className="border-t border-[#ededed] pt-4 text-center">
                        <button
                          onClick={handleReveal}
                          className="bg-[#32373c] text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-[#4a5057] transition"
                        >
                          Revelar votos
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="bg-white rounded-xl border border-[#ededed] shadow-sm p-5">
            <History roomId={roomId} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Cola de historias (sidebar) — visible siempre durante sesión activa */}
          {session && (
            <div className="bg-white rounded-xl border border-[#ededed] shadow-sm p-5">
              <h3 className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Próximas historias</span>
                {storyQueue.length > 0 && (
                  <span className="bg-[#ff7427] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {storyQueue.length}
                  </span>
                )}
              </h3>

              {isModerator && (
                <div className="mb-4">
                  <AddToQueueForm onAdd={handleAddToQueue} />
                </div>
              )}

              {storyQueue.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">
                  No hay más historias en cola.
                </p>
              ) : (
                <StoryQueueList
                  queue={storyQueue}
                  isModerator={isModerator}
                  onStart={handleStartFromQueue}
                  onRemove={handleRemoveFromQueue}
                  activeQueueId={activeQueueId}
                  compact
                />
              )}
            </div>
          )}

          {/* Participantes */}
          <div className="bg-white rounded-xl border border-[#ededed] shadow-sm p-5">
            <h3 className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-4">
              Participantes ({roomState.participants.length})
            </h3>
            <ParticipantList
              participants={roomState.participants}
              revealed={revealed}
              votes={roomState.votes}
            />
          </div>
        </aside>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 border-t border-[#ededed]">
        Aune · Rosario Derivados S.A.
      </footer>
    </div>
  );
}
