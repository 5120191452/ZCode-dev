import { describe, expect, it } from "vitest";
import enUS from "@/i18n/locales/en-US.js";
import zhCN from "@/i18n/locales/zh-CN.js";

describe("LongsysCode product copy", () => {
  it("uses the model re-authentication label for unauthenticated entry points", () => {
    expect(zhCN["app.login"]).toBe("重新认证模型");
    expect(zhCN["sidebar.profile.notLoggedIn"]).toBe("重新认证模型");
    expect(enUS["app.login"]).toBe("Re-authenticate models");
    expect(enUS["sidebar.profile.notLoggedIn"]).toBe("Re-authenticate models");
  });

  it.each([
    ["zh-CN", zhCN],
    ["en-US", enUS],
  ] as const)("does not expose the legacy product name in the %s catalog", (_locale, catalog) => {
    expect(Object.values(catalog).filter((value) => /\bZCode\b/.test(value))).toEqual([]);
  });

  it("uses LongsysCode in the About menu", () => {
    expect(zhCN["titleBar.menu.help.about"]).toBe("关于 LongsysCode");
    expect(enUS["titleBar.menu.help.about"]).toBe("About LongsysCode");
  });
});
