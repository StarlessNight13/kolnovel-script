import { Create } from "@/components/creat-element";
import { NotificationManager } from "@/components/Notification";
import { db } from "@/db";
import { api, Novel as NovelAPI } from "@/lib/API";
import { Book, createElement, Minus, Plus } from "lucide";

// Type definitions
interface NovelData {
  id?: number;
  name: string;
  cover: string;
  chaptersCount: number;
  slug: string;
}

enum NovelStatus {
  READING = "reading",
  COMPLETED = "completed",
  DROPPED = "dropped",
  PLAN_TO_READ = "planToRead",
}

enum LibraryAction {
  READING = "reading",
  PLANNING = "planning",
  REMOVE = "remove",
}


// Configuration objects
const STATUS_DISPLAY_TEXT = {
  [NovelStatus.READING]: "يقرأ",
  [NovelStatus.COMPLETED]: "تم أنهاءه",
  [NovelStatus.DROPPED]: "تم التخلي عنه",
  [NovelStatus.PLAN_TO_READ]: "يخطط للقراءة",
};

const NOTIFICATIONS = {
  [LibraryAction.REMOVE]: {
    message: "Removed from library",
    variant: "success" as const,
  },
  [LibraryAction.PLANNING]: {
    message: "Planning to read",
    variant: "warning" as const,
  },
  [LibraryAction.READING]: {
    message: "Added to library",
    variant: "success" as const,
  },
};

const LIBRARY_BUTTONS = [
  {
    id: "reading-btn",
    text: "Add to Library",
    icon: Plus,
    action: LibraryAction.READING,
  },
  {
    id: "planning-btn",
    text: "Planning to read",
    icon: Book,
    action: LibraryAction.PLANNING,
    variant: "muted" as const,
  },
  {
    id: "remove-btn",
    text: "Remove from Library",
    icon: Minus,
    action: LibraryAction.REMOVE,
    variant: "destructive" as const,
  },
];

/**
 * Novel page manager for KolNovel site
 */
export class NovelPageManager {
  private readonly selectors = {
    novelTitle: "article > div.sertobig > div > div.sertoinfo > h1",
    novelCover: "article > div.sertobig > div > div.sertothumb > img",
    novelChapters: ".eplister > ul > li",
    novelDataContainer: "div.sertoinfo",
  };

  private buttonContainer: HTMLDivElement | null = null;
  private infoContent: HTMLDivElement | null = null;
  private novelData: NovelAPI | null = null;

  constructor() {
    this.init()
      .then(() =>
        this.initChapterList()
      );
  }

  /**
   * Initialize chapter list from DOM elements
   */
  private async initChapterList(): Promise<void> {
    const novelId = this.novelData?.id;
    if (!novelId) return;
  }

  /**
   * Initialize the novel library management page
   */
  public async init(): Promise<void> {
    await this.fetchNovelData();
    this.createPageElements();
    await this.updateNovelStatus();
    this.showButtonContainer();
    await this.updateNovelChapters();
  }

  /**
   * Fetch novel data from API based on URL slug
   */
  private async fetchNovelData(): Promise<void> {
    const slug = window.location.pathname.split("/")[2];
    this.novelData = await api.getNovelbySlug(slug);
  }

  /**
   * Create page elements for the novel management UI
   */
  private createPageElements(): void {
    // Create status info container
    this.infoContent = Create.div({
      className: "info-content",
      id: "follow-info",
    });

    const statusContainer = Create.div({
      className: "state-containter",
      children: [
        Create.div({
          className: "follow-title",
          textContent: "الحالة",
        }),
        this.infoContent,
      ],
    });

    // Create button container
    this.buttonContainer = this.createLibraryButtons();
    this.buttonContainer.style.display = "none";

    // Create and append novel data container
    const novelDataContainer = Create.div({
      id: "novel-data-container",
      children: [statusContainer, this.buttonContainer],
    });

    document
      .querySelector(this.selectors.novelDataContainer)
      ?.appendChild(novelDataContainer);
  }

  /**
   * Create library management buttons
   */
  private createLibraryButtons(): HTMLDivElement {
    const buttonsContainer = Create.div({
      id: "lib-container",
    });

    LIBRARY_BUTTONS.forEach(({ id, text, icon, action, variant }) => {
      const button = Create.button({
        id,
        textContent: text,
        className: "endless-button",
        children: createElement(icon),
        variant,
      });

      button.setAttribute("data-action", action);
      buttonsContainer.appendChild(button);
    });

    buttonsContainer.addEventListener("click", this.handleButtonClick.bind(this));
    return buttonsContainer;
  }

  /**
   * Handle button click events
   */
  private handleButtonClick(e: Event): void {
    const target = e.target as HTMLElement;
    const button = target.closest("button");
    if (!button) return;

    const action = button.getAttribute("data-action") as LibraryAction;
    if (!action) return;

    const novelData = this.extractNovelDetails();
    this.handleNovelAction(novelData, action);

  }

  /**
   * Extract novel details from the current page
   */
  private extractNovelDetails(): NovelData {
    const name = this.getElementText(this.selectors.novelTitle) ?? "Unknown";
    const cover = this.getElementAttribute(this.selectors.novelCover, "src") ?? "#";
    const chaptersCount = this.novelData?.count ?? 0;
    const slug = this.novelData?.slug ?? window.location.pathname.split("/")[2];

    return {
      id: this.novelData?.id,
      name,
      cover,
      chaptersCount,
      slug,
    };
  }

  /**
   * Show the button container
   */
  private showButtonContainer(): void {
    if (this.buttonContainer) {
      this.buttonContainer.style.removeProperty("display");
    }
  }

  /**
   * Update novel chapters in database if new chapters are found
   */
  private async updateNovelChapters(): Promise<void> {
    if (!this.novelData?.id) return;

    const indexedChapters = await db.chapters
      .where({ novelId: this.novelData.id })
      .toArray();

    const hasNewChapters = this.novelData?.count > indexedChapters.length;

    NotificationManager.show({
      message: hasNewChapters
        ? "هناك فصول جديدة في الكتاب"
        : "لم يتم العثور على فصول جديدة",
      variant: "success",
    });

  }

  /**
   * Get text content from an element
   */
  private getElementText(selector: string): string | null {
    return document.querySelector<HTMLElement>(selector)?.textContent?.trim() ?? null;
  }

  /**
   * Get attribute from an element
   */
  private getElementAttribute(selector: string, attribute: string): string | null {
    return document.querySelector<HTMLElement>(selector)?.getAttribute(attribute) ?? null;
  }

  /**
   * Update the UI to reflect the novel's library status
   */
  private async updateNovelStatus(): Promise<void> {
    if (!this.buttonContainer || !this.infoContent || !this.novelData?.id) return;

    const novel = await db.novels.where({ id: this.novelData.id }).first();

    if (novel) {
      this.buttonContainer.setAttribute("data-indexed", "true");
      this.infoContent.textContent = this.getStatusDisplayText(novel.status);
    } else {
      this.buttonContainer.setAttribute("data-indexed", "false");
      this.infoContent.textContent = "هذا الكتاب غير موجود في المكتبة";
    }
  }

  /**
   * Get reading state text based on status
   */
  private getStatusDisplayText(status: string): string {
    return STATUS_DISPLAY_TEXT[status as NovelStatus] ||
      STATUS_DISPLAY_TEXT[NovelStatus.PLAN_TO_READ];
  }

  /**
   * Handle novel library actions (add, remove, planning)
   */
  private async handleNovelAction(novel: NovelData, action: LibraryAction): Promise<void> {
    if (action === LibraryAction.REMOVE) {
      await this.removeNovelFromLibrary(novel);
    } else {
      await this.addNovelToLibrary(novel, action);
    }

    await this.updateNovelStatus();
    this.showNotification(action);
  }

  /**
   * Remove a novel from the library
   */
  private async removeNovelFromLibrary(novel: NovelData): Promise<void> {
    if (novel.id) {
      await db.novels.where({ id: novel.id }).delete();
    }
  }

  /**
   * Add a novel to the library
   */
  private async addNovelToLibrary(novel: NovelData, action: LibraryAction): Promise<void> {
    const status = action === LibraryAction.PLANNING
      ? NovelStatus.PLAN_TO_READ
      : NovelStatus.READING;

    const newNovel = {
      id: novel.id,
      status,
      chaptersCount: novel.chaptersCount,
      uri: novel.slug,
      name: novel.name,
      cover: novel.cover,
    };

    await db.novels.add(newNovel);
  }

  /**
   * Show notification based on action
   */
  private showNotification(action: LibraryAction): void {
    const notification = NOTIFICATIONS[action];
    if (notification) {
      NotificationManager.show({
        message: notification.message,
        variant: notification.variant,
      });
    }
  }
}