import { Book, createElement } from "lucide";
import { Create } from "../components/creat-element";
import { NotificationManager } from "../components/Notification";
import { SITE_CONFIGS } from "../config";
import { db } from "../db";
import {
  api,
  Chapter as APIChapter,
  Novel as APINovel,
  apiUtil,
  ChapterList,
} from "../lib/API";
import { debounce } from "../lib/utli";

// Centralized interfaces for better type clarity

type NovelData = APINovel & {
  saved: boolean;
};

interface Settings {
  saved: boolean;
  autoLoader: boolean;
}

/**
 * MasterObserver class for tracking reading progress and managing chapters
 */
export class MasterObserver {
  private chapterData: ChapterList | null = null;
  private novelData: NovelData | null = null;
  private observedElements: Set<HTMLElement> = new Set();
  private createdChapters: Set<number> = new Set();
  private mutationObserver: MutationObserver | null = null;
  private currentChapter: HTMLElement | null = null;
  private settings: Settings = {
    saved: false,
    autoLoader: false,
  };
  private chapterList: Array<ChapterList> = [];
  private currentChapterIndex: number = 0;
  private fetching = false;

  constructor() {
    this.initialize();
  }

  /**
   * Primary initialization method
   */
  private async initialize(): Promise<void> {
    // Setup settings first
    this.loadSettingsFromStorage();
    this.setupSettingsUI();

    if (this.settings.autoLoader) {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }

      window.onbeforeunload = function () {
        window.scrollTo(0, 0);
      };

      // adding scroll event listeners
      const debouncedScroll = debounce(this.handleScroll, 300);

      window.addEventListener("scroll", debouncedScroll);
      window.addEventListener("resize", debouncedScroll);

      // Initial check
      this.handleScroll();
    }

    // Initialize novel and chapter data
    await this.loadNovelData();
    await this.setupCurrentChapter();

    // get Chapters
    await this.getChapters();

    //  setup styles for chapter
    this.setupChapterStyle();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettingsFromStorage(): void {
    this.settings.autoLoader =
      localStorage.getItem("autoLoaderState") === "true";
  }

  /**
   * Setup settings UI components
   */
  private setupSettingsUI(): void {
    const { container: toggleContainer, input: toggleInput } = Create.toogle();

    toggleInput.checked = this.settings.autoLoader;
    toggleInput.addEventListener("change", () => {
      if (this.settings.autoLoader !== toggleInput.checked) {
        // Update settings
        this.settings.autoLoader = toggleInput.checked;
        localStorage.setItem(
          "autoLoaderState",
          this.settings.autoLoader.toString()
        );
      }
    });

    document.querySelector("div.optx-content")?.appendChild(toggleContainer);
  }

  /**
   * Fetch and set up novel data
   */
  private async loadNovelData(): Promise<void> {
    const article = document.querySelector("article");
    if (!article) return;

    const articleID = article.id;
    const id = articleID.split("-")[1];

    if (!id || id.trim().length === 0 || Number.isNaN(Number(id))) {
      return;
    }

    try {
      const novel = await api.getNovelbyChapterId(Number(id));
      const savedNovel = !!(await db.novels.where({ id: novel.id }).first());

      this.novelData = {
        ...novel,
        saved: savedNovel,
      };
    } catch (error) {
      console.error("Failed to load novel data:", error);
    }
  }

  /**
   * Fetch next chapter and create UI element
   */
  async createChapter(nextChapter: APIChapter): Promise<void> {
    if (this.createdChapters.has(nextChapter.id)) return;
    this.createdChapters.add(nextChapter.id);
    const chapterContainer = Create.div({
      className: "chapter-container",
      attributes: {
        "data-url": nextChapter.link,
      },
    });
    const chapterTitle = Create.div({
      className: "chapter-title",
      children: [
        Create.a({
          href: nextChapter.link,
          textContent: nextChapter.title.rendered,
          className: "endless-link",
        }),
      ],
    });
    const chapterContent = Create.div({
      className: "chapter-content",
      children: [
        Create.div({
          className: "chapter-content-inner",
          innerHTML: nextChapter.content.rendered,
        }),
      ],
      attributes: {
        chapterId: nextChapter.id.toString(),
        novelId: this.novelData?.id?.toString() ?? "null",
      },
    });

    // Add chapter to DOM
    chapterContainer.appendChild(chapterTitle);
    chapterContainer.appendChild(chapterContent);
    chapterContainer.appendChild(
      this.createUserOptions(
        this.chapterData?.title ?? nextChapter.title.rendered,
        this.chapterData?.link ?? nextChapter.link
      )
    );
    this.currentChapter?.after(chapterContainer);
    this.currentChapter = chapterContainer;

    this.fetching = false;
  }

  async getChapters(): Promise<void> {
    if (!this.novelData) return;
    const chapters = await api.getChaptersList(this.novelData?.slug);
    this.chapterList = chapters;
    this.currentChapterIndex = chapters.findIndex(
      (chapter) => chapter.id === this.chapterData?.id
    );
  }

  /**
   * Calculate how much of the current chapter has been scrolled past
   */
  private getScrolledPastPercentage(): number {
    const el = this.currentChapter;
    if (!el) return 0;

    const rect = el.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;

    // Element is above viewport
    if (rect.top >= windowHeight) return 100;

    // Element is completely scrolled past
    if (rect.top <= -rect.height) return 100;

    // Element is below viewport (not seen yet)
    if (rect.bottom <= 0) return 0;

    // Calculate partial scroll percentage
    const scrolledPastHeight = Math.max(0, -rect.top);
    const elementHeight = rect.height;

    if (elementHeight === 0) return 0;

    return Math.min(100, (scrolledPastHeight / elementHeight) * 100);
  }

  /**
   * Scroll event handler
   */
  private handleScroll = async (): Promise<void> => {
    const percentageVisible = Math.floor(this.getScrolledPastPercentage());
    if (percentageVisible > 80 && !this.fetching) {
      this.fetching = true;
      this.currentChapterIndex++;
      this.chapterData = this.chapterList[this.currentChapterIndex];
      const chapterData = await api.getChapter(this.chapterData.id);
      await this.createChapter(chapterData);
    }
    // Additional scroll logic can be implemented here
  };

  /**
   * Create user options UI element
   */
  private createUserOptions(title: string, chapterUrl: string): HTMLDivElement {
    return Create.div({
      className: "chapter-options-container",
      children: [
        // Chapter link
        Create.a({
          href: chapterUrl,
          textContent: title,
          className: "chapter-options-link endless-link",
          attributes: {
            "data-variant": "outline",
            disabled: chapterUrl ? "false" : "true",
          },
        }),
        // Novel link
        Create.a({
          href: this.novelData?.link,
          textContent: this.novelData?.name,
          className: "chapter-options-link endless-link",
          attributes: {
            "data-variant": "outline",
          },
        }),
        // Library link
        Create.a({
          href: SITE_CONFIGS.libLink,
          textContent: "Library",
          className: "chapter-options-link endless-link",
          children: createElement(Book),
          attributes: {
            "data-variant": "outline",
            disabled: chapterUrl ? "false" : "true",
          },
        }),
        // Settings button
        Create.endlessButton({
          textContent: "Settings",
          clickFunc: SITE_CONFIGS.openSettingsFunc,
        }),
      ],
    });
  }

  /**
   * Set up the current chapter for tracking
   */
  private async setupCurrentChapter(): Promise<void> {
    const currentUrl = window.location.href;
    const titleElement = document.querySelector(SITE_CONFIGS.selectors.title);
    const currentChapter = document.querySelector(
      SITE_CONFIGS.selectors.content
    );

    if (!currentChapter) {
      NotificationManager.show({
        message: "Setting up chapter failed!",
        variant: "error",
      });
      return;
    }

    const chapterTitle = titleElement?.textContent ?? "Unknown Chapter";

    // Add user options to the chapter container
    const userOptions = this.createUserOptions(chapterTitle, currentUrl);

    currentChapter.appendChild(userOptions);
    this.currentChapter = currentChapter as HTMLElement;

    // Set up chapter for tracking
    currentChapter.classList.add("chapter-container", "track-content");
    currentChapter.setAttribute(
      "novel-id",
      this.novelData?.id?.toString() ?? "null"
    );
    currentChapter.setAttribute("data-url", currentUrl);

    // Extract chapter ID and set up chapter data
    await this.setupChapterData(currentChapter, currentUrl, chapterTitle);
  }

  /**
   * Set up chapter data from page elements
   */
  private async setupChapterData(
    currentChapter: Element,
    currentUrl: string,
    chapterTitle: string
  ): Promise<void> {
    const article = document.querySelector("article");
    if (!article) return;

    const articleID = article.id;
    const id = articleID?.split("-")[1];

    if (!id || Number.isNaN(Number(id))) return;

    const breadCrumbs = document.querySelector(
      "div.ts-breadcrumb.bixbox > div"
    );
    if (!breadCrumbs) return;

    const currentChapterTitle =
      breadCrumbs.querySelector("span:nth-child(2) a")?.textContent ?? "";
    const novelTitle =
      breadCrumbs.querySelector("span:nth-child(3) a")?.textContent ?? "";

    const index = apiUtil.getChapterIndex(
      currentChapterTitle,
      this.novelData?.name ?? novelTitle
    );

    // Set up chapter data
    this.chapterData = {
      id: Number(id),
      link: currentUrl,
      title: chapterTitle,
      chapterIndex: index,
    };

    currentChapter.setAttribute("chapter-id", id);
  }

  private setupChapterStyle(): () => void {
    const sourceElement = document.querySelector(
      SITE_CONFIGS.selectors.content
    ) as HTMLElement;

    if (!sourceElement) {
      console.error(`Element not found: ${SITE_CONFIGS.selectors.content}`);
      return () => {}; // Return an empty disconnect function
    }

    let newElement = document.querySelector(".epwrapper") as HTMLElement;

    if (!newElement) {
      console.error(`Element not found: .epwrapper`);
      return () => {}; // Return an empty disconnect function
    }

    // Copy initial styles
    for (const prop of sourceElement.style) {
      const value = sourceElement.style.getPropertyValue(prop);
      newElement.style.setProperty(prop, value);
    }

    // MutationObserver to track style changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          // Update new element's styles
          for (const prop of sourceElement.style) {
            const value = sourceElement.style.getPropertyValue(prop);
            newElement.style.setProperty(prop, value);
          }
        }
      });
    });

    observer.observe(sourceElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    // Optional: Disconnect the observer when no longer needed
    return () => observer.disconnect();
  }

  /**
   * Clean up observers and event listeners
   */
  public destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleScroll);

    this.observedElements.clear();
  }
}
