---
name: filtering-swagger
description: "Filters a Swagger/OpenAPI JSON file by tag names or controller descriptions. Use when the user wants to extract specific API groups from a swagger.json file."
---

# Filtering Swagger

Filter a Swagger/OpenAPI JSON file to keep only the API groups (tags) specified by the user.

## Workflow

1. Confirm the swagger file path with the user (default: `swagger.json` in the current workspace).
2. Read the `tags` array from the swagger file using `jq` or `Read`, then list all available tags (name + description) to the user in a table.
3. Ask the user which tags to keep. They may specify by tag `name` (e.g. `用户登录接口`), tag `description` (e.g. `User Login Controller`), or a mix of both.
4. Run the filter script:
   ```bash
   node scripts/filter-swagger.mjs \
     --input <swagger-file> --output <output-file> "<tag1>" "<tag2>" ...
   ```
5. Report results: matched tags, number of kept paths and schemas, and the output file path.

## Filter Script Details

- `--input <path>`: Path to the source swagger JSON file (required).
- `--output <path>`: Path for the filtered output file (optional, defaults to `swagger-filter.json` in cwd).
- Remaining positional arguments are filter terms, matched against both tag `name` and `description`.
- Referenced `components.schemas` are included automatically with recursive `$ref` resolution.
