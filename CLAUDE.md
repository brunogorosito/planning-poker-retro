# CLAUDE.md — Scrum Poker

## Descripción del proyecto

Aplicación web de Scrum Poker en tiempo real para equipos de hasta 25 personas. Los usuarios entran con un nombre (sin autenticación), se unen a una sala y votan stories usando el mazo de Fibonacci. El historial de votaciones persiste en base de datos.

---

## Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | React + Vite + TypeScript | Rápido, moderno, fácil de mantener |
| Backend | Node.js + Express + TypeScript | Simple, bien soportado con Socket.io |
| Tiempo real | Socket.io | Requerimiento explícito |
| Base de datos | SQLite (via better-sqlite3) | Sin infraestructura extra, fácil de desplegar, persiste a reinicios |
| ORM | Drizzle ORM | Liviano, type-safe, bien integrado con SQLite |
| Estilos | Tailwind CSS | Productivo para videocoding |
| Package manager | pnpm | Más rápido que npm |

> **Deploy:** El equipo de Infraestructura despliega en un servidor interno usando **Nexus** como registro de artefactos. El backend sirve el frontend buildeado como archivos estáticos (single deployable unit).

---

## Arquitectura

```
scrum-poker/
├── packages/
│   ├── client/          # React + Vite
│   └── server/          # Express + Socket.io
├── package.json         # pnpm workspace root
└── CLAUDE.md
```

El servidor Express sirve la API REST, los WebSockets **y** los archivos estáticos del frontend buildeado. Un solo proceso, un solo puerto. Fácil para Infraestructura.

---

## Modelo de datos (SQLite)

### `rooms`
| columna | tipo | descripción |
|---|---|---|
| id | TEXT PK | código de sala (ej: `ABC123`) |
| name | TEXT | nombre descriptivo de la sala |
| created_at | INTEGER | timestamp unix |

### `sessions`
| columna | tipo | descripción |
|---|---|---|
| id | TEXT PK | uuid |
| room_id | TEXT FK | sala a la que pertenece |
| story_name | TEXT | nombre/descripción de la historia |
| result | TEXT | consenso final (nullable) |
| created_at | INTEGER | timestamp unix |
| revealed_at | INTEGER | cuando se revelaron los votos (nullable) |

### `votes`
| columna | tipo | descripción |
|---|---|---|
| id | TEXT PK | uuid |
| session_id | TEXT FK | sesión a la que pertenece |
| participant_name | TEXT | nombre del votante |
| value | TEXT | valor votado (1,2,3,5,8,13,21,?) |
| created_at | INTEGER | timestamp unix |

---

## Funcionalidades — v1

### Flujo principal
1. Usuario entra, escribe su **nombre**
2. Puede **crear una sala** (se convierte en Moderador) o **unirse con un código**
3. Dentro de la sala, el Moderador escribe el nombre de la historia y arranca la ronda
4. Todos los participantes ven las cartas y votan (voto oculto hasta revelación)
5. El Moderador **revela** los votos → se muestran todos los valores y el promedio
6. El Moderador puede **guardar el resultado** (consenso) y arrancar una nueva ronda
7. El historial de la sala muestra todas las historias votadas con sus resultados

### Roles
| Rol | Capacidades |
|---|---|
| **Moderador** | Crear ronda, revelar votos, guardar resultado, resetear ronda, ver historial |
| **Participante** | Votar, ver estado de la sala, ver historial |

> El primero en crear la sala es el Moderador. En v1 no hay transferencia de rol.

### Mazo
Fibonacci: `1, 2, 3, 5, 8, 13, 21, ?`

---

## Eventos Socket.io

### Cliente → Servidor
| evento | payload | descripción |
|---|---|---|
| `join_room` | `{ roomId, name, isModerator }` | Entrar a una sala |
| `vote` | `{ sessionId, value }` | Emitir voto |
| `reveal_votes` | `{ sessionId }` | Revelar (solo Moderador) |
| `save_result` | `{ sessionId, result }` | Guardar consenso (solo Moderador) |
| `new_round` | `{ roomId, storyName }` | Nueva ronda (solo Moderador) |

### Servidor → Cliente(s)
| evento | payload | descripción |
|---|---|---|
| `room_state` | estado completo de la sala | Al conectarse o reconectarse |
| `participant_joined` | `{ name }` | Nuevo participante |
| `participant_left` | `{ name }` | Participante desconectado |
| `vote_cast` | `{ name, hasVoted }` | Alguien votó (sin revelar el valor) |
| `votes_revealed` | `{ votes[], average }` | Votos revelados |
| `result_saved` | `{ sessionId, result }` | Consenso guardado |
| `round_started` | `{ session }` | Nueva ronda iniciada |

---

## API REST

| método | ruta | descripción |
|---|---|---|
| `POST` | `/api/rooms` | Crear sala |
| `GET` | `/api/rooms/:id` | Obtener sala + sesión activa |
| `GET` | `/api/rooms/:id/history` | Historial de votaciones |

---

## Convenciones de código

- **TypeScript estricto** en ambos packages (`strict: true`)
- Tipos compartidos en `packages/server/src/types.ts` (importados desde el cliente via path relativo o package interno)
- Nombres de eventos Socket.io definidos como constantes en un archivo `events.ts` compartido
- No usar `any`
- Componentes React en PascalCase, hooks con prefijo `use`

---

## Comandos de desarrollo

```bash
# Instalar todo
pnpm install

# Desarrollo (ambos procesos en paralelo)
pnpm dev

# Build para producción
pnpm build

# El servidor sirve el cliente desde dist/
pnpm start
```

---

## Notas para el deploy con Nexus

- El build genera un **único artefacto**: el servidor Node.js con los estáticos del cliente embebidos en `server/dist/public/`
- Variables de entorno necesarias:
  - `PORT` (default: 3000)
  - `DB_PATH` (default: `./data/scrum-poker.db`) — debe apuntar a un volumen persistente
- El proceso escucha en `0.0.0.0:PORT`
- No requiere ningún otro servicio externo (sin Redis, sin Postgres, sin nada)

---

## Out of scope para v1

- Autenticación / login
- Transferencia de rol de Moderador
- Múltiples moderadores
- Mazos personalizados
- Integración con Jira / Linear
- Notificaciones por email
