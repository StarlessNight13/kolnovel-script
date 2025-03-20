import * as v from "valibot";
import { tryCatch } from "./utli";

// API_URL
const API_URL = "https://kolbook.xyz/wp-json/wp/v2";

// Schema declaration:
const chapterSchema = v.object({
  id: v.number(),
  title: v.object({
    rendered: v.string(),
  }),
  content: v.object({
    rendered: v.string(),
  }),
  link: v.string(),
  categories: v.array(v.number()),
});

const novelSchema = v.object({
  id: v.number(),
  count: v.number(),
  link: v.string(),
  name: v.string(),
  slug: v.string(),
});

const chapterListSchema = v.object({
  id: v.number(),
  title: v.string(),
  link: v.string(),
  chapterIndex: v.number(),
});

export type Chapter = v.InferInput<typeof chapterSchema>;
export type Novel = v.InferInput<typeof novelSchema>;
export type ChapterList = v.InferInput<typeof chapterListSchema>;

// API functions

export const api = {
  // Get novel
  getNovel: async (id: number) => {
    const { data: res, error: err } = await tryCatch(fetch(`${API_URL}/categories/${id}`));
    if (err) return null;
    const data = await res.json();
    const safeData = v.parse(novelSchema, data);
    return safeData;
  },
  getNovelbyChapterId: async (chapterId: number) => {
    // const res = await fetch(`${API_URL}/categories?post=${chapterId}`);
    const { data: res, error: err } = await tryCatch(fetch(`${API_URL}/categories?post=${chapterId}`));
    if (err) return null;
    const data = await res.json();
    const safeData = v.parse(v.array(novelSchema), data);
    return safeData[0];
  },

  getNovelbySlug: async (slug: string) => {
    const { data: res, error: err } = await tryCatch(fetch(`${API_URL}/categories?slug=${slug}`));
    if (err) return null;
    const data = await res.json();
    const safeData = v.parse(v.array(novelSchema), data);
    return safeData[0];
  },

  // Get Chapter
  getChapter: async (id: number) => {
    const { data: res, error: err } = await tryCatch(fetch(`${API_URL}/posts/${id}`));
    if (err) return null;
    const data = await res.json();
    const safeData = v.parse(chapterSchema, data);
    return safeData;
  },
  getChaptersByNovelId: async (
    novelId: number,
    page: number = 1,
    pageSize: number = 10
  ) => {

    const { data: res, error: err } = await tryCatch(fetch(`${API_URL}/posts?categories=${novelId}&per_page=${pageSize}&page=${page}`));
    if (err) return null;
    const data = await res.json();
    const safeData = v.parse(v.array(chapterSchema), data);
    return safeData;
  },

  getChaptersList: async (uri: string) => {
    // Fetch and parse the HTML document
    const { data: response, error: err } = await tryCatch(fetch(`https://kolbook.xyz/series/${uri}`));
    if (err) return null;
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    // Extract section titles and chapter lists
    const sectionTitles = doc.querySelectorAll(".ts-chl-collapsible");
    const chapterLists = doc.querySelectorAll<HTMLUListElement>(
      "div.bixbox.bxcl.epcheck > div > div > ul"
    );

    // Pair section titles with their corresponding chapter lists
    const sections = [];
    let currentListIndex = 0;

    for (let i = 0; i < sectionTitles.length; i++) {
      const title = sectionTitles[i].textContent?.trim() ?? "";
      const nextTitle = sectionTitles[i + 1] || null;
      let currentList = null;

      // Find all chapter lists that belong to this section title
      // (those that appear before the next section title)
      while (
        currentListIndex < chapterLists.length &&
        (!nextTitle ||
          chapterLists[currentListIndex].compareDocumentPosition(nextTitle) &
          Node.DOCUMENT_POSITION_FOLLOWING)
      ) {
        currentList = chapterLists[currentListIndex];
        currentListIndex++;
      }

      if (currentList) {
        sections.push({ title, content: currentList });
      }
    }

    // Process each section to extract chapter information
    const extractChapterInfo = (section: {
      title: string;
      content: HTMLUListElement;
    }) => {
      return Array.from(section.content?.children ?? []).map((item) => {
        const chapterId = Number(item.getAttribute("data-id"));
        const chapterLink =
          item.querySelector("a")?.getAttribute("href") ?? "404";
        const chapterTitle =
          item.querySelector(".epl-title")?.textContent ?? "unknown";
        // Clean up chapter index by removing section title and "الفصل" text
        const rawIndex = item.querySelector(".epl-num")?.textContent ?? "";
        const cleanIndex = rawIndex
          .replace(section.title ?? "الفصل", "")
          .replace("الفصل", "")
          .trim();

        return {
          id: chapterId,
          chapterIndex: Number(cleanIndex),
          title: chapterTitle,
          link: chapterLink,
        };
      });
    };

    // Process all sections and create the final chapter list
    const chapters = sections.flatMap(extractChapterInfo).reverse(); // Reverse to maintain original order

    // Validate and return the chapter list
    return v.parse(v.array(chapterListSchema), chapters);
  },
};

export const apiUtil = {
  currentChapterPage: (
    chapterCount: number,
    chapterIndex: number,
    collectionSize: number,
    offset: number = 0
  ) => {
    const totalCollections = Math.ceil(chapterCount / collectionSize);
    const originalCollection = Math.floor(
      (chapterIndex - offset) / collectionSize
    );
    const page = totalCollections - originalCollection;
    return { page, totalCollections, originalCollection };
  },
  getChapterIndex: (chapterTitle: string, novelName: string) => {
    const pureString = chapterTitle.replace(novelName, "").trim();
    const index = pureString.split(" ")[0];
    return Number(index);
  },
};
