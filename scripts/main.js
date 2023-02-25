import arg from "arg";
import * as prompts from "@clack/prompts";
import { exitPrompt, isPackageManager } from "../lib/utils.js";
import { createReact } from "./react.js";

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
			"--pkg-manager": String,
			"-h": "--help",
			"-i": "--install",
			"-g": "--git",
			"-p": "--pkg-manager",
		},
		{ argv, permissive: true }
	);
	let {
		"--help": help,
		"--install": installDeps,
		"--git": initGitRepo,
		"--dry": dryRun,
		"--pkg-manager": pkgManager,
	} = flags;

	// 0. Show help text and bail
	if (help) {
		console.log(getHelp());
		return;
	}

	// 1. Say hello!
	prompts.intro("@chance/create" + (dryRun ? " (dry run)" : ""));

	// 2. Get template to set up
	let [template, ...args] = flags["_"];
	if (template && !isValidTemplate(template)) {
		prompts.log.warning(`"${template}" isn't a valid template`);
		template = null;
	}
	if (!template) {
		let answer = await prompts.select({
			message: "Which template would you like to use?",
			options: [{ value: "react", label: "react" }],
			initialValue: "react",
		});
		if (prompts.isCancel(answer)) exitPrompt();
		template = answer;
	}

	// 2. Construct context to pass to template functions
	/** @type {Context} */
	let ctx = {
		dryRun,
		installDeps,
		initGitRepo,
		pkgManager: isPackageManager(pkgManager) ? pkgManager : null,
		args,
	};

	// 3. Call template functions
	switch (template) {
		case "react":
			await createReact(ctx);
			break;
		default:
			throw new Error(`Unknown template: ${template}`);
	}

	// 4. Huzzah!
	prompts.outro("You're all set!");
}

function getHelp() {
	return "No help yet, sorry!";
}

/**
 * @param {string|null|undefined} template
 * @returns {template is Template}
 */
function isValidTemplate(template) {
	return ["react"].includes(template);
}

/**
 * @typedef {import("../types").Template} Template
 * @typedef {import("../types").PackageManager} PackageManager
 * @typedef {import("../types").Context} Context
 */
