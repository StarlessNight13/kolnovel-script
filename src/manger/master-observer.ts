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

// Improved type definitions
interface NovelData extends APINovel {
  saved: boolean;
}

interface Settings {
  saved: boolean;
  autoLoader: boolean;
}

/**
 * MasterObserver class for tracking reading progress and managing chapters
 */
export class MasterObserver {
  // Private properties
  private chapterData: ChapterList | null = null;
  private novelData: NovelData | null = null;
  private observedElements: Set<HTMLElement> = new Set();
  private createdChapters: Set<number> = new Set();
  private currentChapter: HTMLElement | null = null;
  private settings: Settings = {
    saved: false,
    autoLoader: false,
  };
  private chapterList: ChapterList[] = [];
  private currentChapterIndex: number = 0;
  private fetching = false;
  private styleObserver: MutationObserver | null = null;

  /**
   * Creates a new MasterObserver instance
   */
  constructor() {
    this.initialize();
  }

  /**
   * Primary initialization method
   */
  private async initialize(): Promise<void> {
    // Setup settings
    this.setupSettings();

    // Setup chapter navigation and infinite scroll
    if (this.settings.autoLoader) {
      this.setupScrollNavigation();
    }

    // Initialize data and UI
    await this.loadNovelData();
    await this.setupCurrentChapter();
    await this.loadChaptersList();

    // Setup chapter styling
    this.setupChapterStyle();
  }

  /**
   * Setup settings from storage and create UI
   */
  private setupSettings(): void {
    this.loadSettingsFromStorage();
    this.createSettingsUI();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettingsFromStorage(): void {
    this.settings.autoLoader =
      localStorage.getItem("autoLoaderState") === "true";
  }

  /**
   * Create and inject settings UI
   */
  private createSettingsUI(): void {
    const { container: toggleContainer, input: toggleInput } = Create.toogle();

    toggleInput.checked = this.settings.autoLoader;
    toggleInput.addEventListener("change", () => {
      this.settings.autoLoader = toggleInput.checked;
      localStorage.setItem(
        "autoLoaderState",
        this.settings.autoLoader.toString()
      );
    });

    document.querySelector("div.optx-content")?.appendChild(toggleContainer);
  }

  /**
   * Setup infinite scroll functionality
   */
  private setupScrollNavigation(): void {
    // Reset scroll position on page refresh
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    window.onbeforeunload = () => window.scrollTo(0, 0);

    // Add scroll event listeners with debounce
    const debouncedScroll = debounce(this.handleScroll, 300);
    window.addEventListener("scroll", debouncedScroll);
    window.addEventListener("resize", debouncedScroll);

    // Initial check
    this.handleScroll();
  }

  /**
   * Fetch and setup novel data
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
   * Load all chapters list for the current novel
   */
  private async loadChaptersList(): Promise<void> {
    if (!this.novelData) return;

    try {
      this.chapterList = await api.getChaptersList(this.novelData.slug);
      this.currentChapterIndex = this.chapterList.findIndex(
        (chapter) => chapter.id === this.chapterData?.id
      );
    } catch (error) {
      console.error("Failed to load chapters list:", error);
    }
  }

  /**
   * Set up the current chapter DOM element
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

    // Setup the current chapter element
    currentChapter.classList.add("chapter-container", "track-content");
    currentChapter.setAttribute(
      "novel-id",
      this.novelData?.id?.toString() ?? "null"
    );
    currentChapter.setAttribute("data-url", currentUrl);

    // Extract chapter metadata
    await this.extractChapterMetadata(
      currentChapter as HTMLElement,
      currentUrl,
      chapterTitle
    );

    // Add user options UI
    const userOptions = this.createUserOptionsUI(chapterTitle, currentUrl);
    currentChapter.appendChild(userOptions);

    this.currentChapter = currentChapter as HTMLElement;
  }

  /**
   * Extract and set chapter metadata
   */
  private async extractChapterMetadata(
    element: HTMLElement,
    url: string,
    title: string
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

    // Set chapter data
    this.chapterData = {
      id: Number(id),
      link: url,
      title: title,
      chapterIndex: index,
    };

    element.setAttribute("chapter-id", id);
  }

  /**
   * Scroll event handler for infinite loading
   */
  private handleScroll = async (): Promise<void> => {
    const scrollPercentage = this.calculateScrollPercentage();

    // Load next chapter when we're 80% through the current one
    if (scrollPercentage > 80 && !this.fetching) {
      await this.loadNextChapter();
    }
  };

  /**
   * Calculate how much of the current chapter has been scrolled
   */
  private calculateScrollPercentage(): number {
    const el = this.currentChapter;
    if (!el) return 0;

    const rect = el.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;

    // Element is above viewport (completely scrolled past)
    if (rect.top <= -rect.height) return 100;

    // Element is below viewport (not seen yet)
    if (rect.top >= windowHeight) return 0;

    // Calculate partial scroll percentage
    const scrolledPastHeight = Math.max(0, -rect.top);
    const elementHeight = rect.height;

    if (elementHeight === 0) return 0;

    return Math.min(100, (scrolledPastHeight / elementHeight) * 100);
  }

  /**
   * Load and append the next chapter
   */
  private async loadNextChapter(): Promise<void> {
    this.fetching = true;

    try {
      // Get next chapter in the list
      this.currentChapterIndex++;
      const nextChapterInfo = this.chapterList[this.currentChapterIndex];

      if (!nextChapterInfo) {
        this.fetching = false;
        return;
      }

      this.chapterData = nextChapterInfo;

      // Fetch full chapter data
      const chapterData = await api.getChapter(nextChapterInfo.id);
      await this.createChapterElement(chapterData);
    } catch (error) {
      console.error("Failed to load next chapter:", error);
    } finally {
      this.fetching = false;
    }
  }

  /**
   * Create and append a new chapter element
   */
  private async createChapterElement(chapter: APIChapter): Promise<void> {
    if (this.createdChapters.has(chapter.id)) return;
    this.createdChapters.add(chapter.id);

    const chapterContainer = Create.div({
      className: "chapter-container",
      attributes: {
        "data-url": chapter.link,
      },
    });

    const chapterTitle = Create.div({
      className: "chapter-title",
      children: [
        Create.a({
          href: chapter.link,
          textContent: chapter.title.rendered,
          className: "endless-link",
        }),
      ],
    });

    const chapterContent = Create.div({
      className: "chapter-content",
      children: [
        Create.div({
          className: "chapter-content-inner",
          innerHTML: chapter.content.rendered,
        }),
      ],
      attributes: {
        chapterId: chapter.id.toString(),
        novelId: this.novelData?.id?.toString() ?? "null",
      },
    });

    // Create user options UI
    const userOptions = this.createUserOptionsUI(
      this.chapterData?.title ?? chapter.title.rendered,
      this.chapterData?.link ?? chapter.link
    );

    // Assemble and append the chapter
    chapterContainer.appendChild(chapterTitle);
    chapterContainer.appendChild(chapterContent);
    chapterContainer.appendChild(userOptions);

    this.currentChapter?.after(chapterContainer);
    this.currentChapter = chapterContainer;
  }

  /**
   * Create user options UI element
   */
  private createUserOptionsUI(
    title: string,
    chapterUrl: string
  ): HTMLDivElement {
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
          href: "/series/" + this.novelData?.slug,
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
   * Setup style synchronization between source and new elements
   */
  private setupChapterStyle(): void {
    const sourceElement = document.querySelector(
      SITE_CONFIGS.selectors.content
    ) as HTMLElement;

    if (!sourceElement) {
      console.error(
        `Source element not found: ${SITE_CONFIGS.selectors.content}`
      );
      return;
    }

    const targetElement = document.querySelector(".epwrapper") as HTMLElement;

    if (!targetElement) {
      console.error(`Target element not found: .epwrapper`);
      return;
    }

    // Initial style copy
    this.syncStyles(sourceElement, targetElement);

    // Create observer to track style changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          this.syncStyles(sourceElement, targetElement);
        }
      });
    });

    observer.observe(sourceElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    this.styleObserver = observer;
  }

  /**
   * Sync styles between two elements
   */
  private syncStyles(source: HTMLElement, target: HTMLElement): void {
    for (const prop of source.style) {
      const value = source.style.getPropertyValue(prop);
      target.style.setProperty(prop, value);
    }
  }

  /**
   * Clean up observers and event listeners
   */
  public destroy(): void {
    // Clean up style observer
    if (this.styleObserver) {
      this.styleObserver.disconnect();
      this.styleObserver = null;
    }

    // Clean up scroll handlers
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleScroll);

    // Clear element sets
    this.observedElements.clear();
    this.createdChapters.clear();
  }
}
