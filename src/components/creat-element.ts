import { Bot, createElement } from "lucide";

type ElementVariant = "destructive" | "muted" | "outline";
type ElementChild = Element | HTMLElement | SVGElement;

// Base interface for all element creation functions
interface BaseElementProps {
  className?: string | string[];
  id?: string;
  textContent?: string;
  variant?: ElementVariant;
  children?: ElementChild | ElementChild[];
  attributes?: Record<string, string>;
}

// Extended interfaces for specific element types
interface ButtonElementProps extends BaseElementProps {
  clickFunc?: (this: HTMLButtonElement, ev: MouseEvent) => void;
  icon?: Element;
}

interface AnchorElementProps extends BaseElementProps {
  href?: string;
}

interface DivElementProps extends BaseElementProps {
  innerHTML?: string;
}

export const Create = {
  /**
   * Creates and configures an HTML element with common properties
   * @param tagName - HTML element tag name to create
   * @param props - Configuration properties
   * @returns Configured HTML element
   */
  element<T extends HTMLElement>(tagName: string, props: BaseElementProps): T {
    const element = document.createElement(tagName) as T;

    // Apply text content if provided
    if (props.textContent) {
      element.textContent = props.textContent;
    }

    // Apply class names
    if (props.className) {
      if (Array.isArray(props.className)) {
        props.className.forEach((cls) => element.classList.add(cls));
      } else {
        element.className = props.className;
      }
    }

    // Apply ID if provided
    if (props.id) {
      element.id = props.id;
    }

    // Apply variant as data attribute
    if (props.variant) {
      element.setAttribute("data-variant", props.variant);
    }

    // Apply custom attributes
    if (props.attributes) {
      Object.entries(props.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    // Append children
    if (props.children) {
      const childrenArray = Array.isArray(props.children)
        ? props.children
        : [props.children];
      childrenArray.forEach((child) => {
        if (child instanceof Element) {
          element.appendChild(child);
        }
      });
    }

    return element;
  },

  /**
   * Creates a button element
   */
  button(props: ButtonElementProps): HTMLButtonElement {
    const button = this.element<HTMLButtonElement>("button", props);

    // Add click event listener
    if (props.clickFunc) {
      button.addEventListener("click", props.clickFunc);
    }

    // Add icon if provided
    if (props.icon) {
      button.appendChild(props.icon);
    }

    // Add default class
    button.classList.add("endless-button");

    return button;
  },

  /**
   * Creates a div element
   */
  div(props: DivElementProps): HTMLDivElement {
    const div = this.element<HTMLDivElement>("div", props);

    // Apply innerHTML if provided
    if (props.innerHTML) {
      div.innerHTML = props.innerHTML;
    }

    return div;
  },

  /**
   * Creates an anchor element
   */
  a(props: AnchorElementProps): HTMLAnchorElement {
    const anchor = this.element<HTMLAnchorElement>("a", props);

    // Set href if provided
    if (props.href) {
      anchor.href = props.href;
    }

    return anchor;
  },

  /**
   * Creates a span element
   */
  span(props: BaseElementProps): HTMLSpanElement {
    return this.element<HTMLSpanElement>("span", props);
  },

  /**
   * Creates a toggle control
   */
  toogle() {
    const toggleContainer = this.div({
      className: "toggle-container",
      id: "toggle-container",
    });

    const input = this.element<HTMLInputElement>("input", {
      id: "auto-loader-toggle",
      className: "hidden",
      attributes: { type: "checkbox" },
    });

    const label = this.element<HTMLLabelElement>("label", {
      textContent: "Auto Loader",
      className: "endless-toggle",
      attributes: { for: "auto-loader-toggle" },
    });

    // Add Bot icon to label
    const bot = createElement(Bot);
    label.appendChild(bot);

    // Assemble the toggle
    toggleContainer.appendChild(input);
    toggleContainer.appendChild(label);

    return {
      container: toggleContainer,
      input,
      label,
    };
  },
};
