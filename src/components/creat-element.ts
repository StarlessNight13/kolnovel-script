import { Bot, createElement } from "lucide";

export const Create = {
  endlessButton: ({
    className,
    id,
    textContent,
    variant,
    children,
    clickFunc,
  }: {
    className?: string | string[];
    id?: string;
    textContent?: string;
    variant?: "destructive" | "muted" | "outline";
    children?: HTMLElement | HTMLElement[] | SVGElement;
    clickFunc?: () => void;
  }) => {
    const button = document.createElement("button");
    if (textContent) {
      button.textContent = textContent;
    }
    if (className) {
      if (Array.isArray(className)) {
        className.forEach((className) => {
          button.classList.add(className);
        });
      } else {
        button.classList.add(className);
      }
    }
    if (clickFunc) {
      button.addEventListener("click", clickFunc);
    }
    if (id) {
      button.id = id;
    }
    if (variant) {
      button.setAttribute("data-variant", variant);
    }
    if (children) {
      if (Array.isArray(children)) {
        // If children is an array, append each child
        children.forEach((child) => {
          button.appendChild(child);
        });
      } else if (children instanceof HTMLElement) {
        // If children is a single HTMLElement, append it
        button.appendChild(children);
      } else if (children instanceof SVGElement) {
        // If children is a single SVGElement, append it
        button.appendChild(children);
      }
    }
    button.classList.add("endless-button");
    return button;
  },
  div: ({
    className,
    id,
    textContent,
    variant,
    children,
    attributes = {},
    innerHTML,
  }: {
    className?: string | string[];
    id?: string;
    textContent?: string;
    variant?: "destructive" | "muted" | "outline";
    children?: Element | Element[];
    attributes?: Record<string, string>;
    innerHTML?: string;
  }): HTMLDivElement => {
    const div = document.createElement("div");

    if (innerHTML) {
      div.innerHTML = innerHTML;
    }
    if (textContent) {
      div.textContent = textContent;
    }
    if (className) {
      if (Array.isArray(className)) {
        className.forEach((className) => {
          div.classList.add(className);
        });
      } else {
        div.className = className;
      }
    }
    Object.entries(attributes).forEach(([key, value]) => {
      div.setAttribute(key, value);
    });
    if (id) {
      div.id = id;
    }
    if (variant) {
      div.setAttribute("data-variant", variant);
    }
    if (children) {
      if (Array.isArray(children)) {
        // If children is an array, append each child
        children.forEach((child) => {
          div.appendChild(child);
        });
      } else if (children instanceof Element) {
        // If children is a single HTMLElement, append it
        div.appendChild(children);
      }
    }
    return div;
  },
  a: ({
    className,
    id,
    textContent,
    variant,
    children,
    href,
    attributes = {},
  }: {
    className?: string | string[];
    id?: string;
    textContent?: string;
    variant?: "destructive" | "muted" | "outline";
    children?: HTMLElement | HTMLElement[] | SVGElement;
    href?: string;
    attributes?: Record<string, string>;
  }) => {
    const a = document.createElement("a");
    if (textContent) {
      a.textContent = textContent;
    }
    if (className) {
      if (Array.isArray(className)) {
        className.forEach((className) => {
          a.classList.add(className);
        });
      } else {
        a.className = className;
      }
    }
    Object.entries(attributes).forEach(([key, value]) => {
      a.setAttribute(key, value);
    });

    if (id) {
      a.id = id;
    }
    if (href) {
      a.href = href;
    }
    if (variant) {
      a.setAttribute("data-variant", variant);
    }
    if (children) {
      if (Array.isArray(children)) {
        // If children is an array, append each child
        children.forEach((child) => {
          a.appendChild(child);
        });
      } else if (children instanceof HTMLElement) {
        // If children is a single HTMLElement, append it
        a.appendChild(children);
      } else if (children instanceof SVGElement) {
        // If children is a single SVGElement, append it
        a.appendChild(children);
      }
    }
    return a;
  },
  span: ({
    className,
    id,
    textContent,
    variant,
    children,
    attributes = {},
  }: {
    className?: string | string[];
    id?: string;
    textContent?: string;
    variant?: "destructive" | "muted" | "outline";
    children?: (HTMLElement | SVGElement)[] | (HTMLElement | SVGElement);
    attributes?: Record<string, string>;
  }): HTMLSpanElement => {
    const span = document.createElement("span");
    if (textContent) {
      span.textContent = textContent;
    }
    if (className) {
      if (Array.isArray(className)) {
        className.forEach((className) => {
          span.classList.add(className);
        });
      } else {
        span.className = className;
      }
    }
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
    if (id) {
      span.id = id;
    }
    if (variant) {
      span.setAttribute("data-variant", variant);
    }
    if (children) {
      if (Array.isArray(children)) {
        // If children is an array, append each child
        children.forEach((child) => {
          span.appendChild(child);
        });
      } else if (children instanceof HTMLElement) {
        // If children is a single HTMLElement, append it
        span.appendChild(children);
      } else if (children instanceof SVGElement) {
        // If children is a single SVGElement, append it
        span.appendChild(children);
      }
    }
    return span;
  },
  toogle: () => {
    const toggleContainer = Create.div({
      className: "toggle-container",
      id: "toggle-container",
    });
    const userSettingsItemInput = document.createElement("input");
    userSettingsItemInput.type = "checkbox";
    userSettingsItemInput.className = "hidden";
    userSettingsItemInput.id = "auto-loader-toggle";
    toggleContainer.appendChild(userSettingsItemInput);

    const userSettingsItemLabel = document.createElement("label");
    userSettingsItemLabel.htmlFor = "auto-loader-toggle";
    userSettingsItemLabel.textContent = "Auto Loader";
    userSettingsItemLabel.className = "endless-toggle ";
    const bot = createElement(Bot);
    userSettingsItemLabel.appendChild(bot);
    toggleContainer.appendChild(userSettingsItemLabel);

    // Return the container element, which now holds the toggle
    return {
      container: toggleContainer,
      input: userSettingsItemInput,
      label: userSettingsItemLabel,
    };
  },
};
