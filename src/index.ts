import type { LinkResult, Target } from "./skill-manager.js";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { checkbox, select } from "@inquirer/prompts";
import pc from "picocolors";
import { getLinkStatus, getSkills, linkSkill, unlinkSkill } from "./skill-manager.js";

interface TargetEntry {
  target: Target;
  commands: string[];
  appPaths?: string[];
}

const TARGETS: TargetEntry[] = [
  { target: { name: "Claude Code", path: join(homedir(), ".claude", "skills") }, commands: ["claude"] },
  { target: { name: "Amp (agents)", path: join(homedir(), ".config", "agents", "skills") }, commands: ["amp"] },
  { target: { name: "Amp (amp)", path: join(homedir(), ".config", "amp", "skills") }, commands: ["amp"] },
  { target: { name: "VS Code (Copilot)", path: join(homedir(), ".copilot", "skills") }, commands: ["code"], appPaths: ["/Applications/Visual Studio Code.app"] },
  { target: { name: "Cursor", path: join(homedir(), ".cursor", "skills") }, commands: ["cursor"], appPaths: ["/Applications/Cursor.app"] },
  { target: { name: "Factory", path: join(homedir(), ".factory", "skills") }, commands: ["droid"] },
];

function isCommandInstalled(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("which", [command], (error) => {
      resolve(!error);
    });
  });
}

async function isInstalled({ commands, appPaths }: { commands: string[]; appPaths?: string[] }): Promise<boolean> {
  const commandCheck = Promise.all(commands.map(isCommandInstalled)).then(r => r.some(Boolean));
  const pathCheck = appPaths?.some(p => existsSync(p)) ?? false;
  return pathCheck || await commandCheck;
}

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

function printSummary(results: LinkResult[]): void {
  const linked = results.filter(r => r.action === "linked").length;
  const unlinked = results.filter(r => r.action === "unlinked").length;
  const skipped = results.filter(r => r.action === "already_linked" || r.action === "not_linked").length;
  const conflicts = results.filter(r => r.action === "conflict").length;

  const parts: string[] = [];
  if (linked > 0) {
    parts.push(pc.green(`${linked} linked`));
  }
  if (unlinked > 0) {
    parts.push(pc.green(`${unlinked} unlinked`));
  }
  if (skipped > 0) {
    parts.push(pc.dim(`${skipped} skipped`));
  }
  if (conflicts > 0) {
    parts.push(pc.yellow(`${conflicts} conflict`));
  }

  const icon = conflicts > 0 ? pc.yellow("⚠") : pc.green("✓");
  console.log(`  ${icon} ${parts.join(", ")}\n`);
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

  const targetChoices = await Promise.all(
    TARGETS.map(async ({ target, commands, appPaths }) => ({
      name: `${target.name} (${pc.dim(target.path)})`,
      value: target,
      checked: await isInstalled({ commands, appPaths }),
    })),
  );

  const selectedTargets = await checkbox<Target>({
    message: `Select targets ${pc.dim("(Esc to quit)")}`,
    choices: targetChoices,
    required: true,
  });

  let lastResults: LinkResult[] = [];
  while (true) {
    await printStatus(skills, selectedTargets);
    if (lastResults.length > 0) {
      printSummary(lastResults);
      lastResults = [];
    }

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

    const results: LinkResult[] = [];

    if (action === "install") {
      const selected = await checkbox({
        message: `Select skills to install ${pc.dim("(Esc to cancel)")}`,
        choices: skills.map(s => ({ name: s, value: s })),
      });
      for (const skill of selected) {
        for (const target of selectedTargets) {
          results.push(await linkSkill(SKILLS_DIR, skill, target));
        }
      }
    }
    else if (action === "uninstall") {
      const selected = await checkbox({
        message: `Select skills to uninstall ${pc.dim("(Esc to cancel)")}`,
        choices: skills.map(s => ({ name: s, value: s })),
      });
      for (const skill of selected) {
        for (const target of selectedTargets) {
          results.push(await unlinkSkill(SKILLS_DIR, skill, target));
        }
      }
    }
    else if (action === "install_all") {
      for (const skill of skills) {
        for (const target of selectedTargets) {
          results.push(await linkSkill(SKILLS_DIR, skill, target));
        }
      }
    }
    else if (action === "remove_all") {
      for (const skill of skills) {
        for (const target of selectedTargets) {
          results.push(await unlinkSkill(SKILLS_DIR, skill, target));
        }
      }
    }

    lastResults = results;
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
