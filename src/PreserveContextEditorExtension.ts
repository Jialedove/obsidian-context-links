import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

import type LinkWithAliasPlugin from "./main";
import { completePlainLink, getCompletedLinkAlias } from "./PreserveContext";

export function createPreserveContextEditorExtension(plugin: LinkWithAliasPlugin) {
	return ViewPlugin.fromClass(
		class {
			private pendingAlias?: AliasLinkAction;
			pendingEnterCompletionQuery?: string;

			update(update: ViewUpdate) {
				if ((!update.docChanged && !update.selectionSet) || plugin.isPreserveContextApplyingEditorChange()) {
					return;
				}
				const userEvent = update.transactions.map((tr) => tr.annotation(Transaction.userEvent)).find(Boolean);
				if (userEvent === "input.paste" || userEvent === "delete.selection") {
					this.pendingAlias = undefined;
					return;
				}
				if (this.pendingAlias && shouldCommitPendingAlias(update.state, this.pendingAlias)) {
					handleCompletedLinkAction(plugin, update.view, this.pendingAlias);
					this.pendingAlias = undefined;
					return;
				}
				if (!update.docChanged) {
					return;
				}
				const startQuery = getQueryBeforeCursor(update.startState);
				const query = getConfirmedCompletionQuery(startQuery, this.pendingEnterCompletionQuery, userEvent);
				this.pendingEnterCompletionQuery = undefined;
				const action = getCompletedLinkAction(update.state, query);
				if (!shouldHandleCompletedLinkAction(action, startQuery, userEvent)) {
					if (action?.type === "alias") {
						this.pendingAlias = action;
						return;
					}
					plugin.trackManualUnfreeze(update);
					return;
				}
				if (!action) {
					return;
				}
				handleCompletedLinkAction(plugin, update.view, action);
			}
		},
		{
			eventHandlers: {
				keydown(event: KeyboardEvent, view: EditorView) {
					if (event.key !== "Enter") {
						return;
					}
					this.pendingEnterCompletionQuery = getQueryBeforeCursor(view.state);
				},
			},
		},
	);
}

interface FrozenLinkAction {
	type: "freeze";
	from: number;
	to: number;
	raw: string;
	replacement: string;
	surfaceStart: number;
	surfaceEnd: number;
}

interface AliasLinkAction {
	type: "alias";
	from: number;
	to: number;
	target: string;
	surfaceText: string;
}

export type CompletedLinkAction = FrozenLinkAction | AliasLinkAction;
type CompletedLinkScheduler = (callback: () => void) => void;

export function handleCompletedLinkAction(
	plugin: LinkWithAliasPlugin,
	view: EditorView,
	action: CompletedLinkAction,
	schedule: CompletedLinkScheduler = (callback) => {
		const win = view.dom.ownerDocument.defaultView || window;
		win.requestAnimationFrame(callback);
	},
): void {
	if (action.type === "alias") {
		plugin.addAliasForCompletedLink(action.target, action.surfaceText);
		return;
	}
	schedule(() => {
		if (view.state.doc.sliceString(action.from, action.to) !== action.raw) {
			return;
		}
		plugin.applyCompletedLinkFreeze(view, action.from, action.to, action.replacement, action.surfaceStart, action.surfaceEnd);
	});
}

export function shouldHandleCompletedLinkAction(
	action: CompletedLinkAction | undefined,
	query: string | undefined,
	userEvent: string | undefined,
): boolean {
	if (!action) {
		return false;
	}
	if (userEvent === "input.complete") {
		return true;
	}
	if (userEvent?.startsWith("input.type")) {
		return false;
	}
	if (action.type === "alias") {
		return true;
	}
	return query != null;
}

export function getConfirmedCompletionQuery(
	startQuery: string | undefined,
	pendingEnterCompletionQuery: string | undefined,
	userEvent: string | undefined,
): string | undefined {
	if (userEvent != null && userEvent !== "input.complete") {
		return;
	}
	if (startQuery == null || pendingEnterCompletionQuery == null || startQuery !== pendingEnterCompletionQuery) {
		return;
	}
	return startQuery;
}

export function getCompletedLinkAction(state: EditorState, query?: string): CompletedLinkAction | undefined {
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
	const from = line.from + before;
	const to = line.from + after + 2;
	const frozen = completePlainLink(raw, from, query);
	if (frozen) {
		return { type: "freeze", from, to, raw, ...frozen };
	}
	const alias = getCompletedLinkAlias(raw);
	if (alias) {
		return { type: "alias", from, to, ...alias };
	}
	return;
}

export function isCursorInsideActionLink(action: CompletedLinkAction | undefined, cursor: number): boolean {
	if (!action) {
		return false;
	}
	return cursor >= action.from && cursor <= action.to;
}

function shouldCommitPendingAlias(state: EditorState, action: AliasLinkAction): boolean {
	if (isCursorInsideActionLink(action, state.selection.main.head)) {
		return false;
	}
	const raw = state.doc.sliceString(action.from, action.to);
	const alias = getCompletedLinkAlias(raw);
	return alias?.target === action.target && alias.surfaceText === action.surfaceText;
}

export function getQueryBeforeCursor(state: EditorState): string | undefined {
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
	return query;
}
