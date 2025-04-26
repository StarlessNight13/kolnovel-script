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
        author: "Darkless",
        version: "1.2.6",
        match: ["https://kolbook.xyz/*", "https://kolnovel.com/*"],
        updateURL:
          "https://github.com/StarlessNight13/kolnovel-script/releases/latest/download/kolnovel.user.js",
        downloadURL:
          "https://github.com/StarlessNight13/kolnovel-script/releases/latest/download/kolnovel.user.js",
      },
    }),

  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
