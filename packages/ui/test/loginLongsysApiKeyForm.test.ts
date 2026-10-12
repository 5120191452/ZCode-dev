// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TID_LOGIN_API_KEY_CANCEL_BUTTON,
  TID_LOGIN_API_KEY_CONTINUE_BUTTON,
  TID_LOGIN_API_KEY_INPUT,
  TID_LOGIN_API_KEY_PROVIDER_TRIGGER,
  TID_LOGIN_API_KEY_SKIP_BUTTON,
} from "@zcode/shared";

const mocks = vi.hoisted(() => ({
  configureLongsysProvider: vi.fn(),
  getProviderView: vi.fn(),
  getModelSelectionView: vi.fn(),
  markApiKeyLoginSuccess: vi.fn(),
}));

vi.mock("@/hooks/useServices.js", () => ({
  useServices: () => ({
    providerSettingsService: {
      getView: mocks.getProviderView,
      configureLongsysProvider: mocks.configureLongsysProvider,
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    },
    modelSelectionService: {
      getView: mocks.getModelSelectionView,
    },
  }),
}));

vi.mock("@/hooks/usePlatform.js", () => ({
  usePlatform: () => ({ openExternal: vi.fn() }),
}));

vi.mock("@/i18n/IntlProvider.js", () => ({
  useZCodeIntl: () => ({
    locale: "zh-CN",
    intl: {
      formatMessage: ({ id }: { id: string }, values?: Record<string, unknown>) =>
        values?.error ? `${id}:${String(values.error)}` : id,
    },
  }),
}));

vi.mock("@/store/StoreProvider.js", () => ({
  useZCodeStore: (selector: (state: unknown) => unknown) =>
    selector({ markApiKeyLoginSuccess: mocks.markApiKeyLoginSuccess }),
}));

describe("LoginApiKeyForm Longsys onboarding", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderView.mockResolvedValue({
      revision: 1,
      providerTemplates: [],
      providerOrder: [],
      providers: [],
    });
    mocks.configureLongsysProvider.mockResolvedValue({
      providerId: "longsys",
      view: { revision: 2, providerTemplates: [], providerOrder: [], providers: [] },
    });
    mocks.getModelSelectionView.mockResolvedValue({
      revision: 2,
      providers: [
        {
          providerId: "longsys",
          config: { kind: "api" },
          models: [{ modelId: "GLM-5.3-Flash", config: {} }],
        },
      ],
    });
  });

  it("只显示 API Key 与主动作，不显示 provider、URL、跳过或取消", async () => {
    const { LoginApiKeyForm } = await import("@/login/LoginApiKeyForm.js");
    const view = render(createElement(LoginApiKeyForm, { onSaved: vi.fn() }));

    expect(view.getByTestId(TID_LOGIN_API_KEY_INPUT)).toBeTruthy();
    expect(view.getByTestId(TID_LOGIN_API_KEY_CONTINUE_BUTTON)).toBeTruthy();
    expect(view.queryByTestId(TID_LOGIN_API_KEY_PROVIDER_TRIGGER)).toBeNull();
    expect(view.queryByTestId(TID_LOGIN_API_KEY_CANCEL_BUTTON)).toBeNull();
    expect(view.queryByTestId(TID_LOGIN_API_KEY_SKIP_BUTTON)).toBeNull();
    expect(view.container.textContent).not.toContain("base_url");
  });

  it("提交时只把 Key 交给 Host，并使用发现的第一个模型完成登录", async () => {
    const onSaved = vi.fn();
    const { LoginApiKeyForm } = await import("@/login/LoginApiKeyForm.js");
    const view = render(createElement(LoginApiKeyForm, { onSaved }));

    fireEvent.change(view.getByTestId(TID_LOGIN_API_KEY_INPUT), {
      target: { value: " test-key " },
    });
    fireEvent.click(view.getByTestId(TID_LOGIN_API_KEY_CONTINUE_BUTTON));

    await waitFor(() =>
      expect(mocks.configureLongsysProvider).toHaveBeenCalledWith({ apiKey: "test-key" }),
    );
    expect(mocks.getProviderView).not.toHaveBeenCalled();
    expect(mocks.markApiKeyLoginSuccess).toHaveBeenCalledWith(
      expect.stringContaining("GLM-5.3-Flash"),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
