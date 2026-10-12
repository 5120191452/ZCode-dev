import type { ApiClient } from "@zcode/shared";

export const LONGSYS_BASE_URL = "https://aicode.longsys.com/v1";
export const LONGSYS_MODELS_URL = `${LONGSYS_BASE_URL}/models`;

interface OpenAICompatibleModelList {
  readonly data: readonly unknown[];
}

/**
 * 只在 Host 内使用固定 Longsys 端点发现模型。错误信息不得包含响应正文或凭据，
 * 避免上游把认证材料回显到 Renderer、日志或错误遥测。
 */
export async function discoverLongsysModelIds(
  apiClient: ApiClient,
  apiKey: string,
): Promise<readonly string[]> {
  const normalizedApiKey = apiKey.trim();
  if (!normalizedApiKey) throw new Error("Longsys API Key 不能为空");

  let response: Response;
  try {
    response = await apiClient.request(LONGSYS_MODELS_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${normalizedApiKey}`,
      },
      timeoutMs: 15_000,
    });
  } catch {
    throw new Error("Longsys 模型列表请求失败");
  }

  if (!response.ok) {
    throw new Error(`Longsys 模型列表请求失败（HTTP ${response.status}）`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Longsys 模型列表响应不是有效 JSON");
  }
  if (!isOpenAICompatibleModelList(payload)) {
    throw new Error("Longsys 模型列表响应格式无效");
  }

  const seen = new Set<string>();
  const modelIds: string[] = [];
  for (const candidate of payload.data) {
    if (!candidate || typeof candidate !== "object" || !("id" in candidate)) continue;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    modelIds.push(id);
  }
  if (modelIds.length === 0) {
    throw new Error("Longsys 当前没有可用模型");
  }
  return Object.freeze(modelIds);
}

function isOpenAICompatibleModelList(value: unknown): value is OpenAICompatibleModelList {
  return Boolean(
    value && typeof value === "object" && "data" in value && Array.isArray(value.data),
  );
}
