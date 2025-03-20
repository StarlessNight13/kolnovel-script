import { LibraryManager } from "@/manger/library-manager";


/**
 * Initialize the library page
 */
export function initLibrary(): void {
  const contentContainer = document.querySelector<HTMLElement>("#content");
  if (!contentContainer) return;
  window.document.title = "المكتبة";

  contentContainer.innerHTML = "";
  new LibraryManager(contentContainer);
}
