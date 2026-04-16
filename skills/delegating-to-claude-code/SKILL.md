---
name: delegating-to-claude-code
description: "Delegates task execution to Claude Code via MCP bridge. Use when user prompt contains「用 Claude Code 执行」. Supports 【全自动】and 【半自动】modes."
---

# Delegating Tasks to Claude Code

Delegates task execution to Claude Code via the MCP tool `execute_in_claude_code`. Amp handles planning and supervision.

## Trigger

Activated when the user prompt contains「用 Claude Code 执行」.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `execute_in_claude_code` | Execute a single step. Params: `prompt`, `workdir`, `step` (optional) |
| `rollback_claude_code` | Rollback all uncommitted changes. Params: `workdir` |
| `check_claude_code_changes` | View current uncommitted changes. Params: `workdir` |

## Execution Modes

Determined by markers in the user prompt:

- **`【全自动】`** (Full Auto): Auto-review and proceed. Pause only on errors or deviations.
- **`【半自动】`** (Semi-Auto): Report results after each step, wait for user confirmation before continuing.
- **Not specified**: Default to Semi-Auto.

## Workflow

### Phase 1: Planning

1. Understand the user's requirements; ask clarifying questions if needed.
2. Read relevant code to understand the current implementation.
3. Create a step-by-step plan. Each step should be a small, independently verifiable change.
4. Present the plan to the user and wait for confirmation.
5. The user may revise the plan; iterate until confirmed.

### Phase 2: Execution

After the user confirms the plan, call `execute_in_claude_code` for each step sequentially.

#### Prompt Construction for Each Step

Each prompt sent to Claude Code must include:

```
## Background
{Project context, tech stack, relevant information}

## Current Task
Step {N}/{Total}: {Step title}

## Requirements
{Detailed modification requirements, including files, functions, and expected behavior}

## Constraints
- Only modify files relevant to this step
- Do not add extra features or refactoring
- Maintain existing code style
- Run typecheck and lint after modifications to confirm no errors
```

#### workdir

Default to the current project root directory. Use user-specified directory if provided.

#### step Parameter

Use the format `"1/5"` for tracking purposes.

### Phase 3: Review

After each step completes, Amp reviews the returned results:

1. **Change scope**: Check `git diff --stat` — only expected files should be modified.
2. **Type safety**: Verify no TypeScript errors.
3. **Code quality**: Confirm lint passes.
4. **Logic correctness**: Read key changes and verify they match expectations.

#### Full Auto Mode

- Review passed → Automatically proceed to the next step.
- Review failed → Pause, report the issue to the user, and wait for instructions.

#### Semi-Auto Mode

- Report to the user: execution result, change summary, review conclusion.
- Wait for user confirmation before proceeding to the next step.

### Deviation Handling

| Severity | Action |
|----------|--------|
| Minor (extra comments, formatting) | Send a correction prompt to Claude Code for minor adjustments |
| Moderate (wrong files, logic deviation) | Call `rollback_claude_code`, reorganize the prompt, and retry |
| Severe (widespread incorrect changes) | Rollback, pause execution, report to the user and ask for guidance |

## Completion Report

After all steps are completed, report to the user:

1. Which steps were completed
2. Total files modified
3. Final typecheck and lint status
4. Any items requiring manual user review
