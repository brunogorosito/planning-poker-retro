# Planning Poker + Retrospectivas

[![CI](https://github.com/brunogorosito/planning-poker-retro/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/brunogorosito/planning-poker-retro/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/brunogorosito/planning-poker-retro/graph/badge.svg?token=CODECOV_TOKEN)](https://codecov.io/gh/brunogorosito/planning-poker-retro)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-embedded-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)

Herramienta ágil en tiempo real para equipos de desarrollo. Combina **Scrum Poker** para estimaciones y **Retrospectivas** sincrónicas en una sola aplicación, sin infraestructura adicional.

---

## Funcionalidades

### Scrum Poker
- Estimaciones con mazo Fibonacci: `1 · 2 · 3 · 5 · 8 · 13 · 21 · ?`
- Votos ocultos hasta que el moderador los revela
- Desglose de resultados por rol **Dev** y **QA**
- Consenso editable por rol — resultado final calculado automáticamente (`Dev + QA → Fibonacci`)
- Cola de historias persistida (con integración opcional a Jira)
- Resumen de sesión exportable a PDF

### Retrospectivas
- Tablero sincrónico en tiempo real con tarjetas **anónimas**
- Timer server-side configurable para la fase de escritura
- Revelación simultánea de todas las tarjetas al finalizar el timer
- Plantillas de columnas: Clásica, Start/Stop/Continue, Mad/Sad/Glad o personalizadas
- Votación por tarjeta con votos independientes por persona
- Resumen final ordenado por votos, exportable a PDF

### General
- Identificación por nombre + email (sin contraseña, sistema de confianza interna)
- Sin base de datos externa — SQLite embebido, persiste entre reinicios
- Deploy como un único proceso Python

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Backend | Python 3.10+ + FastAPI + python-socketio |
| Tiempo real | Socket.IO (ASGI, compatible con socket.io-client JS) |
| Base de datos | SQLite via stdlib (sin ORM) |
| Estilos | Tailwind CSS |
| Package manager | pnpm (solo frontend) |

---

## Estructura del proyecto

```
planning-poker-retro/
├── packages/
│   ├── client/              # React + Vite
│   │   └── src/
│   │       ├── pages/       # HomePage, RoomPage, RetroPage, SummaryPage
│   │       ├── hooks/       # useRoom, useRetro, useJiraIssue
│   │       └── components/
│   └── server-python/       # FastAPI + Socket.IO — servidor de producción
│       ├── main.py          # Entry point
│       ├── db.py            # SQLite + helpers
│       ├── memory.py        # Estado en memoria (participantes, cola)
│       ├── socket_handlers.py
│       ├── retro_handlers.py
│       ├── routes/          # rooms, retros, jira
│       ├── tests/           # pytest (67 tests)
│       └── requirements.txt
└── README.md
```

---

## Instalación y desarrollo

### Prerequisitos
- **Python 3.10+** — para el servidor
- **Node.js 20+** y **pnpm** — solo para buildear el frontend (`npm install -g pnpm`)

### Setup

```bash
git clone https://github.com/brunogorosito/planning-poker-retro.git
cd planning-poker-retro

# Dependencias del frontend
pnpm install

# Dependencias del servidor Python
cd packages/server-python
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### Desarrollo

```bash
# Opción A: frontend + servidor Node legacy en paralelo (requiere Node)
pnpm dev

# Opción B: servidor Python + frontend por separado
cd packages/server-python && .venv/bin/uvicorn main:socket_app --reload
# en otra terminal:
pnpm --filter client dev
```

El cliente corre en `http://localhost:5173` y el servidor en `http://localhost:3000`.

### Variables de entorno

Crear `packages/server-python/.env`:

```env
PORT=3000
DB_PATH=./data/scrum-poker.db
CORS_ORIGIN=http://localhost:5173

# Integración Jira (opcional)
JIRA_BASE_URL=https://tuempresa.atlassian.net
JIRA_USER_EMAIL=tu@email.com
JIRA_API_TOKEN=tu_token
```

---

## Deploy / Producción

```bash
# Build del frontend (genera estáticos en server-python/public/)
pnpm build

# Iniciar servidor Python (sirve API + WebSockets + estáticos)
pnpm start
```

El servidor Python sirve la API REST, WebSockets **y** los archivos estáticos del cliente. Un solo proceso, un solo puerto, sin dependencias externas.

### Variables de entorno en producción

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `DB_PATH` | `./data/scrum-poker.db` | Ruta al SQLite — apuntar a un volumen persistente |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin permitido |

---

## Tests

```bash
cd packages/server-python
.venv/bin/pytest
```

67 tests cubriendo funciones de DB, estado en memoria y todos los endpoints REST. El CI sube el reporte a Codecov automáticamente.

---

## Flujo de uso

### Scrum Poker

1. Entrar con nombre + email → crear sala o unirse con código
2. Moderador carga la cola de historias (con clave Jira opcional)
3. Moderador inicia la votación de cada historia
4. Todos votan con el mazo Fibonacci (voto oculto)
5. Moderador revela → ajusta consenso Dev y QA → resultado final automático
6. Al completar todas las historias → resumen exportable a PDF

### Retrospectiva

1. Entrar con nombre + email → crear retro o unirse con código
2. Moderador configura: título, timer, votos por persona y columnas
3. Equipo se conecta — lista de participantes visible en tiempo real
4. Moderador inicia el timer → fase de escritura (tarjetas solo visibles para su autor)
5. Al finalizar el timer → todas las tarjetas se revelan simultáneamente, sin autor
6. Fase de votación — cada persona reparte sus votos entre las tarjetas
7. Moderador cierra → resumen ordenado por votos, exportable a PDF

---

## Modelo de datos

```
users          → email (PK), name
rooms          → sala de estimación
sessions       → historia votada dentro de una sala
votes          → voto individual por sesión
story_queue    → cola de historias por sala
retros         → sesión de retrospectiva
retro_columns  → columnas de la retro (personalizables)
retro_items    → tarjetas anónimas
retro_votes    → votos por tarjeta
```

---

## Licencia

Uso interno — Aune · Rosario Derivados S.A.
