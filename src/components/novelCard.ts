import { SITE_CONFIGS } from "@/config";
import {
  Book,
  BookOpenCheck,
  Calendar,
  createElement,
  EyeClosed,
} from "lucide";
import { db, Novels } from "../db";
import { Create } from "./creat-element";

export class NovelComponent {
  private container: HTMLElement;
  private novel: Novels;
  private novelCard: HTMLDivElement;

  constructor(container: HTMLElement, novel: Novels) {
    this.container = container;
    this.novel = novel;
    // Create the card container
    this.novelCard = Create.div({
      className: "novel-card",
      id: this.novel.id.toString(),
      attributes: {
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
    });

    const title = document.createElement("h4");
    title.className =
      "tw:scroll-m-20 tw:text-xl tw:font-semibold tw:tracking-tight tw:first:mt-0 tw:text-center tw:truncate";
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
          Create.div({
            className: "novel-info-item",
            children: [
              Create.span({
                children: createElement(Calendar),
              }),
              Create.span({
                className: "truncate",
                textContent: `${unFinishedChapter.lastRead.toLocaleDateString()}`,
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
    // Card footer
    const cardFooter = Create.div({
      className: "novel-card-footer",
    });

    // Continue reading button
    const button = Create.a({
      href: unFinishedChapter?.link ?? SITE_CONFIGS.novelPath + this.novel.uri,
      className: "endless-button",
      textContent: unFinishedChapter ? "استمر في القراءة" : "ابدأ القراءة",
    });
    cardFooter.appendChild(button);

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

  private async deleteNovel() {
    const novelId = this.novel.id;
    await db.novels.delete(novelId);
    await db.chapters.where({ novelId }).delete();
    this.novelCard.remove();
  }
}
