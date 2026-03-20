import { useState } from "react";
import type { ParticipantRole } from "../../../server/src/types";

interface Props {
  onJoin: (params: { name: string; email: string; roomId: string; isModerator: boolean; role: ParticipantRole }) => void;
  onJoinRetro: (params: { retroId: string; name: string; email: string }) => void;
}

const ROLES: { value: ParticipantRole; label: string; color: string }[] = [
  { value: "Dev", label: "Dev", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "QA", label: "QA", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "Otro", label: "Otro", color: "bg-gray-100 text-gray-600 border-gray-300" },
];

const RETRO_TEMPLATES: { label: string; columns: { emoji: string; title: string }[] }[] = [
  {
    label: "Clasica",
    columns: [
      { emoji: "💚", title: "Que salio bien" },
      { emoji: "🔶", title: "Que mejorar" },
      { emoji: "🎯", title: "Acciones" },
    ],
  },
  {
    label: "Start/Stop/Continue",
    columns: [
      { emoji: "🚀", title: "Empezar" },
      { emoji: "🛑", title: "Dejar de hacer" },
      { emoji: "🔁", title: "Continuar" },
    ],
  },
  {
    label: "Mad/Sad/Glad",
    columns: [
      { emoji: "😤", title: "Mad" },
      { emoji: "😢", title: "Sad" },
      { emoji: "😊", title: "Glad" },
    ],
  },
];

const TIMER_OPTIONS: { label: string; value: number }[] = [
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
  { label: "15 min", value: 900 },
  { label: "20 min", value: 1200 },
];

const VOTES_OPTIONS = [3, 5, 7];

type Mode = "idle" | "create" | "join" | "create_retro" | "join_retro";

export function HomePage({ onJoin, onJoinRetro }: Props) {
  const [name, setName] = useState(() => localStorage.getItem("sp_name") ?? "");
  const [email, setEmail] = useState(() => localStorage.getItem("sp_email") ?? "");
  const [role, setRole] = useState<ParticipantRole>(
    () => (localStorage.getItem("sp_role") as ParticipantRole) ?? "Dev"
  );
  const [mode, setMode] = useState<Mode>("idle");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Retro state
  const [retroTitle, setRetroTitle] = useState("");
  const [retroTimer, setRetroTimer] = useState(300);
  const [retroVotes, setRetroVotes] = useState(5);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [customColumns, setCustomColumns] = useState<{ emoji: string; title: string }[]>([]);
  const [useCustomColumns, setUseCustomColumns] = useState(false);
  const [retroCode, setRetroCode] = useState("");

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const identityReady = !!trimmedName && emailValid;

  function saveIdentity() {
    localStorage.setItem("sp_name", trimmedName);
    localStorage.setItem("sp_email", trimmedEmail);
    localStorage.setItem("sp_role", role);
  }

  async function handleCreate() {
    if (!identityReady || !roomName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName.trim() }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al crear sala");
      saveIdentity();
      onJoin({ name: trimmedName, email: trimmedEmail, roomId: data.id!, isModerator: true, role });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!identityReady || !roomCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const code = roomCode.trim().toUpperCase();
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json() as { room?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sala no encontrada");
      saveIdentity();
      onJoin({ name: trimmedName, email: trimmedEmail, roomId: data.room!.id, isModerator: false, role });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRetro() {
    if (!identityReady || !retroTitle.trim()) return;
    setLoading(true);
    setError("");
    try {
      const columns = useCustomColumns
        ? customColumns.filter((c) => c.title.trim())
        : RETRO_TEMPLATES[selectedTemplate].columns;

      if (columns.length === 0) {
        setError("Agregá al menos una columna");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/retros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: retroTitle.trim(),
          timerSeconds: retroTimer,
          votesPerPerson: retroVotes,
          facilitatorEmail: trimmedEmail,
          columns,
        }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al crear retrospectiva");
      saveIdentity();
      onJoinRetro({ retroId: data.id!, name: trimmedName, email: trimmedEmail });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRetro() {
    if (!identityReady || !retroCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const code = retroCode.trim();
      const res = await fetch(`/api/retros/${code}`);
      const data = await res.json() as { retro?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Retrospectiva no encontrada");
      saveIdentity();
      onJoinRetro({ retroId: data.retro!.id, name: trimmedName, email: trimmedEmail });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function addCustomColumn() {
    if (customColumns.length >= 5) return;
    setCustomColumns([...customColumns, { emoji: "", title: "" }]);
  }

  function updateCustomColumn(idx: number, field: "emoji" | "title", value: string) {
    setCustomColumns(customColumns.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  function removeCustomColumn(idx: number) {
    setCustomColumns(customColumns.filter((_, i) => i !== idx));
  }

  const currentColumns = useCustomColumns
    ? customColumns
    : RETRO_TEMPLATES[selectedTemplate].columns;

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Header corporativo */}
      <header className="bg-[#32373c] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-[#ff7427] rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">SP</span>
          </div>
          <span className="text-white font-semibold tracking-wide">Scrum Poker</span>
          <span className="text-[#ededed] text-xs ml-auto opacity-60">AUNE</span>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-[#32373c] pb-16 pt-10 px-4 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Estimaciones de equipo en tiempo real
        </h1>
        <p className="text-[#ededed] opacity-70 max-w-md mx-auto text-sm">
          Planifica sprints con tu equipo usando Scrum Poker. Sin friccion, sin infraestructura adicional.
        </p>
      </div>

      {/* Card centrada */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

          {/* Nombre */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
              Tu nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ana Garcia"
              maxLength={40}
              className="w-full border border-[#ededed] rounded-lg px-4 py-3 text-[#32373c] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
              Tu email corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej: ana.garcia@empresa.com"
              className={[
                "w-full border rounded-lg px-4 py-3 text-[#32373c] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition",
                email && !emailValid
                  ? "border-red-300 focus:ring-red-400"
                  : emailValid
                  ? "border-green-400 focus:ring-green-400"
                  : "border-[#ededed] focus:ring-[#ff7427]",
              ].join(" ")}
            />
            {email && !emailValid && (
              <p className="text-xs text-red-500 mt-1">Ingresa un email valido</p>
            )}
          </div>

          {/* Rol */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
              Tu rol
            </label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={[
                    "flex-1 py-2.5 rounded-lg border font-semibold text-sm transition",
                    role === r.value
                      ? "bg-[#ff7427] text-white border-[#ff7427]"
                      : "bg-white text-[#4a5057] border-[#ededed] hover:border-[#ff7427] hover:text-[#ff7427]",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Acciones — Scrum Poker */}
          {mode === "idle" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">Scrum Poker</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setMode("create"); setError(""); }}
                    disabled={!identityReady}
                    className="flex-1 bg-[#ff7427] text-white py-3 rounded-lg font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition text-sm"
                  >
                    Crear sala
                  </button>
                  <button
                    onClick={() => { setMode("join"); setError(""); }}
                    disabled={!identityReady}
                    className="flex-1 bg-white border-2 border-[#32373c] text-[#32373c] py-3 rounded-lg font-semibold hover:bg-[#f5f5f5] disabled:opacity-40 transition text-sm"
                  >
                    Unirse
                  </button>
                </div>
              </div>
              <div className="border-t border-[#ededed] pt-4">
                <p className="text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">Retrospectiva</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setMode("create_retro"); setError(""); }}
                    disabled={!identityReady}
                    className="flex-1 bg-white border-2 border-[#ff7427] text-[#ff7427] py-3 rounded-lg font-semibold hover:bg-orange-50 disabled:opacity-40 transition text-sm"
                  >
                    Nueva retro
                  </button>
                  <button
                    onClick={() => { setMode("join_retro"); setError(""); }}
                    disabled={!identityReady}
                    className="flex-1 bg-white border-2 border-[#32373c] text-[#32373c] py-3 rounded-lg font-semibold hover:bg-[#f5f5f5] disabled:opacity-40 transition text-sm"
                  >
                    Unirse a retro
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                  Nombre de la sala
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Ej: Sprint 42"
                  autoFocus
                  className="w-full border border-[#ededed] rounded-lg px-4 py-3 text-[#32373c] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setMode("idle"); setError(""); }}
                  className="flex-1 border border-[#ededed] text-[#32373c] py-2.5 rounded-lg hover:bg-[#f5f5f5] transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!roomName.trim() || loading}
                  className="flex-1 bg-[#ff7427] text-white py-2.5 rounded-lg font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition"
                >
                  {loading ? "Creando..." : "Crear sala"}
                </button>
              </div>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                  Codigo de sala
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="ABC123"
                  maxLength={6}
                  autoFocus
                  className="w-full border border-[#ededed] rounded-lg px-4 py-3 font-mono tracking-[0.3em] text-center text-xl uppercase text-[#32373c] focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setMode("idle"); setError(""); }}
                  className="flex-1 border border-[#ededed] text-[#32373c] py-2.5 rounded-lg hover:bg-[#f5f5f5] transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleJoin}
                  disabled={roomCode.trim().length < 6 || loading}
                  className="flex-1 bg-[#ff7427] text-white py-2.5 rounded-lg font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition"
                >
                  {loading ? "Buscando..." : "Ingresar"}
                </button>
              </div>
            </div>
          )}

          {mode === "create_retro" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                  Titulo de la retrospectiva
                </label>
                <input
                  type="text"
                  value={retroTitle}
                  onChange={(e) => setRetroTitle(e.target.value)}
                  placeholder="Ej: Retro Sprint 42"
                  autoFocus
                  className="w-full border border-[#ededed] rounded-lg px-4 py-3 text-[#32373c] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                    Tiempo de escritura
                  </label>
                  <select
                    value={retroTimer}
                    onChange={(e) => setRetroTimer(Number(e.target.value))}
                    className="w-full border border-[#ededed] rounded-lg px-3 py-2.5 text-sm text-[#32373c] focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
                  >
                    {TIMER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                    Votos por persona
                  </label>
                  <select
                    value={retroVotes}
                    onChange={(e) => setRetroVotes(Number(e.target.value))}
                    className="w-full border border-[#ededed] rounded-lg px-3 py-2.5 text-sm text-[#32373c] focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
                  >
                    {VOTES_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v} votos</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                  Columnas
                </label>
                {!useCustomColumns ? (
                  <div className="space-y-2">
                    {RETRO_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedTemplate(idx)}
                        className={[
                          "w-full text-left border rounded-lg px-3 py-2.5 text-sm transition",
                          selectedTemplate === idx
                            ? "border-[#ff7427] bg-orange-50 text-[#32373c]"
                            : "border-[#ededed] text-[#32373c] hover:border-[#ff7427]",
                        ].join(" ")}
                      >
                        <span className="font-semibold">{tmpl.label}</span>
                        <span className="text-gray-400 ml-2 text-xs">
                          {tmpl.columns.map((c) => `${c.emoji} ${c.title}`).join(" · ")}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setUseCustomColumns(true); if (customColumns.length === 0) addCustomColumn(); }}
                      className="w-full text-left border border-dashed border-[#ededed] rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:border-[#ff7427] hover:text-[#ff7427] transition"
                    >
                      + Personalizar columnas
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customColumns.map((col, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={col.emoji}
                          onChange={(e) => updateCustomColumn(idx, "emoji", e.target.value)}
                          placeholder="emoji"
                          maxLength={4}
                          className="w-14 border border-[#ededed] rounded-lg px-2 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={col.title}
                          onChange={(e) => updateCustomColumn(idx, "title", e.target.value)}
                          placeholder="Nombre de columna"
                          className="flex-1 border border-[#ededed] rounded-lg px-3 py-2 text-sm text-[#32373c] focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent"
                        />
                        <button
                          onClick={() => removeCustomColumn(idx)}
                          className="text-gray-400 hover:text-red-500 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {customColumns.length < 5 && (
                      <button
                        type="button"
                        onClick={addCustomColumn}
                        className="w-full text-sm border border-dashed border-[#ededed] rounded-lg py-2 text-gray-400 hover:border-[#ff7427] hover:text-[#ff7427] transition"
                      >
                        + Agregar columna
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setUseCustomColumns(false)}
                      className="text-xs text-gray-400 hover:text-[#32373c] transition"
                    >
                      Usar plantilla predefinida
                    </button>
                  </div>
                )}
              </div>

              {/* Preview */}
              {currentColumns.length > 0 && (
                <div className="bg-[#f5f5f5] rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 mb-1">Vista previa:</p>
                  <div className="flex gap-2 flex-wrap">
                    {currentColumns.map((col, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white border border-[#ededed] rounded px-2 py-1 text-[#32373c]"
                      >
                        {col.emoji} {col.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setMode("idle"); setError(""); }}
                  className="flex-1 border border-[#ededed] text-[#32373c] py-2.5 rounded-lg hover:bg-[#f5f5f5] transition font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRetro}
                  disabled={!retroTitle.trim() || loading}
                  className="flex-1 bg-[#ff7427] text-white py-2.5 rounded-lg font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition text-sm"
                >
                  {loading ? "Creando..." : "Crear retro"}
                </button>
              </div>
            </div>
          )}

          {mode === "join_retro" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#32373c] uppercase tracking-wider mb-2">
                  Codigo de retrospectiva
                </label>
                <input
                  type="text"
                  value={retroCode}
                  onChange={(e) => setRetroCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRetro()}
                  placeholder="Ingresa el ID de la retro"
                  autoFocus
                  className="w-full border border-[#ededed] rounded-lg px-4 py-3 text-sm font-mono text-[#32373c] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff7427] focus:border-transparent transition"
                />
                <p className="text-xs text-gray-400 mt-1">
                  El facilitador te compartira el ID de la retrospectiva.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setMode("idle"); setError(""); }}
                  className="flex-1 border border-[#ededed] text-[#32373c] py-2.5 rounded-lg hover:bg-[#f5f5f5] transition font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleJoinRetro}
                  disabled={!retroCode.trim() || loading}
                  className="flex-1 bg-[#ff7427] text-white py-2.5 rounded-lg font-semibold hover:bg-[#e6631a] disabled:opacity-40 transition text-sm"
                >
                  {loading ? "Buscando..." : "Unirse"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-gray-400">
        AUNE · Rosario Derivados S.A.
      </footer>
    </div>
  );
}
