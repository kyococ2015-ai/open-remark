# Agent Instructions: Code Guidelines

> **Purpose:** This file documents the code conventions, patterns, and workflows for this project. Any AI assistant modifying the codebase MUST follow these rules.

---

If an funtion needs to be used in multiple places, it should be moved to a shared utility file (e.g., `utils/` or `lib/`) rather than duplicated across files. This promotes DRY principles and makes maintenance easier.

## 1. Code Style should follow consistent formatting and style guidelines. Use Prettier for automatic code formatting and ESLint for linting rules. Key style rules include:

- Use 2 spaces for indentation (no tabs)
- Use single quotes for strings (`'example'`), except when the string contains a single quote (e.g., `const message = "It's a nice day!"`)
- Always include semicolons at the end of statements
- Use camelCase for variable and function names (`getUserData`, `isValidEmail`)
- Use PascalCase for React components (`UserProfile`)
- Always try to use funtional programming patterns and avoid mutating state directly. For example, use array methods like `map`, `filter`, and `reduce` instead of loops and mutable operations.
- Use UPPER_SNAKE_CASE for constants (`API_URL`, `MAX_RETRIES`)

## 2. Code Organization should follow a modular structure. Group related functions and components together in files and directories based on their functionality. For example:

- `components/` for React components
- `utils/` for utility functions
- `services/` for API calls and data fetching logic
- `hooks/` for custom React hooks
- `types/` for TypeScript type definitions

## 3. Always wrap complex logic into reuseable hooks or utility functions. This promotes separation of concerns and makes the code easier to test and maintain. For example, if you have a complex data fetching logic, consider creating a custom hook like `useFetchData` that encapsulates the logic and can be reused across different components.

## 4. When modifying existing code, ensure that you understand the current implementation and its dependencies. Avoid making changes that could introduce bugs or break existing functionality.

## 5. When dealing with API calls in dashboard, try to use new react features like Suspense with skeletons, ErrorBoundary component for error handling, optimistic UI updates with our custom hook `hooks/use-optimistic-state.ts` .

## 6. Always write clear and concise comments but not bloated to explain the purpose of complex code blocks, functions, or components. This helps other developers (or future you). also remember a clear variable and function names can often reduce the need for comments.
