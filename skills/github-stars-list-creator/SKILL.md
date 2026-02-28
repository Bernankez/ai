---
name: github-stars-list-creator
description: Helps create a new GitHub Stars List by suggesting a name, emoji, and description, then automatically updates the github-stars-classifier skill's decision tree to include the new list. Use when the user wants to add a new category to their GitHub Stars Lists.
---

# GitHub Stars List Creator

## Entry Points

There are two ways to start this skill. Determine which applies before doing anything else:

**Path A — Full flow** (user wants to define a new list from scratch):
→ Start at Step 1.

**Path B — Classifier-only update** (user already has a confirmed name/emoji/description and explicitly says they only want to update the classifier skill):
→ Skip to Step 4 directly.

---

## Path A: Full Flow

### Step 1: Understand Intent

Ask the user what the new list is for. If they haven't provided 2–3 example repositories, ask for them — examples help produce a more accurate proposal.

### Step 2: Propose List Details

Reason directly (no external script needed) using the guidelines below. Do **not** call any API for this step.

**Naming rules:**
- **Name**: Short English noun phrase, 2–4 words, title case. No emoji in this field.
- **Emoji**: A single emoji that visually represents the domain. Must not duplicate an emoji already used in the existing lists.
- **Description**: One sentence, max 12 words, starting with a noun.

Before proposing, read `skills/github-stars-classifier/SKILL.md` (List Reference table) to see all existing lists and avoid overlap.

Present the proposal in this format and ask the user to confirm:

```
Name:        Game Development
Emoji:       🎮
Full name:   🎮 Game Development
Description: Game engines, frameworks, and game dev tooling.
```

Iterate until the user approves.

### Step 3: Create the List on GitHub (conditional)

Ask the user: **"Should I automatically create this list on your GitHub?"**

- **If no** → skip this step entirely, proceed to Step 4.
- **If yes** → check whether a usable GitHub token is already available in the current context (e.g., previously provided in this session, or accessible via `gh auth token`).
  - **Token already available and has `user` scope** → use it directly, do not ask again.
  - **No token available** → ask the user to provide a Classic Personal Access Token with the `user` scope.

Once a token is available, run:

```bash
python skills/github-stars-list-creator/scripts/create_list.py \
  --token "<token>" \
  --name "🎮 Game Development" \
  --description "Game engines, frameworks, and game dev tooling."
```

Report success or failure to the user.

### Step 4: Update the Classifier Skill (conditional)

Ask the user: **"Should I update the github-stars-classifier skill to include this new list?"**

- **If no** → the workflow is complete.
- **If yes** → determine the correct `--position` by reading the current decision tree in `skills/github-stars-classifier/SKILL.md` and reasoning about where the new list fits (more specific categories go earlier). Then run:

```bash
python skills/github-stars-list-creator/scripts/update_classifier.py \
  --classifier-path skills/github-stars-classifier/SKILL.md \
  --name "<name>" \
  --emoji "<emoji>" \
  --decision "<condition text>" \
  --position <integer> \
  --boundary-case "<example scenario>" \
  --boundary-reason "<reason>" \
  --typical-repos "<repo1>, <repo2>"
```

After running, read the updated file to verify the decision tree numbering and logic are correct, then confirm to the user.

---

## Path B: Classifier-Only Update

The user already has a confirmed name, emoji, and description. Skip Steps 1–3 entirely.

Proceed directly to Step 4: read the current decision tree, determine the correct insertion position, and run `update_classifier.py` as described above.

---

## Script Reference

### `create_list.py`

Creates a new GitHub Stars List via the GitHub GraphQL API.

```bash
python skills/github-stars-list-creator/scripts/create_list.py \
  --token "<github_token>" \
  --name "🎮 Game Development" \
  --description "Game engines, frameworks, and game dev tooling."
```

Requires a Classic Personal Access Token with the `user` scope.

### `update_classifier.py`

Patches `github-stars-classifier/SKILL.md` to insert the new list into the decision tree, Boundary Cases table, and List Reference table.

| Argument | Description |
|---|---|
| `--classifier-path` | Path to `github-stars-classifier/SKILL.md` |
| `--name` | List name without emoji |
| `--emoji` | Emoji for the list |
| `--decision` | Condition text for the decision tree (phrased as a condition, not a question) |
| `--position` | 1-based insertion position in the decision tree |
| `--boundary-case` | Example repo or scenario for the Boundary Cases table |
| `--boundary-reason` | Why it belongs to this list and not another |
| `--typical-repos` | Comma-separated example repos for the List Reference table |
