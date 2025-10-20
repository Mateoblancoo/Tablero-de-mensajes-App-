# Message Board App

Un **Tablero de Mensajes** full‑stack con:
- **Frontend**: HTML + CSS + JS (vanilla).
- **Backend**: Node.js + Express.
- **Base de datos**: SQLite (archivo local).
- **Operaciones CRUD** completas, datos dinámicos y validación en frontend y backend.
- **Sin login**: edición/borrado protegido por **token por mensaje** .

---

## Requisitos
- Node.js 18 o superior (recomendado 20).

La app se sirve en **http://localhost:3000**


## API (REST)

- `GET /api/messages` 
- `POST /api/messages` 
  - body: `{ username, title, body }`
  - respuesta: `{ id, editToken }`  → guarda ese `editToken` en tu navegador; sólo con él podrás **editar/borrar**.
- `PUT /api/messages/:id` 
  - body: `{ title, body, editToken }`
- `DELETE /api/messages/:id` 
  - body: `{ editToken }`

> El **editToken** es una solución simple para evitar login en este prototipo. 
