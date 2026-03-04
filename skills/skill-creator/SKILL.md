---
name: skill-creator
description: Guide for creating or updating skills that extend an AI agent via specialized knowledge, workflows, or tool integrations. Use when creating a new skill from scratch, updating an existing skill, or packaging reusable agent capabilities into a structured skill directory.
---

# Skill Creator

This skill provides guidance for creating effective skills for AI agents.

## About Skills

Skills are modular, self-contained packages that extend an AI agent's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks—they transform a general-purpose agent into a specialized agent equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows — Multi-step procedures for specific domains
2. Tool integrations — Instructions for working with specific file formats or APIs
3. Domain expertise — Organization-specific knowledge, schemas, and business logic
4. Bundled resources — Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a shared resource. Skills share it with everything else the agent needs: system prompt, conversation history, other skills' metadata, and the actual user request.

**Default assumption: the agent is already capable.** Only add context the agent does not already have. Challenge each piece of information: "Does the agent really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

**High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.

**Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.

**Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

Think of the agent as exploring a path: a narrow bridge with cliffs needs specific guardrails (low freedom), while an open field allows many routes (high freedom).

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── templates/        - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md (required)

Every SKILL.md consists of:

- **Frontmatter** (YAML): Contains `name` and `description` fields. These are the only fields the agent reads to determine when the skill gets used, so it is very important to be clear and comprehensive in describing what the skill is and when it should be used.
- **Body** (Markdown): Instructions and guidance for using the skill. Only loaded after the skill triggers.

#### Bundled Resources (optional)

- **`scripts/`** — Executable code for repetitive or deterministic tasks (e.g., `rotate_pdf.py`). Token-efficient; can run without loading into context.
- **`references/`** — Documentation loaded as needed (schemas, API docs, policies). Keeps SKILL.md lean. For large files (>10k words), include grep patterns in SKILL.md.
- **`templates/`** — Output assets not loaded into context (logos, fonts, boilerplate code).

**Avoid duplication**: Information lives in SKILL.md OR references, not both.

**Do NOT include**: README.md, CHANGELOG.md, or other auxiliary documentation. Skills are for AI agents, not human users.

### Progressive Disclosure

Three-level loading system:

1. **Metadata** — Always in context (~100 words)
2. **SKILL.md body** — When skill triggers (<500 lines)
3. **Bundled resources** — As needed

Keep SKILL.md under 500 lines. When splitting content to references, clearly describe when to read them.

**Key principle:** Keep core workflow in SKILL.md; move variant-specific details to reference files.

Example structure for multi-domain skills:

```
bigquery-skill/
├── SKILL.md (overview + navigation)
└── references/
    ├── finance.md
    ├── sales.md
    └── product.md
```

The agent only loads the relevant reference file when needed.

## Skill Creation Process

Skill creation involves these steps:

1. Understand the skill with concrete examples
2. Plan reusable skill contents (scripts, references, templates)
3. Initialize the skill (run `init_skill.py`)
4. Edit the skill (implement resources and write SKILL.md)
5. Deliver the skill (send the skill directory to the user)
6. Iterate based on real usage

Follow these steps in order, skipping only if there is a clear reason why a step is not applicable.

### Step 1: Understanding the Skill with Concrete Examples

Skip this step only when the skill's usage patterns are already clearly understood.

Gather concrete examples of how the skill will be used. Ask questions like:

- "What functionality should this skill support?"
- "Can you give examples of how it would be used?"

Avoid asking too many questions at once. Conclude when you have a clear sense of the functionality.

### Step 2: Planning the Reusable Skill Contents

For each example, identify reusable resources:

| Resource Type  | When to Use                      | Example                                |
| -------------- | -------------------------------- | -------------------------------------- |
| `scripts/`     | Code rewritten repeatedly        | `rotate_pdf.py` for PDF rotation       |
| `templates/`   | Same boilerplate each time       | HTML/React starter for webapp builder  |
| `references/`  | Documentation needed repeatedly  | Database schemas for BigQuery skill    |

### Step 3: Initializing the Skill

Skip this step only if the skill already exists and iteration or packaging is needed. In that case, continue to the next step.

When creating a new skill from scratch, run the `init_skill.py` script. It generates a new template skill directory that automatically includes everything a skill requires.

Usage (adjust the base path to match your environment):

```bash
python /path/to/skills/skill-creator/scripts/init_skill.py <skill-name> [--skills-dir /path/to/skills]
```

The script:

- Creates the skill directory at `<skills-dir>/<skill-name>/`
- Generates a SKILL.md template with proper frontmatter and TODO placeholders
- Creates example resource directories: `scripts/`, `references/`, and `templates/`
- Adds example files in each directory that can be customized or deleted

After initialization, customize or remove the generated SKILL.md and example files as needed.

### Step 4: Edit the Skill

When editing the skill, remember it is being created for another agent instance to use. Include information that would be beneficial and non-obvious. Consider what procedural knowledge, domain-specific details, or reusable assets would help another agent execute these tasks more effectively.

#### Learn Proven Design Patterns

Consult these helpful guides based on your skill's needs:

- **Multi-step processes**: See `references/workflows.md` for sequential workflows and conditional logic
- **Output formats or quality standards**: See `references/output-patterns.md` for template and example patterns
- **Progressive Disclosure Patterns**: See `references/progressive-disclosure-patterns.md` for splitting content across files

These files contain established best practices for effective skill design.

#### Start with Reusable Skill Contents

Begin with the `scripts/`, `references/`, and `templates/` files identified in Step 2. This may require user input (e.g., brand assets for `templates/`, documentation for `references/`).

Test added scripts by running them to ensure they work correctly. For many similar scripts, test a representative sample.

Delete any unused example files from initialization.

#### Update SKILL.md

**Writing Guidelines:** Always use imperative/infinitive form.

##### Frontmatter

Write the YAML frontmatter with `name` and `description`:

- `name`: The skill name (hyphen-case, e.g., `data-analyzer`)
- `description`: Primary trigger mechanism. Must include what the skill does AND when to use it (body only loads after triggering).
  - Example: "Document creation and editing with tracked changes. Use for: creating .docx files, modifying content, working with tracked changes."

##### Body

Write instructions for using the skill and its bundled resources.

### Step 5: Delivering the Skill

Once development of the skill is complete, validate and deliver it to the user.

#### Validate the Skill

Run the validation script to ensure the skill meets all requirements:

```bash
python /path/to/skills/skill-creator/scripts/quick_validate.py <skill-name> [--skills-dir /path/to/skills]
```

If validation fails, fix the errors and run validation again.

#### Deliver to User

Package the skill directory and send it to the user. The recommended approach is to create a compressed archive of the skill directory:

```bash
cd /path/to/skills && zip -r <skill-name>.zip <skill-name>/
```

Then provide the `.zip` file as an attachment so the user can install it in their own skills directory.

### Step 6: Iterate

After testing the skill, users may request improvements. Often this happens right after using the skill, with fresh context of how the skill performed.

**Iteration workflow:**

1. Use the skill on real tasks
2. Notice struggles or inefficiencies
3. Identify how SKILL.md or bundled resources should be updated
4. Implement changes and test again
