import path from "node:path";
import os from "node:os";
import fse from "fs-extra";
import arg from "arg";
import { execa } from "execa";
import * as prompts from "@clack/prompts";
import { getModulePaths } from "../lib/utils.js";

main();

async function main() {
	process.on("SIGINT", () => process.exit(0));
	process.on("SIGTERM", () => process.exit(0));

	let argv = process.argv.slice(2).filter((arg) => arg !== "--");

	let flags = arg(
		{
			"--help": Boolean,
			"--install": Boolean,
			"--git": Boolean,
			"--dry": Boolean,
			"-h": "--help",
			"-i": "--install",
			"-g": "--git",
		},
		{ argv, permissive: true }
	);
	let {
		_: args,
		"--help": help,
		"--install": installDeps,
		"--git": gitInit,
		"--dry": dryRun,
	} = flags;

	let spinner = prompts.spinner();
	let cwd = process.cwd();

	// 0. Show help text and bail
	if (help) {
		console.log(getHelp());
		return;
	}

	// 1. Say hello!
	prompts.intro("@chance/create react" + (dryRun ? " (dry run)" : ""));

	// 2. Set up project directory
	let project = await getProjectDetails(args, { cwd });
	if (dryRun) {
		await wait(1);
	} else {
		await ensureDirRecursive(project.pathname);
	}

	// 3. Create the damned thing
	cwd = project.pathname;
	let relativePath = path.relative(process.cwd(), project.pathname);
	spinner.start(`Creating a new React app in ${relativePath}`);
	if (dryRun) {
		await wait(2000);
	} else {
		await createApp(project.name, project.pathname, {
			onError(error) {
				spinner.stop("Failed to create new React app");
				prompts.cancel();
				console.error(error);
				process.exit(1);
			},
		});
	}
	spinner.stop(`New React app '${project.name}' created 🚀`);

	// 4. Initialize git repo
	gitInit = gitInit ?? (await promptToInitializeGitRepo());
	if (gitInit) {
		if (dryRun) {
			await wait(1);
		} else {
			await exec("git", ["init"], { cwd });
		}
		prompts.log.success("Initialized Git repository");
	} else {
		prompts.log.info("Skipped Git initialization");
	}

	// 5. Install dependencies
	installDeps = installDeps ?? (await promptToInstallDependencies());
	if (installDeps) {
		let pm = detectPackageManager();
		spinner.start(`Installing dependencies with ${pm}`);
		if (dryRun) {
			await wait(1000);
		} else {
			await exec(pm, pm === "yarn" ? [] : ["install"], { cwd });
		}
		spinner.stop("Installed dependencies");
	} else {
		prompts.log.info("Skipped dependency installation");
	}

	// 6. Huzzah!
	prompts.outro("You're all set!");
}

/**
 *
 * @param {string} projectName
 * @param {string} projectPathname
 * @param {{ onError: (err: unknown) => any }} opts
 */
async function createApp(projectName, projectPathname, { onError }) {
	let { dirname } = getModulePaths(import.meta.url);
	let templatesDir = path.resolve(dirname, "..", "templates");
	let sharedTemplateDir = path.join(templatesDir, "_shared");
	let reactTemplateDir = path.join(templatesDir, "react");

	await ensureDirRecursive(projectPathname);

	// TODO: Detect if project directory is empty, otherwise we
	// can't create a new project here.
	await fse.copy(reactTemplateDir, projectPathname);

	// Copy misc files from shared
	let filesToCopy = [
		{
			src: path.join(sharedTemplateDir, "reset.css"),
			dest: path.join(projectPathname, "src", "reset.css"),
		},
	];
	await Promise.all(
		filesToCopy.map(async ({ src, dest }) => await fse.copy(src, dest))
	);

	/** @type {Array<{ pathname: string; getUpdates: (contents: string) => string }>} */
	let filesToUpdate = [
		{
			pathname: path.join(projectPathname, "package.json"),
			getUpdates: updateProjectName,
		},
	];
	await Promise.all(
		filesToUpdate.map(async ({ pathname, getUpdates }) => {
			let contents = await fse.readFile(pathname, "utf-8");
			let updatedContents = getUpdates(contents);
			await fse.writeFile(pathname, updatedContents, "utf-8");
		})
	);

	/** @param {string} contents */
	function updateProjectName(contents) {
		return contents.replace(/{{PROJECT_NAME}}/g, projectName);
	}
}

async function promptToInitializeGitRepo() {
	let answer = await prompts.confirm({
		message: "Initialize a Git repository?",
		initialValue: true,
	});
	if (prompts.isCancel(answer)) cancel();
	return answer;
}

async function promptToInstallDependencies() {
	let answer = await prompts.confirm({
		message: "Install dependencies?",
		initialValue: false,
	});
	if (prompts.isCancel(answer)) return cancel();
	return answer;
}

/**
 * @param {string[]} args
 * @param {{ cwd: string }} opts
 */
async function getProjectDetails(args, opts) {
	let projectName = args[0];
	if (!projectName) {
		let defaultProjectName = "my-react-app";
		let answer = await prompts.text({
			message: "Where would you like to create your project?",
			placeholder: "." + path.sep + defaultProjectName,
		});
		if (prompts.isCancel(answer)) {
			return cancel();
		}
		answer = answer?.trim();
		projectName = answer || defaultProjectName;
	}

	/** @type {string} */
	let pathname;

	if (isPathname(projectName)) {
		let dir = path.resolve(opts.cwd, path.dirname(normalizePath(projectName)));
		projectName = toValidProjectName(path.basename(projectName));
		pathname = path.join(dir, projectName);
	} else {
		projectName = toValidProjectName(projectName);
		pathname = path.resolve(opts.cwd, projectName);
	}

	return {
		name: projectName,
		pathname,
	};
}

/**
 * @returns {never}
 */
function cancel() {
	prompts.outro("At least you tried. Catch you later!");
	return process.exit(0);
}

function getHelp() {
	return "No help yet, sorry!";
}

function detectExecCommand() {
	const defaultCommand = "npx";
	if (!process.env.npm_execpath) return defaultCommand;
	let basename = path.basename(process.env.npm_execpath);
	return basename.startsWith("pnpx")
		? "pnpx"
		: basename.startsWith("yarn")
		? "yarn"
		: basename.startsWith("npm")
		? "npx"
		: defaultCommand;
}

function detectPackageManager() {
	let execCommand = detectExecCommand();
	switch (execCommand) {
		case "pnpx":
			return "pnpm";
		case "yarn":
			return "yarn";
		case "npx":
			return "npm";
		default:
			throw new Error(`Unknown exec command: ${execCommand}`);
	}
}

/**
 * @param {number} ms
 */
async function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} command
 * @param {readonly string[]} args
 * @param {{ cwd: string }} options
 * @returns {Promise<{ code: number | null; signal: NodeJS.Signals | null }>}
 */
async function exec(command, args, options) {
	let installExec = execa(command, ["init"], { ...options, stdio: "ignore" });
	return new Promise((resolve, reject) => {
		installExec.on("error", (error) => reject(error));
		installExec.on("close", (code, signal) => resolve({ code, signal }));
	});
}

/**
 * @param {string} projectName
 */
function toValidProjectName(projectName) {
	if (isValidProjectName(projectName)) {
		return projectName;
	}
	return projectName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/^[._]/, "")
		.replace(/[^a-z\d\-~]+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "");
}

/**
 * @param {string} projectName
 */
function isValidProjectName(projectName) {
	return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
		projectName
	);
}

/**
 * @param {string} dir
 */
async function ensureDirRecursive(dir) {
	let parent = path.dirname(dir);
	if (parent !== dir) {
		await ensureDirRecursive(parent);
	}
	await fse.ensureDir(dir);
}

/**
 * @param {string} str
 */
function isPathname(str) {
	return str.includes("/") || str.includes("\\");
}

/**
 * @param {string} pathname
 */
function normalizePath(pathname) {
	if (os.platform() === "win32") {
		return path.win32.normalize(pathname);
	}
	return path.normalize(pathname);
}

/**
 * @typedef {string | object | number | boolean | bigint} Serializable
 */
