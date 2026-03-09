import type { Target } from "./skill-manager.js";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLinkStatus, getSkills, getStatusMap, linkSkill, unlinkSkill } from "./skill-manager.js";

let tempDir: string;
let skillsDir: string;
let targetDir: string;
let target: Target;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "skill-manager-test-"));
  skillsDir = join(tempDir, "skills");
  targetDir = join(tempDir, "target-skills");
  await mkdir(skillsDir);
  await mkdir(targetDir, { recursive: true });
  target = { name: "Test Target", path: targetDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function createSkill(name: string): Promise<void> {
  const dir = join(skillsDir, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "SKILL.md"), `# ${name}`);
}

describe("getSkills", () => {
  it("returns empty array when skills dir does not exist", async () => {
    const result = await getSkills(join(tempDir, "nonexistent"));
    expect(result).toEqual([]);
  });

  it("returns empty array when skills dir is empty", async () => {
    const result = await getSkills(skillsDir);
    expect(result).toEqual([]);
  });

  it("returns only directories, not files", async () => {
    await createSkill("my-skill");
    await writeFile(join(skillsDir, "README.md"), "readme");
    const result = await getSkills(skillsDir);
    expect(result).toEqual(["my-skill"]);
  });

  it("returns multiple skills sorted by readdir order", async () => {
    await createSkill("beta-skill");
    await createSkill("alpha-skill");
    const result = await getSkills(skillsDir);
    expect(result).toContain("alpha-skill");
    expect(result).toContain("beta-skill");
    expect(result).toHaveLength(2);
  });
});

describe("getLinkStatus", () => {
  it("returns 'not_linked' when dest does not exist", async () => {
    await createSkill("my-skill");
    const status = await getLinkStatus(skillsDir, "my-skill", target);
    expect(status).toBe("not_linked");
  });

  it("returns 'linked' when dest is a symlink pointing to the correct source", async () => {
    await createSkill("my-skill");
    await symlink(join(skillsDir, "my-skill"), join(targetDir, "my-skill"), "junction");
    const status = await getLinkStatus(skillsDir, "my-skill", target);
    expect(status).toBe("linked");
  });

  it("returns 'conflict' when dest is a symlink pointing elsewhere", async () => {
    await createSkill("my-skill");
    const otherDir = join(tempDir, "other");
    await mkdir(otherDir);
    await symlink(otherDir, join(targetDir, "my-skill"), "junction");
    const status = await getLinkStatus(skillsDir, "my-skill", target);
    expect(status).toBe("conflict");
  });

  it("returns 'conflict' when dest is a regular directory", async () => {
    await createSkill("my-skill");
    await mkdir(join(targetDir, "my-skill"));
    const status = await getLinkStatus(skillsDir, "my-skill", target);
    expect(status).toBe("conflict");
  });
});

describe("linkSkill", () => {
  it("creates a symlink and returns 'linked'", async () => {
    await createSkill("my-skill");
    const result = await linkSkill(skillsDir, "my-skill", target);
    expect(result.action).toBe("linked");
    expect(existsSync(join(targetDir, "my-skill"))).toBe(true);
  });

  it("returns 'already_linked' when already linked", async () => {
    await createSkill("my-skill");
    await linkSkill(skillsDir, "my-skill", target);
    const result = await linkSkill(skillsDir, "my-skill", target);
    expect(result.action).toBe("already_linked");
  });

  it("returns 'conflict' when dest exists but is not our symlink", async () => {
    await createSkill("my-skill");
    await mkdir(join(targetDir, "my-skill"));
    const result = await linkSkill(skillsDir, "my-skill", target);
    expect(result.action).toBe("conflict");
  });

  it("creates target directory if it does not exist", async () => {
    await createSkill("my-skill");
    const deepTarget: Target = { name: "Deep", path: join(tempDir, "a", "b", "c") };
    const result = await linkSkill(skillsDir, "my-skill", deepTarget);
    expect(result.action).toBe("linked");
    expect(existsSync(join(deepTarget.path, "my-skill"))).toBe(true);
  });
});

describe("unlinkSkill", () => {
  it("removes symlink and returns 'unlinked'", async () => {
    await createSkill("my-skill");
    await linkSkill(skillsDir, "my-skill", target);
    const result = await unlinkSkill(skillsDir, "my-skill", target);
    expect(result.action).toBe("unlinked");
    expect(existsSync(join(targetDir, "my-skill"))).toBe(false);
  });

  it("returns 'not_linked' when skill is not linked", async () => {
    await createSkill("my-skill");
    const result = await unlinkSkill(skillsDir, "my-skill", target);
    expect(result.action).toBe("not_linked");
  });

  it("returns 'conflict' when dest is not our symlink", async () => {
    await createSkill("my-skill");
    await mkdir(join(targetDir, "my-skill"));
    const result = await unlinkSkill(skillsDir, "my-skill", target);
    expect(result.action).toBe("conflict");
  });

  it("does not remove the source skill directory", async () => {
    await createSkill("my-skill");
    await linkSkill(skillsDir, "my-skill", target);
    await unlinkSkill(skillsDir, "my-skill", target);
    expect(existsSync(join(skillsDir, "my-skill", "SKILL.md"))).toBe(true);
  });
});

describe("getStatusMap", () => {
  it("returns status map for all skills and targets", async () => {
    await createSkill("skill-a");
    await createSkill("skill-b");
    const target2: Target = { name: "Target 2", path: join(tempDir, "target2") };
    await mkdir(target2.path);

    await linkSkill(skillsDir, "skill-a", target);

    const map = await getStatusMap(skillsDir, ["skill-a", "skill-b"], [target, target2]);

    expect(map.get("skill-a")?.get(target.name)).toBe("linked");
    expect(map.get("skill-a")?.get(target2.name)).toBe("not_linked");
    expect(map.get("skill-b")?.get(target.name)).toBe("not_linked");
    expect(map.get("skill-b")?.get(target2.name)).toBe("not_linked");
  });
});

describe("link and unlink roundtrip", () => {
  it("can link, verify, unlink, and verify across multiple targets", async () => {
    await createSkill("roundtrip-skill");
    const target2: Target = { name: "Target 2", path: join(tempDir, "target2") };
    await mkdir(target2.path);

    // Link to both targets
    await linkSkill(skillsDir, "roundtrip-skill", target);
    await linkSkill(skillsDir, "roundtrip-skill", target2);

    expect(await getLinkStatus(skillsDir, "roundtrip-skill", target)).toBe("linked");
    expect(await getLinkStatus(skillsDir, "roundtrip-skill", target2)).toBe("linked");

    // Unlink from one
    await unlinkSkill(skillsDir, "roundtrip-skill", target);
    expect(await getLinkStatus(skillsDir, "roundtrip-skill", target)).toBe("not_linked");
    expect(await getLinkStatus(skillsDir, "roundtrip-skill", target2)).toBe("linked");

    // Unlink from the other
    await unlinkSkill(skillsDir, "roundtrip-skill", target2);
    expect(await getLinkStatus(skillsDir, "roundtrip-skill", target2)).toBe("not_linked");
  });
});
