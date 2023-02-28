import path from "node:path";
import os from "node:os";
import * as prompts from "@clack/prompts";

/**
 * @param {string} url
 */
export function getModulePaths(url) {
	let pathname = new URL(url).pathname;
	let parts = pathname.split("/");
	let basename = parts.pop();
	let dirname = parts.join(path.sep);
	return { pathname, dirname, basename };
}

/**
 * @returns {never}
 */
export function exitPrompt() {
	prompts.cancel("At least you tried. Catch you later!");
	return process.exit(0);
}

/**
 * @param {string} str
 */
export function isPathname(str) {
	return str.includes(path.sep);
}

/**
 * @param {string} pathname
 */
export function normalizePath(pathname) {
	if (os.platform() === "win32") {
		return path.win32.normalize(pathname);
	}
	return path.normalize(pathname);
}

/**
 * @param {number} ms
 */
export async function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 *
 * @param {string} str
 * @returns {str is PackageManager}
 */
export function isPackageManager(str) {
	return str === "npm" || str === "yarn" || str === "pnpm";
}

/**
 * @typedef {import("../types").PackageManager} PackageManager
 */
