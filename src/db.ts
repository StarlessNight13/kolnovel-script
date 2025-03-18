import Dexie, { type EntityTable } from "dexie";

interface Novels {
  /**
   * Unique identifier for the novel.
   */
  id: number;
  /**
   * URI or URL linking to the novel's resource.
   */
  uri: string;
  /**
   * Title or name of the novel.
   */
  name: string;
  /**
   * URL to the cover image of the novel.
   */
  cover: string;
  /**
   * Current reading status of the novel.
   * Can be one of: "reading", "planToRead", "dropped", "paused", or "completed".
   */
  status: "reading" | "planToRead" | "dropped" | "paused" | "completed";

  /**
   * The total amount of Chapters in the novel.
   */
  chaptersCount: number;
}

interface Chapters {
  /**
   * auto incremented id
   */
  id: number;
  /**
   * foreign key to the novel id
   */
  novelId: number;
  /**
   * the link to the chapter
   */
  link: string;
  /**
   * how much of the chapter has been read in percent
   * from 0 to 100
   */
  readingCompletion: number;
  /**
   * the chapter Title
   */
  title: string;
  /**
   * last read date
   */
  lastRead: Date;
}

const db = new Dexie("UserLibrary") as Dexie & {
  novels: EntityTable<Novels, "id">;
  chapters: EntityTable<Chapters, "id">;
};

// Schema declaration:
db.version(2).stores({
  novels: "id, uri, name, cover, status, chaptersCount",
  chapters: "id, novelId, title, link, readingCompletion, lastRead",
});

export type Novel = Omit<Novels, "id">;
export type Chapter = Omit<Chapters, "id">;

export type { Novels, Chapters };
export { db };
