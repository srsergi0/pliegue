// @hutch cli=0.27.0-canary.8 cottontail=0.7.0-canary.10
export default {
	packageManager: "bun",
	scripts: {
		install: ["bun", "install"],
		// Flujo Electron (el de siempre, vía package.json + bun).
		// Flujo Electrobun (requiere Hutch canary, ver README):
		//   - `hutch run dev`   → prepara, compila el React y abre la app
		//     (si `bun run dev:vite` está corriendo en otra terminal hay HMR).
		//   - `hutch run build` → instalador estable.
		"eb:prepare": ["hutch", "electrobun", "prepare"],
		dev: "hutch electrobun prepare && bun run build:vite && hutch electrobun dev --watch",
		start: "hutch electrobun prepare && hutch electrobun dev",
		build: "hutch electrobun prepare && bun run build:vite && hutch electrobun build --env=stable",
		"build:canary": "hutch electrobun prepare && bun run build:vite && hutch electrobun build --env=canary",
	},
	electrobun: {
		version: "2.0.2-beta.27",
	},
};
