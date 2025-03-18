import { NotificationManager } from "./components/Notification";
import { api } from "./lib/API";
import { MasterObserver } from "./manger/master-observer";
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
  } else if (currentPage === "chapter") {
    document.body.classList.add("chapterPage");
    document.body.classList.add("removeElements");
    new MasterObserver();
    new URLManager();
  } else if (currentPage === "page") {
    document.body.classList.add("novelPage");
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

async function test() {
  const article = document.querySelector("article");

  if (article) {
    const articleID = article.id;
    const id = articleID.split("-")[1];
    if (!Number.isNaN(Number(id))) {
      const novel = await api.getNovelbyChapterId(Number(id));
      const chapterPatch = await api.getChaptersByNovelId(novel.id);
    }
  }
}
