export type Language = "en" | "zh";

export const LANGUAGE_OPTIONS: Record<Language, string> = {
	en: "English",
	zh: "中文",
};

export const I18N = {
	en: {
		"command.createLinkWithAlias": "Create context link with alias",
		"command.createLink": "Create link",
		"command.toggleLinkDisplayText": "Toggle link display text",
		"command.freezeExistingLinksInVault": "Freeze Existing Links in Vault",
		"notice.preserveContextDisabled": "Preserve Context is disabled.",
		"notice.freezeExistingLinksInVault": "Obsidian Context Links: froze {changedLinks} link(s) in {changedFiles} file(s).",
		"notice.renameComplete": "Obsidian Context Links: recorded \"{oldTitle}\" and updated {changedLinks} link(s) in {changedFiles} file(s).",
		"setting.language.name": "Language",
		"setting.language.desc": "Choose the language used by plugin settings, commands, and notices.",
		"setting.copyDisplayText.name": "Copy selected text as link file",
		"setting.copyDisplayText.desc": "When selected then creates link `[[text|text]]`, otherwise `[[|text]]`.",
		"setting.capitalizeFileName.name": "Capitalize link file name",
		"setting.capitalizeFileName.desc": "When selected then `text` creates link `[[Text|text]]`, otherwise `[[text|text]]`.",
		"setting.preserveContext.name": "Preserve Context",
		"setting.preserveContext.desc": "Freeze surface text in wikilinks so note names can evolve without losing the original context.",
		"setting.freezeCompletionLinks.name": "Freeze completed links",
		"setting.freezeCompletionLinks.desc": "After Obsidian link completion, convert plain links like [[Target]] into [[Target|Target]] or [[Target|typed text]].",
		"setting.freezeRenamedPlainLinks.name": "Freeze plain links after rename",
		"setting.freezeRenamedPlainLinks.desc": "When a note is renamed, convert plain links to keep the old title as display text.",
		"setting.addOldTitleAliasOnRename.name": "Add old title as alias",
		"setting.addOldTitleAliasOnRename.desc": "When a note is renamed, add the previous title to its aliases frontmatter.",
		"setting.enableUserOverrideRegistry.name": "Respect manual unfrozen links",
		"setting.enableUserOverrideRegistry.desc": "Remember when a user removes generated display text and do not add it back on later renames.",
	},
	zh: {
		"command.createLinkWithAlias": "创建带别名的语境链接",
		"command.createLink": "创建链接",
		"command.toggleLinkDisplayText": "切换链接显示文本",
		"command.freezeExistingLinksInVault": "冻结库中已有链接",
		"notice.preserveContextDisabled": "Preserve Context 已关闭。",
		"notice.freezeExistingLinksInVault": "Obsidian Context Links：已在 {changedFiles} 个文件中冻结 {changedLinks} 个链接。",
		"notice.renameComplete": "Obsidian Context Links：已记录「{oldTitle}」，并在 {changedFiles} 个文件中更新 {changedLinks} 个链接。",
		"setting.language.name": "语言",
		"setting.language.desc": "选择插件设置、命令和通知使用的语言。",
		"setting.copyDisplayText.name": "将选中文本作为链接文件名",
		"setting.copyDisplayText.desc": "开启后创建 `[[文本|文本]]`，关闭后创建 `[[|文本]]`。",
		"setting.capitalizeFileName.name": "链接文件名首字母大写",
		"setting.capitalizeFileName.desc": "开启后 `text` 会创建 `[[Text|text]]`，关闭后创建 `[[text|text]]`。",
		"setting.preserveContext.name": "保留语境",
		"setting.preserveContext.desc": "冻结 wikilink 的表层文本，让笔记名演化时不丢失原始语境。",
		"setting.freezeCompletionLinks.name": "冻结补全后的链接",
		"setting.freezeCompletionLinks.desc": "Obsidian 链接补全后，将 [[Target]] 这类普通链接转换为 [[Target|Target]] 或 [[Target|输入文本]]。",
		"setting.freezeRenamedPlainLinks.name": "重命名后冻结普通链接",
		"setting.freezeRenamedPlainLinks.desc": "笔记重命名时，将普通链接转换为带旧标题显示文本的链接。",
		"setting.addOldTitleAliasOnRename.name": "将旧标题写入 alias",
		"setting.addOldTitleAliasOnRename.desc": "笔记重命名时，将旧标题加入目标笔记的 aliases frontmatter。",
		"setting.enableUserOverrideRegistry.name": "尊重手动取消冻结的链接",
		"setting.enableUserOverrideRegistry.desc": "记住用户移除自动生成显示文本的选择，后续重命名时不再自动加回。",
	},
} as const;

export type TranslationKey = keyof typeof I18N.en;

export function t(language: Language, key: TranslationKey, replacements: Record<string, string | number> = {}): string {
	let text: string = I18N[language][key];
	Object.entries(replacements).forEach(([name, value]) => {
		text = text.replace(`{${name}}`, String(value));
	});
	return text;
}
