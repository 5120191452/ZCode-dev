import { useState } from "react";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import {
  TID_LOGIN_API_KEY_CONTINUE_BUTTON,
  TID_LOGIN_API_KEY_ERROR,
  TID_LOGIN_API_KEY_INPUT,
} from "@zcode/shared";
import { Alert, AlertDescription } from "@/components/ui/alert.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { useServices } from "@/hooks/useServices.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import { buildLoginApiKeyDefaultModelPreferenceFromSelection } from "@/login/LoginApiKeyForm.helpers.js";
import { useZCodeStore } from "@/store/StoreProvider.js";

interface LoginApiKeyFormProps {
  onSaved: () => void | Promise<void>;
}

export function LoginApiKeyForm({ onSaved }: LoginApiKeyFormProps) {
  const { intl } = useZCodeIntl();
  const { modelSelectionService, providerSettingsService } = useServices();
  const markApiKeyLoginSuccess = useZCodeStore((state) => state.markApiKeyLoginSuccess);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveApiKeyProvider = async () => {
    const apiKey = apiKeyValue.trim();
    if (!apiKey) {
      setError(intl.formatMessage({ id: "login.longsys.emptyError" }));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Bugfix: Renderer 只提交 Key；固定 URL 与 /models 发现都由 Host 持有，
      // 避免 UI 自报模型成员，也避免失败前先写入一份不可执行的 Provider。
      const created = await providerSettingsService.configureLongsysProvider({ apiKey });
      const defaultModelPreference = buildLoginApiKeyDefaultModelPreferenceFromSelection(
        await modelSelectionService.getView(),
        created.providerId,
      );
      if (!defaultModelPreference) {
        throw new Error(intl.formatMessage({ id: "login.longsys.noModelError" }));
      }
      markApiKeyLoginSuccess(defaultModelPreference);
      await onSaved();
    } catch (saveError) {
      const safeMessage = toCredentialSafeErrorMessage(saveError, apiKey);
      logger.error("[LoginEntry] Longsys Provider 配置失败", { error: safeMessage });
      setError(
        intl.formatMessage(
          { id: "login.longsys.saveError" },
          {
            error: safeMessage,
          },
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-ui-base font-medium text-foreground">
          {intl.formatMessage({ id: "login.longsys.apiKeyTitle" })}
        </h2>
        <p className="text-ui-sm text-foreground-subtle">
          {intl.formatMessage({ id: "login.longsys.apiKeyDescription" })}
        </p>
        <Input
          id="login-api-key"
          type="password"
          size="lg"
          className="h-10 w-full text-ui-base"
          data-testid={TID_LOGIN_API_KEY_INPUT}
          aria-label={intl.formatMessage({ id: "login.longsys.apiKeyPlaceholder" })}
          value={apiKeyValue}
          placeholder={intl.formatMessage({ id: "login.longsys.apiKeyPlaceholder" })}
          autoComplete="off"
          disabled={saving}
          onChange={(event) => {
            setApiKeyValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && apiKeyValue.trim() && !saving) {
              void saveApiKeyProvider();
            }
          }}
        />
      </div>

      {error ? (
        <Alert variant="destructive" data-testid={TID_LOGIN_API_KEY_ERROR}>
          <TriangleAlertIcon className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        className="h-10 w-full text-ui-base"
        size="lg"
        data-testid={TID_LOGIN_API_KEY_CONTINUE_BUTTON}
        disabled={!apiKeyValue.trim() || saving}
        onClick={() => void saveApiKeyProvider()}
      >
        {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {intl.formatMessage({ id: "login.longsys.connect" })}
      </Button>
    </div>
  );
}

function toCredentialSafeErrorMessage(error: unknown, apiKey: string): string {
  const message = error instanceof Error ? error.message : String(error);
  return apiKey ? message.replaceAll(apiKey, "[redacted]") : message;
}
