/// <reference types="vitest" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude],
		environment: "happy-dom",
	},
	plugins: [react()],
});
