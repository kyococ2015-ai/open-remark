---
name: project-guidelines
description: >
  Invoke this skill before touching ANY code in this repo —
  schema changes, new routes, UI components, auth patterns, service logic, folder structure,
  or commit messages. Read the relevant reference file before writing a single line.
  Covers: DB schema + migration rules, layered architecture, RBAC/auth, shadcn/ui components,
  route templates, folder map, and commit format.
---

# Project Guidelines

Read the matching `references/` file **before** acting. Never guess conventions — they differ from defaults.

| Task                                          | Reference                          |
| --------------------------------------------- | ---------------------------------- |
| Add or edit models, migrations, indexes       | `references/database-schema.md`    |
| Code style, naming, architecture layers, RBAC | `references/coding-conventions.md` |
| Navigate or add project folders/files         | `references/folder-structure.md`   |
| Build dashboard UI with components            | `references/ui-components.md`      |
| Auth, sessions, JWT, middleware, CORS         | `references/auth-system.md`        |
| Add API routes, pages, or services            | `references/route-creation.md`     |
| Write a commit message                        | `references/commit-conventions.md` |

For tasks that span multiple areas (e.g. adding a feature requires a new model + route + UI), read all relevant references.
