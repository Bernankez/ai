#!/usr/bin/env python3
"""
Skill Initializer - Creates a new skill from template

Usage:
    init_skill.py <skill-name> [--skills-dir /path/to/skills]

Options:
    --skills-dir    Base directory where skills are stored.
                    Defaults to the 'skills' directory two levels above this script,
                    i.e., <repo-root>/skills/

Examples:
    init_skill.py my-new-skill
    init_skill.py my-api-helper --skills-dir /home/user/my-agent/skills
"""

import sys
import argparse
from pathlib import Path


SKILL_TEMPLATE = """---
name: {skill_name}
description: [TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
---

# {skill_title}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Structuring This Skill

[TODO: Choose the structure that best fits this skill's purpose. Common patterns:

**1. Workflow-Based** (best for sequential processes)
- Works well when there are clear step-by-step procedures
- Example: DOCX skill with "Workflow Decision Tree" → "Reading" → "Creating" → "Editing"
- Structure: ## Overview → ## Workflow Decision Tree → ## Step 1 → ## Step 2...

**2. Task-Based** (best for tool collections)
- Works well when the skill offers different operations/capabilities
- Example: PDF skill with "Quick Start" → "Merge PDFs" → "Split PDFs" → "Extract Text"
- Structure: ## Overview → ## Quick Start → ## Task Category 1 → ## Task Category 2...

**3. Reference/Guidelines** (best for standards or specifications)
- Works well for brand guidelines, coding standards, or requirements
- Example: Brand styling with "Brand Guidelines" → "Colors" → "Typography" → "Features"
- Structure: ## Overview → ## Guidelines → ## Specifications → ## Usage...

**4. Capabilities-Based** (best for integrated systems)
- Works well when the skill provides multiple interrelated features
- Example: Product Management with "Core Capabilities" → numbered capability list
- Structure: ## Overview → ## Core Capabilities → ### 1. Feature → ### 2. Feature...

Patterns can be mixed and matched as needed. Most skills combine patterns (e.g., start with task-based, add workflow for complex operations).

Delete this entire "Structuring This Skill" section when done - it's just guidance.]

## [TODO: Replace with the first main section based on chosen structure]

[TODO: Add content here. See examples in existing skills:
- Code samples for technical skills
- Decision trees for complex workflows
- Concrete examples with realistic user requests
- References to scripts/templates/references as needed]

## Resources

This skill includes example resource directories that demonstrate how to organize different types of bundled resources:

### scripts/
Executable code (Python/Bash/etc.) that can be run directly to perform specific operations.

**Examples from other skills:**
- PDF skill: `fill_fillable_fields.py`, `extract_form_field_info.py` - utilities for PDF manipulation
- DOCX skill: `document.py`, `utilities.py` - Python modules for document processing

**Appropriate for:** Python scripts, shell scripts, or any executable code that performs automation, data processing, or specific operations.

### references/
Documentation and reference material intended to be loaded into context to inform the agent's process and thinking.

**Examples from other skills:**
- Product management: `communication.md`, `context_building.md` - detailed workflow guides
- BigQuery: API reference documentation and query examples
- Finance: Schema documentation, company policies

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information the agent should reference while working.

### templates/
Files not intended to be loaded into context, but rather used within the output the agent produces.

**Examples from other skills:**
- Brand styling: PowerPoint template files (.pptx), logo files
- Frontend builder: HTML/React boilerplate project directories
- Typography: Font files (.ttf, .woff2)

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Any unneeded directories can be deleted.** Not every skill requires all three types of resources.
"""

EXAMPLE_SCRIPT = '''#!/usr/bin/env python3
"""
Example helper script for {skill_name}

This is a placeholder script that can be executed directly.
Replace with actual implementation or delete if not needed.

Example real scripts from other skills:
- pdf/scripts/fill_fillable_fields.py - Fills PDF form fields
- pdf/scripts/convert_pdf_to_images.py - Converts PDF pages to images
"""

def main():
    print("This is an example script for {skill_name}")
    # TODO: Add actual script logic here
    # This could be data processing, file conversion, API calls, etc.

if __name__ == "__main__":
    main()
'''

EXAMPLE_REFERENCE = """# Reference Documentation for {skill_title}

This is a placeholder for detailed reference documentation.
Replace with actual reference content or delete if not needed.

## When Reference Docs Are Useful

Reference docs are ideal for:
- Comprehensive API documentation
- Detailed workflow guides
- Complex multi-step processes
- Information too lengthy for main SKILL.md
- Content that's only needed for specific use cases

## Structure Suggestions

### API Reference Example
- Overview
- Authentication
- Endpoints with examples
- Error codes
- Rate limits

### Workflow Guide Example
- Prerequisites
- Step-by-step instructions
- Common patterns
- Troubleshooting
- Best practices
"""

EXAMPLE_TEMPLATE = """# Example Template File

This placeholder represents where template files would be stored.
Replace with actual template files (templates, images, fonts, etc.) or delete if not needed.

Template files are NOT intended to be loaded into context, but rather used within
the output the agent produces.

## Common Template Types

- Templates: .pptx, .docx, boilerplate directories
- Images: .png, .jpg, .svg, .gif
- Fonts: .ttf, .otf, .woff, .woff2
- Boilerplate code: Project directories, starter files
- Icons: .ico, .svg
- Data files: .csv, .json, .xml, .yaml

Note: This is a text placeholder. Actual templates can be any file type.
"""


def title_case_skill_name(skill_name: str) -> str:
    """Convert hyphenated skill name to Title Case for display."""
    return ' '.join(word.capitalize() for word in skill_name.split('-'))


def resolve_skills_base(skills_dir_arg: str | None, script_path: Path) -> Path:
    """
    Determine the skills base directory.

    Priority:
    1. Explicit --skills-dir argument
    2. 'skills' sibling directory next to the 'skill-creator' directory
       (i.e., <skills-root>/skill-creator/scripts/init_skill.py → <skills-root>/)
    3. Current working directory / skills
    """
    if skills_dir_arg:
        return Path(skills_dir_arg).expanduser().resolve()

    # Heuristic: script lives at <skills-root>/skill-creator/scripts/init_skill.py
    inferred = script_path.parent.parent.parent
    if inferred.is_dir():
        return inferred

    return Path.cwd() / "skills"


def init_skill(skill_name: str, skills_base: Path) -> Path | None:
    """
    Initialize a new skill directory with template SKILL.md.

    Args:
        skill_name:   Name of the skill (hyphen-case)
        skills_base:  Base directory where skills are stored

    Returns:
        Path to created skill directory, or None if an error occurred.
    """
    skill_dir = skills_base / skill_name

    if skill_dir.exists():
        print(f"❌ Error: Skill directory already exists: {skill_dir}")
        return None

    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"✅ Created skill directory: {skill_dir}")
    except Exception as exc:
        print(f"❌ Error creating directory: {exc}")
        return None

    skill_title = title_case_skill_name(skill_name)

    # Write SKILL.md
    skill_md_path = skill_dir / 'SKILL.md'
    try:
        skill_md_path.write_text(
            SKILL_TEMPLATE.format(skill_name=skill_name, skill_title=skill_title)
        )
        print("✅ Created SKILL.md")
    except Exception as exc:
        print(f"❌ Error creating SKILL.md: {exc}")
        return None

    # Write resource directories with example files
    try:
        scripts_dir = skill_dir / 'scripts'
        scripts_dir.mkdir(exist_ok=True)
        example_script = scripts_dir / 'example.py'
        example_script.write_text(EXAMPLE_SCRIPT.format(skill_name=skill_name))
        example_script.chmod(0o755)
        print("✅ Created scripts/example.py")

        references_dir = skill_dir / 'references'
        references_dir.mkdir(exist_ok=True)
        (references_dir / 'api_reference.md').write_text(
            EXAMPLE_REFERENCE.format(skill_title=skill_title)
        )
        print("✅ Created references/api_reference.md")

        templates_dir = skill_dir / 'templates'
        templates_dir.mkdir(exist_ok=True)
        (templates_dir / 'example_template.txt').write_text(EXAMPLE_TEMPLATE)
        print("✅ Created templates/example_template.txt")
    except Exception as exc:
        print(f"❌ Error creating resource directories: {exc}")
        return None

    print(f"\n✅ Skill '{skill_name}' initialized successfully at {skill_dir}")
    print("\nNext steps:")
    print("1. Edit SKILL.md to complete the TODO items and update the description")
    print("2. Customize or delete the example files in scripts/, references/, and templates/")
    print("3. Run quick_validate.py when ready to check the skill structure")

    return skill_dir


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Initialize a new skill directory from template.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "skill_name",
        help="Hyphen-case skill name (e.g., 'data-analyzer'). Max 64 characters.",
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
    skill_name: str = args.skill_name

    skills_base = resolve_skills_base(args.skills_dir, Path(__file__).resolve())

    print(f"🚀 Initializing skill: {skill_name}")
    print(f"   Location: {skills_base / skill_name}")
    print()

    result = init_skill(skill_name, skills_base)
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
