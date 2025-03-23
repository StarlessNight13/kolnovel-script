import { Bot, createElement } from "lucide";

// Type definitions
type ElementVariant = "destructive" | "muted" | "outline";
type ElementChild = Element | HTMLElement | SVGElement;

// Base interface for element properties
interface BaseElementProps {
  className?: string | string[];
  id?: string;
  textContent?: string;
  variant?: ElementVariant;
  children?: ElementChild | ElementChild[];
  attributes?: Record<string, string>;
  innerHTML?: string;
}

// Extended interfaces for specific element types
interface ButtonElementProps extends BaseElementProps {
  clickFunc?: (this: HTMLButtonElement, ev: MouseEvent) => void;
  icon?: Element;
}

interface SelectElementProps extends BaseElementProps {
  options?: { value: string; text: string, selected?: boolean }[];
  clickFunc?: (e: Event) => void;
}

interface AnchorElementProps extends BaseElementProps {
  href?: string;
}

interface InputElementProps extends BaseElementProps {
  type?: string;
  value?: string;
  placeholder?: string;
  name?: string;
}

interface RangeSelectorProps extends BaseElementProps {
  min: number;
  max: number;
  value?: number;
}

interface DropDownMenuProps extends BaseElementProps {
  label: string;
  icon?: Element;
  withArrow?: boolean;
  iconOnly?: boolean;
  options: {
    value: string;
    text: string;
    icon?: Element;
    clickFunc?: (e: Event) => void | Promise<void>;
  }[];
}

interface ProgressBarProps {
  value: number;
  maxValue: number;
}

/**
 * Utility for creating DOM elements with a fluent API
 */
export const Create = {
  /**
   * Creates and configures an HTML element with common properties
   * @param tagName - HTML element tag name to create
   * @param props - Configuration properties
   * @returns Configured HTML element
   */
  element<T extends HTMLElement>(tagName: string, props: BaseElementProps = {}): T {
    const element = document.createElement(tagName) as T;

    // Apply text content if provided
    if (props.textContent) {
      element.textContent = props.textContent;
    }

    // Apply class names
    if (props.className) {
      if (Array.isArray(props.className)) {
        element.classList.add(...props.className);
      } else {
        element.className = props.className;
      }
    }

    // Apply ID if provided
    if (props.id) {
      element.id = props.id;
    }

    // Apply innerHTML if provided
    if (props.innerHTML) {
      element.innerHTML = props.innerHTML;
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
   * Creates an input element
   */
  input(props: InputElementProps): HTMLInputElement {
    const input = this.element<HTMLInputElement>("input", props);

    if (props.type) {
      input.type = props.type;
    }

    if (props.value) {
      input.value = props.value;
    }

    if (props.placeholder) {
      input.placeholder = props.placeholder;
    }

    if (props.name) {
      input.name = props.name;
    }

    return input;
  },

  /**
   * Creates a select element with a wrapper
   */
  select(props: SelectElementProps): {
    wrapper: HTMLDivElement;
    select: HTMLSelectElement;
  } {
    const selectWrapper = this.element<HTMLDivElement>("div", {
      className: "select-wrapper",
    });

    const select = this.element<HTMLSelectElement>("select", {
      ...props,
      className: (Array.isArray(props.className) ? props.className.join(" ") : [props.className || ""]) + " w-select"
    });

    // Apply options
    if (props.options) {
      props.options.forEach((option) => {
        const optElement = new Option(option.text, option.value, option.selected, option.selected);
        select.add(optElement);
      });
    }

    // Add click event listener
    if (props.clickFunc) {
      select.addEventListener("change", props.clickFunc);
    }

    selectWrapper.appendChild(select);

    return {
      wrapper: selectWrapper,
      select: select,
    };
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
    if (props.icon && !props.children) {
      button.appendChild(props.icon);
    }

    return button;
  },

  /**
   * Creates a div element
   */
  div(props: BaseElementProps = {}): HTMLDivElement {
    return this.element<HTMLDivElement>("div", props);
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
   * Creates a toggle control
   */
  toggle(id = "toggle", label = "Toggle"): {
    container: HTMLDivElement;
    input: HTMLInputElement;
    label: HTMLLabelElement;
  } {
    const toggleContainer = this.div({
      className: "toggle-container",
    });

    const input = this.input({
      id,
      className: "hidden",
      attributes: { type: "checkbox" },
    });

    const lableElement = this.element<HTMLLabelElement>("label", {
      textContent: label,
      className: "endless-toggle",
      attributes: { for: id },
    });

    // Add Bot icon to label

    lableElement.appendChild(
      createElement(Bot)
    );

    // Assemble the toggle
    toggleContainer.appendChild(input);
    toggleContainer.appendChild(lableElement);

    return {
      container: toggleContainer,
      input,
      label: lableElement,
    };
  },

  progressBar(props: ProgressBarProps): HTMLDivElement {
    const { value, maxValue } = props;
    if (maxValue === 0) return this.element<HTMLDivElement>("div", {
      className: "progress-bar indeterminate",
      attributes: {
        value: "0",
      },
      children: [
        this.element<HTMLSpanElement>("span", {
          className: "progress-value",
          attributes: {
            style: `width: ${0}%`,
          },
        }),
        this.element<HTMLSpanElement>("span", {
          className: "progress-max",
          attributes: {
            style: `width: ${100}%`,
          },
        }),
      ],
    });
    return this.element<HTMLDivElement>("div", {
      className: "progress-bar",
      attributes: {
        "full": (value === maxValue).toString(),
        value: value.toString(),
        max: maxValue.toString(),
      },
      children: [
        this.element<HTMLSpanElement>("span", {
          className: "progress-value",
          attributes: {
            style: `width: ${Math.floor((value / maxValue) * 100)}%`,
          },
        }),
        this.element<HTMLSpanElement>("span", {
          className: "progress-max",
          attributes: {
            style: `width: ${100 - Math.floor((value / maxValue) * 100)}%`,
          },
        }),
      ],
    });
  },

  /**
   * Creates a range selector with label and value display
   */
  rangeSelector(props: RangeSelectorProps): HTMLDivElement {
    const value = props.value ?? props.min;

    const rangeSelector = this.div({
      className: "range-selector",
    });

    const label = this.element<HTMLLabelElement>("label", {
      className: "range-label",
      textContent: "Select Range:",
    });

    const rangeControls = this.div({
      className: "range-controls",
      children: [
        this.element<HTMLSpanElement>("span", {
          className: "range-min-label",
          textContent: `Min: ${props.min}`,
        }),
        this.element<HTMLSpanElement>("span", {
          className: "range-max-label",
          textContent: `Max: ${props.max}`,
        }),
      ]
    });

    const range = this.input({
      className: "range-input",
      attributes: {
        type: "range",
        min: props.min.toString(),
        max: props.max.toString(),
        value: value.toString(),
      }
    });

    const valueDisplay = this.element<HTMLSpanElement>("span", {
      className: "range-value",
      textContent: value.toString(),
    });

    // Event handling for updating the displayed value
    range.addEventListener('input', function () {
      valueDisplay.textContent = this.value;
    });

    rangeSelector.appendChild(label);
    rangeSelector.appendChild(rangeControls);
    rangeSelector.appendChild(range);
    rangeSelector.appendChild(valueDisplay);

    return rangeSelector;
  },

  /**
   * Creates a dropdown menu using CSS and checkbox for toggle
   */
  dropDownMenu(props: DropDownMenuProps): HTMLDivElement {
    // Generate a unique ID for the checkbox
    const dropdownId = `dropdown-${Math.random().toString(36).substring(2, 9)}`;

    // Create container with proper CSS classes
    const dropdownContainer = this.div({
      className: "dropdown-container " + (props.variant ? `dropdown-${props.variant}` : ""),
    });

    // Create hidden checkbox for toggling
    const dropdownToggle = this.input({
      id: dropdownId,
      className: "dropdown-toggle",
      attributes: {
        type: "checkbox",
      }
    });

    // Style the checkbox to be hidden but still accessible
    dropdownToggle.style.position = "absolute";
    dropdownToggle.style.opacity = "0";
    dropdownToggle.style.height = "0";
    dropdownToggle.style.width = "0";

    // Create the dropdown trigger label
    const dropdownLabel = this.element<HTMLLabelElement>("label", {
      className: "dropdown-label",
      attributes: {
        for: dropdownId,
      },
    });

    // Add icon or text to the label
    if (props.icon) {
      dropdownLabel.appendChild(props.icon);
    }

    // Add label text if not icon-only
    if (!props.iconOnly) {
      dropdownLabel.appendChild(
        this.element<HTMLSpanElement>("span", {
          className: "dropdown-text",
          textContent: props.label,
        })
      );
    }

    // Add arrow if specified
    if (props.withArrow) {
      dropdownLabel.appendChild(
        this.element<HTMLSpanElement>("span", {
          className: "dropdown-arrow",
          textContent: "▾",
        })
      );
    }

    // Create dropdown menu content
    const dropdownMenu = this.div({
      className: "dropdown-menu",
    });

    // Add options to the dropdown menu
    props.options.forEach(option => {
      const optionElement = this.div({
        className: "dropdown-option",
        attributes: {
          "data-value": option.value,
        },
      });

      // Add icon if provided
      if (option.icon) {
        optionElement.appendChild(option.icon);
      }

      // Add text if not icon-only
      optionElement.appendChild(
        this.element<HTMLSpanElement>("span", {
          textContent: option.text,
        })
      );


      // Add click event listener if provided
      if (option.clickFunc) {
        optionElement.addEventListener("click", (e) => {
          // Close dropdown after selection
          dropdownToggle.checked = false;
          option.clickFunc!(e);
        });
      }

      dropdownMenu.appendChild(optionElement);
    });


    // Assemble the dropdown
    dropdownContainer.appendChild(dropdownToggle);
    dropdownContainer.appendChild(dropdownLabel);
    dropdownContainer.appendChild(dropdownMenu);

    return dropdownContainer;
  },
};