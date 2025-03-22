import { Create } from "@/components/creat-element";
import { NotificationManager } from "@/components/Notification";
import { Chapter, Chapters, db } from "@/db";
import { api, Novel as NovelAPI } from "@/lib/API";
import { Bomb, Book, createElement, Eye, EyeClosed, EyeOff, Minus, Plus } from "lucide";

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
  private chapterList: Chapters[] = [];
  private unReadChapters: number = 0;

  constructor() {
    this.init()
      .then(() =>
        this.initChapterList()
          .then(
            () =>
              this.setupChapters()
          )
      );
  }

  /**
   * Initialize chapter list from DOM elements
   */
  private async initChapterList(): Promise<void> {
    const novelId = this.novelData?.id;
    if (!novelId) return;
    const chapterElements = document.querySelectorAll<HTMLLIElement>(
      this.selectors.novelChapters
    );

    this.chapterList = await Promise.all(Array.from(chapterElements).map(async (element) => {
      const anchorElement = element.querySelector("a") as HTMLAnchorElement;
      const chapterId = Number(element.getAttribute("data-id"));

      const savedChapter = await db.chapters.where({ id: chapterId, novelId }).first();
      if (savedChapter) {
        return savedChapter
      } else {
        await db.chapters.add({
          id: chapterId,
          link: anchorElement.getAttribute("href") ?? "404",
          title: element.textContent?.trim() ?? "unknown",
          novelId,
          readingCompletion: 0,
          lastRead: new Date(),
        });
        return {
          id: chapterId,
          link: anchorElement.getAttribute("href") ?? "404",
          title: element.textContent?.trim() ?? "unknown",
          novelId,
          readingCompletion: 0,
          lastRead: new Date(),
        };
      }
    }));
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

    if (this.novelData?.id) {
      this.addChaptersToDB(this.chapterList, this.novelData.id);
    }
  }

  /**
   * Extract novel details from the current page
   */
  private extractNovelDetails(): NovelData {
    const name = this.getElementText(this.selectors.novelTitle) ?? "Unknown";
    const cover = this.getElementAttribute(this.selectors.novelCover, "src") ?? "#";
    const chaptersCount = this.chapterList.length;
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

    const hasNewChapters = this.chapterList.length > indexedChapters.length;

    NotificationManager.show({
      message: hasNewChapters
        ? "هناك فصول جديدة في الكتاب"
        : "لم يتم العثور على فصول جديدة",
      variant: "success",
    });

    if (hasNewChapters && this.novelData.id) {
      this.addChaptersToDB(this.chapterList, this.novelData.id);
    }
  }

  /**
   * Add chapters to database
   */
  private async addChaptersToDB(chapters: Chapters[], novelId: number): Promise<void> {
    const now = new Date();

    // Get chapters that don't exist in the database yet
    const existingChapterIds = new Set(
      (await db.chapters.where({ novelId }).toArray()).map(c => c.id)
    );

    const chaptersToAdd = chapters.filter(chapter => !existingChapterIds.has(chapter.id));

    // Add new chapters to database
    if (chaptersToAdd.length > 0) {
      await db.chapters.bulkAdd(
        chaptersToAdd.map(chapter => ({
          id: chapter.id,
          link: chapter.link,
          novelId: novelId,
          title: chapter.title,
          readingCompletion: 0,
          lastRead: now,
        }))
      );
    }

    document.querySelector("#update-chapters-btn")?.remove();
  }

  /**
   * Setup chapter UI elements with reading status
   */
  private async setupChapters(): Promise<void> {
    if (!this.novelData?.id) return;
    // Check reading status for each chapter
    const chaptersReadStatus = await Promise.all(
      this.chapterList.map(async (chapter) => {
        return chapter.readingCompletion < 100;
      })
    );

    this.unReadChapters = chaptersReadStatus.filter(Boolean).length;

    NotificationManager.show({
      message: `عدد الفصول الغير مقروءة: ${this.unReadChapters}`,
      variant: "success",
    });

    // Add action buttons to each chapter
    const chapterElements = Array.from(
      document.querySelectorAll<HTMLLIElement>(this.selectors.novelChapters)
    );

    chapterElements.forEach(async (element) => {
      const chapterId = element.getAttribute("data-id");
      if (!chapterId) return;
      const chapterIndex = this.chapterList.findIndex(c => c.id === Number(chapterId))
      const chapter = this.chapterList[chapterIndex];
      if (!chapter) return;
      const read = chapter?.readingCompletion === 100;

      const actionBtn = this.createChapterActionButton(chapter, read, chapterIndex);
      element.appendChild(actionBtn);
    });
  }

  /**
   * Create dropdown action button for chapters
   */
  private createChapterActionButton(chapter: Chapter & { id: number }, read: boolean, index: number): HTMLElement {
    if (read) {
      return Create.dropDownMenu({
        icon: createElement(EyeOff),
        label: "⋯",
        iconOnly: true,
        options: [{
          value: "asUnread",
          text: "غير مقروء",
          icon: createElement(EyeClosed),
          clickFunc: () => this.updateChapter({ ...chapter, readingCompletion: 0 }).then(() => {
            NotificationManager.show({
              message: "تم تحديث حالة القراءة",
              variant: "success",
            });
          }),
        },
        {
          value: "prevAsUnread",
          text: "لم اقرا ما سبق",
          icon: createElement(Bomb),
          clickFunc: () => {
            this.markPreviousChaptersAsUnread(index);
            NotificationManager.show({
              message: "تم تحديث حالة القراءة",
              variant: "success",
            });
          },
        }
        ],
      });
    }
    return Create.dropDownMenu({
      icon: createElement(Eye),
      label: "⋯",
      iconOnly: true,
      options: [{
        value: "asRead",
        text: "مقروء",
        icon: createElement(Eye),
        clickFunc: () => this.updateChapter({ ...chapter, readingCompletion: 100 }).then(() => {
          NotificationManager.show({
            message: "تم تحديث حالة القراءة",
            variant: "success",
          });
        }),
      },
      {
        value: "prevAsRead",
        text: "قرأت ما سبق",
        icon: Create.element("span", {
          innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-eye-down"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M12 18c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /><path d="M19 16v6" /><path d="M22 19l-3 3l-3 -3" /></svg>`,
        }),
        clickFunc: () => {
          this.markPreviousChaptersAsRead(index);
          NotificationManager.show({
            message: "تم تحديث حالة القراءة",
            variant: "success",
          });
        },
      }
      ],
    });
  }


  private async markPreviousChaptersAsUnread(index: number): Promise<void> {
    const chapters = this.chapterList;
    if (!chapters) return;
    const chapter = chapters[index];
    if (!chapter) return;

    for (let i = index; i < chapters.length; i++) {
      const prevChapter = chapters[i];
      if (!prevChapter) return;
      await this.updateChapter({ ...prevChapter, readingCompletion: 0, lastRead: new Date() });
    }

  }

  private async markPreviousChaptersAsRead(index: number): Promise<void> {
    const chapters = this.chapterList;
    if (!chapters) return;
    const chapter = chapters[index];
    if (!chapter) return;

    for (let i = index; i > 0; i++) {
      const prevChapter = chapters[i];
      if (!prevChapter) return;
      await this.updateChapter({ ...prevChapter, readingCompletion: 100, lastRead: new Date() });
    }

  }

  /**
   * Update chapter reading status in database
   */
  private async updateChapter(chapter: Chapter & { id: number }): Promise<void> {
    await db.chapters.update(chapter.id, {
      readingCompletion: chapter.readingCompletion,
      lastRead: chapter.lastRead,
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