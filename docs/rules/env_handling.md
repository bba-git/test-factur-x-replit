## 🧭 Cursor Project Rule – .env Handling

**Purpose:**  
Clarify environment variable handling and prevent Cursor from recreating or misinterpreting `.env` configuration.

---

### ✅ Environment Setup Rules

1. **The `.env` file is already present and correct.**
   - Do **NOT** regenerate or recreate it.
   - Do **NOT** create default `.env` or `.env.local` files unless explicitly requested.

2. **Loading behavior:**
   - The backend **must** load the `.env` file using `dotenv.config()` at the entry point (e.g., `index.ts`, `server.ts`, or `main.ts`).
   - This is **already handled**, do not modify unless explicitly instructed.

3. **Supabase Config:**
   - The `SUPABASE_URL` and `SUPABASE_ANON_KEY` are **already defined** in `.env`.
   - Do not overwrite or prompt to insert default Supabase config values.

4. **Frontend variable access:**
   - Vite is used, so variables should be accessed using `import.meta.env.VITE_...`
   - These are also already configured.

---

### 🚫 Prohibited Actions Unless Explicitly Requested

- Do not add a new `.env` file.
- Do not duplicate variables into `process.env` manually.
- Do not suggest `.env.example` or `.env.local` unless asked.
- Do not auto-create fallback environment variables in source files.

---

### ✅ What You Can Do

- If a variable appears `undefined`, first **check for typos** in its name.
- If `.env` isn't loading at runtime, **check import order and placement of `dotenv.config()`**.
- If building with Vite, make sure `.env` variables are prefixed with `VITE_`.

---

### 🧩 Goal

Ensure `.env` handling is stable, centralized, and **never reset or overwritten** by Cursor or tooling unless explicitly instructed.

