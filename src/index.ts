import type { Target } from "./skill-manager.js";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { checkbox, select } from "@inquirer/prompts";
import pc from "picocolors";
import { getLinkStatus, getSkills, linkSkill, unlinkSkill } from "./skill-manager.js";

const TARGETS: Target[] = [
  { name: "Claude Code", path: join(homedir(), ".claude", "skills") },
  { name: "Amp (agents)", path: join(homedir(), ".config", "agents", "skills") },
  { name: "Amp (amp)", path: join(homedir(), ".config", "amp", "skills") },
];

const SKILLS_DIR = resolve(import.meta.dirname, "..", "skills");

function statusIcon(status: "linked" | "conflict" | "not_linked"): string {
  switch (status) {
    case "linked":
      return pc.green("✓");
    case "conflict":
      return pc.yellow("⚠");
    case "not_linked":
      return pc.red("✗");
  }
}

function formatResult(result: { skill: string; target: Target; action: string }): string {
  const label = `${result.skill} → ${result.target.name}`;
  switch (result.action) {
    case "linked":
      return pc.green(`  ${label}: linked ✓`);
    case "already_linked":
      return pc.dim(`  ${label}: already linked, skipped`);
    case "unlinked":
      return pc.green(`  ${label}: unlinked ✓`);
    case "not_linked":
      return pc.dim(`  ${label}: not linked, skipped`);
    case "conflict":
      return pc.yellow(`  ${label}: path exists but is not our symlink, skipped`);
    default:
      return `  ${label}: ${result.action}`;
  }
}

async function printStatus(skills: string[], targets: Target[]): Promise<void> {
  console.log();
  const nameWidth = Math.max(...skills.map(s => s.length));
  for (const skill of skills) {
    const statuses = await Promise.all(
      targets.map(async (t) => {
        const status = await getLinkStatus(SKILLS_DIR, skill, t);
        return `${t.name}: ${statusIcon(status)}`;
      }),
    );
    console.log(`  ${pc.bold(skill.padEnd(nameWidth))}  ${statuses.join("  ")}`);
  }
  console.log();
}

async function main(): Promise<void> {
  console.log(pc.bold(pc.cyan("\n=== AI Skills Manager ===")));

  const skills = await getSkills(SKILLS_DIR);
  if (skills.length === 0) {
    console.log(pc.red("No skills found in ./skills/"));
    return;
  }

  const selectedTargets = await checkbox<Target>({
    message: "Select targets",
    choices: TARGETS.map(t => ({
      name: `${t.name} (${pc.dim(t.path)})`,
      value: t,
      checked: false,
    })),
    required: true,
  });

  while (true) {
    await printStatus(skills, selectedTargets);

    const action = await select({
      message: "Action",
      choices: [
        { name: "Install skills", value: "install" as const },
        { name: "Uninstall skills", value: "uninstall" as const },
        { name: "Install all", value: "install_all" as const },
        { name: "Remove all", value: "remove_all" as const },
        { name: "Quit", value: "quit" as const },
      ],
    });

    if (action === "quit") {
      break;
    }

    if (action === "install") {
      const selected = await checkbox({
        message: "Select skills to install",
        choices: skills.map(s => ({ name: s, value: s })),
      });
      for (const skill of selected) {
        for (const target of selectedTargets) {
          const result = await linkSkill(SKILLS_DIR, skill, target);
          console.log(formatResult(result));
        }
      }
    }
    else if (action === "uninstall") {
      const selected = await checkbox({
        message: "Select skills to uninstall",
        choices: skills.map(s => ({ name: s, value: s })),
      });
      for (const skill of selected) {
        for (const target of selectedTargets) {
          const result = await unlinkSkill(SKILLS_DIR, skill, target);
          console.log(formatResult(result));
        }
      }
    }
    else if (action === "install_all") {
      for (const skill of skills) {
        for (const target of selectedTargets) {
          const result = await linkSkill(SKILLS_DIR, skill, target);
          console.log(formatResult(result));
        }
      }
    }
    else if (action === "remove_all") {
      for (const skill of skills) {
        for (const target of selectedTargets) {
          const result = await unlinkSkill(SKILLS_DIR, skill, target);
          console.log(formatResult(result));
        }
      }
    }
  }

  console.log(pc.dim("Bye!"));
}

main().catch((error) => {
  if (error instanceof Error && error.message === "Prompt was canceled") {
    console.log(pc.dim("\nBye!"));
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});
