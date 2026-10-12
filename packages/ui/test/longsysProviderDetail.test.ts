import { describe, expect, it } from "vitest";
import { resolvePersonalProviderEditability } from "@/settings/model-provider-section/Detail.js";

describe("Longsys provider detail", () => {
  it("固定 Longsys 模板的名称与 API 端点", () => {
    expect(resolvePersonalProviderEditability("longsys")).toEqual({
      readOnlyEndpoints: true,
      nameEditable: false,
    });
    expect(resolvePersonalProviderEditability("deepseek")).toEqual({
      readOnlyEndpoints: false,
      nameEditable: true,
    });
  });
});
