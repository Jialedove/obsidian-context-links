import { App, Editor, EditorPosition, MarkdownFileInfo, MarkdownView, Notice, Plugin, PluginManifest, ReferenceCache, TAbstractFile, TFile } from "obsidian";
import { EditorView, ViewUpdate } from "@codemirror/view";

import { EditorCursorListener } from "./EditorCursorListener";
import { addMissingAliasesIntoFile, shouldSkipAutomaticAlias, syncTitleIntoFile } from "./InjectAlias";
import { t } from "./i18n";
import { Unregister } from "./ListenerRegistry";
import { getReferenceCacheFromEditor, setLinkText } from "./MarkdownUtils";
import {
	appendUniqueOverrides,
	freezeExistingLinksInMarkdown,
	PreserveContextOverride,
	recordManualPlainLinkOverrides,
	rewriteLinksAfterRename,
} from "./PreserveContext";
import { createPreserveContextEditorExtension } from "./PreserveContextEditorExtension";
import { equalsPosition, isEditorPositionInPos, moveCursor, moveEditorPosition } from "./PositionUtils";
import { DEFAULT_SETTINGS, LinksSettings, LinksSettingTab } from "./settings";
import { getTemplaterPlugin } from "./TemplaterIntegration";
import { capitalize, isNewFile } from "./Utils";
import { getOrCreateFileOfLink } from "./VaultUtils";

interface CanvasNode {
	canvas: unknown;
}

function isCanvasNode(obj: unknown): obj is CanvasNode {
	if (typeof obj == "object" && obj != null && "canvas" in obj) {
		return true;
	}
	return false;
}

interface CanvasNodeContext {
	node: CanvasNode;
}

function isCanvasNodeContext(ctx: unknown): ctx is CanvasNodeContext {
	if (typeof ctx == "object" && ctx != null && "node" in ctx) {
		return isCanvasNode((ctx as CanvasNodeContext).node);
	}
	return false;
}

/**
 * Information about to be handled link
 */
class LinkInfo {
	/**  */
	private readonly unregister: Unregister[] = [];

	constructor(
		/** Editor position of the link start bracket `[` */
		public readonly linkStart: EditorPosition,
		/** The file which contains the link */
		public readonly file: TFile | undefined,
		/** The Editor which contains the link*/
		public readonly editor: Editor,
		/** At the end make alias */
		public readonly makeAlias: boolean,
		/** The latest version of link cache */
		public cacheLink: ReferenceCache,
		/** The string of link text from the last process check */
		public linkText?: string,
	) {}

	register(unregister: Unregister): this {
		this.unregister.push(unregister);
		return this;
	}

	destroy() {
		this.unregister.forEach((c) => c());
		this.unregister.length = 0;
	}
}

/**
 * Main plugin class
 */
export default class LinkWithAliasPlugin extends Plugin {
	editorCursorListener: EditorCursorListener;
	linkInfo?: LinkInfo;
	settings = DEFAULT_SETTINGS;
	preserveContextOverrides: PreserveContextOverride[] = [];
	private generatedPreserveContextLinks: PreserveContextOverride[] = [];
	private applyingEditorChange = false;
	private registeredCommandIds: string[] = [];

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.editorCursorListener = new EditorCursorListener(this);
	}

	async onload() {
		await this.loadSettings();

		this.registerCommands();
		this.registerEditorExtension(createPreserveContextEditorExtension(this));
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				this.handleFileRename(file, oldPath);
			}),
		);

		this.addSettingTab(new LinksSettingTab(this.app, this));
	}

	registerCommands(): void {
		this.registeredCommandIds.forEach((commandId) => this.removeCommand(commandId));
		this.registeredCommandIds = [];
		this.addCommand({
			id: "create-context-link-with-alias",
			name: t(this.settings.language, "command.createLinkWithAlias"),
			icon: "bracket-glyph",
			editorCallback: (editor: Editor, ctx) => {
				this.createLinkFromSelection(this.getFileFromContext(ctx), editor, editor.getCursor(), {
					makeAlias: true,
					pathFromText: this.settings.copyDisplayText,
				});
			},
		});
		this.registeredCommandIds.push("create-context-link-with-alias");
		this.addCommand({
			id: "create-link",
			name: t(this.settings.language, "command.createLink"),
			icon: "bracket-glyph",
			editorCallback: (editor: Editor, ctx) => {
				this.createLinkFromSelection(this.getFileFromContext(ctx), editor, editor.getCursor(), {
					makeAlias: false,
					pathFromText: this.settings.copyDisplayText,
				});
			},
		});
		this.registeredCommandIds.push("create-link");

		this.addCommand({
			id: "toggle-link-display-text",
			name: t(this.settings.language, "command.toggleLinkDisplayText"),
			icon: "link-2",
			editorCallback: (editor: Editor, ctx) => {
				this.toggleLinkTextFromSelection(this.getFileFromContext(ctx), editor, editor.getCursor());
			},
		});
		this.registeredCommandIds.push("toggle-link-display-text");
		this.addCommand({
			id: "freeze-existing-links-in-vault",
			name: t(this.settings.language, "command.freezeExistingLinksInVault"),
			icon: "snowflake",
			callback: () => {
				this.freezeExistingLinksInVault();
			},
		});
		this.registeredCommandIds.push("freeze-existing-links-in-vault");
	}

	refreshLanguage(): void {
		this.registerCommands();
	}

	async loadSettings() {
		const data = await this.loadData();
		const { preserveContext: _preserveContext, ...settingsData } = data || {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, settingsData);
		this.preserveContextOverrides = data?.preserveContextOverrides || [];
		this.generatedPreserveContextLinks = data?.generatedPreserveContextLinks || [];
	}

	async saveSettings(): Promise<void> {
		await this.saveData({
			...this.settings,
			preserveContextOverrides: this.preserveContextOverrides,
			generatedPreserveContextLinks: this.generatedPreserveContextLinks,
		});
	}

	isPreserveContextApplyingEditorChange(): boolean {
		return this.applyingEditorChange;
	}

	async applyCompletedLinkFreeze(view: EditorView, from: number, to: number, replacement: string, surfaceStart: number, surfaceEnd: number): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		const target = replacement.substring(2, replacement.indexOf("|"));
		const surfaceText = replacement.substring(replacement.indexOf("|") + 1, replacement.length - 2);
		const targetExists = file ? this.app.metadataCache.getFirstLinkpathDest(target, file.path) != null : true;
		if (!this.settings.freezeCompletionLinks && targetExists) {
			return;
		}
		this.applyingEditorChange = true;
		try {
			view.dispatch({
				changes: { from, to, insert: replacement },
				selection: { anchor: surfaceStart, head: surfaceEnd },
			});
		} finally {
			this.applyingEditorChange = false;
		}
		if (file) {
			await this.ensureLinkTargetExists(target, file.path);
			this.recordGeneratedPreserveContextLink(file.path, target, surfaceText);
			this.saveSettings();
		}
	}

	addAliasForCompletedLink(target: string, surfaceText: string): void {
		if (shouldSkipAutomaticAlias(surfaceText) || isAliasSameAsCompletedTarget(target, surfaceText)) {
			return;
		}
		const file = this.app.workspace.getActiveFile();
		this.addMissingAliasForTarget(target, surfaceText, file?.path);
		new Notice(t(this.settings.language, "notice.aliasAdded", { alias: surfaceText }));
	}

	trackManualUnfreeze(update: ViewUpdate): void {
		if (!this.settings.enableUserOverrideRegistry || this.generatedPreserveContextLinks.length === 0) {
			return;
		}
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			return;
		}
		const before = update.startState.doc.toString();
		const after = update.state.doc.toString();
		const next = recordManualPlainLinkOverrides({
			before,
			after,
			sourcePath: file.path,
			targetPath: "",
			generated: this.generatedPreserveContextLinks.filter((item) => item.sourcePath === file.path),
			existing: this.preserveContextOverrides,
		});
		if (next.length !== this.preserveContextOverrides.length) {
			this.preserveContextOverrides = next;
			this.saveSettings();
		}
	}

	private getFileFromContext(ctx: MarkdownView | MarkdownFileInfo): TFile | undefined {
		if (ctx.file) {
			return ctx.file;
		}
		if (isCanvasNodeContext(ctx)) {
			//TODO detect file of the canvas
		}
		return;
	}

	/**
	 * starts create link with alias process for current `editor` of `file` on `position`
	 * Only one link is processed, so only last call matters
	 * @param file
	 * @param editor
	 * @param position
	 */
	private createLinkFromSelection(
		file: TFile | undefined,
		editor: Editor,
		position: EditorPosition,
		options: { makeAlias: boolean; pathFromText: boolean },
	): void {
		/**
		 * returns ReferenceCache like structure which describes the link in `editor` on `pos` position or undefined if there is no link at `pos` position
		 */
		const cacheLink = getReferenceCacheFromEditor(editor, position);
		if (cacheLink != null && cacheLink.position.start.col !== position.ch) {
			//the cursor is inside the link, do not make nested link
			//but instead check that display text is used as alias
			if (options.makeAlias) {
				this.addMissingAlias(cacheLink, file?.path);
			}
			return;
		}
		const selected_word = editor.getSelection();
		let linkStart;
		let linkText;
		if (selected_word == "") {
			//nothing is selected, just create a new empty link
			editor.replaceSelection(`[[]]`);
			linkStart = moveEditorPosition(moveCursor(editor, -2), -2);
		} else if (selected_word.indexOf("|") >= 0) {
			const parts = selected_word.split("|");
			if (parts.length > 2) {
				return;
			}
			//selected text already contains a file name and display text
			editor.replaceSelection(`[[${selected_word}]]`);
			linkStart = moveEditorPosition(moveCursor(editor, -(parts[1].length + 3)), -(parts[0].length + 2));
			linkText = parts[1];
		} else {
			//text is selected
			if (options.pathFromText) {
				// use it as link target and also link display text
				editor.replaceSelection(`[[${this.capitalizeOptionally(selected_word)}|${selected_word}]]`);
				linkStart = moveEditorPosition(moveCursor(editor, -(selected_word.length + 3)), -(selected_word.length + 2));
				linkText = selected_word;
			} else {
				// use it as link target
				editor.replaceSelection(`[[|${selected_word}]]`);
				linkStart = moveEditorPosition(moveCursor(editor, -(selected_word.length + 3)), -2);
				linkText = selected_word;
			}
		}

		if (this.linkInfo) {
			//destroy old link handling request
			this.linkInfo.destroy();
			delete this.linkInfo;
		}
		const newCacheLink = getReferenceCacheFromEditor(editor, position);
		if (!newCacheLink) throw new Error("cannot find newly create link");
		//create new link handling request
		const lastLink = new LinkInfo(linkStart, file, editor, options.makeAlias, newCacheLink, linkText);

		lastLink.register(
			//listen on cursor move or deactivation of editor
			this.editorCursorListener.fireOnCursorChange(editor, (cursorPosition) => {
				if (!cursorPosition) {
					//user is editing another file now. Add missing alias from origin file
					if (lastLink.makeAlias) {
						this.addMissingAlias(lastLink.cacheLink, lastLink.file?.path);
					}
					return false;
				}
				return this.handleChangeOnLastLink(editor, lastLink);
			}),
		);

		this.linkInfo = lastLink;
	}

	capitalizeOptionally(name: string): string {
		if (this.settings.capitalizeFileName) {
			return capitalize(name);
		}
		return name;
	}

	toggleLinkTextFromSelection(file: TFile | undefined, editor: Editor, position: EditorPosition): void {
		const cacheLink = getReferenceCacheFromEditor(editor, position);
		if (cacheLink != null && cacheLink.position.start.col !== position.ch) {
			//the cursor is inside the link, toggle display text
			if (cacheLink.displayText == null) {
				//add display text separator to open drop down menu
				editor.setCursor({ line: cacheLink.position.end.line, ch: cacheLink.position.end.col - 2 });
				editor.replaceSelection("|");
			} else {
				// delete display text from this link and keep just plain link
				setLinkText(cacheLink, editor, undefined);
			}
			return;
		}
	}

	private async handleFileRename(file: TAbstractFile, oldPath: string): Promise<void> {
		if (!(file instanceof TFile) || file.extension !== "md") {
			return;
		}
		const oldTitle = getBasename(oldPath);
		const newTitle = file.basename;
		if (!oldTitle || oldTitle === newTitle) {
			return;
		}
		if (this.settings.addOldTitleAliasOnRename) {
			await addMissingAliasesIntoFile(this.app.fileManager, file, [oldTitle]);
		}
		await syncTitleIntoFile(this.app.fileManager, file);
		let changedFiles = 0;
		let changedLinks = 0;
		const newGenerated: PreserveContextOverride[] = [];
		for (const markdownFile of this.app.vault.getMarkdownFiles()) {
			const result = await this.app.vault.process(markdownFile, (data) => {
				const rewrite = rewriteLinksAfterRename(data, {
					oldLinkText: oldTitle,
					newLinkText: newTitle,
					freezePlainLinks: this.settings.freezeRenamedPlainLinks,
					overrides: this.settings.enableUserOverrideRegistry ? this.preserveContextOverrides : [],
					sourcePath: markdownFile.path,
					targetPath: file.path,
				});
				if (rewrite.changed) {
					changedFiles++;
					changedLinks += rewrite.count;
					newGenerated.push(...rewrite.autoFrozen);
				}
				return rewrite.text;
			});
			void result;
		}
		if (newGenerated.length > 0) {
			this.generatedPreserveContextLinks = appendUniqueOverrides(this.generatedPreserveContextLinks, newGenerated);
			await this.saveSettings();
		}
		if (changedLinks > 0 || this.settings.addOldTitleAliasOnRename) {
			new Notice(t(this.settings.language, "notice.renameComplete", { oldTitle, changedLinks, changedFiles }));
		}
	}

	private async freezeExistingLinksInVault(): Promise<void> {
		let changedFiles = 0;
		let changedLinks = 0;
		for (const file of this.app.vault.getMarkdownFiles()) {
			await this.app.vault.process(file, (data) => {
				const result = freezeExistingLinksInMarkdown(data);
				if (result.changed) {
					changedFiles++;
					changedLinks += result.count;
				}
				return result.text;
			});
		}
		new Notice(t(this.settings.language, "notice.freezeExistingLinksInVault", { changedLinks, changedFiles }));
	}

	/**
	 * Handles cache or editor cursor position change on the lastLink
	 * @param editor
	 * @param lastLink
	 * @returns false if we are finished with that link
	 */
	private handleChangeOnLastLink(editor: Editor, lastLink: LinkInfo): boolean {
		const cacheLink = getReferenceCacheFromEditor(editor, lastLink.linkStart);
		if (cacheLink && equalsPosition(lastLink.linkStart, cacheLink.position.start)) {
			//the link still exist and starts on the expected position, continue handling
			lastLink.cacheLink = cacheLink;
			//the cache link for just created link exists now
			if (isEditorPositionInPos(lastLink.editor.getCursor(), cacheLink.position)) {
				//User still edits the last link,
				//update the link text if it was changed by user
				lastLink.linkText = cacheLink.displayText;
				//wait until he is done and moves cursor out
				return true;
			}
			//user left the link so s/he is done
			if (lastLink.linkText) {
				//Reset the link text in case the obsidian autocompletion changed it
				setLinkText(cacheLink, editor, lastLink.linkText);
			} else if (this.settings.freezeCompletionLinks && cacheLink.displayText == null && cacheLink.link) {
				setLinkText(cacheLink, editor, cacheLink.link);
				lastLink.linkText = cacheLink.link;
				if (lastLink.file) {
					this.recordGeneratedPreserveContextLink(lastLink.file.path, cacheLink.link, cacheLink.link);
					this.saveSettings();
				}
			}
			if (lastLink.makeAlias) {
				//now we can create an alias
				this.addMissingAlias(cacheLink, lastLink.file?.path);
			}
			//continue handling here, because user can come back and add different alias for that last link
			return true;
		}
		//the link doesn't exist or start of the link was moved, do not handle it
		//unregister all handlers for this link, not just this one callback
		lastLink.destroy();
		//and do not call this callback anynmore
		return false;
	}

	/**
	 * creates target file and alias if something is not existing
	 * @param cacheLink
	 * @param sourcePath
	 * @returns
	 */
	private async addMissingAlias(cacheLink: ReferenceCache, sourcePath: string | undefined): Promise<void> {
		if (!cacheLink.original.includes("|") || !cacheLink.displayText) {
			//there is no special display text = no alias to add
			return;
		}
		//the link contains display text. Add it as alias
		const linkTargetPath = cacheLink.link;
		if (!linkTargetPath) {
			//there is no link target
			return;
		}
		await this.addMissingAliasForTarget(linkTargetPath, cacheLink.displayText, sourcePath);
	}

	private async addMissingAliasForTarget(linkTargetPath: string, surfaceText: string, sourcePath: string | undefined): Promise<void> {
		if (!surfaceText) {
			return;
		}
		const target = await this.ensureLinkTargetExists(linkTargetPath, sourcePath);
		await addMissingAliasesIntoFile(this.app.fileManager, target, [surfaceText]);
	}

	private async ensureLinkTargetExists(linkTargetPath: string, sourcePath: string | undefined): Promise<TFile> {
		const target = await getOrCreateFileOfLink(this.app, linkTargetPath, sourcePath);
		if (isNewFile(target)) {
			const templaterPlugin = getTemplaterPlugin(this.app);
			if (templaterPlugin) {
				await templaterPlugin.waitUntilDone();
			}
		}
		return target;
	}

	private recordGeneratedPreserveContextLink(sourcePath: string, target: string, surfaceText: string): void {
		this.generatedPreserveContextLinks = appendUniqueOverrides(this.generatedPreserveContextLinks, [
			{
				sourcePath,
				targetPath: `${target}.md`,
				surfaceText,
			},
		]);
	}
}

function isAliasSameAsCompletedTarget(target: string, surfaceText: string): boolean {
	const normalizedSurface = normalizeAliasComparisonText(surfaceText);
	if (!normalizedSurface) {
		return true;
	}
	return normalizedSurface === normalizeAliasComparisonText(target) || normalizedSurface === normalizeAliasComparisonText(getLinkTargetBasename(target));
}

function getLinkTargetBasename(target: string): string {
	const targetWithoutSubpath = target.split("#")[0].split("^")[0];
	const slash = targetWithoutSubpath.lastIndexOf("/");
	const basename = slash >= 0 ? targetWithoutSubpath.substring(slash + 1) : targetWithoutSubpath;
	return basename.replace(/\.md$/i, "");
}

function normalizeAliasComparisonText(text: string): string {
	return text.trim().toLocaleLowerCase();
}

function getBasename(path: string): string {
	const name = path.substring(path.lastIndexOf("/") + 1);
	return name.replace(/\.md$/i, "");
}
