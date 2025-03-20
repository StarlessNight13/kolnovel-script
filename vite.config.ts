import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      server: {
        open: false,
      },
      userscript: {
        icon: "https://www.google.com/s2/favicons?sz=64&domain=kolbook.xyz",
        namespace: "darkless/kolnovel",
        version: "1.0.0",
        match: ["https://kolbook.xyz/*"],
        updateURL:
          "https://github.com/StarlessNight13/kolnovel-script/releases/latest/download/kolnovel-script.user.js",
        downloadURL:
          "https://github.com/StarlessNight13/kolnovel-script/releases/latest/download/kolnovel-script.user.js",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
