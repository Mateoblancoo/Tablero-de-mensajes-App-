# Message Board App

Un **Tablero de Mensajes** full‑stack con:
- **Frontend**: HTML + CSS + JS (vanilla).
- **Backend**: Node.js + Express.
- **Base de datos**: SQLite (archivo local).
- **Operaciones CRUD** completas, datos dinámicos y validación en frontend y backend.
- **Sin login**: edición/borrado protegido por **token por mensaje** (guardado en tu navegador).

> Este proyecto es ideal para VS Code y para subir a GitHub. Corre localmente con Node 18+.

---

## Requisitos
- Node.js 18 o superior (recomendado 20).
- (Opcional) Git para versionado y GitHub.

## Instalación y ejecución

```bash
cd message-board-app
npm install
npm run dev   # o npm start
```

La app se sirve en **http://localhost:3000**

> La base SQLite se crea automáticamente en `./data/messages.db`.

## Estructura

```
message-board-app/
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ data/
│  └─ messages.db        # (se genera en el primer arranque)
├─ server.js
├─ package.json
└─ README.md
```

## API (REST)

- `GET /api/messages` — lista de mensajes (ordenados del más nuevo al más viejo)
- `POST /api/messages` — crea un mensaje
  - body: `{ username, title, body }`
  - respuesta: `{ id, editToken }`  → guarda ese `editToken` en tu navegador; sólo con él podrás **editar/borrar**.
- `PUT /api/messages/:id` — edita
  - body: `{ title, body, editToken }`
- `DELETE /api/messages/:id` — borra
  - body: `{ editToken }`

> El **editToken** es una solución simple para evitar login en este prototipo. No es un mecanismo de seguridad para producción.

## Límites de caracteres (validación frontend + backend)
- `username`: 2–24
- `title`: 1–60
- `body`: 1–280

## Sugerencias para GitHub
1. Crea un repositorio nuevo (p.ej. `message-board-app`).
2. Copia estos archivos.
3. `git init`, `git add .`, `git commit -m "Initial commit: Message Board"`
4. Conecta con GitHub y `git push`.

## Notas
- Si borras el storage del navegador, **seguirás pudiendo leer** todos los mensajes, pero **no podrás editar/borrar** los que ya publicaste porque perderás los `editToken`.
- Para un proyecto real con múltiples usuarios, implementa autenticación (cookies/JWT/oauth) y control de permisos.

¡Éxitos! 🚀
