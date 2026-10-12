import { describe, expect, it } from "vitest";
import { buildLoginApiKeyDefaultModelPreferenceFromSelection } from "@/login/LoginApiKeyForm.helpers.js";
import { encodeCustomModelValue } from "@/lib/zcodeCustomModelValue.js";

describe("LoginApiKeyForm helpers", () => {
  it("从 Host Selection View 选择 Longsys 发现顺序中的第一个模型", () => {
    expect(
      buildLoginApiKeyDefaultModelPreferenceFromSelection(
        {
          revision: 3,
          providers: [
            {
              providerId: "longsys",
              config: { kind: "api" },
              models: [
                { modelId: "GLM-5.3-Flash", config: {} },
                { modelId: "Default_coder", config: {} },
              ],
            },
          ],
        },
        "longsys",
      ),
    ).toBe(encodeCustomModelValue("longsys", "GLM-5.3-Flash"));
  });
});
