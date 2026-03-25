# CLAUDE.md — Scrum Poker

## Descripción del proyecto

Aplicación web de Scrum Poker en tiempo real para equipos de hasta 25 personas. Los usuarios entran con un nombre (sin autenticación), se unen a una sala y votan stories usando el mazo de Fibonacci. El historial de votaciones persiste en base de datos.

---

## Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | React + Vite + TypeScript | Rápido, moderno, fácil de mantener |
| Backend | Python 3 + FastAPI + python-socketio | El servidor de producción solo tiene Python instalado |
| Tiempo real | python-socketio (ASGI) | Compatible con el cliente socket.io-client de JS |
| Base de datos | SQLite (via sqlite3 stdlib) | Sin infraestructura extra, fácil de desplegar, persiste a reinicios |
| Estilos | Tailwind CSS | Productivo para videocoding |
| Package manager | pnpm | Más rápido que npm (solo para el frontend) |

> **Deploy:** El equipo de Infraestructura despliega en un servidor interno usando **Nexus** como registro de artefactos. El backend Python sirve el frontend buildeado como archivos estáticos (single deployable unit).

---

## Arquitectura

```
scrum-poker/
├── packages/
│   ├── client/             # React + Vite (TypeScript)
│   ├── server/             # Node.js legacy (solo para desarrollo local con pnpm dev)
│   └── server-python/      # Python — el servidor que se despliega a producción
│       ├── main.py         # Entry point: FastAPI + uvicorn + socket.io
│       ├── db.py           # SQLite + helpers (fetchone, fetchall, execute, generate_id...)
│       ├── memory.py       # Estado en memoria: participantes + cola de historias
│       ├── retro_memory.py # Estado en memoria: participantes de retro + timers
│       ├── socket_handlers.py  # Eventos Socket.io de Scrum Poker
│       ├── retro_handlers.py   # Eventos Socket.io de Retrospectiva
│       ├── routes/
│       │   ├── rooms.py    # /api/rooms
│       │   ├── retros.py   # /api/retros
│       │   └── jira.py     # /api/jira
│       └── requirements.txt
├── package.json            # pnpm workspace root
└── CLAUDE.md
```

El servidor Python sirve la API REST, los WebSockets **y** los archivos estáticos del frontend buildeado. Un solo proceso, un solo puerto. Fácil para Infraestructura.

> `packages/server/` (Node.js) solo se usa para `pnpm dev` en desarrollo local. El servidor de producción es exclusivamente el Python.

---

## Modelo de datos (SQLite)

### `users`
| columna | tipo | descripción |
|---|---|---|
| email | TEXT PK | email del usuario |
| name | TEXT | nombre para mostrar |
| created_at | INTEGER | timestamp unix ms |
| updated_at | INTEGER | timestamp unix ms |

### `rooms`
| columna | tipo | descripción |
|---|---|---|
| id | TEXT PK | código de sala (ej: `ABC123`) |
| name | TEXT | nombre descriptivo de la sala |
| created_at | INTEGER | timestamp unix ms |

### `sessions`
| columna | tipo | descripción |
|---|---|---|
| id | TEXT PK | hex aleatorio (32 chars) |
| room_id | TEXT FK | sala a la que pertenece |
| story_name | TEXT | nombre/descripción de la historia |
| jira_key | TEXT | clave de Jira (nullable) |
| story_queue_id | TEXT | referencia a item de cola (nullable) |
| result | TEXT | consenso final (nullable) |
| dev_result | TEXT | estimación Dev (nullable) |
| qa_result | TEXT | estimación QA (nullable) |
| created_at | INTEGER | timestamp unix ms |
| revealed_at | INTEGER | cuando se revelaron los votos (nullable) |

### `votes`
| columna | tipo | descripción |
|---|---|---|
| id | TEXT PK | hex aleatorio |
| session_id | TEXT FK | sesión a la que pertenece |
| participant_name | TEXT | nombre del votante |
| participant_role | TEXT | rol: Dev, QA, Otro |
| value | TEXT | valor votado (1,2,3,5,8,13,21,?) |
| created_at | INTEGER | timestamp unix ms |

### `story_queue`
| columna | tipo | descripción |
|---|---|---|
| id | TEXT PK | hex aleatorio |
| room_id | TEXT FK | sala a la que pertenece |
| story_name | TEXT | nombre de la historia |
| jira_key | TEXT | clave de Jira (nullable) |
| position | INTEGER | orden en la cola |
| created_at | INTEGER | timestamp unix ms |

### `retros`, `retro_columns`, `retro_items`, `retro_votes`
Tablas del módulo de Retrospectiva.

---

## Funcionalidades

### Scrum Poker
1. Usuario entra con su **nombre** y **email**
2. Puede **crear una sala** (se convierte en Moderador) o **unirse con un código**
3. El Moderador escribe el nombre de la historia y arranca la ronda
4. Todos los participantes votan (voto oculto hasta revelación)
5. El Moderador **revela** los votos → se muestran todos los valores y el promedio
6. El Moderador puede **guardar el resultado** y arrancar una nueva ronda
7. El historial de la sala muestra todas las historias votadas

### Retrospectiva
Módulo adicional con fases: `waiting → writing → revealed → voting → closed`

### Roles (Scrum Poker)
| Rol | Capacidades |
|---|---|
| **Moderador** | Crear ronda, revelar votos, guardar resultado, gestionar cola |
| **Participante** | Votar, ver estado de la sala, ver historial |

### Mazo
Fibonacci: `1, 2, 3, 5, 8, 13, 21, ?`

---

## Eventos Socket.io — Scrum Poker

### Cliente → Servidor
| evento | payload | descripción |
|---|---|---|
| `join_room` | `{ roomId, name, email, isModerator, role }` | Entrar a una sala |
| `vote` | `{ sessionId, value }` | Emitir voto |
| `reveal_votes` | `{ sessionId }` | Revelar (solo Moderador) |
| `save_result` | `{ sessionId, result, devResult, qaResult }` | Guardar consenso |
| `new_round` | `{ roomId, storyName, jiraKey? }` | Nueva ronda (solo Moderador) |
| `add_to_queue` | `{ roomId, storyName, jiraKey? }` | Agregar historia a la cola |
| `remove_from_queue` | `{ roomId, storyId }` | Quitar historia de la cola |
| `start_from_queue` | `{ roomId, storyId }` | Iniciar ronda desde la cola |
| `close_queue` | — | Limpiar la cola |

### Servidor → Cliente(s)
| evento | payload | descripción |
|---|---|---|
| `room_state` | estado completo de la sala | Al conectarse o reconectarse |
| `participant_joined` | `{ name, role }` | Nuevo participante |
| `participant_left` | `{ name }` | Participante desconectado |
| `vote_cast` | `{ name, hasVoted }` | Alguien votó (sin revelar el valor) |
| `votes_revealed` | `{ votes[], average }` | Votos revelados |
| `result_saved` | `{ sessionId, result }` | Consenso guardado |
| `round_started` | `{ session }` | Nueva ronda iniciada |
| `queue_updated` | `{ queue[] }` | Cola de historias actualizada |
| `error` | `{ message }` | Error de operación |

---

## API REST

| método | ruta | descripción |
|---|---|---|
| `POST` | `/api/rooms` | Crear sala |
| `GET` | `/api/rooms/:id` | Obtener sala + sesión activa |
| `GET` | `/api/rooms/:id/history` | Historial de votaciones |
| `POST` | `/api/retros` | Crear retrospectiva |
| `GET` | `/api/retros/:id` | Obtener retrospectiva |
| `GET` | `/api/jira/issue/:key` | Proxy a Jira API |
| `GET` | `/api/health` | Health check |

---

## Convenciones de código

- **Python 3.10+** en el servidor (usa `dict | None`, `list[str]`, etc.)
- Las filas de SQLite se convierten a camelCase con `row_to_camel()` antes de enviarlas al frontend
- Los timestamps son enteros en milisegundos (unix ms), consistente con el JS original
- Componentes React en PascalCase, hooks con prefijo `use`
- Tipos TypeScript del cliente en `packages/server/src/types.ts` (no cambiar, el cliente los usa)

---

## Comandos de desarrollo

```bash
# Instalar dependencias del frontend
pnpm install

# Instalar dependencias del servidor Python (con virtualenv)
cd packages/server-python
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Desarrollo frontend + servidor Node legacy (para devs con Node local)
pnpm dev

# Desarrollo con el servidor Python
cd packages/server-python && .venv/bin/uvicorn main:socket_app --reload
# (en otra terminal)
pnpm --filter client dev

# Build para producción (genera los estáticos en server-python/public/)
pnpm build

# Iniciar servidor Python (producción)
pnpm start
# equivalente a: cd packages/server-python && python main.py
```

---

## Notas para el deploy con Nexus

- El build genera un **único artefacto**: el directorio `packages/server-python/` con los estáticos del cliente en `public/`
- Variables de entorno necesarias:
  - `PORT` (default: 3000)
  - `DB_PATH` (default: `./data/scrum-poker.db`) — debe apuntar a un volumen persistente
  - `CORS_ORIGIN` (default: `http://localhost:5173`) — origin permitido en producción
  - `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` — opcionales, para integración Jira
- El proceso escucha en `0.0.0.0:PORT`
- No requiere ningún otro servicio externo (sin Redis, sin Postgres, sin nada)
- **Python 3.10+** requerido en el servidor
- Crear venv e instalar: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
- Iniciar: `.venv/bin/python main.py` desde `packages/server-python/`

---

## Out of scope para v1

- Autenticación / login
- Transferencia de rol de Moderador
- Múltiples moderadores
- Mazos personalizados
- Notificaciones por email
