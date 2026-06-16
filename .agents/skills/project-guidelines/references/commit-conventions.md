# Commit Message Conventions

## Format

```
type(scope): description
```

Scope is optional. No scope when change is project-wide.

## Types

| Type | When | Example |
|---|---|---|
| `feat` | New feature or capability | `feat(authz): add permissions single source of truth` |
| `fix` | Bug fix | `fix(dashboard): align overview loading skeleton with page layout` |
| `chore` | Maintenance, bumps, content updates, minor tweaks | `chore: bump version to 0.5.0` |
| `refactor` | Code restructuring, no behavior change | `refactor(settings): split site-settings-form into sections` |
| `docs` | Documentation only | `docs: add RBAC roles design spec` |
| `content` | Markdown/content file changes | `content(homepage): update landing page contents` |
| `style` | CSS/styling only | `style(ui): apply radius tokens to Dialog and Tabs` |

## Scopes

| Scope | Area |
|---|---|
| `auth` | Authentication, session, login |
| `authz` | Authorization, permissions, RBAC |
| `db` | Database schema, migrations |
| `dashboard` | Dashboard UI, pages, layout |
| `settings` | Site settings forms |
| `sites` | Site management |
| `widget` | Embed widget (vanilla TS) |
| `team` | Team/member management |
| `permissions` | Role/permission logic |
| `homepage` | Landing/marketing page |
| `elements` | Design system showcase |
| `content` | Markdown content files |
| `branding` | Logo, brand config |
| `typography` | Font, text styles |
| `ui` | Shared UI components |
| `changelog` | Changelog page |

## Rules

- Description is lowercase, imperative mood ("add" not "added")
- Keep under 72 characters
- No period at end
- Reference issues with `#123` when relevant
