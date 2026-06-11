export interface PreserveContextOverride {
	sourcePath: string;
	targetPath: string;
	surfaceText: string;
}

export interface RewriteResult {
	changed: boolean;
	count: number;
	text: string;
}

export interface RenameRewriteResult extends RewriteResult {
	autoFrozen: PreserveContextOverride[];
}

interface Wikilink {
	start: number;
	end: number;
	raw: string;
	target: string;
	displayText?: string;
	embed: boolean;
}

const wikilinkPattern = /!?\[\[([^\]\n]+)\]\]/g;

export function freezePlainLink(rawLink: string, surfaceText?: string): string | undefined {
	const link = parseWikilink(rawLink, 0);
	if (!link || link.embed || link.displayText != null || !link.target) {
		return;
	}
	return makeWikilink(link.target, surfaceText || link.target);
}

export function freezeExistingLinksInMarkdown(markdown: string): RewriteResult {
	return rewriteMarkdownLinks(markdown, (link) => {
		if (link.embed || link.displayText != null || !link.target) {
			return;
		}
		return makeWikilink(link.target, link.target);
	});
}

export function rewriteLinksAfterRename(
	markdown: string,
	options: {
		oldLinkText: string;
		newLinkText: string;
		freezePlainLinks: boolean;
		overrides: PreserveContextOverride[];
		sourcePath: string;
		targetPath: string;
	},
): RenameRewriteResult {
	const autoFrozen: PreserveContextOverride[] = [];
	const oldPath = getComparableLinkpath(options.oldLinkText);
	const result = rewriteMarkdownLinks(markdown, (link) => {
		const linkPath = getComparableLinkpath(link.target);
		if (link.embed || (linkPath !== oldPath && linkPath !== getComparableLinkpath(options.newLinkText))) {
			return;
		}
		if (link.displayText != null) {
			return makeWikilink(options.newLinkText, link.displayText);
		}
		if (
			!options.freezePlainLinks ||
			hasOverride(options.overrides, options.sourcePath, options.targetPath, options.oldLinkText) ||
			hasOverride(options.overrides, options.sourcePath, options.oldLinkText, options.oldLinkText)
		) {
			return makeWikilink(options.newLinkText);
		}
		const generated = {
			sourcePath: options.sourcePath,
			targetPath: options.targetPath,
			surfaceText: options.oldLinkText,
		};
		autoFrozen.push(generated);
		return makeWikilink(options.newLinkText, options.oldLinkText);
	});
	return { ...result, autoFrozen };
}

export function recordManualPlainLinkOverrides(options: {
	before: string;
	after: string;
	sourcePath: string;
	targetPath: string;
	generated: PreserveContextOverride[];
	existing: PreserveContextOverride[];
}): PreserveContextOverride[] {
	const next = [...options.existing];
	for (const generated of options.generated) {
		if (hasOverride(next, generated.sourcePath, generated.targetPath, generated.surfaceText)) {
			continue;
		}
		if (generated.sourcePath !== options.sourcePath) {
			continue;
		}
		if (containsLink(options.before, generated.surfaceText) && containsPlainLink(options.after, generated.targetPath)) {
			next.push(generated);
		}
	}
	return next;
}

export function makeWikilink(target: string, displayText?: string): string {
	return displayText == null ? `[[${target}]]` : `[[${target}|${displayText}]]`;
}

export function appendUniqueOverrides(existing: PreserveContextOverride[], added: PreserveContextOverride[]): PreserveContextOverride[] {
	const next = [...existing];
	for (const item of added) {
		if (!hasOverride(next, item.sourcePath, item.targetPath, item.surfaceText)) {
			next.push(item);
		}
	}
	return next;
}

function rewriteMarkdownLinks(markdown: string, rewrite: (link: Wikilink) => string | undefined): RewriteResult {
	const lines = markdown.split("\n");
	let inCodeBlock = false;
	let count = 0;
	let changed = false;
	const rewritten = lines.map((line) => {
		if (line.trimStart().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			return line;
		}
		if (inCodeBlock) {
			return line;
		}
		let output = "";
		let lastIndex = 0;
		let lineChanged = false;
		wikilinkPattern.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = wikilinkPattern.exec(line)) != null) {
			if (isInsideInlineCode(line, match.index)) {
				continue;
			}
			const link = parseWikilink(match[0], match.index);
			if (!link) {
				continue;
			}
			const replacement = rewrite(link);
			if (!replacement || replacement === link.raw) {
				continue;
			}
			output += line.substring(lastIndex, link.start) + replacement;
			lastIndex = link.end;
			count++;
			changed = true;
			lineChanged = true;
		}
		if (!lineChanged) {
			return line;
		}
		return output + line.substring(lastIndex);
	});
	return { changed, count, text: rewritten.join("\n") };
}

function parseWikilink(raw: string, start: number): Wikilink | undefined {
	const embed = raw.startsWith("!");
	const prefixLength = embed ? 3 : 2;
	const inner = raw.substring(prefixLength, raw.length - 2);
	if (!inner || inner.includes("\n")) {
		return;
	}
	const pipe = inner.indexOf("|");
	const target = pipe >= 0 ? inner.substring(0, pipe) : inner;
	const displayText = pipe >= 0 ? inner.substring(pipe + 1) : undefined;
	return {
		start,
		end: start + raw.length,
		raw,
		target,
		displayText,
		embed,
	};
}

function containsLink(markdown: string, surfaceText: string): boolean {
	return collectLinks(markdown).some((link) => link.displayText === surfaceText);
}

function containsPlainLink(markdown: string, targetPath: string): boolean {
	return collectLinks(markdown).some((link) => link.displayText == null && getComparableLinkpath(link.target) === getComparableLinkpath(targetPath));
}

function collectLinks(markdown: string): Wikilink[] {
	const links: Wikilink[] = [];
	rewriteMarkdownLinks(markdown, (link) => {
		links.push(link);
		return undefined;
	});
	return links;
}

function hasOverride(overrides: PreserveContextOverride[], sourcePath: string, targetPath: string, surfaceText: string): boolean {
	return overrides.some(
		(item) =>
			item.sourcePath === sourcePath &&
			getComparableLinkpath(item.targetPath) === getComparableLinkpath(targetPath) &&
			item.surfaceText === surfaceText,
	);
}

function isInsideInlineCode(line: string, index: number): boolean {
	let ticks = 0;
	for (let i = 0; i < index; i++) {
		if (line.charAt(i) === "`") {
			ticks++;
		}
	}
	return ticks % 2 === 1;
}

function getComparableLinkpath(linktext: string): string {
	return linktext.split("#")[0].split("^")[0].replace(/\.md$/i, "");
}
