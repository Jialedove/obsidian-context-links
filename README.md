# Obsidian Context Links

[English](README.md) | [中文](README.zh-CN.md)

Obsidian Context Links is a fork of the Obsidian community plugin `Link with Alias`. Its direction is **Preserve Context**: a vault should remember not only what a concept is called today, but also how it was named in the writing context where it first appeared.

Suggested GitHub About text:

```text
Preserve Obsidian wikilink surface text, aliases, and title metadata as note names evolve.
```

## Core Idea

Obsidian internal links can carry three layers of meaning:

- **Canonical Name**: the current file name, which can evolve as your understanding changes.
- **Aliases**: old titles, synonyms, and previous expressions stored in target-note frontmatter.
- **Surface Form**: the exact wording used in the source note, stored as the wikilink display text.

Preserve Context keeps the surface form stable by default. File names may change, but the words you wrote in context should not be silently overwritten.

For example:

```md
[[International Chess: Knight|horse]]
```

`International Chess: Knight` is the current canonical name, while `horse` is the surface form used in that context. If the file is renamed later, the displayed word stays intact.

## Features

### 1. New-note links are frozen on creation

When you type a wikilink to a note that does not exist yet, the plugin creates the target note and writes the link with display text:

```md
[[New note]]
```

becomes:

```md
[[New note|New note]]
```

This keeps the newly created note name as the visible wording from the beginning.

For existing notes, the setting `Freeze completed links` controls whether Obsidian completion should also freeze plain links. It is off by default:

```md
[[Existing note]]
```

When the setting is enabled, completion writes:

```md
[[Existing note|Existing note]]
```

If you typed a search phrase and confirm an existing completion candidate with <kbd>Enter</kbd>, the typed phrase is treated as the display text:

```md
[[International Chess: Knight|horse]]
```

Mouse or button-based completion only selects the target note. It does not treat the typed search phrase as an alias. If the completed target already matches the visible text, such as creating `[[New note|New note]]`, the plugin does not write a redundant alias.

### 2. Write aliases only from explicit display text

If you manually type a display text with `|`, the plugin treats it as an intentional alias:

```md
[[New note|nickname]]
```

The target note is created if needed, and its frontmatter receives:

```yaml
aliases:
  - nickname
```

Plain links without `|` do not write aliases just because they were created.

Completed links only write aliases when the display text is clearly different from the target note. This keeps pure new-note creation from polluting `aliases` with the note's own title.

### 3. Create links from selected text

The original plugin behavior is preserved: select text, run `Create context link with alias`, and the plugin creates a display-text link while writing the display text into the target note's `aliases`.

Selecting:

```md
horse
```

and linking it to `International Chess: Knight` creates:

```md
[[International Chess: Knight|horse]]
```

The target note receives:

```yaml
aliases:
  - horse
```

Aliases are deduplicated, aliases identical to the file name are skipped, and existing frontmatter is preserved as much as possible.

### 4. Preserve old titles on rename

When a file is renamed from `International Chess: Knight` to `Chess: Knight`, the plugin adds the old title to the file's aliases:

```yaml
aliases:
  - International Chess: Knight
```

It also synchronizes the note's frontmatter title with the new filename:

```yaml
title: Chess: Knight
```

Existing frozen links update their target but keep display text:

```md
[[International Chess: Knight|horse]]
```

becomes:

```md
[[Chess: Knight|horse]]
```

Plain links are frozen by default with the old title as display text:

```md
[[International Chess: Knight]]
```

becomes:

```md
[[Chess: Knight|International Chess: Knight]]
```

### 5. Respect manual changes

User edits win over automation. If the plugin generated display text and you later remove it:

```md
[[New title|Old title]]
```

to:

```md
[[New title]]
```

the plugin records that choice and avoids re-freezing the same link on later renames.

### 6. Migrate existing vaults

The command:

```text
Freeze Existing Links in Vault
```

scans the vault and converts existing plain wikilinks:

```md
[[Target]]
```

to:

```md
[[Target|Target]]
```

This command never runs automatically. Back up your vault or commit your current state before running it.

### 7. Bilingual plugin UI

The plugin defaults to English. In settings, choose `English` or `中文` to localize:

- Settings labels and descriptions
- Command palette names
- Plugin notices

Both language options remain available in settings.

## Out of Scope

Preserve Context only intervenes when the user explicitly creates or evolves wikilink context. These cases remain native or external-system behavior:

- Pasted links
- File save
- External scripts
- Canvas
- Dataview
- Bases
- Embed links such as `![[Image]]`
- Links in code blocks or inline code

## Commands

- `Create context link with alias`: create a link and write the display text into target-note aliases.
- `Create link`: create a link without proactively writing aliases.
- `Toggle link display text`: add or remove display text for the current link.
- `Freeze Existing Links in Vault`: manually migrate existing plain links.

## Install with BRAT

This fork is currently intended for installation through [BRAT](https://github.com/TfTHacker/obsidian42-brat) as a beta plugin.

1. Install and enable BRAT in Obsidian.
2. Open the command palette and run `BRAT: Add a beta plugin for testing`.
3. Enter this repository URL:

```text
https://github.com/Jialedove/obsidian-context-links
```

4. Let BRAT install the latest version from GitHub Releases.
5. Enable `Obsidian Context Links` in Obsidian's Community plugins.

Releases should provide the `main.js`, `manifest.json`, and plugin zip required by BRAT/Obsidian. Prefer the latest Release over manually copying source files.

## Settings

- `Language`: choose English or Chinese for settings, commands, and notices.
- `Freeze completed links`: for existing notes, turn completion from `[[Target]]` into `[[Target|Target]]`; when completion is confirmed with <kbd>Enter</kbd>, a typed search phrase can become the display text. Off keeps Obsidian's native `[[Target]]`.
- `Freeze plain links after rename`: when `A` is renamed to `B`, on converts `[[A]]` into `[[B|A]]`; off keeps Obsidian's native `[[B]]`.
- `Add old title as alias`: when `A` is renamed to `B`, on writes `A` into `B`'s `aliases`; off leaves aliases unchanged.
- `Respect manual unfrozen links`: when you change `[[Target|Text]]` back to `[[Target]]`, on remembers that choice for later renames.

## Development

```bash
npm ci
npm test
npm run build
```

Development mode:

```bash
npm run dev
```

Build output `main.js` is not committed to the repository. It is generated during release.

## Migration Notes

`Freeze Existing Links in Vault` modifies Markdown files in bulk. It skips links that already have display text, embeds, code blocks, and inline code, but you should still back up the vault or commit first.

The rename listener writes target-note frontmatter and may update Markdown files that reference the old title. The plugin records facts: old titles and words the user actually wrote. It does not infer which alias should be deleted.
