# Longsys Provider Onboarding

## 状态与目标

ZCode Desktop 的首次启动首页只展示 Longsys AI API Key 输入。用户提交 Key 后，由当前
Workspace Host 使用固定的 OpenAI-compatible 端点发现该 Key 可访问的模型，并在一次 Personal
Provider 配置事务中写入 Provider、API Key 和模型成员。成功后进入工作区，所有模型选择入口继续
消费现有 Registry / ModelSelection View，不建立首页私有模型列表。

固定协议：

| 字段          | 值                                                              |
| ------------- | --------------------------------------------------------------- |
| Template ID   | `longsys`                                                       |
| Provider 名称 | `Longsys AI`                                                    |
| Runtime API   | `openai-chat-completions`（CLI factory 为 `openai-compatible`） |
| Base URL      | `https://aicode.longsys.com/v1`                                 |
| 模型发现 URL  | `https://aicode.longsys.com/v1/models`                          |
| 鉴权          | `Authorization: Bearer <API Key>`                               |

API Key 是运行时用户凭据，不得写入仓库源码、测试 fixture、日志、错误信息或遥测。沿用当前
Personal Provider 配置的凭据持久化边界；UI 不直接发网络请求，也不把自报模型名单传给 Host。

## 产品规则

1. WelcomeScreen 的普通 idle 状态只显示 Longsys API Key 输入和“连接并获取模型”动作，不显示
   OAuth Provider 列表、Provider 选择器、Base URL、API 类型、跳过或取消入口。
2. 提交前只做非空校验。提交后按钮进入 loading，阻止同一表单并发提交。
3. Host 使用固定 URL 请求模型列表，接受 OpenAI-compatible `{ data: [{ id }] }` 响应；模型 ID
   执行 `trim`、过滤空值并按首次出现顺序去重。HTTP 非成功、响应格式错误或空模型列表都失败。
4. 只有模型发现成功后才写配置。失败时不创建或修改 Provider，首页保留输入并显示可重试错误。
5. 配置写入按 `templateId=longsys` 幂等 upsert：首次创建一个 Personal Provider；再次配置复用
   已有实例，原子替换 API Key 和 Personal 模型成员，不产生重复 Longsys Provider。
6. Provider 的 API 类型和 Base URL 继承自 Built-in Template；首页不得接受或保存调用方提供的
   URL、factory 或模型 ID。
7. 模型成员以本次发现结果为准，顺序保持服务端返回顺序。模型能力与执行完整性继续通过现有
   ModelConfig Rules 解析，不在首页维护第二份 metadata。
8. 原子写入完成后刷新同一 Host Registry，再从 ModelSelection View 读取第一个 Longsys 模型作为
   初始偏好；最终模型执行仍由 Registry / ModelFactory 校验。
9. 已存在可执行 Personal Provider 时，即使没有 Z.ai/BigModel `providerFamilyDomain`，启动守卫也
   不再打开 WelcomeScreen。手机 `/remote` 继续复用 Desktop Host，不执行独立 Longsys onboarding。
10. 设置页触发的既有 OAuth 连接请求仍可复用 WelcomeScreen 的 waiting/error 状态，但普通首页
    不提供 OAuth 选择按钮。

## 状态所有者与事件顺序

```text
WelcomeScreen API Key draft（Renderer 局部状态）
        |
        | configureLongsysProvider({ apiKey })
        v
IProviderSettingsService（目标 Workspace Host，唯一命令入口）
        |
        |-- GET fixed /v1/models + Bearer Key
        |      \-- 失败/空列表：返回脱敏错误，不写配置
        |
        |-- ProviderConfigService 单事务 upsert
        |      \-- templateId + access.apiKey + personalModelIds/modelOrder
        |
        |-- ProviderRegistryService refresh
        v
ModelSelection View -> Renderer 初始模型偏好 -> 进入工作区
```

- API Key 草稿只由 `LoginApiKeyForm` 持有。
- Provider、Key 和模型成员的权威落点是目标 Environment 的 Personal Provider Repository。
- Registry 是已解析执行投影；Renderer snapshot 只是显示缓存。
- 单次 UI 提交没有并发；Host 对同一 Longsys 配置命令串行化。后发请求在前一请求完成后重新发现并
  upsert，不允许较早的迟到结果覆盖已完成的较新提交。
- Desktop 使用 `desktop-continuous` Registry/selection 链路；mobile `web-remote-replayable` 只读取
  attached Host 的结果，不创建第二个 Provider owner。

## Impact Brief

### Feature Summary

| Field            | Value                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Developer intent | 固定 Longsys OpenAI-compatible endpoint，首页只填 Key 并自动发现模型                                       |
| Capability       | Provider registry、Provider template、Welcome onboarding、model selection                                  |
| Change layer     | presentation / option-source / validation / commit-effect / persistence                                    |
| Operating mode   | planning / implementation-handoff                                                                          |
| Primary seeds    | `WelcomeScreen`、`LoginApiKeyForm`、`IProviderSettingsService`、`ProviderConfigService`、`ProviderRuntime` |
| Out of scope     | Longsys 计费/额度、OAuth、服务端模型详情页复刻、手机独立配置、静态硬编码用户 Key                           |

### UI Surface Matrix

| User scenario        | UI entry                            | Shared implementation                        | Display/draft owner    | Default/inherit source              | Validation/gating              | Commit action                    | Authority/persistence                   | Mode boundary                        | Must remain isolated from            |
| -------------------- | ----------------------------------- | -------------------------------------------- | ---------------------- | ----------------------------------- | ------------------------------ | -------------------------------- | --------------------------------------- | ------------------------------------ | ------------------------------------ |
| 首次启动连接 Longsys | `WelcomeScreen` / `LoginApiKeyForm` | Services accessor、Provider Settings service | 表单本地 API Key draft | 固定 Longsys Template               | 非空 + Host 远端发现           | `configureLongsysProvider`       | Personal Provider Repository + Registry | Desktop/Web root；手机 remote 不运行 | OAuth family、套餐状态、任务/session |
| 对话选择发现模型     | Composer model control              | `ModelConfigSelect` / ModelSelection View    | Composer draft         | Host preferred/first selectable     | Registry selectable/executable | 既有 model selection commit      | Agent runtime selection                 | continuous/replayable 既有语义       | Automation/Subagent 独立 commit sink |
| 设置页查看 Longsys   | Model Provider settings             | Provider Settings View                       | 设置页 draft           | Longsys Template + Personal overlay | 既有配置完整性                 | 既有 Provider settings mutations | Personal Provider Repository            | 目标 Environment                     | Welcome API Key draft                |

### Shared And Divergent Behavior

| Concern              | Shared across surfaces                             | Deliberately different                | Why it matters for this change |
| -------------------- | -------------------------------------------------- | ------------------------------------- | ------------------------------ |
| UI/component         | 首页沿用 Input/Button/Alert                        | 首页不复用设置页完整 Provider 编辑器  | 首页只能暴露 Key               |
| Option source        | 所有模型选择器使用 Host ModelSelection View        | 首页先通过 Longsys `/models` 生成成员 | 避免第二份模型列表             |
| Default/inheritance  | Template 提供 API 与 URL，通用规则提供模型默认能力 | 初始偏好取发现顺序第一项              | 服务端顺序可预测               |
| Validation           | 最终执行由 Registry/ModelFactory 校验              | 首页额外校验远端模型列表              | 无模型时不能进入空 Provider    |
| Commit effect        | Provider 设置走同一 Host 配置服务                  | Longsys 是发现后原子 upsert           | Key、成员、Registry 必须一致   |
| Persistence/recovery | Personal Repository 与远端同步沿既有边界           | API Key draft 不恢复                  | 不把秘密复制到 Renderer 持久层 |

### Feature Relationships

| Rank           | From                      | Semantic edge | To                           | Condition         | Why inspect it              | Evidence                                    |
| -------------- | ------------------------- | ------------- | ---------------------------- | ----------------- | --------------------------- | ------------------------------------------- |
| must-inspect   | Longsys onboarding        | commits-to    | Provider Settings service    | Key 提交          | 唯一配置写入路径            | `providerFacadeServices.ts`                 |
| must-inspect   | Provider Settings service | persists-to   | Personal Provider Repository | 发现成功          | Key 与成员原子一致          | `config-service.ts`                         |
| must-inspect   | Longsys onboarding        | options-from  | Longsys `/v1/models`         | Bearer Key 有效   | 候选不能静态伪造            | 本 spec + discovery tests                   |
| should-inspect | Provider Registry         | projects-to   | ModelSelection View          | upsert 后 refresh | 首页成功后立即可选          | `providerRuntime.ts`                        |
| should-inspect | ModelSelection View       | shared-by     | Composer/Automation/Subagent | 各入口自身提交    | 候选共享、状态不共享        | `docs/feature-impact-discovery.md`          |
| invariant-only | Longsys onboarding        | isolated-from | OAuth family/plan state      | 普通首页          | 不伪造 Z.ai/BigModel domain | `useProviderAvailabilityLoginEntryGuard.ts` |
| invariant-only | Longsys onboarding        | isolated-from | mobile remote owner          | `/remote`         | 不另起 Provider runtime     | remote workspace architecture               |

### State Owners And Commit Sinks

| State/fact            | Draft/display owner    | Authoritative owner     | Commit command/service     | Persistence/cache            | Evidence       |
| --------------------- | ---------------------- | ----------------------- | -------------------------- | ---------------------------- | -------------- |
| API Key 输入          | `LoginApiKeyForm`      | 提交前仅 Renderer draft | `configureLongsysProvider` | 不持久化 draft               | UI test        |
| Key 可访问模型        | loading/error UI       | Host discovery result   | fixed `/v1/models` request | 不单独缓存                   | service test   |
| Longsys Provider/成员 | Provider Settings View | `ProviderConfigService` | atomic upsert              | Personal Provider Repository | provider test  |
| 可选模型              | Model selectors        | target Host Registry    | Registry refresh/read      | Renderer snapshot            | selection test |

### Must-Preserve Invariants

| Invariant                              | Surfaces/modes               | Proof needed                           | Evidence              |
| -------------------------------------- | ---------------------------- | -------------------------------------- | --------------------- |
| Key 不进入源码、日志、错误或遥测       | Host/UI                      | secret-free fixture + error assertions | discovery/UI tests    |
| Renderer 不能提交 model IDs/base URL   | Welcome                      | service contract 只接收 Key            | TypeScript contract   |
| 发现失败零写入                         | Welcome/Host                 | repository snapshot unchanged          | provider/service test |
| Longsys upsert 不产生重复 Provider     | repeated submit              | 同 template 重配断言                   | provider test         |
| 其它模型入口只共享候选、不共享提交状态 | Composer/Automation/Subagent | 既有模型选择回归                       | focused regression    |
| mobile 不创建独立 runtime              | `/remote`                    | 架构检查/既有 remote service tests     | architecture evidence |

### Codegraph Evidence

当前工作区没有可调用的 codegraph 工具或索引；按技能约束使用功能图 seeds 与精确调用方阅读，深度
限制为 2，不将此静态扫描声称为完整调用图证明。

| Seed                                           | Query               | Direct callers / key path                    | Depth | Interpretation                 |
| ---------------------------------------------- | ------------------- | -------------------------------------------- | ----- | ------------------------------ |
| `LoginApiKeyForm`                              | exact callers       | `WelcomeScreen`                              | 1     | 首页唯一 Key draft             |
| `IProviderSettingsService`                     | exact callers       | UI hooks、Welcome、remote service collection | 2     | 必须从公共服务契约增加命令     |
| `ProviderConfigService.createPersonalProvider` | exact callers       | Facade -> ProviderRuntime mutation target    | 2     | 原子配置 owner                 |
| `ModelConfigSelect` / selection view           | feature graph seeds | Composer、Automation、Subagent               | 2     | 候选变更影响共享 option source |

### Graph Drift Candidates / Delta

现有功能图包含 Provider Registry、Provider Templates、Provider Settings 和模型选择面，但没有声明
Welcome API Key onboarding surface。实施时新增 Longsys onboarding capability/surface、Host discovery
service、Personal persistence 和 selection projection 关系；不改变现有模型选择 surface 的 commit sink。

### Unresolved Questions

无。用户已明确固定 factory/base URL、首页只输入 API Key、模型由 Key 自动获取。实现默认采用
OpenAI-compatible `/models` 标准响应并保持服务端顺序。

## Accepted Cases

| Case ID | Setup                              | Action           | Assertions                                                      | Evidence layers           | E2E status                        |
| ------- | ---------------------------------- | ---------------- | --------------------------------------------------------------- | ------------------------- | --------------------------------- |
| LS-01   | 首次启动、无可执行 Provider        | 打开首页         | 只显示 Longsys Key 输入和主动作，无 OAuth/provider/URL/跳过     | UI                        | unit + E2E passed；manual pending |
| LS-02   | `/models` 返回重复且含空 ID        | 提交有效 Key     | trim/filter/稳定去重；一个 Longsys Provider；顺序与首次返回一致 | network + repository + UI | unit covered                      |
| LS-03   | HTTP 401/500、畸形 JSON 或空列表   | 提交 Key         | 显示脱敏错误；Provider Repository 不变；可重试                  | network + repository + UI | unit covered                      |
| LS-04   | 已有 Longsys Provider              | 提交另一有效 Key | 复用同 providerId，原子替换 Key 与模型成员，不新增 Provider     | repository + Registry     | unit covered                      |
| LS-05   | Longsys 配置完成且无 family domain | 重启             | 启动守卫不再打开 Welcome；模型选择显示发现成员                  | UI + Registry             | unit covered                      |
| LS-06   | 手机连接 Desktop Host              | 打开 `/remote`   | 读取 Host 已有模型，不出现独立 Longsys onboarding/配置写入      | service boundary          | existing regression               |

## Pruning Decisions

| Decision ID | Pruned combinations         | Guard/invariant        | Product reason                           | Representative coverage |
| ----------- | --------------------------- | ---------------------- | ---------------------------------------- | ----------------------- |
| LS-P01      | 用户自定义 factory/base URL | 首页契约只接受 Key     | Longsys 固定接入                         | LS-01/02                |
| LS-P02      | 静态写死截图模型            | 模型成员来自授权 Key   | 不把目录截图当权限事实                   | LS-02                   |
| LS-P03      | OAuth/Plan 与 Longsys 组合  | 普通首页无 OAuth 选择  | 保留后台连接流程但不进入 onboarding 矩阵 | 既有 OAuth 回归         |
| LS-P04      | mobile 独立发现/保存        | shared-host attachment | 只有 Desktop/target Host 是配置 owner    | LS-06                   |

## 验证

- Provider 配置与 discovery 单测先失败后实现。
- Welcome/API Key 表单与启动守卫单测。
- Built-in release 完整性与 Provider Runtime 回归。
- `pnpm typecheck`、`pnpm lint`、`pnpm architecture:check --changed`、格式检查。
- 本地 Desktop 启动；真实 Longsys Key 只由用户在 UI 输入，自动化和日志中不携带真实凭据。
