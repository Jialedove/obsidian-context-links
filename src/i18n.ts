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
		"notice.aliasAdded": "Obsidian Context Links: added alias \"{alias}\".",
		"notice.freezeExistingLinksInVault": "Obsidian Context Links: froze {changedLinks} link(s) in {changedFiles} file(s).",
		"notice.renameComplete": "Obsidian Context Links: recorded \"{oldTitle}\" and updated {changedLinks} link(s) in {changedFiles} file(s).",
		"setting.language.name": "Language",
		"setting.language.desc": "Choose the language used by plugin settings, commands, and notices.",
		"setting.freezeCompletionLinks.name": "Freeze completed links",
		"setting.freezeCompletionLinks.desc": "A plain link has no display text, such as [[Target]]. This option changes what happens after Obsidian link completion. Typed search text is only used as display text after Enter-confirmed completion.",
		"setting.freezeCompletionLinks.exampleOn": "On: completing [[Target]] writes [[Target|Target]], or [[Target|typed text]] when Enter confirms a typed search.",
		"setting.freezeCompletionLinks.exampleOff": "Off: completion keeps Obsidian's native [[Target]].",
		"setting.freezeRenamedPlainLinks.name": "Freeze plain links after rename",
		"setting.freezeRenamedPlainLinks.desc": "Freezing means keeping the visible wording after a note name changes.",
		"setting.freezeRenamedPlainLinks.exampleOn": "On: after A is renamed to B, [[A]] becomes [[B|A]].",
		"setting.freezeRenamedPlainLinks.exampleOff": "Off: after A is renamed to B, [[A]] follows Obsidian's native update and becomes [[B]].",
		"setting.addOldTitleAliasOnRename.name": "Add old title as alias",
		"setting.addOldTitleAliasOnRename.desc": "An alias is a searchable alternate name in frontmatter aliases. Aliases matching the file name are skipped.",
		"setting.addOldTitleAliasOnRename.exampleOn": "On: after A is renamed to B, add A to B's aliases.",
		"setting.addOldTitleAliasOnRename.exampleOff": "Off: after A is renamed to B, B's aliases are not changed.",
		"setting.enableUserOverrideRegistry.name": "Respect manual unfrozen links",
		"setting.enableUserOverrideRegistry.desc": "Manual unfreezing means changing [[Target|Text]] back to [[Target]].",
		"setting.enableUserOverrideRegistry.exampleOn": "On: if you remove the display text once, later renames will not add it back.",
		"setting.enableUserOverrideRegistry.exampleOff": "Off: later rename handling may freeze that plain link again.",
	},
	zh: {
		"command.createLinkWithAlias": "创建带别名的语境链接",
		"command.createLink": "创建链接",
		"command.toggleLinkDisplayText": "切换链接显示文本",
		"command.freezeExistingLinksInVault": "冻结库中已有链接",
		"notice.aliasAdded": "Obsidian Context Links：已写入 alias「{alias}」。",
		"notice.freezeExistingLinksInVault": "Obsidian Context Links：已在 {changedFiles} 个文件中冻结 {changedLinks} 个链接。",
		"notice.renameComplete": "Obsidian Context Links：已记录「{oldTitle}」，并在 {changedFiles} 个文件中更新 {changedLinks} 个链接。",
		"setting.language.name": "语言",
		"setting.language.desc": "选择插件设置、命令和通知使用的语言。",
		"setting.freezeCompletionLinks.name": "冻结补全后的链接",
		"setting.freezeCompletionLinks.desc": "普通链接指没有显示文本的 [[目标]]。这个选项控制 Obsidian 链接补全后的处理方式。只有按 Enter 确认补全时，输入的搜索词才会作为显示文本。",
		"setting.freezeCompletionLinks.exampleOn": "开启：补全 [[目标]] 后写成 [[目标|目标]]；按 Enter 确认输入词时写成 [[目标|输入文本]]。",
		"setting.freezeCompletionLinks.exampleOff": "关闭：补全后保持 Obsidian 原生的 [[目标]]。",
		"setting.freezeRenamedPlainLinks.name": "重命名后冻结普通链接",
		"setting.freezeRenamedPlainLinks.desc": "冻结指保留链接在正文里显示的旧说法，让文件名变化时读者看到的文字不变。",
		"setting.freezeRenamedPlainLinks.exampleOn": "开启：A 改名为 B 后，[[A]] 变成 [[B|A]]。",
		"setting.freezeRenamedPlainLinks.exampleOff": "关闭：A 改名为 B 后，[[A]] 按 Obsidian 原生逻辑变成 [[B]]。",
		"setting.addOldTitleAliasOnRename.name": "将旧标题写入 alias",
		"setting.addOldTitleAliasOnRename.desc": "alias 是 frontmatter 里的可搜索别名；如果 alias 与文件名同名，会跳过不写入。",
		"setting.addOldTitleAliasOnRename.exampleOn": "开启：A 改名为 B 后，将 A 写入 B 的 aliases。",
		"setting.addOldTitleAliasOnRename.exampleOff": "关闭：A 改名为 B 后，不修改 B 的 aliases。",
		"setting.enableUserOverrideRegistry.name": "尊重手动取消冻结的链接",
		"setting.enableUserOverrideRegistry.desc": "手动取消冻结指把 [[目标|显示文本]] 改回 [[目标]]。",
		"setting.enableUserOverrideRegistry.exampleOn": "开启：你主动删除显示文本后，后续重命名不会再自动加回。",
		"setting.enableUserOverrideRegistry.exampleOff": "关闭：后续重命名处理可能再次冻结这个普通链接。",
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
