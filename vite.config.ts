import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		coverage: {
			provider: "c8",
			include: ["packages/*/**/*.test.{ts,tsx,js,jsx}"],
			exclude: [...configDefaults.exclude],
		},
	},
});
