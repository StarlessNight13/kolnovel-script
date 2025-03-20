import { NotificationManager } from "./components/Notification";
import { initLibrary } from "./lib/library";
import { MasterObserver } from "./manger/master-observer";
import { NovelPageManager } from "./manger/novel-page";
import { URLManager } from "./manger/URLManager";
import "./style/index.css";

(async () => {
  console.clear();
  console.log("kolnovel Inhance");

  always();
  const currentPage = findCurrentPage();
  NotificationManager.init();

  if (currentPage === "user-library") {
    document.body.classList.add("libraryPage");
    initLibrary();
  } else if (currentPage === "chapter") {
    document.body.classList.add("chapterPage");
    document.body.classList.add("removeElements");
    new MasterObserver();
    new URLManager();
  } else if (currentPage === "page") {
    document.body.classList.add("novelPage");

    const manager = new NovelPageManager();
    await manager.init();
  } else {
    document.body.classList.add("otherPage");
  }

  document.body.setAttribute("page", currentPage);
  console.log("🚀 ~ currentPage:", currentPage);
})();

function always() {
  const nav = document.querySelector('[role="navigation"] ul');
  const libraryLink = document.createElement("li");
  libraryLink.innerHTML = `<a href="/my-account/#user-library">مكتبة شخصية</a>`;
  const classesToAdd = [
    "menu-item",
    "menu-item-type-custom",
    "menu-item-object-custom",
  ];
  libraryLink.classList.add(...classesToAdd);
  nav?.appendChild(libraryLink);
  document.querySelector("#menu-item-185962")?.remove();
  document.querySelector("#menu-item-185963")?.remove();
}

function findCurrentPage() {
  if (document.querySelector("article > div.bixbox.episodedl")) {
    return "chapter";
  } else if (document.querySelector("article > div.sertobig")) {
    return "page";
  } else if (location.hash.includes("#user-library")) {
    return "user-library";
  } else {
    return "home";
  }
}
