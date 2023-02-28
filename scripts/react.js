import path from "node:path";
import fse from "fs-extra";
import { execa } from "execa";
import * as prompts from "@clack/prompts";
import {
	exitPrompt,
	getModulePaths,
	isPathname,
	normalizePath,
	wait,
} from "../lib/utils.js";

/** @param {Context} ctx */
export async function createReact(ctx) {
	let { args, dryRun, initGitRepo, installDeps } = ctx;

	let spinner = prompts.spinner();
	let cwd = process.cwd();

	// 1. Set up project directory
	let project = await getProjectDetails(args[0], { cwd });
	if (dryRun) {
		await wait(1);
	} else {
		await fse.ensureDir(project.pathname);
	}

	// 2. Create the damned thing
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

	// 3. Initialize git repo
	initGitRepo = initGitRepo ?? (await promptToInitializeGitRepo());
	if (initGitRepo) {
		if (dryRun) {
			await wait(1);
		} else {
			await exec("git", ["init"], { cwd });
		}
		prompts.log.success("Initialized Git repository");
	} else {
		prompts.log.info("Skipped Git initialization");
	}

	// 4. Install dependencies
	installDeps = installDeps ?? (await promptToInstallDependencies());
	if (installDeps) {
		const pm = ctx.pkgManager ?? "pnpm";
		spinner.start(`Installing dependencies with ${pm}`);
		if (dryRun) {
			await wait(1000);
		} else {
			await installDependencies(pm, { cwd });
		}
		spinner.stop(`Dependencies installed with ${pm}`);
	} else {
		prompts.log.info("Skipped dependency installation");
	}
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

	await fse.ensureDir(projectPathname);

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
	if (prompts.isCancel(answer)) exitPrompt();
	return answer;
}

async function promptToInstallDependencies() {
	let answer = await prompts.confirm({
		message: "Install dependencies?",
		initialValue: false,
	});
	if (prompts.isCancel(answer)) exitPrompt();
	return answer;
}

/**
 * @param {string|undefined} projectNameInput
 * @param {{ cwd: string }} opts
 */
async function getProjectDetails(projectNameInput, opts) {
	let projectName = projectNameInput;
	if (!projectName) {
		let defaultProjectName = "my-react-app";
		let answer = await prompts.text({
			message: "Where would you like to create your project?",
			placeholder: "." + path.sep + defaultProjectName,
		});
		if (prompts.isCancel(answer)) exitPrompt();

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
 * @param {"npm" | "yarn" | "pnpm"} packageManager
 * @param {{ cwd: string }} opts
 * @returns
 */
async function installDependencies(packageManager, { cwd }) {
	let installExec = execa(packageManager, ["install"], { cwd });
	return new Promise((resolve, reject) => {
		installExec.on("error", (error) => reject(error));
		installExec.on("close", () => resolve());
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
 * @typedef {import("../types").Template} Template
 * @typedef {import("../types").PackageManager} PackageManager
 * @typedef {import("../types").Context} Context
 * @typedef {import("../types").Serializable} Serializable
 */
