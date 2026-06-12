jest.mock(
	"obsidian",
	() => ({
		Notice: jest.fn(),
		Plugin: class {},
		PluginSettingTab: class {},
		Setting: class {},
		TFile: class {},
	}),
	{ virtual: true },
);

import { Notice } from "obsidian";
import LinkWithAliasPlugin from "../src/main";

describe("completed link handling", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	function createFakeApp(targetExists: boolean) {
		return {
			workspace: {
				getActiveFile: jest.fn(() => ({ path: "Source.md" })),
			},
			metadataCache: {
				getFirstLinkpathDest: jest.fn(() => (targetExists ? { path: "New note.md" } : null)),
			},
			fileManager: {
				getNewFileParent: jest.fn(() => ({ path: "" })),
			},
			vault: {
				create: jest.fn(async (path: string) => ({
					path,
					basename: path.replace(/^\//, "").replace(/\.md$/, ""),
					stat: { ctime: Date.now() },
				})),
			},
		};
	}

	it("freezes and creates a missing target note even when completion freezing is off", async () => {
		const app = createFakeApp(false);
		const view = { dispatch: jest.fn() };
		const plugin = {
			settings: { freezeCompletionLinks: false, language: "en" },
			app,
			applyingEditorChange: false,
			ensureLinkTargetExists: (LinkWithAliasPlugin.prototype as never as { ensureLinkTargetExists: unknown }).ensureLinkTargetExists,
			recordGeneratedPreserveContextLink: jest.fn(),
			saveSettings: jest.fn(),
		};

		await LinkWithAliasPlugin.prototype.applyCompletedLinkFreeze.call(
			plugin as never,
			view as never,
			0,
			12,
			"[[New note|New note]]",
			12,
			20,
		);

		expect(view.dispatch).toHaveBeenCalledWith({
			changes: { from: 0, to: 12, insert: "[[New note|New note]]" },
			selection: { anchor: 12, head: 20 },
		});
		expect(app.vault.create).toHaveBeenCalledWith("/New note.md", "");
		expect(plugin.recordGeneratedPreserveContextLink).toHaveBeenCalledWith("Source.md", "New note", "New note");
	});

	it("does not freeze an existing target note when completion freezing is off", async () => {
		const app = createFakeApp(true);
		const view = { dispatch: jest.fn() };
		const plugin = {
			settings: { freezeCompletionLinks: false, language: "en" },
			app,
			applyingEditorChange: false,
			recordGeneratedPreserveContextLink: jest.fn(),
			saveSettings: jest.fn(),
		};

		await LinkWithAliasPlugin.prototype.applyCompletedLinkFreeze.call(
			plugin as never,
			view as never,
			0,
			12,
			"[[New note|New note]]",
			12,
			20,
		);

		expect(view.dispatch).not.toHaveBeenCalled();
		expect(app.vault.create).not.toHaveBeenCalled();
	});

	it("writes a manually provided display text as alias even when completion freezing is off", () => {
		const plugin = {
			settings: { freezeCompletionLinks: false, language: "en" },
			app: {
				workspace: {
					getActiveFile: jest.fn(() => ({ path: "Source.md" })),
				},
			},
			addMissingAliasForTarget: jest.fn(),
		};

		LinkWithAliasPlugin.prototype.addAliasForCompletedLink.call(plugin as never, "New note", "Alias");

		expect(plugin.addMissingAliasForTarget).toHaveBeenCalledWith("New note", "Alias", "Source.md");
		expect(Notice).toHaveBeenCalledWith("Obsidian Context Links: added alias \"Alias\".");
	});

	it("does not write Obsidian's default untitled text as an alias", () => {
		const plugin = {
			settings: { freezeCompletionLinks: false, language: "en" },
			app: {
				workspace: {
					getActiveFile: jest.fn(() => ({ path: "Source.md" })),
				},
			},
			addMissingAliasForTarget: jest.fn(),
		};

		LinkWithAliasPlugin.prototype.addAliasForCompletedLink.call(plugin as never, "Real note", "未命名");

		expect(plugin.addMissingAliasForTarget).not.toHaveBeenCalled();
		expect(Notice).not.toHaveBeenCalledWith("Obsidian Context Links: added alias \"未命名\".");
	});

	it("does not write an alias when the completed surface text is the target name", () => {
		const plugin = {
			settings: { freezeCompletionLinks: false, language: "en" },
			app: {
				workspace: {
					getActiveFile: jest.fn(() => ({ path: "Source.md" })),
				},
			},
			addMissingAliasForTarget: jest.fn(),
		};

		LinkWithAliasPlugin.prototype.addAliasForCompletedLink.call(plugin as never, "New note", "New note");

		expect(plugin.addMissingAliasForTarget).not.toHaveBeenCalled();
		expect(Notice).not.toHaveBeenCalledWith("Obsidian Context Links: added alias \"New note\".");
	});

	it("does not write an alias when the completed surface text is the target basename", () => {
		const plugin = {
			settings: { freezeCompletionLinks: false, language: "en" },
			app: {
				workspace: {
					getActiveFile: jest.fn(() => ({ path: "Source.md" })),
				},
			},
			addMissingAliasForTarget: jest.fn(),
		};

		LinkWithAliasPlugin.prototype.addAliasForCompletedLink.call(plugin as never, "Folder/New note", "New note");

		expect(plugin.addMissingAliasForTarget).not.toHaveBeenCalled();
		expect(Notice).not.toHaveBeenCalledWith("Obsidian Context Links: added alias \"New note\".");
	});

	it("does not write Obsidian's numbered default untitled text as an alias", () => {
		const plugin = {
			settings: { freezeCompletionLinks: false, language: "en" },
			app: {
				workspace: {
					getActiveFile: jest.fn(() => ({ path: "Source.md" })),
				},
			},
			addMissingAliasForTarget: jest.fn(),
		};

		LinkWithAliasPlugin.prototype.addAliasForCompletedLink.call(plugin as never, "Real note", "未命名 5");
		LinkWithAliasPlugin.prototype.addAliasForCompletedLink.call(plugin as never, "Real note", "Untitled 5");

		expect(plugin.addMissingAliasForTarget).not.toHaveBeenCalled();
		expect(Notice).not.toHaveBeenCalledWith("Obsidian Context Links: added alias \"未命名 5\".");
		expect(Notice).not.toHaveBeenCalledWith("Obsidian Context Links: added alias \"Untitled 5\".");
	});

	it("does not write any alias containing Obsidian's Chinese untitled text", () => {
		const plugin = {
			settings: { freezeCompletionLinks: false, language: "en" },
			app: {
				workspace: {
					getActiveFile: jest.fn(() => ({ path: "Source.md" })),
				},
			},
			addMissingAliasForTarget: jest.fn(),
		};

		LinkWithAliasPlugin.prototype.addAliasForCompletedLink.call(plugin as never, "Real note", "新建未命名草稿");

		expect(plugin.addMissingAliasForTarget).not.toHaveBeenCalled();
		expect(Notice).not.toHaveBeenCalledWith("Obsidian Context Links: added alias \"新建未命名草稿\".");
	});
});
