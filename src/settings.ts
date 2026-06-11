import { App, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import { default as FrontmatterLinksPlugin, default as LinkWithAliasPlugin } from "./main";

export interface LinksSettings {
	copyDisplayText: boolean;
	capitalizeFileName: boolean;
	preserveContext: boolean;
	freezeCompletionLinks: boolean;
	freezeRenamedPlainLinks: boolean;
	addOldTitleAliasOnRename: boolean;
	enableUserOverrideRegistry: boolean;
}

export const DEFAULT_SETTINGS: LinksSettings = {
	copyDisplayText: true,
	capitalizeFileName: true,
	preserveContext: true,
	freezeCompletionLinks: true,
	freezeRenamedPlainLinks: true,
	addOldTitleAliasOnRename: true,
	enableUserOverrideRegistry: true,
};

export class LinksSettingTab extends PluginSettingTab {
	private plugin: LinkWithAliasPlugin;

	constructor(app: App, plugin: FrontmatterLinksPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Copy selected text as link file")
			.setDesc("When selected then creates link `[[text|text]]`, otherwise `[[|text]]`.")
			.addToggle((component: ToggleComponent) => {
				component.setValue(this.plugin.settings.copyDisplayText);
				component.onChange((value: boolean) => {
					this.plugin.settings.copyDisplayText = value;
					this.plugin.saveSettings();
				});
			});
		new Setting(this.containerEl)
			.setName("Capitalize link file name")
			.setDesc("When selected then `text` creates link `[[Text|text]]`, otherwise `[[text|text]]`.")
			.setDisabled(!this.plugin.settings.copyDisplayText)
			.addToggle((component: ToggleComponent) => {
				component.setValue(this.plugin.settings.capitalizeFileName);
				component.onChange((value: boolean) => {
					this.plugin.settings.capitalizeFileName = value;
					this.plugin.saveSettings();
				});
			});
		new Setting(this.containerEl)
			.setName("Preserve Context")
			.setDesc("Freeze surface text in wikilinks so note names can evolve without losing the original context.")
			.addToggle((component: ToggleComponent) => {
				component.setValue(this.plugin.settings.preserveContext);
				component.onChange((value: boolean) => {
					this.plugin.settings.preserveContext = value;
					this.plugin.saveSettings();
					this.display();
				});
			});
		new Setting(this.containerEl)
			.setName("Freeze completed links")
			.setDesc("After Obsidian link completion, convert plain links like [[Target]] into [[Target|Target]] or [[Target|typed text]].")
			.setDisabled(!this.plugin.settings.preserveContext)
			.addToggle((component: ToggleComponent) => {
				component.setValue(this.plugin.settings.freezeCompletionLinks);
				component.onChange((value: boolean) => {
					this.plugin.settings.freezeCompletionLinks = value;
					this.plugin.saveSettings();
				});
			});
		new Setting(this.containerEl)
			.setName("Freeze plain links after rename")
			.setDesc("When a note is renamed, convert plain links to keep the old title as display text.")
			.setDisabled(!this.plugin.settings.preserveContext)
			.addToggle((component: ToggleComponent) => {
				component.setValue(this.plugin.settings.freezeRenamedPlainLinks);
				component.onChange((value: boolean) => {
					this.plugin.settings.freezeRenamedPlainLinks = value;
					this.plugin.saveSettings();
				});
			});
		new Setting(this.containerEl)
			.setName("Add old title as alias")
			.setDesc("When a note is renamed, add the previous title to its aliases frontmatter.")
			.setDisabled(!this.plugin.settings.preserveContext)
			.addToggle((component: ToggleComponent) => {
				component.setValue(this.plugin.settings.addOldTitleAliasOnRename);
				component.onChange((value: boolean) => {
					this.plugin.settings.addOldTitleAliasOnRename = value;
					this.plugin.saveSettings();
				});
			});
		new Setting(this.containerEl)
			.setName("Respect manual unfrozen links")
			.setDesc("Remember when a user removes generated display text and do not add it back on later renames.")
			.setDisabled(!this.plugin.settings.preserveContext)
			.addToggle((component: ToggleComponent) => {
				component.setValue(this.plugin.settings.enableUserOverrideRegistry);
				component.onChange((value: boolean) => {
					this.plugin.settings.enableUserOverrideRegistry = value;
					this.plugin.saveSettings();
				});
			});
	}

	hide() {
		this.containerEl.empty();
	}
}
