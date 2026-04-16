import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

export interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  type?: string;
  _description?: string;
  [key: string]: unknown;
}

export interface McpTarget {
  name: string;
  configPath: string;
  /** JSON key path to the mcpServers object, e.g. ["mcpServers"] or ["amp.mcpServers"] */
  serverKey: string;
}

export type McpLinkStatus = "installed" | "conflict" | "not_installed";

export interface McpLinkResult {
  server: string;
  target: McpTarget;
  action: "installed" | "already_installed" | "conflict" | "not_installed" | "uninstalled";
}

export async function getMcpServers(mcpJsonPath: string): Promise<Record<string, McpServerConfig>> {
  if (!existsSync(mcpJsonPath)) {
    return {};
  }
  const content = await readFile(mcpJsonPath, "utf-8");
  const json = JSON.parse(content);
  return json.mcpServers ?? {};
}

async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  if (!existsSync(path)) {
    return {};
  }
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

async function writeJsonFile(path: string, data: Record<string, unknown>): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function getServersFromConfig(config: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = config[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveArgs(args: string[], mcpDir: string): string[] {
  return args.map(arg => isAbsolute(arg) ? arg : resolve(mcpDir, arg));
}

function buildServerEntry(server: McpServerConfig, mcpDir: string): McpServerConfig {
  const entry: McpServerConfig = {};
  for (const [key, value] of Object.entries(server)) {
    if (key.startsWith("_")) {
      continue;
    }
    if (key === "args" && Array.isArray(value)) {
      entry[key] = resolveArgs(value as string[], mcpDir);
    }
    else {
      entry[key] = value;
    }
  }
  return entry;
}

export async function getMcpLinkStatus(
  mcpDir: string,
  serverName: string,
  serverConfig: McpServerConfig,
  target: McpTarget,
): Promise<McpLinkStatus> {
  const config = await readJsonFile(target.configPath);
  const servers = getServersFromConfig(config, target.serverKey);
  const existing = servers[serverName];

  if (existing === undefined) {
    return "not_installed";
  }

  const expected = buildServerEntry(serverConfig, mcpDir);
  if (deepEqual(existing, expected)) {
    return "installed";
  }

  return "conflict";
}

export async function installMcpServer(
  mcpDir: string,
  serverName: string,
  serverConfig: McpServerConfig,
  target: McpTarget,
): Promise<McpLinkResult> {
  const status = await getMcpLinkStatus(mcpDir, serverName, serverConfig, target);
  if (status === "installed") {
    return { server: serverName, target, action: "already_installed" };
  }
  if (status === "conflict") {
    return { server: serverName, target, action: "conflict" };
  }

  const config = await readJsonFile(target.configPath);
  const servers = getServersFromConfig(config, target.serverKey);
  const entry = buildServerEntry(serverConfig, mcpDir);
  servers[serverName] = entry;
  config[target.serverKey] = servers;
  await writeJsonFile(target.configPath, config);

  return { server: serverName, target, action: "installed" };
}

export async function uninstallMcpServer(
  mcpDir: string,
  serverName: string,
  serverConfig: McpServerConfig,
  target: McpTarget,
): Promise<McpLinkResult> {
  const status = await getMcpLinkStatus(mcpDir, serverName, serverConfig, target);
  if (status === "not_installed") {
    return { server: serverName, target, action: "not_installed" };
  }
  if (status === "conflict") {
    return { server: serverName, target, action: "conflict" };
  }

  const config = await readJsonFile(target.configPath);
  const servers = getServersFromConfig(config, target.serverKey);
  delete servers[serverName];
  config[target.serverKey] = servers;
  await writeJsonFile(target.configPath, config);

  return { server: serverName, target, action: "uninstalled" };
}
