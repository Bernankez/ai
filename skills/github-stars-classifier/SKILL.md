---
name: github-stars-classifier
description: Classify GitHub starred repositories into the user's 13 predefined Lists. Use when the user asks which List a new starred repo belongs to, or when organizing/re-classifying GitHub Stars into Lists.
---

# GitHub Stars Classifier

Classify any GitHub repository into one of the user's 13 Star Lists using the decision tree below.

## Decision Tree (evaluate in order, stop at first match)

1. **Bilibili-specific?** (API, plugin, recorder, danmaku — exclusively for Bilibili)
   → 📺 **Bilibili Ecosystem**

2. **Font files or font tooling?** (typeface, glyph, typography tool)
   → 🔤 **Fonts & Typography**

3. **Core value depends on an AI/ML model?** (LLM app, image generation, voice synthesis, AI agent, RAG, model training/inference)
   → 🧠 **AI/ML & Data**

4. **Primarily knowledge/tutorials/resource lists?** (books, awesome lists, roadmaps, weekly newsletters — not runnable code)
   → 📚 **Learning & Resources**

5. **System/network/security layer?** (proxy, VPN, firewall, SSH, Docker orchestration, network monitor)
   → 📡 **System & Network**

6. **Complete standalone desktop or mobile app?** (Electron/Tauri app, iOS/Android app, cross-platform GUI)
   → 💻 **Desktop & Mobile Apps**

7. **Content creation, download, or media playback?** (video downloader, live recorder, audio player, subtitle tool, PDF editor, note-taking app)
   → 📝 **Content & Media**

8. **UI component tied to a specific framework?** (React/Vue/Svelte component library, framework-specific widget)
   → 🧩 **Framework Components**

9. **Visual rendering / graphics / animation — framework-agnostic?** (Canvas, WebGL, SVG, color tools, diagram editors, icon sets)
   → 🎨 **Design & Graphics**

10. **Serves the development workflow itself?** (CLI tool, build plugin, linter config, VS Code extension, scaffolding, package manager helper)
    → 🛠️ **Developer Tools**

11. **Runtime library or framework for building web apps?** (HTTP framework, auth lib, DB client, logger, rich-text editor, state management)
    → 🌐 **Web Development**

12. **General-purpose productivity tool (non-developer-specific)?** (clipboard manager, launcher, system cleaner, keyboard visualizer)
    → 🚀 **Utilities & Productivity**

13. **None of the above** (community projects, social commentary, fun/meme repos)
    → 🤝 **Community & Social**

## Boundary Cases

| Scenario | List | Reason |
|----------|------|---------|
| Vite/webpack plugin | 🛠️ Developer Tools | Dev-time, not runtime |
| Vue/React component library | 🧩 Framework Components | Framework-dependent |
| Canvas lib (no framework dep) | 🎨 Design & Graphics | Framework-agnostic visual |
| Multi-platform live recorder | 📝 Content & Media | Not Bilibili-exclusive |
| Bilibili live recorder | 📺 Bilibili Ecosystem | Bilibili-exclusive |
| AI-powered code editor | 🧠 AI/ML & Data | Core value = AI, not editor |
| Regular code editor/IDE | 💻 Desktop & Mobile Apps | Complete GUI app |
| Font-related CSS utility | 🔤 Fonts & Typography | Core subject = font |

## List Reference

| Emoji | Name | Typical repos |
|-------|------|---------------|
| 🧠 | AI/ML & Data | ollama, dify, cline, stable-diffusion-webui |
| 🌐 | Web Development | hono, vuejs/core, better-auth, pino |
| 🛠️ | Developer Tools | tsup, ni, eslint-config, vite-plugin-* |
| 🧩 | Framework Components | shadcn-ui, mantine, daisyui, vaul |
| 🎨 | Design & Graphics | tldraw, fabric.js, pixijs, chroma.js |
| 📚 | Learning & Resources | public-apis, ruanyf/weekly, system-design-101 |
| 📝 | Content & Media | Motrix, Remotion, memos, howler.js |
| 📡 | System & Network | clash-verge, Xray-core, sniffnet, SafeLine |
| 📺 | Bilibili Ecosystem | Bilibili-Evolved, BililiveRecorder, biliup |
| 💻 | Desktop & Mobile Apps | Pake, Zed, localsend, zen-browser |
| 🔤 | Fonts & Typography | maple-font, 得意黑, ark-pixel-font |
| 🚀 | Utilities & Productivity | Maccy, heynote, PasteBar, aliyunpan |
| 🤝 | Community & Social | 996.ICU, elk-zone/elk, run (润学) |
