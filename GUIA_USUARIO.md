# Guía de usuario — Scrum Poker + Retrospectivas

Herramienta de planificación ágil en tiempo real para equipos. Incluye dos módulos:

- **Scrum Poker** — estimación de historias con el mazo Fibonacci, desglose por rol Dev / QA
- **Retrospectivas** — tablero sincrónico con tarjetas anónimas, timer y votación

---

## Índice

1. [Identificación de usuario](#1-identificación-de-usuario)
2. [Roles](#2-roles)
3. [Scrum Poker — flujo completo](#3-scrum-poker--flujo-completo)
4. [Retrospectivas — flujo completo](#4-retrospectivas--flujo-completo)
5. [Referencia rápida — Mazo Fibonacci](#5-referencia-rápida--mazo-fibonacci)
6. [Preguntas frecuentes](#6-preguntas-frecuentes)

---

## 1. Identificación de usuario

Al entrar a la aplicación se piden **nombre y email corporativo**. El email es el identificador único del sistema: si entrás en otra sesión con el mismo email, el sistema te reconoce como la misma persona.

> No hay contraseña. El sistema es de confianza interna (igual que ingresar con tu nombre de usuario en cualquier herramienta corporativa).

---

## 2. Roles

| Rol | Descripción |
|---|---|
| **Moderador** | Crea la sala o retro, administra el flujo, revela votos y guarda resultados |
| **Dev** | Participa como desarrollador. Su voto se agrupa en el consenso Dev |
| **QA** | Participa como tester. Su voto se agrupa en el consenso QA |
| **Otro** | Rol genérico para PO, Scrum Master u observadores |

---

## 3. Scrum Poker — flujo completo

### 3.1 Crear o unirse a una sala

- **Crear sala:** ingresá nombre, email y rol, escribí el nombre de la sala y hacé clic en **Crear sala**. Sos automáticamente el Moderador.
- **Unirse:** ingresá nombre, email y rol, luego el **código de sala** que te compartió el Moderador. El código aparece en el encabezado y se puede copiar con un clic.

---

### 3.2 Cargar las historias a votar _(solo Moderador)_

1. En el campo **Clave Jira** escribí el ID del ticket (ej. `PROJ-123`). Si la integración está activa, el título se completa automáticamente y podés ver el detalle con **Ver detalles**.
2. Completá el **nombre de la historia** si no usás Jira.
3. Hacé clic en **+ Agregar**.
4. Repetí para todas las historias del sprint.

Las historias se pueden eliminar con **✕** en cualquier momento.

---

### 3.3 Iniciar la votación de una historia

El Moderador hace clic en **▶ Votar** junto a la historia. Todos los participantes ven la historia activa. La historia permanece en la cola con el badge **Votando**.

---

### 3.4 Votar

Cada participante selecciona una carta:

```
1 · 2 · 3 · 5 · 8 · 13 · 21 · ?
```

- Los votos son **ocultos** hasta la revelación.
- Se puede cambiar el voto antes de que el Moderador revele.
- El panel lateral muestra quiénes ya votaron (sin revelar el valor).

---

### 3.5 Revelar los votos _(solo Moderador)_

Clic en **Revelar votos**. Las cartas se muestran agrupadas por rol:

- **Dev** — cartas azules + promedio del grupo
- **QA** — cartas verdes + promedio del grupo
- **Otro** — cartas naranjas + promedio del grupo

---

### 3.6 Guardar el resultado _(solo Moderador)_

1. **Consenso Dev** — sugerencia automática (Fibonacci ≥ promedio Dev). Editable.
2. **Consenso QA** — igual que Dev. Editable.
3. **Resultado final** — calculado automáticamente como `Dev + QA`, redondeado hacia arriba al siguiente Fibonacci.
4. Clic en **Guardar resultado**.

> **Ejemplo:** Dev 3 + QA 4 = 7 → resultado **8**

---

### 3.7 Resumen de sesión

Cuando todas las historias están estimadas, la app navega automáticamente al **resumen**. También se puede acceder con **Ver resumen** en el encabezado (visible para el Moderador desde que hay al menos una historia estimada).

El resumen muestra una tabla con Dev, QA y resultado final por historia, más el detalle de votos individuales.

Desde el resumen se puede **Imprimir / Exportar PDF** y **Cerrar sesión**.

---

## 4. Retrospectivas — flujo completo

### 4.1 Crear una retro _(solo Moderador)_

Desde la pantalla principal, hacé clic en **Nueva retrospectiva** y completá:

| Campo | Descripción |
|---|---|
| Título | Ej: "Retro Sprint 42" |
| Timer de escritura | Tiempo que tendrá el equipo para escribir tarjetas (ej. 5 minutos) |
| Sesión de estimación | Opcional — vinculá esta retro a una sesión de Scrum Poker pasada |
| Columnas | Elegí una plantilla o personalizá tus propias columnas |
| Votos por persona | Cantidad de votos totales que cada participante puede repartir entre las tarjetas |

#### Plantillas de columnas disponibles

| Plantilla | Columnas |
|---|---|
| **Clásica** | 💚 Qué salió bien · 🔶 Qué mejorar · 🎯 Acciones |
| **Start / Stop / Continue** | 🚀 Empezar · 🛑 Dejar de hacer · 🔁 Continuar |
| **Mad / Sad / Glad** | 😤 Mad · 😢 Sad · 😊 Glad |
| **Personalizada** | Definís título, emoji y cantidad de columnas |

---

### 4.2 Unirse a una retro

El Moderador comparte el **código de retro**. Los participantes ingresan con su nombre y email como siempre.

---

### 4.3 Fase de escritura

Una vez que el Moderador inicia el timer:

- Cada participante escribe **tarjetas** en las columnas que quiera.
- **El contenido de cada tarjeta es visible solo para quien la escribió** — los demás solo ven cuántas tarjetas tiene cada persona, no qué escribió.
- Se pueden agregar, editar y eliminar tarjetas propias mientras el timer corra.
- Un contador visible para todos muestra el tiempo restante.

El Moderador puede adelantar la revelación en cualquier momento con **Revelar ahora**.

---

### 4.4 Revelación simultánea

Cuando el timer llega a cero (o el Moderador adelanta):

- **Todas las tarjetas aparecen a la vez**, organizadas en sus columnas.
- Las tarjetas son **completamente anónimas** — nadie sabe quién escribió qué, ni siquiera el Moderador.
- No existe ninguna opción para revelar autoría.

---

### 4.5 Fase de votación

Cada participante reparte sus votos (definidos por el Moderador al crear la retro) entre las tarjetas que considera más importantes.

- Los votos se acumulan en tiempo real y son visibles para todos.
- Podés distribuir todos tus votos en una sola tarjeta o repartirlos.
- No podés votar tus propias tarjetas _(implementación futura)_.

---

### 4.6 Cierre y exportación

El Moderador hace clic en **Cerrar retro**. El tablero queda en modo lectura y se puede:

- **Exportar a PDF** con las tarjetas ordenadas por votos
- Vincular el resultado a la sesión de estimación asociada (si se configuró)

---

## 5. Referencia rápida — Mazo Fibonacci

| Valor | Cuándo usarlo (orientativo) |
|---|---|
| **1** | Tarea trivial, menos de 1 hora |
| **2** | Tarea pequeña, bien definida |
| **3** | Tarea simple con algo de incertidumbre |
| **5** | Tarea mediana, requiere análisis |
| **8** | Tarea compleja o con dependencias |
| **13** | Historia grande, considerar dividir |
| **21** | Demasiado grande — dividir antes de estimar |
| **?** | No tengo información suficiente para votar |

---

## 6. Preguntas frecuentes

**¿Puedo cambiar mi voto en Scrum Poker?**
Sí, hasta que el Moderador revele los votos podés seleccionar otra carta.

**¿Qué pasa si me desconecto?**
Al volver a entrar con el mismo email y sala, el estado se recupera automáticamente.

**¿El Moderador puede saber quién escribió qué tarjeta en la retro?**
No. El anonimato es absoluto: el sistema nunca envía esa información al cliente. Ni al Moderador.

**¿Puedo agregar historias a la cola de Scrum Poker mientras se vota?**
Sí, el Moderador puede agregar historias en cualquier momento.

**¿El Moderador puede votar en Scrum Poker?**
Sí, también es un participante y puede votar.

**¿Qué pasa si no hay votos Dev o QA en una historia?**
El consenso de ese rol queda en 0 y el Moderador puede ajustarlo manualmente antes de guardar.

**¿Puedo compartir el resumen de estimaciones o la retro?**
Sí, ambos se pueden exportar a PDF desde sus respectivas páginas de resumen.

**¿Se puede usar la retro sin una sesión de Scrum Poker?**
Sí, las retrospectivas son independientes. La vinculación a una sesión de estimación es opcional.
