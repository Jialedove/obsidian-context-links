import { FileManager, TFile } from "obsidian";
import { toArray } from "./Utils";

const aliasPropertyNames = ["aliases", "alias"];

/**
 * Adds `requiredAliases` if they don't exist yet in the `file`
 * @param fileManager
 * @param file
 * @param requiredAliases
 */
export async function addMissingAliasesIntoFile(fileManager: FileManager, file: TFile, requiredAliases: string[]): Promise<void> {
	await fileManager.processFrontMatter(file, (frontmatter) => {
		if (typeof frontmatter == "object") {
			const aliasPropName = aliasPropertyNames.find((name) => frontmatter[name] != null) || aliasPropertyNames[0];
			const lowercaseBasename = file.basename.toLocaleLowerCase();
			const existingAliases = toArray<string>(frontmatter[aliasPropName]).filter(
				(alias) => alias.toLocaleLowerCase() !== lowercaseBasename && !shouldSkipAutomaticAlias(alias),
			);
			const toBeAdded: string[] = [];
			requiredAliases.forEach((requiredAlias) => {
				const lowercaseRequiredAlias = requiredAlias.toLocaleLowerCase();
				if (lowercaseRequiredAlias === lowercaseBasename || shouldSkipAutomaticAlias(requiredAlias)) {
					return;
				}
				if (!existingAliases.some((alias) => alias.toLocaleLowerCase() == lowercaseRequiredAlias)) {
					toBeAdded.push(requiredAlias);
				}
			});
			if (toBeAdded.length === 0 && existingAliases.length === toArray<string>(frontmatter[aliasPropName]).length) {
				return;
			}
			const newAliases = [...existingAliases, ...toBeAdded];
			//longest firs. It is needed for correct detection of back references
			newAliases.sort((a, b) => b.length - a.length);
			frontmatter[aliasPropName] = newAliases;
		}
	});
}

export function shouldSkipAutomaticAlias(alias: string): boolean {
	const normalized = alias.trim().toLocaleLowerCase();
	return normalized.includes("未命名") || /^untitled(?: \d+)?$/.test(normalized);
}

export async function syncTitleIntoFile(fileManager: FileManager, file: TFile): Promise<void> {
	await fileManager.processFrontMatter(file, (frontmatter) => {
		if (typeof frontmatter == "object") {
			frontmatter.title = file.basename;
		}
	});
}
