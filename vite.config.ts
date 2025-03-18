import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      server: {
        open: false,
      },
      userscript: {
        icon: "https://vitejs.dev/logo.svg",
        namespace: "npm/vite-plugin-monkey",
        match: ["https://kolbook.xyz/*"],
        updateURL:
          "https://github.com/StarlessNight13/kolnovel-script/releases/latest/download/kolnovel-script.user.js",
        downloadURL:
          "https://github.com/StarlessNight13/kolnovel-script/releases/latest/download/kolnovel-script.user.js",
      },
    }),
  ],
});
