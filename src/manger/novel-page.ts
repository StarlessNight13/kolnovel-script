import { Create } from "@/components/creat-element";
import { NotificationManager } from "@/components/Notification";
import { db } from "@/db";
import { Book, Minus, Plus, createElement } from "lucide";

// Type definitions
interface NovelData {
  name: string;
  cover: string;
  novelChapters: number;
  uri: string;
}

interface Novel {
  id?: number;
  status: NovelStatus;
  chaptersCount: number;
  uri: string;
  name: string;
  cover: string;
}

// Enum for novel statuses
enum NovelStatus {
  READING = "reading",
  COMPLETED = "completed",
  DROPPED = "dropped",
  PLAN_TO_READ = "planToRead",
}

// Enum for library actions
enum LibraryAction {
  READING = "reading",
  PLANNING = "planning",
  REMOVE = "remove",
}

// Notification configuration
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

// Mapping of status to display text
const STATUS_DISPLAY_TEXT = {
  [NovelStatus.READING]: "يقرأ",
  [NovelStatus.COMPLETED]: "تم أنهاءه",
  [NovelStatus.DROPPED]: "تم التخلي عنه",
  [NovelStatus.PLAN_TO_READ]: "يخطط للقراءة",
};

// Button configuration
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
  private buttonContainer: HTMLDivElement | null = null;
  private infoContent: HTMLDivElement | null = null;

  private selectors = {
    novelTitle: "article > div.sertobig > div > div.sertoinfo > h1",
    novelCover: "article > div.sertobig > div > div.sertothumb > img",
    novelChapters: ".eplister > ul > li > a",
    novelDataContainer: "div.sertoinfo",
  };

  /**
   * Initialize the novel library management page
   */
  public async init(): Promise<void> {
    this.createPageElements();
    await this.updateNovelStatus();
    this.showButtonContainer();
  }

  /**
   * Create page elements for the novel management UI
   */
  private createPageElements(): void {
    // Create follow info container
    this.infoContent = Create.div({
      className: "info-content",
      id: "follow-info",
    });

    const followContainer = Create.div({
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
      children: [followContainer, this.buttonContainer],
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

    buttonsContainer.addEventListener(
      "click",
      this.handleButtonClick.bind(this)
    );
    return buttonsContainer;
  }

  /**
   * Handle button click events
   */
  private handleButtonClick(e: Event): void {
    const target = e.target as HTMLButtonElement;
    if (target.tagName !== "BUTTON") return;

    const action = target.getAttribute("data-action") as LibraryAction;
    if (!action) return;

    const novelData = this.extractNovelDetails();
    this.handleNovelAction(novelData, action);
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
   * Extract novel details from the current page
   */
  private extractNovelDetails(): NovelData {
    const novelId = this.getNovelIdFromUrl();
    const novelName =
      this.getElementText(this.selectors.novelTitle) ?? "Unknown";
    const novelCover =
      this.getElementAttribute(this.selectors.novelCover, "src") ?? "#";
    const chaptersCount = document.querySelectorAll(
      this.selectors.novelChapters
    ).length;

    return {
      name: novelName,
      uri: novelId,
      cover: novelCover,
      novelChapters: chaptersCount,
    };
  }

  /**
   * Get novel ID from the current URL
   */
  private getNovelIdFromUrl(): string {
    return window.location.pathname.split("/")[2];
  }

  /**
   * Get text content from an element
   */
  private getElementText(selector: string): string | null {
    return (
      document.querySelector<HTMLElement>(selector)?.textContent?.trim() ?? null
    );
  }

  /**
   * Get attribute from an element
   */
  private getElementAttribute(
    selector: string,
    attribute: string
  ): string | null {
    return (
      document.querySelector<HTMLElement>(selector)?.getAttribute(attribute) ??
      null
    );
  }

  /**
   * Update the UI to reflect the novel's library status
   */
  private async updateNovelStatus(): Promise<void> {
    if (!this.buttonContainer || !this.infoContent) return;

    const novelId = this.getNovelIdFromUrl();
    const indexed = await db.novels.where({ uri: novelId }).first();

    if (indexed) {
      this.buttonContainer.setAttribute("data-indexed", "true");
      this.infoContent.textContent = this.getReadingStateText(indexed.status);
    } else {
      this.buttonContainer.setAttribute("data-indexed", "false");
      this.infoContent.textContent = "هذا الكتاب غير موجود في المكتبة";
    }
  }

  /**
   * Get reading state text based on status
   */
  private getReadingStateText(status: string): string {
    return (
      STATUS_DISPLAY_TEXT[status as NovelStatus] ||
      STATUS_DISPLAY_TEXT[NovelStatus.PLAN_TO_READ]
    );
  }

  /**
   * Handle novel library actions (add, remove, planning)
   */
  private async handleNovelAction(
    novel: NovelData,
    action: LibraryAction
  ): Promise<void> {
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
    const indexed = await db.novels.where({ uri: novel.uri }).first();
    if (indexed) {
      await db.novels.where({ id: indexed.id }).delete();
    }
  }

  /**
   * Add a novel to the library
   */
  private async addNovelToLibrary(
    novel: NovelData,
    action: LibraryAction
  ): Promise<void> {
    const status =
      action === LibraryAction.PLANNING
        ? NovelStatus.PLAN_TO_READ
        : NovelStatus.READING;

    const newNovel: Novel = {
      status,
      chaptersCount: novel.novelChapters,
      uri: novel.uri,
      name: novel.name,
      cover: novel.cover,
    };

    await db.novels.add(newNovel);
  }

  /**
   * Create notification based on action
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
