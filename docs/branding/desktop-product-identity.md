# LongsysCode Desktop 安装与进程身份

## 产品规则

- 正式桌面安装身份和主应用进程名统一为 `LongsysCode`。
- Preview 桌面安装身份和主应用进程名统一为 `LongsysCode Preview`，继续与正式版并排安装。
- Windows 安装器和主程序分别命名为 `LongsysCode-<version>-win-<arch>.exe` 与
  `LongsysCode.exe`；macOS 使用 `LongsysCode.app`；Linux 使用 `longsyscode` 可执行文件。
- Preview 在上述可见名称后保留 ` Preview` 或 `-preview` 区分；`_TEST` 后缀仍只表示测试后端。
- Electron `appId`、Windows AUMID、卸载注册身份、`zcode://`、`.zcode`、`@zcode/*`、内部
  `zcode-agent`/Computer Use Helper 名称不随展示品牌迁移，避免破坏升级、协议和权限兼容性。
- Linux deb/rpm/pacman 的内部 package id 继续使用 `zcode` / `zcode-preview`，使新版覆盖升级原安装；
  面向用户的产物文件名和启动进程仍使用 LongsysCode。
- 主应用调用 `app.setName` 和 `process.title` 时使用 LongsysCode 名称；默认 Electron `userData`
  与 `sessionData` 仍指向历史 `ZCode` / `ZCode Preview` / `ZCode Dev` 目录。显式 E2E 路径覆盖保持优先。

## 构建宿主规则

- Windows 正式安装包优先在 Windows x64 runner 上构建。
- 在 Linux 或 macOS 上交叉构建 Windows 安装包时，Electron Builder 需要 Wine 处理 Windows
  可执行文件；`bundle.mjs` 必须在准备资源和编译应用之前检查 `wine`/`wine64`，缺失时立即给出
  可执行的安装或改用 Windows 构建机的提示。
- `--dry-run` 只展示命令，不要求宿主已经安装 Wine。
- `ZCODE_ENV` 未设置时继续 fail-safe 到测试后端和 Preview 身份。生成无 `Preview` 的正式安装包必须
  显式设置 `ZCODE_ENV=production`，不得为了本地打包便利改变环境默认值。

## Impact Brief

| Field              | Value                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Requested change   | 安装包、主应用可执行文件和主进程从 ZCode 改为 LongsysCode；提前诊断跨平台 Windows 打包缺少 Wine                                 |
| Change layers      | presentation、persistence compatibility、desktop lifecycle/release validation                                                   |
| Primary capability | `capability.product-brand-logo`（LongsysCode 产品品牌）                                                                         |
| Direct owners      | `desktop-product-identity.mjs` 拥有构建身份；`desktopRuntimeEnv.ts` 拥有运行时名称和数据目录投影；`bundle.mjs` 拥有打包前置检查 |
| Out of scope       | appId/protocol/配置目录迁移、内部 Agent/Helper 重命名、绕过 Electron fuse、自动安装系统依赖                                     |

### UI / platform surface matrix

| Surface          | Display/process source                     | Commit/build sink               | Persistence boundary                            | Required result                                  |
| ---------------- | ------------------------------------------ | ------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Windows NSIS     | Desktop product identity                   | electron-builder `win`/`nsis`   | 原 appId 与卸载注册身份                         | 安装包 `LongsysCode-*`; 主程序 `LongsysCode.exe` |
| macOS bundle     | Desktop product identity                   | electron-builder `mac`          | 原 bundle/appId 与旧数据目录                    | `LongsysCode.app`，主进程 `LongsysCode`          |
| Linux package    | `linuxExecutableName` / `linuxPackageName` | AppImage/deb/rpm/pacman         | package id 保留 `zcode*`，`.zcode` 业务数据不变 | 产物和进程使用 LongsysCode                       |
| Electron runtime | `desktopRuntimeEnv.ts`                     | `app.setName` / `process.title` | 旧 `ZCode*` Electron 数据目录                   | 可见运行名变更，已有会话和缓存可继续读取         |
| Cross-build CLI  | `bundle.mjs`                               | Electron Builder invocation     | 不写产品状态                                    | 无 Wine 时在资源准备前失败并说明修复方式         |

### Shared implementation and divergent behavior

- Windows 和 macOS 共享 `productName`，Linux 因包管理器规则使用独立的小写名称。
- production 与 preview 共享品牌主名，但保留不同 appId、可执行后缀、包名和 Helper 安装 variant。
- 产品名称改变；技术身份和历史持久化目录保持不变。这是有意的兼容性分离，不是遗漏。

### Ranked relationships

| Rank           | Relationship                                                          | Reason / evidence                  |
| -------------- | --------------------------------------------------------------------- | ---------------------------------- |
| must-inspect   | product identity -> electron-builder product/artifact/executable name | 决定真实安装包和主程序名           |
| must-inspect   | runtime application name -> Electron app/process title                | 决定运行时可见进程身份             |
| must-inspect   | runtime data directory -> historical `ZCode*` directories             | 防止品牌改名创建空白配置和会话     |
| should-inspect | macOS release doctor / Windows installer smoke                        | 发布验收路径包含应用 bundle/exe 名 |
| conditional    | Linux/macOS host -> Windows target -> Wine                            | 只影响 Windows 交叉构建            |
| invariant-only | appId/AUMID/protocol/provider/session ownership                       | 必须保持，不属于品牌可见名称       |

### Graph evidence and drift

当前环境没有独立 codegraph 命令；以精确引用扫描、`resolveDesktopProductIdentity` 的直接消费者、
Electron Builder 配置、runtime identity 单测和安装器 smoke 为证据，展开深度为两层。既有功能图只记录
Logo/UI 投影，缺少 Desktop 安装/进程身份与构建前置检查，作为已确认 graph delta 补入。

## 状态所有者与不变量

```text
ZCODE_ENV + ZCODE_PREVIEW_IDENTITY
              |
              v
desktop-product-identity.mjs ----> electron-builder ----> installer / app executable
              |
              +---- flavor compile constant ----> desktopRuntimeEnv.ts ----> app/process name
                                                    |
                                                    +---- legacy data-directory projection

host platform + target OS ----> bundle.mjs preflight ----> prepare/build/electron-builder
```

- 构建身份只有 `desktop-product-identity.mjs` 一个 owner；平台配置只消费其投影。
- 运行时名称和 Electron 数据目录都由 `desktopRuntimeEnv.ts` 计算，但两者不再使用同一个字符串作为事实。
- Wine 检查只观察宿主工具，不修改系统，不自动安装，也不改变产物配置。
- Desktop continuous、Web remote replayable、workspace identity、Provider registry 和模型配置不受影响。

## 验收用例

| Case           | Setup                                   | Action                         | Assertions                                                                    | Evidence      |
| -------------- | --------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- | ------------- |
| DESKTOP-ID-001 | `ZCODE_ENV=production`                  | 解析构建身份                   | `LongsysCode`、`longsyscode`，appId/package id 仍为 `dev.zcode.app` / `zcode` | unit/config   |
| DESKTOP-ID-002 | test 或显式 Preview                     | 解析构建身份                   | `LongsysCode Preview`、`longsyscode-preview`，Preview appId/package id 不变   | unit/config   |
| DESKTOP-ID-003 | packaged production/preview             | 解析运行时路径                 | app/process 名使用 LongsysCode；数据目录仍为对应 `ZCode*` 历史目录            | unit          |
| DESKTOP-ID-004 | Linux host + Windows target + 无 Wine   | 执行非 dry-run bundle 前置检查 | 在 prepare/build 前失败，错误含 Wine 和 Windows runner 指引                   | unit/CLI      |
| DESKTOP-ID-005 | Linux host + Windows target + Wine 可用 | 执行前置检查                   | 允许继续进入既有构建链                                                        | unit          |
| DESKTOP-ID-006 | 任意宿主 + `--dry-run`                  | 输出构建命令                   | 不因 Wine 缺失失败                                                            | CLI           |
| DESKTOP-ID-007 | Windows NSIS smoke                      | 安装/覆盖/完成页启动           | fixture 目标为 `LongsysCode.exe`，快捷方式和 launchLink 指向同一 exe          | Windows smoke |

无需新增交互 E2E：变更发生在安装产物和主进程壳层，证据由 identity/config 单测、真实 NSIS 编译 smoke
和最终平台打包提供；Renderer 内交互和状态提交路径没有变化。
