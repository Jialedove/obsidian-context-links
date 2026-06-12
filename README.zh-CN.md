# Obsidian Context Links

[English](README.md) | [中文](README.zh-CN.md)

Obsidian Context Links 是一个基于 Obsidian 社区插件 `Link with Alias` 的 fork。它的设计目标是 **Preserve Context（保留语境）**：让知识库记录的不只是“今天这个概念叫什么”，也记录“当时的自己是如何称呼它的”。

建议用于 GitHub About 的介绍：

```text
Preserve Obsidian wikilink surface text, aliases, and title metadata as note names evolve.
```

## 核心理念

Obsidian 的内部链接里有三层信息：

- **Canonical Name（规范名称）**：当前文件名，可以随着理解演化而重命名。
- **Aliases（历史称呼）**：旧标题、同义词、曾用表达，保存在目标笔记 frontmatter。
- **Surface Form（语境表达）**：正文里作者当时实际写下的词，保存在 wikilink 的显示文本中。

Preserve Context 的默认策略是：文件名可以变，正文中的语境表达不应被自动覆盖。

例如：

```md
[[国际象棋：Knight|马]]
```

这里 `国际象棋：Knight` 是当前规范名称，`马` 是当时写作语境中的表达。即使未来继续重命名文件，正文里的 `马` 仍会被保留。

## 主要功能

### 1. 创建新笔记时自动冻结链接

当你输入一个指向不存在笔记的 wikilink 时，插件会创建目标笔记，并把链接写成带显示文本的形式：

```md
[[新笔记]]
```

会变成：

```md
[[新笔记|新笔记]]
```

这样新笔记一创建，就已经保留了当前正文里看到的说法。

对于已经存在的笔记，是否在 Obsidian 补全后冻结普通链接，由 `冻结补全后的链接` 开关控制。这个开关默认关闭：

```md
[[已有笔记]]
```

开启该开关后，补全会写成：

```md
[[已有笔记|已有笔记]]
```

如果你输入了搜索词，并用 <kbd>Enter</kbd> 确认某个已有补全候选，输入词会被当作显示文本保留下来：

```md
[[国际象棋：骑士|马]]
```

鼠标点击或补全按钮只表示选择目标笔记，不会把正在输入的搜索词当作 alias。若最终目标本来就等于显示文本，例如创建 `[[新笔记|新笔记]]`，插件也不会写入重复 alias。

### 2. 只有明确写出显示文本时才写 aliases

如果你手动输入了 `|` 和显示文本，插件会把它理解为你有意提供的 alias：

```md
[[新笔记|别名]]
```

目标笔记不存在时会被创建，并写入：

```yaml
aliases:
  - 别名
```

只有 `[[新笔记]]` 而没有 `|` 时，不会因为创建笔记就自动写 alias。

补全产生的链接只有在显示文本明确不同于目标笔记时才会写 aliases。这样纯新建笔记时，不会把笔记自己的标题污染进 `aliases`。

### 3. 选中文字建立链接并写入 aliases

保留原插件的核心能力：选中正文中的词，再执行 `Create context link with alias`，会生成带显示文本的链接，并把显示文本写入目标笔记的 `aliases`。

例如选中：

```md
马
```

选择目标 `国际象棋：骑士` 后得到：

```md
[[国际象棋：骑士|马]]
```

目标笔记会自动补充：

```yaml
aliases:
  - 马
```

aliases 会自动去重；与文件名同名的 alias 会被跳过；已有 frontmatter 会尽量保留。

### 4. 文件重命名时保留旧标题并同步 title

当文件从 `国际象棋：骑士` 重命名为 `国际象棋：Knight` 时，插件会把旧标题加入该文件的 aliases：

```yaml
aliases:
  - 国际象棋：骑士
```

同时，插件会把该笔记 frontmatter 中的 `title` 同步为新文件名：

```yaml
title: 国际象棋：Knight
```

正文中已有的冻结链接只更新目标，不改变显示文本：

```md
[[国际象棋：骑士|马]]
```

会变成：

```md
[[国际象棋：Knight|马]]
```

对于普通链接，插件默认把旧标题冻结为显示文本：

```md
[[国际象棋：骑士]]
```

重命名后变成：

```md
[[国际象棋：Knight|国际象棋：骑士]]
```

### 5. 尊重用户手动修改

用户优先于自动化。如果插件自动生成了显示文本，而你之后手动改回普通链接：

```md
[[新标题|旧标题]]
```

改为：

```md
[[新标题]]
```

插件会记录这次选择，并在后续重命名时尽量不再把同一处链接自动冻结回来。

### 6. 历史迁移工具

新增命令：

```text
Freeze Existing Links in Vault
```

它会扫描整个 Vault，把已有普通 wikilink：

```md
[[目标]]
```

迁移为：

```md
[[目标|目标]]
```

这个命令默认不会自动执行，适合你确认迁移策略后手动运行。建议在运行前备份 Vault 或使用 Git 提交当前状态。

### 7. 中英文插件界面

插件默认使用英文。你可以在设置中选择 `English` 或 `中文`，用于切换：

- 设置项名称与说明
- 命令面板中的命令名
- 插件通知

两种语言会同时保留在设置里，方便随时切换。

## 不介入的场景

Preserve Context 只在用户明确表达语境的时机介入。以下场景保持原生或外部系统行为：

- 粘贴已有链接
- 保存文件
- 外部脚本写入
- Canvas
- Dataview
- Bases
- embed 链接，例如 `![[图片]]`
- 代码块与行内代码中的链接

## 命令

- `Create context link with alias`：创建链接，并把显示文本写入目标笔记 aliases。
- `Create link`：创建链接但不主动写 aliases。
- `Toggle link display text`：为当前链接添加或移除显示文本。
- `Freeze Existing Links in Vault`：手动迁移旧知识库中的普通链接。

## 通过 BRAT 安装

这个 fork 目前适合通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 作为 beta 插件安装。

1. 先在 Obsidian 中安装并启用 BRAT。
2. 打开命令面板，执行 `BRAT: Add a beta plugin for testing`。
3. 输入本仓库地址：

```text
https://github.com/Jialedove/obsidian-context-links
```

4. 让 BRAT 从 GitHub Release 安装最新版本。
5. 安装完成后，在 Obsidian 的 Community plugins 中启用 `Obsidian Context Links`。

本仓库的 Release 会提供 BRAT/Obsidian 需要的 `main.js`、`manifest.json` 和插件 zip。建议优先使用最新 Release，而不是手动复制源码目录。

## 设置

- `Language`：选择设置、命令和通知使用英文或中文。
- `Freeze completed links`：对已有笔记，开启后把补全结果从 `[[目标]]` 写成 `[[目标|目标]]`；当补全由 <kbd>Enter</kbd> 确认时，输入的搜索词可以成为显示文本；关闭后保持 Obsidian 原生的 `[[目标]]`。
- `Freeze plain links after rename`：A 改名为 B 时，开启后把 `[[A]]` 写成 `[[B|A]]`；关闭后保持 Obsidian 原生的 `[[B]]`。
- `Add old title as alias`：A 改名为 B 时，开启后把 A 写入 B 的 `aliases`；关闭后不修改 aliases。
- `Respect manual unfrozen links`：当你把 `[[目标|显示文本]]` 改回 `[[目标]]` 时，开启后会记住这次选择，后续重命名不再自动加回。

## 开发

```bash
npm ci
npm test
npm run build
```

开发模式：

```bash
npm run dev
```

构建产物 `main.js` 不提交到仓库，发布时由构建流程生成。

## 迁移风险说明

`Freeze Existing Links in Vault` 会批量修改 Markdown 文件。它会跳过已有显示文本、embed、代码块和行内代码，但仍建议先备份 Vault 或使用 Git 记录迁移前状态。

重命名监听会写入目标笔记 frontmatter，并可能更新引用该标题的 Markdown 文件。插件只记录事实：旧标题和用户实际写下的词；不会推断哪个 alias 应该被删除。
