import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

import type LinkWithAliasPlugin from "./main";
import { freezePlainLink } from "./PreserveContext";

export function createPreserveContextEditorExtension(plugin: LinkWithAliasPlugin) {
	return ViewPlugin.fromClass(
		class {
			update(update: ViewUpdate) {
				if (!update.docChanged || plugin.isPreserveContextApplyingEditorChange()) {
					return;
				}
				const userEvent = update.transactions.map((tr) => tr.annotation(Transaction.userEvent)).find(Boolean);
				if (userEvent === "input.paste" || userEvent === "delete.selection") {
					return;
				}
				if (userEvent !== "input.complete") {
					plugin.trackManualUnfreeze(update);
					return;
				}
				const query = getQueryBeforeCursor(update.startState);
				const frozen = freezeLinkAroundCursor(update.state, query);
				if (frozen) {
					plugin.applyCompletedLinkFreeze(update.view, frozen.from, frozen.to, frozen.replacement, frozen.surfaceStart, frozen.surfaceEnd);
				}
			}
		},
	);
}

interface FrozenLinkEdit {
	from: number;
	to: number;
	replacement: string;
	surfaceStart: number;
	surfaceEnd: number;
}

function freezeLinkAroundCursor(state: EditorState, query?: string): FrozenLinkEdit | undefined {
	const cursor = state.selection.main.head;
	const line = state.doc.lineAt(cursor);
	const localCursor = cursor - line.from;
	const before = line.text.lastIndexOf("[[", localCursor);
	if (before < 0) {
		return;
	}
	const after = line.text.indexOf("]]", before);
	if (after < 0 || after + 2 < localCursor) {
		return;
	}
	const raw = line.text.substring(before, after + 2);
	const replacement = freezePlainLink(raw, query);
	if (!replacement) {
		return;
	}
	const surface = query || raw.substring(2, raw.length - 2);
	const from = line.from + before;
	const to = line.from + after + 2;
	const surfaceStart = from + replacement.length - surface.length - 2;
	const surfaceEnd = surfaceStart + surface.length;
	return { from, to, replacement, surfaceStart, surfaceEnd };
}

function getQueryBeforeCursor(state: EditorState): string | undefined {
	const cursor = state.selection.main.head;
	const line = state.doc.lineAt(cursor);
	const localCursor = cursor - line.from;
	const beforeCursor = line.text.substring(0, localCursor);
	const open = beforeCursor.lastIndexOf("[[");
	if (open < 0) {
		return;
	}
	const query = beforeCursor.substring(open + 2);
	if (query.includes("]") || query.includes("|")) {
		return;
	}
	return query || undefined;
}
