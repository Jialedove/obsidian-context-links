import {
	freezeExistingLinksInMarkdown,
	freezePlainLink,
	recordManualPlainLinkOverrides,
	rewriteLinksAfterRename,
} from "../src/PreserveContext";

describe("PreserveContext", () => {
	it("freezes a plain wikilink with the target as surface text", () => {
		expect(freezePlainLink("[[Target note]]")).toEqual("[[Target note|Target note]]");
	});

	it("freezes a completion result with the user query as surface text", () => {
		expect(freezePlainLink("[[International chess: Knight]]", "马")).toEqual("[[International chess: Knight|马]]");
	});

	it("does not freeze embeds or links that already have display text", () => {
		expect(freezePlainLink("![[Image]]")).toBeUndefined();
		expect(freezePlainLink("[[Target|display]]")).toBeUndefined();
	});

	it("freezes existing plain links while skipping code and embeds", () => {
		const input = [
			"正文 [[Target]] 和 ![[Embed]]",
			"`[[Inline]]`",
			"```",
			"[[Code block]]",
			"```",
			"已有 [[Target|display]]",
		].join("\n");

		expect(freezeExistingLinksInMarkdown(input)).toEqual({
			changed: true,
			count: 1,
			text: [
				"正文 [[Target|Target]] 和 ![[Embed]]",
				"`[[Inline]]`",
				"```",
				"[[Code block]]",
				"```",
				"已有 [[Target|display]]",
			].join("\n"),
		});
	});

	it("rewrites renamed links without changing frozen display text", () => {
		const input = "[[Old title|display]] and [[Old title]]";

		expect(
			rewriteLinksAfterRename(input, {
				oldLinkText: "Old title",
				newLinkText: "New title",
				freezePlainLinks: true,
				overrides: [],
				sourcePath: "Source.md",
				targetPath: "New title.md",
			}),
		).toEqual({
			changed: true,
			count: 2,
			text: "[[New title|display]] and [[New title|Old title]]",
			autoFrozen: [
				{
					sourcePath: "Source.md",
					targetPath: "New title.md",
					surfaceText: "Old title",
				},
			],
		});
	});

	it("respects manual plain-link overrides on rename", () => {
		const input = "[[Old title]]";

		expect(
			rewriteLinksAfterRename(input, {
				oldLinkText: "Old title",
				newLinkText: "New title",
				freezePlainLinks: true,
				overrides: [
					{
						sourcePath: "Source.md",
						targetPath: "New title.md",
						surfaceText: "Old title",
					},
				],
				sourcePath: "Source.md",
				targetPath: "New title.md",
			}).text,
		).toEqual("[[New title]]");
	});

	it("records when a user removes a generated display text", () => {
		expect(
			recordManualPlainLinkOverrides({
				before: "[[Target|Surface]]",
				after: "[[Target]]",
				sourcePath: "Source.md",
				targetPath: "Target.md",
				generated: [
					{
						sourcePath: "Source.md",
						targetPath: "Target.md",
						surfaceText: "Surface",
					},
				],
				existing: [],
			}),
		).toEqual([
			{
				sourcePath: "Source.md",
				targetPath: "Target.md",
				surfaceText: "Surface",
			},
		]);
	});
});
