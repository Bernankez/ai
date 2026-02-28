#!/usr/bin/env python3
"""
Update github-stars-classifier/SKILL.md to include a new list.

Modifies three sections:
  1. Decision Tree  — inserts a new numbered item and re-numbers the rest
  2. Boundary Cases — appends a new row to the table
  3. List Reference — appends a new row to the table

Usage:
    python update_classifier.py \
        --classifier-path skills/github-stars-classifier/SKILL.md \
        --name "Game Development" \
        --emoji "🎮" \
        --decision "Game engine, game framework, or game dev tooling" \
        --position 7 \
        --boundary-case "Godot engine" \
        --boundary-reason "Game engine, not a general desktop app" \
        --typical-repos "godot, bevy, phaser, love2d"
"""
import argparse
import re
import sys
from pathlib import Path

# ─── Helpers ──────────────────────────────────────────────────────────────────

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write(path: Path, content: str):
    path.write_text(content, encoding="utf-8")

# ─── Section updaters ─────────────────────────────────────────────────────────

def update_decision_tree(content: str, name: str, emoji: str, decision: str, position: int) -> str:
    """
    Find the decision tree block, insert a new item at `position`, re-number all items.
    Decision tree items follow the pattern:
        N. **...**
           → ...
    """
    tree_start = content.find("## Decision Tree")
    tree_end = content.find("\n## ", tree_start + 1)
    if tree_start == -1 or tree_end == -1:
        print("ERROR: Could not locate Decision Tree section.", file=sys.stderr)
        sys.exit(1)

    tree_block = content[tree_start:tree_end]

    # Extract individual items (each starts with a number + period)
    item_pattern = re.compile(r"(\d+\.\s.+?)(?=\n\d+\.|\Z)", re.DOTALL)
    items = item_pattern.findall(tree_block)

    if not items:
        print("ERROR: No decision tree items found.", file=sys.stderr)
        sys.exit(1)

    # Build the new item text (strip leading number so we can re-number)
    new_item_body = f"**{decision}?**\n   → {emoji} **{name}**"

    # Insert at the desired position (1-based)
    insert_idx = max(0, min(position - 1, len(items)))
    items.insert(insert_idx, f"{position}. {new_item_body}")

    # Re-number all items
    renumbered = []
    for i, item in enumerate(items):
        # Strip existing leading number
        stripped = re.sub(r"^\d+\.\s+", "", item.strip())
        renumbered.append(f"{i + 1}. {stripped}")

    # Reconstruct the tree block header + items
    header_end = tree_block.find("\n1.")
    if header_end == -1:
        header_end = tree_block.find("\n\n") + 1
    header = tree_block[:header_end]
    new_tree_block = header + "\n" + "\n\n".join(renumbered) + "\n"

    return content[:tree_start] + new_tree_block + content[tree_end:]


def update_boundary_cases(content: str, name: str, emoji: str, boundary_case: str, boundary_reason: str) -> str:
    """Append a new row to the Boundary Cases table."""
    marker = "|----------|------|---------|"
    if marker not in content:
        print("WARNING: Boundary Cases table separator not found; skipping.", file=sys.stderr)
        return content
    new_row = f"\n| {boundary_case} | {emoji} {name} | {boundary_reason} |"
    return content.replace(marker, marker + new_row, 1)


def update_list_reference(content: str, name: str, emoji: str, typical_repos: str) -> str:
    """Append a new row to the List Reference table."""
    marker = "|-------|------|---------------|"
    if marker not in content:
        print("WARNING: List Reference table separator not found; skipping.", file=sys.stderr)
        return content
    new_row = f"\n| {emoji} | {name} | {typical_repos} |"
    return content.replace(marker, marker + new_row, 1)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Update github-stars-classifier with a new list.")
    parser.add_argument("--classifier-path", required=True, help="Path to github-stars-classifier/SKILL.md")
    parser.add_argument("--name", required=True, help="List name without emoji (e.g. 'Game Development')")
    parser.add_argument("--emoji", required=True, help="Emoji for the list (e.g. '🎮')")
    parser.add_argument("--decision", required=True, help="Decision tree condition text (the 'Is this X?' question)")
    parser.add_argument("--position", type=int, required=True, help="1-based position to insert in decision tree")
    parser.add_argument("--boundary-case", required=True, help="Example repo/scenario for Boundary Cases table")
    parser.add_argument("--boundary-reason", required=True, help="Why it belongs to this list")
    parser.add_argument("--typical-repos", required=True, help="Comma-separated example repos for List Reference table")
    args = parser.parse_args()

    path = Path(args.classifier_path)
    if not path.exists():
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        sys.exit(1)

    content = read(path)

    content = update_decision_tree(content, args.name, args.emoji, args.decision, args.position)
    content = update_boundary_cases(content, args.name, args.emoji, args.boundary_case, args.boundary_reason)
    content = update_list_reference(content, args.name, args.emoji, args.typical_repos)

    write(path, content)
    print(f"✓ Updated: {path}")
    print(f"  Added '{args.emoji} {args.name}' at position {args.position} in the decision tree.")

if __name__ == "__main__":
    main()
