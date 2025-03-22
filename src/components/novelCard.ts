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

    const readChaptersCount = novelChapters.length;

    let newestChapter: Chapter = novelChapters[0]; // Initialize with the first item

    for (let i = 1; i < novelChapters.length; i++) {
      if (novelChapters[i].lastRead > newestChapter.lastRead) {
        newestChapter = novelChapters[i]; // Update newestItem if a newer item is found
      }
    }

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

    // Card header
    const cardHeader = Create.div({
      className: "novel-card-header",
    });

    const titleLink = Create.a({
      href: SITE_CONFIGS.novelPath + this.novel.uri,
      className: "endless-link",
    });



    const title = document.createElement("h4");
    title.className = "novel-title truncate";
    title.textContent = this.novel.name;
    titleLink.appendChild(title);
    cardHeader.appendChild(titleLink);

    // Card content
    const cardContent = Create.div({
      className: "novel-card-content",
    });

    // Chapters info
    const chaptersDiv = Create.div({
      className: "novel-info-item",
      children: [
        Create.span({
          children: createElement(Book),
        }),
        Create.span({
          className: "truncate",
          textContent: `${this.novel.chaptersCount} فصلاً`,
          attributes: {
            style: "margin-inline: 5px",
          },
        }),
      ],
    });

    // append chapters div
    cardContent.appendChild(chaptersDiv);

    // Latest chapter badge
    if (readChaptersCount > 0) {
      const badgeContainer = Create.div({
        className: "novel-info-item",
        children: [
          Create.span({
            children: createElement(BookOpenCheck),
          }),
          Create.span({
            className: "truncate",
            textContent: `قرات ${readChaptersCount} من ${this.novel.chaptersCount}`,
            attributes: {
              style: "margin-inline: 5px",
            },
          }),
        ],
      });
      cardContent.appendChild(badgeContainer);
    }

    // Last read info
    if (unFinishedChapter) {
      const lastReadDiv = Create.div({
        className: "tw:flex tw:flex-col tw:gap-1 tw:border-t tw:pt-5",
        children: [
          Create.div({
            className: "novel-info-item",
            children: [
              Create.span({
                children: createElement(EyeClosed),
              }),
              Create.span({
                className: "truncate",
                textContent: unFinishedChapter.title,
                attributes: {
                  style: "margin-inline: 5px",
                },
              }),
            ],
          }),
        ],
      });

      // append last read div
      cardContent.appendChild(lastReadDiv);
    }


    if (newestChapter) {
      cardContent.appendChild(
        Create.div({
          className: "novel-info-item",
          children: [
            Create.span({
              children: createElement(Calendar),
            }),
            Create.span({
              className: "truncate",
              textContent: `${newestChapter.lastRead.toLocaleDateString()}`,
              attributes: {
                style: "margin-inline: 5px",
              },
            }),
          ],
        }),
      )
    }

    // Card footer
    const cardFooter = Create.div({
      className: "novel-card-footer",
    });

    // Continue reading button
    cardFooter.appendChild(Create.a({
      href: unFinishedChapter?.link ?? SITE_CONFIGS.novelPath + this.novel.uri,
      className: "endless-button",
      textContent: unFinishedChapter ? "استمر في القراءة" : "ابدأ القراءة",
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
    this.novelCard.appendChild(imageContainer);
    this.novelCard.appendChild(cardHeader);
    this.novelCard.appendChild(cardContent);
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
