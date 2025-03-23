import { SITE_CONFIGS } from "@/config";
import {
  Book,
  BookOpenCheck,
  Calendar,
  createElement,
  EyeClosed,
} from "lucide";
import { Chapter, db, Novels } from "../db";
import { Create } from "./creat-element";

// Enums for novel status types

const NovelStatus = {
  READING: {
    text: "أقرا حاليا",
    value: "reading",
  },
  COMPLETED: {
    text: "اكملتها",
    value: "completed",
  },
  DROPPED: {
    text: "مسحوب عليها",
    value: "dropped",
  },
  PLAN_TO_READ: {
    text: "أقرا لاحقا",
    value: "planToRead",
  },
} as const;




export class NovelComponent {
  private container: HTMLElement;
  private novel: Novels;
  private novelCard: HTMLDivElement;
  private reRender: () => Promise<void>;

  constructor(container: HTMLElement, novel: Novels, reRender: () => Promise<void>, hasUpdates?: boolean,) {
    this.container = container;
    this.novel = novel;
    this.reRender = reRender;
    // Create the card container
    this.novelCard = Create.div({
      className: "novel-card",
      id: this.novel.id.toString(),
      attributes: {
        "has-updates": hasUpdates?.toString() ?? "false",
        "data-novel-id": this.novel.id.toString(),
      },
    });
    this.render();
  }

  private async render(): Promise<void> {
    const novelChapters = await db.chapters
      .where({ novelId: this.novel.id })
      .toArray();

    const novelChaptersCount = novelChapters.length;

    let newestChapter: Chapter = novelChapters[0]; // Initialize with the first item

    for (let i = 1; i < novelChapters.length; i++) {
      if (novelChapters[i].lastRead > newestChapter.lastRead) {
        newestChapter = novelChapters[i]; // Update newestItem if a newer item is found
      }
    }

    const readChapters = novelChapters.filter(chapter => chapter.readingCompletion === 100);

    // find the first chapter that is not read
    const unFinishedChapter = novelChapters.find(
      (chapter) => chapter.readingCompletion < 100
    );


    // Image container
    const imageContainer = Create.a({
      className: "novel-image-container",
      href: SITE_CONFIGS.novelPath + this.novel.uri,
    });

    const image = document.createElement("img");
    image.src = this.novel.cover || "/placeholder.svg";
    image.alt = this.novel.name;
    image.classList.add("novel-image");
    imageContainer.appendChild(image);

    const titleLink = Create.a({
      href: SITE_CONFIGS.novelPath + this.novel.uri,
      className: "endless-link novel-title-link",
    });



    const title = document.createElement("h4");
    title.className = "novel-title truncate";
    title.textContent = this.novel.name;
    titleLink.appendChild(title);
    // Card header
    const cardHeader = Create.div({
      className: "novel-card-header",
      children: [imageContainer, titleLink],
    });


    // Chapters info
    if (readChapters.length > 0) {
      const badgeContainer = Create.div({
        className: "novel-chapters-info read",
        children: [
          Create.element<HTMLSpanElement>("span", {
            className: "all-chapters",
            textContent: novelChaptersCount.toString(),
          }),
          Create.element<HTMLSpanElement>("span", {
            className: "read-chapters",
            textContent: readChapters.length.toString(),
          }),
        ],
      });
      this.novelCard.appendChild(badgeContainer);
    } else {
      const badgeContainer = Create.div({
        className: "novel-chapters-info",
        children: [
          Create.element<HTMLSpanElement>("span", {
            className: "all-chapters",
            textContent: novelChaptersCount.toString(),
          }),
        ],
      });
      this.novelCard.appendChild(badgeContainer);
    }



    // Card footer
    const cardFooter = Create.div({
      className: "novel-card-footer",
    });


    // Novel progress bar
    const novelProgressBar = Create.progressBar({
      value: readChapters.length,
      maxValue: novelChaptersCount,
    });
    cardFooter.appendChild(novelProgressBar);
    // Continue reading button
    cardFooter.appendChild(Create.a({
      href: unFinishedChapter?.link ?? SITE_CONFIGS.novelPath + this.novel.uri,
      className: "endless-button",
      textContent: unFinishedChapter ? "أكمل القراءة" : "ابدأ القراءة",
    }));

    // Change novel status Select element

    const options = Object.keys(NovelStatus).map((e) => ({
      value: e,
      text: NovelStatus[e as keyof typeof NovelStatus].text,
      selected: this.novel.status === NovelStatus[e as keyof typeof NovelStatus].value,
    }));

    const novelStatusSelect = Create.select({
      options: options,
      clickFunc: (e) => {
        e.stopPropagation();
        e.preventDefault();
        const select = e.target as HTMLSelectElement;
        if (select.value in NovelStatus) {
          const status = select.value as keyof typeof NovelStatus;
          this.updateNovelStatus({ status });
        }
      }
    });



    cardFooter.appendChild(novelStatusSelect.wrapper);

    // Delete novel button
    const deleteButton = document.createElement("button");
    deleteButton.className = "endless-button";
    deleteButton.setAttribute("data-variant", "destructive");
    deleteButton.textContent = "أحذف الرواية";
    deleteButton.addEventListener("click", () => this.deleteNovel());
    cardFooter.appendChild(deleteButton);

    // Assemble the card
    this.novelCard.appendChild(cardHeader);
    this.novelCard.appendChild(cardFooter);

    // Add to container
    this.container.appendChild(this.novelCard);
  }

  private async updateNovelStatus({ status }: { status: keyof typeof NovelStatus }) {
    await db.novels.update(this.novel.id, { status: NovelStatus[status as keyof typeof NovelStatus].value });
    await this.reRender();
  }

  private async deleteNovel() {
    const novelId = this.novel.id;
    await db.novels.delete(novelId);
    await db.chapters.where({ novelId }).delete();
    this.novelCard.remove();
  }
}
