# Agent Instructions: Code Guidelines

> **Purpose:** This file documents the code conventions, patterns, and workflows for this project. Any AI assistant modifying the codebase MUST follow these rules.

---

If an funtion needs to be used in multiple places, it should be moved to a shared utility file (e.g., `utils/` or `lib/`) rather than duplicated across files. This promotes DRY principles and makes maintenance easier.

---

## 1. Code Style

Code should follow consistent formatting and style guidelines. Use Prettier for automatic code formatting and ESLint for linting rules.

### Key Style Rules

- Use 2 spaces for indentation (no tabs)
- Use single quotes for strings (`'example'`), except when the string contains a single quote

  ```ts
  const message = "It's a nice day!";
  ```

- Always include semicolons at the end of statements
- Use camelCase for variable and function names

  ```ts
  getUserData;
  isValidEmail;
  ```

- Use PascalCase for React components

  ```tsx
  UserProfile;
  ```

- Always try to use funtional programming patterns and avoid mutating state directly

  Example:
  - Use array methods like `map`, `filter`, and `reduce`
  - Avoid loops and mutable operations when possible

- Use UPPER_SNAKE_CASE for constants

  ```ts
  API_URL;
  MAX_RETRIES;
  ```

---

## 2. Code Organization

Code should follow a modular structure. Group related functions and components together in files and directories based on their functionality.

### Suggested Structure

- `components/` for React components
- `utils/` for utility functions
- `services/` for API calls and data fetching logic
- `hooks/` for custom React hooks
- `types/` for TypeScript type definitions

---

## 3. Reusable Logic

Always wrap complex logic into reuseable hooks or utility functions. This promotes separation of concerns and makes the code easier to test and maintain.

### Example

If you have complex data fetching logic, consider creating a custom hook like:

```ts
useFetchData;
```

This encapsulates the logic and allows reuse across multiple components.

---

## 4. Modifying Existing Code

When modifying existing code:

- Ensure that you understand the current implementation and its dependencies
- Avoid making changes that could introduce bugs or break existing functionality

---

## 5. Check Linting and Formatting should always pass linting and formatting after making changes. Run the following commands before committing:

```bash
yarn lint
yarn format
```

---

## 5. API and Dashboard Patterns

When dealing with API calls in dashboard, try to use new React features like:

- Suspense with skeletons
- ErrorBoundary component for error handling
- Optimistic UI updates with our custom hook:

```ts
hooks/use-optimistic-state.ts;
```

--- 

## 6. Application Configuration

All app-level configuration must live in `config/config.json`. Do **not** scatter config across environment variables, DOM attributes, or hardcoded values when the setting is a feature flag or site-wide option.

### Pattern

Add a top-level key to `config/config.json`:

```json
{
  "google_tag_manager": {
    "enable": true,
    "gtm_id": "GTM-XXXXXXX"
  },
  "branding": {
    "hide_powered_by": false
  }
}
```

Read it server-side (e.g. in a service or route handler) and pass the value down to the client only where needed — never expose the entire config object to the widget or browser.

### Rules

- New feature flags → add to `config/config.json`, not `.env`
- Widget-visible flags → server reads `config.json`, injects into the API response (e.g. `WidgetThemeConfig`)
- Never read `config/config.json` directly from widget source or client components

---

## 7. Comments and Readability

Always write clear and concise comments but not bloated to explain the purpose of complex code blocks, functions, or components.

This helps other developers (or future you).

Also remember:

- Clear variable and function names can often reduce the need for comments
