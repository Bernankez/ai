import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const inputIdx = args.indexOf("--input");
const outputIdx = args.indexOf("--output");

if (inputIdx === -1 || args.length < 2) {
  console.error("用法: node filter-swagger.mjs --input <swagger.json> --output <output.json> <tag1> [tag2 ...]");
  process.exit(1);
}

const inputFile = resolve(args[inputIdx + 1]);
const outputFile = outputIdx !== -1 ? resolve(args[outputIdx + 1]) : resolve("swagger-filter.json");

// Collect filter terms (everything that's not a flag or flag value)
const flagIndices = new Set();
[inputIdx, outputIdx].forEach((i) => {
  if (i !== -1) {
    flagIndices.add(i);
    flagIndices.add(i + 1);
  }
});
const filters = args.filter((_, i) => !flagIndices.has(i));

if (filters.length === 0) {
  console.error("请至少提供一个 tag name 或 description 用于过滤");
  process.exit(1);
}

const swagger = JSON.parse(readFileSync(inputFile, "utf-8"));

// 1. Match tags by name or description
const matchedTagNames = new Set();
for (const tag of swagger.tags ?? []) {
  if (filters.some(f => tag.name === f || tag.description === f)) {
    matchedTagNames.add(tag.name);
  }
}

if (matchedTagNames.size === 0) {
  console.error("未匹配到任何 tag，请检查输入参数");
  console.error("可用的 tags:");
  for (const tag of swagger.tags ?? []) {
    console.error(`  name: "${tag.name}"  description: "${tag.description}"`);
  }
  process.exit(1);
}

console.log("匹配到的 tags:", [...matchedTagNames]);

// 2. Filter paths
const filteredPaths = {};
for (const [path, methods] of Object.entries(swagger.paths ?? {})) {
  const filteredMethods = {};
  for (const [method, operation] of Object.entries(methods)) {
    const tags = operation.tags ?? [];
    if (tags.some(t => matchedTagNames.has(t))) {
      filteredMethods[method] = operation;
    }
  }
  if (Object.keys(filteredMethods).length > 0) {
    filteredPaths[path] = filteredMethods;
  }
}

// 3. Collect referenced schemas recursively
function collectRefs(obj, refs) {
  if (obj == null || typeof obj !== "object") { return; }
  if (typeof obj.$ref === "string") {
    const prefix = "#/components/schemas/";
    if (obj.$ref.startsWith(prefix)) {
      const name = obj.$ref.slice(prefix.length);
      if (!refs.has(name)) {
        refs.add(name);
        const schema = swagger.components?.schemas?.[name];
        if (schema) { collectRefs(schema, refs); }
      }
    }
  }
  for (const value of Object.values(obj)) {
    collectRefs(value, refs);
  }
}

const referencedSchemas = new Set();
collectRefs(filteredPaths, referencedSchemas);

// 4. Filter components.schemas
const filteredSchemas = {};
for (const name of referencedSchemas) {
  if (swagger.components?.schemas?.[name]) {
    filteredSchemas[name] = swagger.components.schemas[name];
  }
}

// 5. Assemble output
const result = {
  ...swagger,
  tags: (swagger.tags ?? []).filter(t => matchedTagNames.has(t.name)),
  paths: filteredPaths,
};
if (swagger.components) {
  result.components = { ...swagger.components, schemas: filteredSchemas };
}

writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf-8");
console.log(`已输出到 ${outputFile}`);
console.log(`保留 ${Object.keys(filteredPaths).length} 个接口路径，${Object.keys(filteredSchemas).length} 个 schema`);
