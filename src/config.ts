export type Pages = "chapter" | "page" | "home" | "user-library";

export const SITE_CONFIGS = {
  selectors: {
    nextLink: ".naveps > div:nth-child(1) > div:nth-child(1) > a:nth-child(1)",
    contentContainer: ".epwrapper",
    appendTo: ".epwrapper",
    title: ".cat-series",
    content: "#kol_content",
    NovelBreadCrumb:
      ".ts-breadcrumb > div:nth-child(1) > span:nth-child(2) > a:nth-child(1)",
  },
  novelPath: "/series/",
  openSettingsFunc: () => {
    const optxshdElement = document.querySelector(".optxshd");
    if (optxshdElement) {
      optxshdElement.classList.toggle("optxshds");
    }
  },
  libLink: "/my-account/#user-library",
};

export type SiteConfig = typeof SITE_CONFIGS;

export interface UniversalConfig {
  scrollThreshold: number;
  maxVisibleChapters: number;
  initDelay: number;
  urlUpdateThreshold: number;
  debugMode: boolean;
  localStorageKey: string;
}

export const UNIVERSAL_CONFIG: UniversalConfig = {
  scrollThreshold: 900,
  maxVisibleChapters: 2,
  initDelay: 2000,
  urlUpdateThreshold: 10,
  debugMode: true,
  localStorageKey: "autoLoaderState",
} as const;
