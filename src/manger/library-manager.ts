import { Create } from "@/components/creat-element";
import { NotificationManager } from "@/components/Notification";
import { db, Novels } from "@/db";
import { createElement, RefreshCcw } from "lucide";
import { NovelComponent } from "@/components/novelCard";
import { api } from "@/lib/API";

// Enums for novel status types
enum NovelStatus {
    READING = "reading",
    COMPLETED = "completed",
    DROPPED = "dropped",
    PLAN_TO_READ = "planToRead",
}



// Type definitions for novel grouping
interface NovelGroup {
    text: string;
    novels: Novels[];
}

interface NovelGroups {
    [NovelStatus.READING]: NovelGroup;
    [NovelStatus.COMPLETED]: NovelGroup;
    [NovelStatus.DROPPED]: NovelGroup;
    [NovelStatus.PLAN_TO_READ]: NovelGroup;
}

// Type definition for novel update results
interface NovelUpdateResult {
    id: number;
    hasUpdates: boolean;
}

interface UpdateResults {
    updates: number[];
    noUpdates: number[];
}

/**
 * Library Manager class responsible for handling the library UI and functionality
 */
export class LibraryManager {
    private novelGroups: NovelGroups = {
        [NovelStatus.READING]: {
            text: "Reading",
            novels: [],
        },
        [NovelStatus.COMPLETED]: {
            text: "Completed",
            novels: [],
        },
        [NovelStatus.DROPPED]: {
            text: "Dropped",
            novels: [],
        },
        [NovelStatus.PLAN_TO_READ]: {
            text: "Plan to read",
            novels: [],
        },
    };

    /**
     * Initialize the library manager
     * @param container The container element to render the library in
     */
    constructor(private container: HTMLElement) {
        this.initialize();
    }

    /**
     * Initialize the library components
     */
    private async initialize(): Promise<void> {
        this.container.appendChild(this.createUserSettings());
        this.renderNovelGroups();
    }

    /**
     * Load all novels from the database and categorize them
     */
    private async loadNovels(): Promise<void> {
        const novels = await db.novels.toArray();

        // Reset all novel arrays
        Object.values(this.novelGroups).forEach((group) => {
            group.novels = [];
        });

        // Sort novels into their respective groups
        novels.forEach((novel) => {
            const status = novel.status as NovelStatus;
            if (this.novelGroups[status]) {
                this.novelGroups[status].novels.push(novel);
            }
        });
    }

    /**
     * Creates the auto-loader toggle UI component
     */
    private createAutoLoaderToggle(): HTMLDivElement {
        const { container: toggleContainer, input: toggleInput } = Create.toggle();

        const savedSetting = localStorage.getItem("autoLoaderState") === "true";
        toggleInput.checked = savedSetting;

        toggleInput.addEventListener("change", () => {
            localStorage.setItem("autoLoaderState", toggleInput.checked.toString());
        });

        return toggleContainer;
    }

    /**
     * Creates the user settings UI components
     */
    private createUserSettings(): HTMLDivElement {
        return Create.div({
            className: "settings",
            children: [
                Create.div({
                    className: "settings-header",
                    children: [
                        Create.div({
                            className: "settings-header-title",
                            innerHTML: `<h3>اعدادت</h3>`,
                        }),
                    ],
                }),
                Create.div({
                    className: "settings-content",
                    children: [
                        Create.div({
                            className: "settings-item",
                            children: [this.createAutoLoaderToggle()],
                        }),
                        Create.div({
                            className: "settings-item",
                            children: [
                                Create.button({
                                    id: "sync-btn",
                                    textContent: "البحث عن الفصول الجديدة",
                                    className: "endless-button",
                                    icon: createElement(RefreshCcw),
                                    clickFunc: this.updateNovels.bind(this),
                                }),
                            ],
                        }),
                    ],
                }),
                Create.div({
                    className: "settings-footer",
                }),
            ],
        });
    }

    /**
     * Updates novels with new chapter information
     */
    private async updateNovels(): Promise<void> {
        const novels = this.novelGroups[NovelStatus.READING].novels;

        try {
            const { updates, noUpdates } = await this.fetchNovelData(novels);

            this.displayUpdateNotifications(updates.length, noUpdates.length);

            if (updates.length > 0) {
                this.renderNovelGroups(updates);
            }
        } catch (error) {
            console.error("Failed to update novels:", error);
            NotificationManager.show({
                message: "Failed to update novels. Please try again later.",
                variant: "error",
            });
        }
    }

    /**
     * Display notifications about novel updates
     */
    private displayUpdateNotifications(
        updatesCount: number,
        noUpdatesCount: number
    ): void {
        if (updatesCount > 0) {
            NotificationManager.show({
                message: `Successfully updated ${updatesCount} novels`,
                variant: "success",
                duration: 30,
            });
        }

        if (noUpdatesCount > 0) {
            NotificationManager.show({
                message: `No updates found for ${noUpdatesCount} novels`,
                variant: "info",
                duration: 30,
            });
        }
    }

    /**
     * Fetches updates for a list of novels
     */
    private async fetchNovelData(novels: Novels[]): Promise<UpdateResults> {
        const novelUpdateResults = await Promise.all(
            novels.map((novel) => this.checkNovelForUpdates(novel))
        );

        return this.categorizeNovelUpdates(novelUpdateResults);
    }

    /**
     * Checks if a novel has updates by comparing the current chapter count with the fetched count
     */
    private async checkNovelForUpdates(
        novel: Novels
    ): Promise<NovelUpdateResult> {
        try {
            const latestNovelData = await api.getNovel(Number(novel.id));
            if (!latestNovelData) return { id: novel.id, hasUpdates: false };
            const hasUpdates = latestNovelData.count !== novel.chaptersCount;

            if (hasUpdates) {
                await this.updateNovelChapterCount(novel.id, latestNovelData.count);
                NotificationManager.show({
                    message: `Novel ${novel.name} has been updated to chapter ${latestNovelData.count}`,
                })

            }

            return { id: novel.id, hasUpdates };
        } catch (error) {
            console.error(`Failed to fetch updates for novel ID ${novel.id}:`, error);
            return { id: novel.id, hasUpdates: false };
        }
    }

    /**
     * Update novel chapter count in the database
     */
    private async updateNovelChapterCount(
        id: number,
        newCount: number
    ): Promise<void> {
        await db.novels.update(id, { chaptersCount: newCount });
    }

    /**
     * Categorizes novel update results into updates and noUpdates arrays
     */
    private categorizeNovelUpdates(results: NovelUpdateResult[]): UpdateResults {
        const updates: number[] = [];
        const noUpdates: number[] = [];

        results.forEach((result) => {
            if (result.hasUpdates) {
                updates.push(result.id);
            } else {
                noUpdates.push(result.id);
            }
        });

        return { updates, noUpdates };
    }




    /**
     * Renders novel groups in the UI
     */
    private async renderNovelGroups(updates?: number[]): Promise<void> {
        console.log("Rendering novel groups")
        await this.loadNovels();
        // Clear existing novel groups (except settings)
        const settingsElement = this.container.querySelector(".settings");
        this.container.innerHTML = "";
        if (settingsElement) {
            this.container.appendChild(settingsElement);
        }

        // Render each group with novels
        Object.values(this.novelGroups).forEach((group) => {
            if (group.novels.length === 0) return;

            const groupContainer = this.createGroupContainer(group, updates);
            this.container.appendChild(groupContainer);
        });
    }

    /**
     * Creates a container for a novel group
     */
    private createGroupContainer(group: NovelGroup, updates?: number[]): HTMLDivElement {
        const groupContainer = Create.div({
            className: "group-container",
        });

        // Add group header
        const groupHeader = document.createElement("h3");
        groupHeader.textContent = group.text;
        groupHeader.className = "group-title";
        groupContainer.appendChild(groupHeader);

        // Create novels container
        const novelsContainer = Create.div({
            id: group.text,
            className: "novel-main-container",
        });
        groupContainer.appendChild(novelsContainer);

        // Render each novel in the group
        group.novels.forEach((novel) => {
            new NovelComponent(novelsContainer, novel,
                this.renderNovelGroups.bind(this, updates),
                updates?.includes(novel.id));
        });

        return groupContainer;
    }
}