import type { McpTarget } from "./mcp-manager.js";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMcpLinkStatus, getMcpServers, installMcpServer, uninstallMcpServer } from "./mcp-manager.js";

let tempDir: string;
let mcpDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mcp-manager-test-"));
  mcpDir = join(tempDir, "mcp");
  await mkdir(mcpDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function createTarget(name: string): McpTarget {
  return {
    name,
    configPath: join(tempDir, `${name}.json`),
    serverKey: "mcpServers",
  };
}

describe("getMcpServers", () => {
  it("returns empty object when file does not exist", async () => {
    const result = await getMcpServers(join(tempDir, "nonexistent.json"));
    expect(result).toEqual({});
  });

  it("returns empty object when mcpServers is missing", async () => {
    await writeFile(join(mcpDir, "mcp.json"), JSON.stringify({ foo: "bar" }));
    const result = await getMcpServers(join(mcpDir, "mcp.json"));
    expect(result).toEqual({});
  });

  it("returns servers from mcp.json", async () => {
    const mcpJson = {
      mcpServers: {
        "my-server": { command: "node", args: ["server.js"] },
      },
    };
    await writeFile(join(mcpDir, "mcp.json"), JSON.stringify(mcpJson));
    const result = await getMcpServers(join(mcpDir, "mcp.json"));
    expect(result).toEqual({ "my-server": { command: "node", args: ["server.js"] } });
  });
});

describe("getMcpLinkStatus", () => {
  it("returns 'not_installed' when config file does not exist", async () => {
    const target = createTarget("test");
    const status = await getMcpLinkStatus(mcpDir, "my-server", { command: "node" }, target);
    expect(status).toBe("not_installed");
  });

  it("returns 'not_installed' when server is not in config", async () => {
    const target = createTarget("test");
    await writeFile(target.configPath, JSON.stringify({ mcpServers: {} }));
    const status = await getMcpLinkStatus(mcpDir, "my-server", { command: "node" }, target);
    expect(status).toBe("not_installed");
  });

  it("returns 'installed' when server config matches (no args)", async () => {
    const target = createTarget("test");
    await writeFile(target.configPath, JSON.stringify({
      mcpServers: { "my-server": { command: "node" } },
    }));
    const status = await getMcpLinkStatus(mcpDir, "my-server", { command: "node" }, target);
    expect(status).toBe("installed");
  });

  it("returns 'installed' when relative args are resolved to match", async () => {
    const target = createTarget("test");
    // Config file has the resolved absolute path
    await writeFile(target.configPath, JSON.stringify({
      mcpServers: { "my-server": { command: "node", args: [join(mcpDir, "my-server/dist/index.js")] } },
    }));
    // Source mcp.json has relative path
    const status = await getMcpLinkStatus(mcpDir, "my-server", { command: "node", args: ["my-server/dist/index.js"] }, target);
    expect(status).toBe("installed");
  });

  it("returns 'conflict' when server config differs", async () => {
    const target = createTarget("test");
    await writeFile(target.configPath, JSON.stringify({
      mcpServers: { "my-server": { command: "node", args: ["other.js"] } },
    }));
    const status = await getMcpLinkStatus(mcpDir, "my-server", { command: "node", args: ["server.js"] }, target);
    expect(status).toBe("conflict");
  });

  it("strips underscore-prefixed keys before comparing", async () => {
    const target = createTarget("test");
    await writeFile(target.configPath, JSON.stringify({
      mcpServers: { "my-server": { command: "node" } },
    }));
    const status = await getMcpLinkStatus(mcpDir, "my-server", { _description: "test desc", command: "node" }, target);
    expect(status).toBe("installed");
  });

  it("keeps absolute args as-is", async () => {
    const target = createTarget("test");
    await writeFile(target.configPath, JSON.stringify({
      mcpServers: { "my-server": { command: "node", args: ["/usr/bin/server.js"] } },
    }));
    const status = await getMcpLinkStatus(mcpDir, "my-server", { command: "node", args: ["/usr/bin/server.js"] }, target);
    expect(status).toBe("installed");
  });
});

describe("installMcpServer", () => {
  it("creates config file and installs server with resolved args", async () => {
    const target = createTarget("test");
    const result = await installMcpServer(mcpDir, "my-server", { command: "node", args: ["my-server/dist/index.js"] }, target);
    expect(result.action).toBe("installed");

    const config = JSON.parse(await readFile(target.configPath, "utf-8"));
    expect(config.mcpServers["my-server"]).toEqual({
      command: "node",
      args: [join(mcpDir, "my-server/dist/index.js")],
    });
  });

  it("returns 'already_installed' when already installed", async () => {
    const target = createTarget("test");
    await installMcpServer(mcpDir, "my-server", { command: "node" }, target);
    const result = await installMcpServer(mcpDir, "my-server", { command: "node" }, target);
    expect(result.action).toBe("already_installed");
  });

  it("returns 'conflict' when different config exists", async () => {
    const target = createTarget("test");
    await writeFile(target.configPath, JSON.stringify({
      mcpServers: { "my-server": { command: "python" } },
    }));
    const result = await installMcpServer(mcpDir, "my-server", { command: "node" }, target);
    expect(result.action).toBe("conflict");
  });

  it("preserves other config keys when installing", async () => {
    const target = createTarget("test");
    await writeFile(target.configPath, JSON.stringify({
      otherSetting: true,
      mcpServers: { existing: { command: "python" } },
    }));
    await installMcpServer(mcpDir, "my-server", { command: "node" }, target);

    const config = JSON.parse(await readFile(target.configPath, "utf-8"));
    expect(config.otherSetting).toBe(true);
    expect(config.mcpServers.existing).toEqual({ command: "python" });
    expect(config.mcpServers["my-server"]).toEqual({ command: "node" });
  });

  it("handles serverKey with dot notation (amp.mcpServers)", async () => {
    const target: McpTarget = {
      name: "Amp",
      configPath: join(tempDir, "amp-settings.json"),
      serverKey: "amp.mcpServers",
    };
    await installMcpServer(mcpDir, "my-server", { command: "node" }, target);

    const config = JSON.parse(await readFile(target.configPath, "utf-8"));
    expect(config["amp.mcpServers"]["my-server"]).toEqual({ command: "node" });
  });

  it("creates parent directories if needed", async () => {
    const target: McpTarget = {
      name: "Deep",
      configPath: join(tempDir, "a", "b", "config.json"),
      serverKey: "mcpServers",
    };
    const result = await installMcpServer(mcpDir, "my-server", { command: "node" }, target);
    expect(result.action).toBe("installed");
    expect(existsSync(target.configPath)).toBe(true);
  });
});

describe("uninstallMcpServer", () => {
  it("removes server and returns 'uninstalled'", async () => {
    const target = createTarget("test");
    await installMcpServer(mcpDir, "my-server", { command: "node" }, target);
    const result = await uninstallMcpServer(mcpDir, "my-server", { command: "node" }, target);
    expect(result.action).toBe("uninstalled");

    const config = JSON.parse(await readFile(target.configPath, "utf-8"));
    expect(config.mcpServers["my-server"]).toBeUndefined();
  });

  it("returns 'not_installed' when server is not installed", async () => {
    const target = createTarget("test");
    const result = await uninstallMcpServer(mcpDir, "my-server", { command: "node" }, target);
    expect(result.action).toBe("not_installed");
  });

  it("returns 'conflict' when config differs", async () => {
    const target = createTarget("test");
    await writeFile(target.configPath, JSON.stringify({
      mcpServers: { "my-server": { command: "python" } },
    }));
    const result = await uninstallMcpServer(mcpDir, "my-server", { command: "node" }, target);
    expect(result.action).toBe("conflict");
  });

  it("preserves other servers when uninstalling", async () => {
    const target = createTarget("test");
    await installMcpServer(mcpDir, "server-a", { command: "node" }, target);
    await installMcpServer(mcpDir, "server-b", { command: "python" }, target);
    await uninstallMcpServer(mcpDir, "server-a", { command: "node" }, target);

    const config = JSON.parse(await readFile(target.configPath, "utf-8"));
    expect(config.mcpServers["server-a"]).toBeUndefined();
    expect(config.mcpServers["server-b"]).toEqual({ command: "python" });
  });
});

describe("install and uninstall roundtrip", () => {
  it("can install, verify, uninstall, and verify across multiple targets", async () => {
    const target1 = createTarget("target1");
    const target2 = createTarget("target2");

    await installMcpServer(mcpDir, "my-server", { command: "node" }, target1);
    await installMcpServer(mcpDir, "my-server", { command: "node" }, target2);

    expect(await getMcpLinkStatus(mcpDir, "my-server", { command: "node" }, target1)).toBe("installed");
    expect(await getMcpLinkStatus(mcpDir, "my-server", { command: "node" }, target2)).toBe("installed");

    await uninstallMcpServer(mcpDir, "my-server", { command: "node" }, target1);
    expect(await getMcpLinkStatus(mcpDir, "my-server", { command: "node" }, target1)).toBe("not_installed");
    expect(await getMcpLinkStatus(mcpDir, "my-server", { command: "node" }, target2)).toBe("installed");

    await uninstallMcpServer(mcpDir, "my-server", { command: "node" }, target2);
    expect(await getMcpLinkStatus(mcpDir, "my-server", { command: "node" }, target2)).toBe("not_installed");
  });
});
