import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "Pliegue",
		identifier: "com.srsergio.pliegue",
		version: "1.0.4",
	},
	build: {
		mainProcess: "cottontail",
		cottontail: {
			entrypoint: "src/bun/index.ts",
		},
		// Vite compila el React a dist/, se copia como mainview
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
			"dist/icon.png": "views/mainview/icon.png",
		},
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
} satisfies ElectrobunConfig;
