#!/usr/bin/env python3
"""
Quick validation script for skills

Usage:
    quick_validate.py <skill-name> [--skills-dir /path/to/skills]
    quick_validate.py <absolute-path-to-skill>

Options:
    --skills-dir    Base directory where skills are stored.
                    Defaults to the 'skills' directory two levels above this script.

Examples:
    quick_validate.py my-skill
    quick_validate.py my-skill --skills-dir /home/user/my-agent/skills
    quick_validate.py /absolute/path/to/my-skill
"""

import sys
import re
import argparse
from pathlib import Path

try:
    import yaml
except ImportError:
    print("❌ PyYAML is required. Install it with: pip install pyyaml")
    sys.exit(1)


def resolve_skills_base(skills_dir_arg: str | None, script_path: Path) -> Path:
    """
    Determine the skills base directory.

    Priority:
    1. Explicit --skills-dir argument
    2. Inferred from script location: <skills-root>/skill-creator/scripts/quick_validate.py
    3. Current working directory / skills
    """
    if skills_dir_arg:
        return Path(skills_dir_arg).expanduser().resolve()

    inferred = script_path.parent.parent.parent
    if inferred.is_dir():
        return inferred

    return Path.cwd() / "skills"


def resolve_skill_path(skill_path_or_name: str, skills_base: Path) -> Path:
    """
    Resolve skill path to absolute path.

    If given an absolute path, use it directly.
    If given a skill name or relative path, resolve it under skills_base.
    """
    path = Path(skill_path_or_name)
    if path.is_absolute():
        return path
    return skills_base / skill_path_or_name


def validate_skill(skill_path: Path) -> tuple[bool, str]:
    """
    Validate a skill directory.

    Returns:
        (is_valid, message)
    """
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, f"SKILL.md not found in: {skill_path}"

    content = skill_md.read_text(encoding="utf-8")

    if not content.startswith('---'):
        return False, "No YAML frontmatter found (file must start with '---')"

    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format (could not find closing '---')"

    frontmatter_text = match.group(1)

    try:
        frontmatter = yaml.safe_load(frontmatter_text)
        if not isinstance(frontmatter, dict):
            return False, "Frontmatter must be a YAML dictionary"
    except yaml.YAMLError as exc:
        return False, f"Invalid YAML in frontmatter: {exc}"

    ALLOWED_PROPERTIES = {'name', 'description', 'license', 'allowed-tools', 'metadata'}

    unexpected_keys = set(frontmatter.keys()) - ALLOWED_PROPERTIES
    if unexpected_keys:
        return False, (
            f"Unexpected key(s) in SKILL.md frontmatter: {', '.join(sorted(unexpected_keys))}. "
            f"Allowed properties are: {', '.join(sorted(ALLOWED_PROPERTIES))}"
        )

    if 'name' not in frontmatter:
        return False, "Missing required field 'name' in frontmatter"
    if 'description' not in frontmatter:
        return False, "Missing required field 'description' in frontmatter"

    name = frontmatter.get('name', '')
    if not isinstance(name, str):
        return False, f"'name' must be a string, got {type(name).__name__}"
    name = name.strip()
    if name:
        if not re.match(r'^[a-z0-9-]+$', name):
            return False, (
                f"Name '{name}' must be hyphen-case "
                "(lowercase letters, digits, and hyphens only)"
            )
        if name.startswith('-') or name.endswith('-') or '--' in name:
            return False, (
                f"Name '{name}' cannot start/end with a hyphen "
                "or contain consecutive hyphens"
            )
        if len(name) > 64:
            return False, (
                f"Name is too long ({len(name)} characters). Maximum is 64 characters."
            )

    description = frontmatter.get('description', '')
    if not isinstance(description, str):
        return False, f"'description' must be a string, got {type(description).__name__}"
    description = description.strip()
    if description:
        if '<' in description or '>' in description:
            return False, "Description cannot contain angle brackets (< or >)"
        if len(description) > 1024:
            return False, (
                f"Description is too long ({len(description)} characters). "
                "Maximum is 1024 characters."
            )

    return True, "✅ Skill is valid!"


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate a skill directory structure and SKILL.md frontmatter.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "skill",
        help="Skill name (resolved under --skills-dir) or absolute path to skill directory.",
    )
    parser.add_argument(
        "--skills-dir",
        default=None,
        metavar="PATH",
        help="Base directory where skills are stored. Defaults to auto-detected location.",
    )
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args(sys.argv[1:])

    skills_base = resolve_skills_base(args.skills_dir, Path(__file__).resolve())
    skill_path = resolve_skill_path(args.skill, skills_base)

    print(f"🔍 Validating skill at: {skill_path}")

    valid, message = validate_skill(skill_path)
    print(message)
    sys.exit(0 if valid else 1)


if __name__ == "__main__":
    main()
