// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ZCodeIntlProvider } from "@/i18n/IntlProvider.js";
import { ConversationDraftEmptyState } from "@/v4/ConversationDraftEmptyState.js";

afterEach(() => {
  cleanup();
});

describe("ConversationDraftEmptyState logo", () => {
  it("uses one product logo asset in both themes", () => {
    const { container } = render(
      createElement(
        ZCodeIntlProvider,
        { initialLocale: "zh-CN" },
        createElement(ConversationDraftEmptyState),
      ),
    );

    const logo = container.querySelector('[data-v4-draft-logo="product"]');
    const logoClassName = logo?.getAttribute("class") ?? "";

    expect(logo).not.toBeNull();
    expect(logo?.tagName).toBe("IMG");
    expect(logo?.getAttribute("src")).toMatch(/512x512\.png(?:\?|$)/u);
    expect(logoClassName).toContain("opacity-[0.16]");
    expect(logoClassName).toContain("dark:opacity-20");
    expect(container.querySelectorAll('[data-v4-draft-logo="product"]')).toHaveLength(1);
    expect(container.querySelector("svg")).toBeNull();
  });
});
