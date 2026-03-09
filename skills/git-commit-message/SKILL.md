---
name: git-commit-message
description: Generate a concise one-line git commit message from staged or unstaged changes. Use when asked to summarize git diff, write a commit message, or describe pending changes.
---

# Git Commit Message Generator

Generate a concise one-line git commit message based on the current uncommitted changes.

## Workflow

1. Run `git diff --cached` to get staged changes. If empty, fall back to `git diff` for unstaged changes.
2. Analyze the diff to understand what changed (files modified, functionality added/removed/fixed).
3. Generate a single-line commit message following the conventions below.

## Commit Message Conventions

- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- Scope is optional; use the module/component name when helpful
- Description: imperative mood, lowercase, no period, under 72 characters
- Write in English

## Examples

- `feat(auth): add OAuth2 login support`
- `fix: resolve null pointer in user profile handler`
- `refactor(api): simplify error handling middleware`
- `docs: update README with deployment instructions`
- `chore: bump dependencies to latest versions`

## Output

Print only the generated commit message line. Do not include explanation or commentary.
