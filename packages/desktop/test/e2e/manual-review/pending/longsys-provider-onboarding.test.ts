import {
  TID_LOGIN_API_KEY_CANCEL_BUTTON,
  TID_LOGIN_API_KEY_CONTINUE_BUTTON,
  TID_LOGIN_API_KEY_INPUT,
  TID_LOGIN_API_KEY_PROVIDER_TRIGGER,
  TID_LOGIN_API_KEY_SKIP_BUTTON,
  TID_OAUTH_LOGIN_BUTTON,
} from "@zcode/shared";
import {
  clearAppData,
  setInputValueByTestIdDom,
  waitForTestIdByDom,
} from "../../helpers/desktop-app.js";

const TEST_API_KEY = "test-longsys-key-not-submitted";

describe("Longsys 首页 Provider onboarding", () => {
  after(async () => {
    await browser.electron.restoreAllMocks();
    await clearAppData();
  });

  it("AUTH-LONGSYS-01: 首页只接受 API Key，不暴露 provider、URL、OAuth 或跳过入口", async function () {
    this.timeout(120_000);

    await ensureWelcomeScreenOpen();
    const initial = await inspectLongsysWelcome();
    expect(initial).toMatchObject({
      apiKeyInput: true,
      apiKeyInputType: "password",
      continueButton: true,
      providerTrigger: false,
      cancelButton: false,
      skipButton: false,
      oauthButton: false,
      containsBaseUrlField: false,
    });

    // 只验证本地表单交互，不提交合成 Key，避免 E2E 访问真实 Longsys 服务。
    await setInputValueByTestIdDom(TID_LOGIN_API_KEY_INPUT, TEST_API_KEY);
    await browser.waitUntil(async () => (await inspectLongsysWelcome()).continueEnabled, {
      timeout: 15_000,
      timeoutMsg: "填写 Longsys API Key 后主动作没有变为可用",
    });
  });
});

async function ensureWelcomeScreenOpen(): Promise<void> {
  await waitForTestIdByDom(TID_LOGIN_API_KEY_INPUT, {
    timeout: 60_000,
    timeoutMsg: "未登录且无 Provider 的冷启动没有自动展示 Longsys API Key 首页",
  });
}

async function inspectLongsysWelcome(): Promise<{
  apiKeyInput: boolean;
  apiKeyInputType: string | null;
  continueButton: boolean;
  continueEnabled: boolean;
  providerTrigger: boolean;
  cancelButton: boolean;
  skipButton: boolean;
  oauthButton: boolean;
  containsBaseUrlField: boolean;
}> {
  return browser.execute(
    (ids) => {
      const input = document.querySelector<HTMLInputElement>(`[data-testid="${ids.input}"]`);
      const continueButton = document.querySelector<HTMLButtonElement>(
        `[data-testid="${ids.continueButton}"]`,
      );
      return {
        apiKeyInput: Boolean(input),
        apiKeyInputType: input?.type ?? null,
        continueButton: Boolean(continueButton),
        continueEnabled: Boolean(continueButton && !continueButton.disabled),
        providerTrigger: Boolean(document.querySelector(`[data-testid="${ids.providerTrigger}"]`)),
        cancelButton: Boolean(document.querySelector(`[data-testid="${ids.cancelButton}"]`)),
        skipButton: Boolean(document.querySelector(`[data-testid="${ids.skipButton}"]`)),
        oauthButton: Boolean(document.querySelector(`[data-testid="${ids.oauthButton}"]`)),
        containsBaseUrlField: /base[_ ]?url/iu.test(document.body.textContent ?? ""),
      };
    },
    {
      input: TID_LOGIN_API_KEY_INPUT,
      continueButton: TID_LOGIN_API_KEY_CONTINUE_BUTTON,
      providerTrigger: TID_LOGIN_API_KEY_PROVIDER_TRIGGER,
      cancelButton: TID_LOGIN_API_KEY_CANCEL_BUTTON,
      skipButton: TID_LOGIN_API_KEY_SKIP_BUTTON,
      oauthButton: TID_OAUTH_LOGIN_BUTTON,
    },
  );
}
