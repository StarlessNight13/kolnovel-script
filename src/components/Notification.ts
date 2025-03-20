import { Create } from "./creat-element";

export class NotificationManager {
  private static defaultDuration: number = 3000;
  private static notificationsContainer: HTMLDivElement;
  private static notifications: Map<
    string,
    {
      element: HTMLDivElement;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  > = new Map();

  static init(options?: { containerClass?: string; defaultDuration?: number }) {
    this.defaultDuration = options?.defaultDuration ?? this.defaultDuration;

    this.notificationsContainer = Create.div({
      className:
        "notifications-container " +
        (options?.containerClass ?? "default-notifications"),
    });

    document.body.appendChild(this.notificationsContainer);
  }

  static show(options: {
    message: string;
    duration?: number;
    variant?: "success" | "error" | "warning" | "info";
    id?: string;
  }): string {

    const {
      message,
      duration = this.defaultDuration,
      variant = "success",
      id = `notification-${Date.now()}`,
    } = options;

    // Remove existing notification with same ID if it exists
    this.dismiss(id);

    const notification = Create.div({
      id: id,
      className: "notification " + `${variant}`,
      textContent: message,
    });

    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = "1";
    });

    this.notificationsContainer.appendChild(notification);

    // Set timeout to remove notification
    const timeoutId = setTimeout(() => {
      this.dismiss(id);
    }, duration);

    // Store notification reference
    this.notifications.set(id, { element: notification, timeoutId });

    return id;
  }

  static dismiss(id: string) {
    const notificationEntry = this.notifications.get(id);

    if (notificationEntry) {
      // Clear the timeout
      clearTimeout(notificationEntry.timeoutId);

      // Animate out
      notificationEntry.element.style.opacity = "0";

      // Remove from DOM after animation
      setTimeout(() => {
        notificationEntry.element.remove();
        this.notifications.delete(id);
      }, 300);
    }
  }

  static dismissAll() {
    this.notifications.forEach((_, id) => this.dismiss(id));
  }

  static getActiveNotifications() {
    return Array.from(this.notifications.keys());
  }
}
