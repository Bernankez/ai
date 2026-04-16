---
name: delegating-to-agent
description: "Delegates task execution to Claude Code or OpenCode via unified MCP bridge. Use when user prompt contains「用 Agent 执行」. Supports 【全自动】and 【半自动】modes."
---

# Delegating Tasks to Agent

Delegates task execution to a chosen agent (Claude Code or OpenCode) via the unified MCP tool `execute_in_agent`. Amp handles planning and supervision.

## Trigger

Activated when the user prompt contains「用 Agent 执行」.

## Agent Selection

The user specifies which agent to use in their prompt:

- **Claude Code**: User mentions "Claude" or "Claude Code" → pass `"claude"` as agent param
- **OpenCode**: User mentions "OpenCode" → pass `"opencode"` as agent param
- **Not specified**: Ask the user which agent to use before proceeding.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `execute_in_agent` | Execute a single step. Params: `agent` (`"claude"` / `"opencode"`), `prompt`, `workdir`, `step` (optional) |
| `rollback_agent` | Rollback all uncommitted changes. Params: `workdir` |
| `check_agent_changes` | View current uncommitted changes. Params: `workdir` |

## Execution Modes

Determined by markers in the user prompt:

- **`【全自动】`** (Full Auto): Auto-review and proceed. Pause only on errors or deviations.
- **`【半自动】`** (Semi-Auto): Report results after each step, wait for user confirmation before continuing.
- **Not specified**: Default to Semi-Auto.

## Workflow

### Phase 1: Planning

1. Understand the user's requirements; ask clarifying questions if needed.
2. Confirm agent selection (Claude Code or OpenCode).
3. Read relevant code to understand the current implementation.
4. Create a step-by-step plan. Each step should be a small, independently verifiable change.
5. Present the plan to the user and wait for confirmation.
6. The user may revise the plan; iterate until confirmed.

### Phase 2: Execution

After the user confirms the plan, call `execute_in_agent` for each step sequentially, passing the chosen `agent` value consistently.

#### Prompt Construction for Each Step

Each prompt sent to the agent must include:

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
| Minor (extra comments, formatting) | Send a correction prompt to the agent for minor adjustments |
| Moderate (wrong files, logic deviation) | Call `rollback_agent`, reorganize the prompt, and retry |
| Severe (widespread incorrect changes) | Rollback, pause execution, report to the user and ask for guidance |

## Completion Report

After all steps are completed, report to the user:

1. Which steps were completed (and which agent was used)
2. Total files modified
3. Final typecheck and lint status
4. Any items requiring manual user review
