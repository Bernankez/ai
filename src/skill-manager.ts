import { existsSync } from "node:fs";
import { lstat, mkdir, readdir, readlink, symlink, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface Target {
  name: string;
  path: string;
}

export type LinkStatus = "linked" | "conflict" | "not_linked";

export interface LinkResult {
  skill: string;
  target: Target;
  action: "linked" | "already_linked" | "conflict" | "not_linked" | "unlinked";
}

export async function getSkills(skillsDir: string): Promise<string[]> {
  if (!existsSync(skillsDir)) {
    return [];
  }
  const entries = await readdir(skillsDir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

export async function getLinkStatus(skillsDir: string, skill: string, target: Target): Promise<LinkStatus> {
  const dest = join(target.path, skill);
  if (!existsSync(dest)) {
    return "not_linked";
  }
  try {
    const stat = await lstat(dest);
    if (stat.isSymbolicLink()) {
      const linkTarget = await readlink(dest);
      const expected = join(skillsDir, skill);
      if (resolve(linkTarget) === resolve(expected)) {
        return "linked";
      }
    }
    return "conflict";
  }
  catch {
    return "not_linked";
  }
}

export async function linkSkill(skillsDir: string, skill: string, target: Target): Promise<LinkResult> {
  const src = join(skillsDir, skill);
  const dest = join(target.path, skill);

  if (!existsSync(target.path)) {
    await mkdir(target.path, { recursive: true });
  }

  const status = await getLinkStatus(skillsDir, skill, target);
  if (status === "linked") {
    return { skill, target, action: "already_linked" };
  }
  if (status === "conflict") {
    return { skill, target, action: "conflict" };
  }

  await symlink(src, dest, "junction");
  return { skill, target, action: "linked" };
}

export async function unlinkSkill(skillsDir: string, skill: string, target: Target): Promise<LinkResult> {
  const status = await getLinkStatus(skillsDir, skill, target);

  if (status === "not_linked") {
    return { skill, target, action: "not_linked" };
  }
  if (status === "conflict") {
    return { skill, target, action: "conflict" };
  }

  const dest = join(target.path, skill);
  await unlink(dest);
  return { skill, target, action: "unlinked" };
}

export async function getStatusMap(
  skillsDir: string,
  skills: string[],
  targets: Target[],
): Promise<Map<string, Map<string, LinkStatus>>> {
  const map = new Map<string, Map<string, LinkStatus>>();
  for (const skill of skills) {
    const targetMap = new Map<string, LinkStatus>();
    for (const target of targets) {
      targetMap.set(target.name, await getLinkStatus(skillsDir, skill, target));
    }
    map.set(skill, targetMap);
  }
  return map;
}
