import { addMissingAliasesIntoFile, syncTitleIntoFile } from "../src/InjectAlias";

describe("title metadata", () => {
	it("syncs frontmatter title to the renamed file basename", async () => {
		const frontmatter: Record<string, unknown> = { title: "Old title", aliases: ["Old title"] };
		const fileManager = {
			processFrontMatter: jest.fn(async (_file, callback) => {
				callback(frontmatter);
			}),
		};
		const file = { basename: "New title" };

		await syncTitleIntoFile(fileManager as never, file as never);

		expect(frontmatter).toEqual({ title: "New title", aliases: ["Old title"] });
		expect(fileManager.processFrontMatter).toHaveBeenCalledTimes(1);
	});

	it("keeps old title aliases while syncing the title", async () => {
		const frontmatter: Record<string, unknown> = { title: "Old title" };
		const fileManager = {
			processFrontMatter: jest.fn(async (_file, callback) => {
				callback(frontmatter);
			}),
		};
		const file = { basename: "New title" };

		await addMissingAliasesIntoFile(fileManager as never, file as never, ["Old title"]);
		await syncTitleIntoFile(fileManager as never, file as never);

		expect(frontmatter).toEqual({ title: "New title", aliases: ["Old title"] });
	});

	it("does not add an alias that matches the file basename", async () => {
		const frontmatter: Record<string, unknown> = {};
		const fileManager = {
			processFrontMatter: jest.fn(async (_file, callback) => {
				callback(frontmatter);
			}),
		};
		const file = { basename: "Target" };

		await addMissingAliasesIntoFile(fileManager as never, file as never, ["Target", "Display text"]);

		expect(frontmatter).toEqual({ aliases: ["Display text"] });
	});

	it("removes existing aliases that match the file basename", async () => {
		const frontmatter: Record<string, unknown> = { aliases: ["Target", "Display text"] };
		const fileManager = {
			processFrontMatter: jest.fn(async (_file, callback) => {
				callback(frontmatter);
			}),
		};
		const file = { basename: "target" };

		await addMissingAliasesIntoFile(fileManager as never, file as never, []);

		expect(frontmatter).toEqual({ aliases: ["Display text"] });
	});

	it("does not add aliases containing Obsidian's Chinese untitled text", async () => {
		const frontmatter: Record<string, unknown> = { aliases: ["Manual alias"] };
		const fileManager = {
			processFrontMatter: jest.fn(async (_file, callback) => {
				callback(frontmatter);
			}),
		};
		const file = { basename: "Real title" };

		await addMissingAliasesIntoFile(fileManager as never, file as never, ["未命名 22", "测试未命名草稿", "Useful alias"]);

		expect(frontmatter).toEqual({ aliases: ["Manual alias", "Useful alias"] });
	});

	it("removes existing aliases containing Obsidian's Chinese untitled text", async () => {
		const frontmatter: Record<string, unknown> = { aliases: ["未命名 5", "测试未命名草稿", "Manual alias"] };
		const fileManager = {
			processFrontMatter: jest.fn(async (_file, callback) => {
				callback(frontmatter);
			}),
		};
		const file = { basename: "Real title" };

		await addMissingAliasesIntoFile(fileManager as never, file as never, []);

		expect(frontmatter).toEqual({ aliases: ["Manual alias"] });
	});
});
