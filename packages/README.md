# Packages (shared libraries)

These are **not** apps. They are libraries imported by `frontend/` and/or `backend/`.

| Folder | npm name | What it is |
|--------|----------|------------|
| `shared-kernel/` | `@velon/shared` | Shared **policy and types**: roles, permissions, plans, navigation labels, password rules, localization. No React, no Nest. |
| `database/` | `@velon/database` | **Persistence**: Prisma schema, migrations, and seed scripts. |

## Rules

- Put a permission, plan limit, or role rule in `shared-kernel` first, then use it from backend guards and frontend UI.
- Put Prisma models and migrations only in `database`.
- Never put UI components or Nest modules in packages.
