import type { Buffer } from "node:buffer";
import { execSync, spawn } from "node:child_process";
import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "agent-bridge",
  version: "1.0.0",
});

const agentEnum = z.enum(["claude", "opencode"]);
type Agent = z.infer<typeof agentEnum>;

function exec(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8" }).trim();
}

function buildAgentArgs(agent: Agent, prompt: string): { command: string; args: string[] } {
  if (agent === "claude") {
    return { command: "claude", args: ["-p", prompt, "--output-format", "text"] };
  }
  return { command: "opencode", args: ["run", prompt] };
}

function runAgent(agent: Agent, prompt: string, workdir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { command, args } = buildAgentArgs(agent, prompt);

    const proc = spawn(command, args, {
      cwd: workdir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      }
      else {
        reject(new Error(`Exit code ${code}: ${stderr || stdout}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`无法启动 ${agent} CLI: ${err.message}`));
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("执行超时 (10min)"));
    }, 10 * 60 * 1000);

    proc.on("close", () => clearTimeout(timer));
  });
}

// ── 工具 1：执行任务 ─────────────────────────────────────────

server.registerTool(
  "execute_in_agent",
  {
    description: "将一个步骤交给指定 Agent (claude / opencode) 执行，返回执行结果和变更摘要",
    inputSchema: {
      agent: agentEnum.describe("选择执行的 Agent：claude 或 opencode"),
      prompt: z.string().describe("要执行的指令，需包含充分的上下文和明确的目标"),
      workdir: z.string().describe("工作目录的绝对路径"),
      step: z.string().optional().describe("步骤编号，如 '1/5'，用于标记"),
    },
  },
  async ({ agent, prompt, workdir, step }) => {
    const label = step ?? "unknown";

    try {
      const output = await runAgent(agent, prompt, workdir);

      let diffStat = "";
      let diffContent = "";
      try {
        diffStat = exec("git diff --stat", workdir);
        diffContent = exec("git diff", workdir);
        if (diffContent.length > 8000) {
          diffContent = `${diffContent.slice(0, 8000)}\n... (diff 过长，已截断)`;
        }
      }
      catch {
        // 非 git 仓库
      }

      const result = [
        `## 步骤 ${label} 执行完成 (via ${agent})`,
        "",
        `### ${agent} 输出`,
        output.length > 4000 ? output.slice(-4000) : output,
        "",
        "### 文件变更摘要",
        diffStat || "(无文件变更)",
        "",
        "### 变更详情",
        diffContent || "(无变更)",
      ].join("\n");

      return { content: [{ type: "text", text: result }] };
    }
    catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `步骤 ${label} 执行失败 (${agent}): ${message}` }],
        isError: true,
      };
    }
  },
);

// ── 工具 2：回滚变更 ─────────────────────────────────────────

server.registerTool(
  "rollback_agent",
  {
    description: "回滚 Agent 的修改（恢复所有未提交的变更）",
    inputSchema: {
      workdir: z.string().describe("工作目录的绝对路径"),
    },
  },
  async ({ workdir }) => {
    try {
      const status = exec("git status --porcelain", workdir);
      if (!status) {
        return { content: [{ type: "text", text: "当前没有未提交的变更，无需回滚" }] };
      }

      exec("git checkout -- .", workdir);
      exec("git clean -fd", workdir);

      return { content: [{ type: "text", text: `已回滚。恢复前的变更:\n${status}` }] };
    }
    catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `回滚失败: ${message}` }],
        isError: true,
      };
    }
  },
);

// ── 工具 3：检查变更状态 ─────────────────────────────────────

server.registerTool(
  "check_agent_changes",
  {
    description: "查看 Agent 当前的未提交变更",
    inputSchema: {
      workdir: z.string().describe("工作目录的绝对路径"),
    },
  },
  async ({ workdir }) => {
    try {
      const status = exec("git status --porcelain", workdir);
      const diffStat = exec("git diff --stat", workdir);

      return {
        content: [{
          type: "text",
          text: status
            ? `未提交的变更:\n${status}\n\n统计:\n${diffStat}`
            : "工作区干净，无未提交变更",
        }],
      };
    }
    catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `检查失败: ${message}` }],
        isError: true,
      };
    }
  },
);

// ── 启动 ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
