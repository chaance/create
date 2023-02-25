import path from "node:path";
import os from "node:os";
import fse from "fs-extra";
import * as prompts from "@clack/prompts";
import ProxyAgent from "proxy-agent";

const defaultAgent = new ProxyAgent();
const httpsAgent = new ProxyAgent();
httpsAgent.protocol = "https:";

/**
 * @param {string} url
 */
export function agent(url) {
	return new URL(url).protocol === "https:" ? httpsAgent : defaultAgent;
}

/**
 * @param {string} url
 */
export function getModulePaths(url) {
	let result = new URL(url);
	let pathname = result.pathname;
	let pathArray = pathname.split("/");
	let basename = pathArray.pop();
	let dirname = pathArray.join("/");
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
 * @param {string} dir
 */
export async function ensureDirRecursive(dir) {
	let parent = path.dirname(dir);
	if (parent !== dir) {
		await ensureDirRecursive(parent);
	}
	await fse.ensureDir(dir);
}

/**
 * @param {string} str
 */
export function isPathname(str) {
	return str.includes("/") || str.includes("\\");
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
