import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
	getCompletedLinkAction,
	getConfirmedCompletionQuery,
	getQueryBeforeCursor,
	handleCompletedLinkAction,
	isCursorInsideActionLink,
	shouldHandleCompletedLinkAction,
} from "../src/PreserveContextEditorExtension";

describe("PreserveContextEditorExtension", () => {
	it("detects a completed plain link and selects the inserted display text", () => {
		const state = EditorState.create({
			doc: "[[Target]]",
			selection: { anchor: 10 },
		});

		expect(getCompletedLinkAction(state)).toEqual({
			type: "freeze",
			from: 0,
			to: 10,
			raw: "[[Target]]",
			replacement: "[[Target|Target]]",
			surfaceStart: 9,
			surfaceEnd: 15,
		});
	});

	it("keeps selected-text completion and requests an alias write", () => {
		const state = EditorState.create({
			doc: "[[Target|selected text]]",
			selection: { anchor: 24 },
		});

		expect(getCompletedLinkAction(state)).toEqual({
			type: "alias",
			from: 0,
			to: 24,
			target: "Target",
			surfaceText: "selected text",
		});
	});

	it("reads the typed alias query from the completion start state", () => {
		const state = EditorState.create({
			doc: "[[马",
			selection: { anchor: 3 },
		});

		expect(getQueryBeforeCursor(state)).toBe("马");
	});

	it("keeps an empty query so completing from bare brackets can be detected", () => {
		const state = EditorState.create({
			doc: "[[",
			selection: { anchor: 2 },
		});

		expect(getQueryBeforeCursor(state)).toBe("");
	});

	it("only exposes the completion query after an Enter-confirmed completion", () => {
		expect(getConfirmedCompletionQuery("typed text", undefined, "input.complete")).toBeUndefined();
		expect(getConfirmedCompletionQuery("typed text", "typed text", "input.complete")).toBe("typed text");
		expect(getConfirmedCompletionQuery("typed text", "typed text", undefined)).toBe("typed text");
		expect(getConfirmedCompletionQuery("typed text", "different", "input.complete")).toBeUndefined();
		expect(getConfirmedCompletionQuery("typed text", "typed text", "input.type")).toBeUndefined();
	});

	it("handles Obsidian link completion even without CodeMirror input.complete", () => {
		const before = EditorState.create({
			doc: "[[",
			selection: { anchor: 2 },
		});
		const after = EditorState.create({
			doc: "[[Target]]",
			selection: { anchor: 10 },
		});
		const query = getQueryBeforeCursor(before);
		const action = getCompletedLinkAction(after, query);

		expect(shouldHandleCompletedLinkAction(action, query, undefined)).toBe(true);
	});

	it("does not use a typed query as display text when completion was not confirmed with Enter", () => {
		const after = EditorState.create({
			doc: "[[Existing note]]",
			selection: { anchor: 17 },
		});
		const action = getCompletedLinkAction(after);

		expect(action).toEqual({
			type: "freeze",
			from: 0,
			to: 17,
			raw: "[[Existing note]]",
			replacement: "[[Existing note|Existing note]]",
			surfaceStart: 16,
			surfaceEnd: 29,
		});
	});

	it("uses a typed query as display text when completion was confirmed with Enter", () => {
		const after = EditorState.create({
			doc: "[[International chess: Knight]]",
			selection: { anchor: 29 },
		});
		const action = getCompletedLinkAction(after, "马");

		expect(action).toEqual({
			type: "freeze",
			from: 0,
			to: 31,
			raw: "[[International chess: Knight]]",
			replacement: "[[International chess: Knight|马]]",
			surfaceStart: 30,
			surfaceEnd: 31,
		});
	});

	it("does not freeze a wikilink that was closed by normal typing", () => {
		const before = EditorState.create({
			doc: "[[Target",
			selection: { anchor: 8 },
		});
		const after = EditorState.create({
			doc: "[[Target]]",
			selection: { anchor: 10 },
		});
		const query = getQueryBeforeCursor(before);
		const action = getCompletedLinkAction(after, query);

		expect(shouldHandleCompletedLinkAction(action, query, "input.type")).toBe(false);
	});

	it("waits while a manually typed display text is still being edited", () => {
		const before = EditorState.create({
			doc: "[[Target|Alias",
			selection: { anchor: 14 },
		});
		const after = EditorState.create({
			doc: "[[Target|Alias]]",
			selection: { anchor: 16 },
		});
		const query = getQueryBeforeCursor(before);
		const action = getCompletedLinkAction(after, query);

		expect(action).toEqual({
			type: "alias",
			target: "Target",
			surfaceText: "Alias",
			from: 0,
			to: 16,
		});
		expect(shouldHandleCompletedLinkAction(action, query, "input.type")).toBe(false);
	});

	it("handles a manually typed display text after the cursor leaves the wikilink", () => {
		const state = EditorState.create({
			doc: "[[Target|Alias]]",
			selection: { anchor: 16 },
		});
		const action = getCompletedLinkAction(state);

		expect(action).toEqual({
			type: "alias",
			target: "Target",
			surfaceText: "Alias",
			from: 0,
			to: 16,
		});
		expect(isCursorInsideActionLink(action, 17)).toBe(false);
		expect(shouldHandleCompletedLinkAction(action, undefined, undefined)).toBe(true);
	});

	it("schedules completed plain link freezing outside the editor update", () => {
		const scheduled: Array<() => void> = [];
		const plugin = {
			applyCompletedLinkFreeze: jest.fn(),
			addAliasForCompletedLink: jest.fn(),
		};
		const view = {
			state: {
				doc: {
					sliceString: jest.fn(() => "[[Target]]"),
				},
			},
		} as unknown as EditorView;

		handleCompletedLinkAction(
			plugin as never,
			view,
			{
				type: "freeze",
				from: 0,
				to: 10,
				raw: "[[Target]]",
				replacement: "[[Target|Target]]",
				surfaceStart: 9,
				surfaceEnd: 15,
			},
			(callback: () => void) => scheduled.push(callback),
		);

		expect(plugin.applyCompletedLinkFreeze).not.toHaveBeenCalled();
		expect(scheduled).toHaveLength(1);

		scheduled[0]();

		expect(plugin.applyCompletedLinkFreeze).toHaveBeenCalledWith(view, 0, 10, "[[Target|Target]]", 9, 15);
	});

	it("skips delayed plain link freezing when the completed link has changed", () => {
		const scheduled: Array<() => void> = [];
		const plugin = {
			applyCompletedLinkFreeze: jest.fn(),
			addAliasForCompletedLink: jest.fn(),
		};
		const view = {
			state: {
				doc: {
					sliceString: jest.fn(() => "[[Target|manual]]"),
				},
			},
		} as unknown as EditorView;

		handleCompletedLinkAction(
			plugin as never,
			view,
			{
				type: "freeze",
				from: 0,
				to: 10,
				raw: "[[Target]]",
				replacement: "[[Target|Target]]",
				surfaceStart: 9,
				surfaceEnd: 15,
			},
			(callback: () => void) => scheduled.push(callback),
		);

		scheduled[0]();

		expect(plugin.applyCompletedLinkFreeze).not.toHaveBeenCalled();
	});
});
