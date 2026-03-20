# Planning Poker + Retrospectivas

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-embedded-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?style=flat-square&logo=pnpm&logoColor=white)

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
- Deploy como un único proceso Node.js

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Tiempo real | Socket.io |
| Base de datos | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Estilos | Tailwind CSS |
| Package manager | pnpm workspaces |

---

## Estructura del proyecto

```
planning-poker-retro/
├── packages/
│   ├── client/          # React + Vite
│   │   └── src/
│   │       ├── pages/   # HomePage, RoomPage, RetroPage, SummaryPage
│   │       ├── hooks/   # useRoom, useRetro, useJiraIssue
│   │       └── components/
│   └── server/          # Express + Socket.io
│       └── src/
│           ├── routes/  # rooms, retros, jira
│           ├── socket/  # handlers de estimación y retro
│           └── db/      # schema Drizzle + migraciones
├── GUIA_USUARIO.md      # Guía de uso para el equipo
└── README.md
```

---

## Instalación y desarrollo

### Prerequisitos
- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Setup

```bash
# Clonar el repositorio
git clone https://github.com/brunogorosito/planning-poker-retro.git
cd planning-poker-retro

# Instalar dependencias
pnpm install

# Desarrollo (cliente + servidor en paralelo)
pnpm dev
```

El cliente corre en `http://localhost:5173` y el servidor en `http://localhost:3000`.

### Variables de entorno (opcionales)

Crear `packages/server/.env`:

```env
PORT=3000
DB_PATH=./data/scrum-poker.db

# Integración Jira (opcional)
JIRA_BASE_URL=https://tuempresa.atlassian.net
JIRA_EMAIL=tu@email.com
JIRA_API_TOKEN=tu_token
```

---

## Deploy / Producción

```bash
# Build completo (cliente + servidor)
pnpm build

# Iniciar servidor (sirve el cliente como estáticos)
pnpm start
```

El servidor Express sirve la API REST, WebSockets **y** los archivos estáticos del cliente. Un solo proceso, un solo puerto.

### Variables de entorno en producción

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `DB_PATH` | `./data/scrum-poker.db` | Ruta al archivo SQLite — apuntar a un volumen persistente |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido en desarrollo |

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
3. Equipo se conecta — la lista de participantes es visible en tiempo real
4. Moderador inicia el timer → fase de escritura (tarjetas solo visibles para quien las escribe)
5. Al finalizar el timer → todas las tarjetas se revelan simultáneamente, **sin autor**
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
