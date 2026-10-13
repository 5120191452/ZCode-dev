import {
  TID_LOGIN_API_KEY_CANCEL_BUTTON,
  TID_LOGIN_API_KEY_CONTINUE_BUTTON,
  TID_LOGIN_API_KEY_INPUT,
  TID_LOGIN_API_KEY_PROVIDER_TRIGGER,
  TID_LOGIN_API_KEY_SKIP_BUTTON,
  TID_MODEL_PROVIDER_NAV_ITEM,
  TID_OAUTH_LOGIN_BUTTON,
  TID_SETTINGS_PAGE,
  TID_SETTINGS_SECTION_NAV,
  TID_TASK_SETTINGS_BUTTON,
  testId,
} from "@zcode/shared";
import {
  DEFAULT_WORKSPACE,
  clearAppData,
  clickTestIdByDom,
  setInputValueByTestIdDom,
  waitForTestIdByDom,
  waitForWorkspaceApp,
} from "../../helpers/desktop-app.js";
import { restartIntoWorkspace, seedReplayProvider } from "../../helpers/model-provider-restart.js";
import { sel } from "../../helpers/selectors.js";

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

  it("AUTH-LONGSYS-02: 模型设置只显示 Longsys，不显示 BigModel 与 Start Plan", async function () {
    this.timeout(120_000);

    await restartIntoWorkspace({
      afterElectronProcessExit: () =>
        seedReplayProvider({
          apiKey: "e2e-longsys-placeholder",
          baseURL: "https://aicode.longsys.com/v1",
          id: "longsys-e2e",
          models: ["longsys-e2e-model"],
          name: "Longsys AI",
        }),
    });
    await waitForWorkspaceApp(DEFAULT_WORKSPACE, 60_000);
    await clickTestIdByDom(TID_TASK_SETTINGS_BUTTON, { timeout: 15_000 });
    await $(sel(TID_SETTINGS_PAGE)).waitForDisplayed({ timeout: 15_000 });
    await clickTestIdByDom(testId(TID_SETTINGS_SECTION_NAV, "modelProvider"), {
      timeout: 15_000,
    });

    await browser.waitUntil(async () => (await readModelProviderNavigationLabels()).length > 0, {
      timeout: 30_000,
      timeoutMsg: "模型设置没有显示 Longsys Provider",
    });
    expect(await readModelProviderNavigationLabels()).toEqual(["Longsys AI"]);
  });
});

async function readModelProviderNavigationLabels(): Promise<string[]> {
  return browser.execute(
    (testIdPrefix) =>
      Array.from(document.querySelectorAll<HTMLElement>(`[data-testid^="${testIdPrefix}-"]`)).map(
        (element) => element.getAttribute("aria-label")?.trim() ?? "",
      ),
    TID_MODEL_PROVIDER_NAV_ITEM,
  );
}

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
