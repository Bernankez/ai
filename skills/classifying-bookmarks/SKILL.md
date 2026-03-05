---
name: classifying-bookmarks
description: Classify a website URL into the appropriate bookmark folder based on its content. Use when asked to categorize, organize, or determine where a URL belongs in a bookmarks directory structure (HTML or Markdown).
---

# Classifying Bookmarks

Classify a given website URL into the most appropriate folder of the user's bookmark directory structure.

## Workflow

### 1. Obtain the Directory Structure

- If the user provides a **Markdown file** (`.md`) with the directory tree already listed, read it directly.
- If the user provides an **HTML bookmarks file** (`.html`), run the extraction script first:

```bash
python3 scripts/extract_bookmarks_dirs.py <bookmarks.html> [output.md]
```

The script is bundled at `scripts/extract_bookmarks_dirs.py` within this skill directory. It extracts all folder names (no links) into a Markdown tree. Then read the generated `.md` file.

### 2. Analyze the Website

Use `read_web_page` to visit the target URL. Extract:

- Page title
- Meta description / tagline
- Primary content type and purpose (tool, documentation, blog, resource hub, etc.)

If the page is inaccessible, infer from the URL and any context the user provides.

### 3. Match to a Bookmark Folder

Compare the website's content against the directory tree. Evaluate from the **deepest (most specific) folders first**, then fall back to broader parent folders.

#### Matching priorities

1. **Exact domain match** — the website's purpose directly matches a leaf folder (e.g., a Webpack plugin → `工程化 > 构建工具 > Webpack`).
2. **Category match** — the website fits a mid-level folder (e.g., a CSS animation library → `CSS > 动画与图形`).
3. **Broad match** — the website fits only a top-level folder (e.g., a general dev tool → `工具`).

### 4. Output the Recommendation

Provide:

- **Recommended path**: Full folder path using `>` separator (e.g., `前端开发 > CSS > 动画与图形`)
- **Reason**: One sentence explaining why this folder is the best fit
- **Alternatives** (if applicable): Up to 2 runner-up paths with brief reasons, sorted by relevance

Format:

```
📁 推荐目录：前端开发 > CSS > 动画与图形
💡 原因：该网站是一个纯 CSS 动画库，与"动画与图形"分类直接对应。

也可以考虑：
  - 前端开发 > CSS > 技巧杂项（如果侧重 CSS 技巧而非动画）
```
