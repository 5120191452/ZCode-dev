# LongsysCode 产品品牌规范

## 产品规则

- 面向用户展示的产品名称统一为 `LongsysCode`。中文和英文界面、窗口标题、系统菜单、托盘、
  Web/Android/TUI 入口、内置指南及可访问名称不得继续显示旧名称 `ZCode`。
- LongsysCode 自身的产品标识统一使用 `public/logo/brand-logo.png` 作为唯一母版。母版是用户交付的
  `1254 x 1254` RGBA PNG，不重画、不反色、不裁切内容，不叠加额外底色、边框或圆角。
- 主题只能影响 Logo 所在的页面表面，不能改变 Logo 自身的红蓝颜色。
- 应用运行时、安装包、托盘、Web favicon、README、登录/引导、对话草稿空态、关于窗口、更新窗口和
  Highspeed 卡片中的 LongsysCode 品牌标识必须来自该母版或可机械校验的等比缩放版。
- `scripts/generate-product-logo-assets.mjs` 是派生资产的唯一写入路径。生成结果随源码提交，打包和启动阶段不再临时改写 Logo。

## 品牌文案与兼容边界

- 未认证状态下的模型入口中文文案统一为“重新认证模型”，英文为“Re-authenticate models”；两个入口
  `app.login` 与 `sidebar.profile.notLoggedIn` 必须保持一致，并继续复用原有认证行为。
- About、帮助菜单、托盘、打开目录菜单、更新提示、Computer Use、会话分享、Web Remote Control、
  内置插件说明及“LongsysCode 使用指南”等用户可见文案统一使用 `LongsysCode`。
- 发送给模型的产品身份文案统一使用 `LongsysCode`，包括主 Agent、内置 Subagent、Workflow、
  Desktop 上下文、会话提示和模型连通性探测。模型不得再从当前提示词中获得旧产品名 `ZCode`，
  但运行时 metadata 中的 `zcode-agent` 身份继续保持不变。
- Desktop 安装包和主应用进程的可见名称按
  [`desktop-product-identity.md`](./desktop-product-identity.md) 迁移为 `LongsysCode`；`ZCode*`
  TypeScript/Kotlin 符号、`@zcode/*` 包名、`.zcode` 数据目录、`zcode://` 协议、`X-ZCode-*`
  HTTP 头、配置键、遥测字段、注册表键及兼容性错误匹配保持不变。
- Electron 的 appId、数据目录选择和旧版迁移标记保持兼容；产品名替换不得创建新的用户数据目录，
  也不得重写已持久化 Provider、模型或会话数据。

### Provider 可见提示词 Impact Brief

| Field              | Value                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------- |
| Requested change   | 模型回复中的自我身份从 `ZCode` 改为 `LongsysCode`                                     |
| Change layers      | Provider 可见提示词、Subagent/Workflow 提示词、辅助模型请求、契约测试                 |
| Primary capability | `capability.product-brand-logo`                                                       |
| Direct owner       | CLI core 的 context section、Subagent prompt、Workflow prompt 与辅助请求构造器        |
| Downstream         | 主会话、内置 Subagent、Desktop 上下文、会话提醒、连通性探测及各 Provider adapter 投影 |
| Out of scope       | `zcode-agent` metadata、包名、协议、存储、遥测、HTTP 兼容标识和 Provider 自身品牌     |

主 Agent 和子 Agent 仍沿用现有 ContextBuilder/Runtime 写入路径，adapter 只投影消息而不改写品牌。
本次不新增状态、提交路径、队列或恢复语义；功能图新增产品品牌到 Agent core runtime 的必查关系，
单测和 adapter wire test 冻结最终 Provider 消息，Desktop E2E fixture 同步更新但无需新增交互分支。

## 资产所有者与派生关系

`public/logo/brand-logo.png` 拥有品牌图像事实，其他文件只是平台格式或尺寸投影：

```text
public/logo/brand-logo.png
  ├── PNG 尺寸集 → public/logo/icons/* + packages/desktop/build/icons/*
  ├── 1024 PNG  → Desktop/Windows/Installer/Update 图标
  ├── PNG 尺寸集 → ICO / ICNS → Desktop、托盘、NSIS、DMG、Web favicon
  ├── PNG 尺寸集 → Android legacy / round / adaptive launcher
  └── 512 PNG   → Renderer 品牌组件和页内品牌入口
```

派生器保持正方形画布和 Alpha 通道，只作等比缩放与容器格式封装。同一尺寸在 `public` 和
`packages/desktop/build` 中必须二进制一致；Web 入口内嵌的 favicon 必须等于 `32x32.png`。

## 范围

### 必须替换

- Desktop 的 macOS/Windows/Linux 运行时图标、开发态图标母版、托盘图标与打包资源。
- Android 远控客户端的 legacy、round 与 adaptive launcher 图标；adaptive/round 投影只允许为系统遮罩安全区增加透明留白。
- macOS DMG 卷图标、Windows NSIS 安装/卸载/页头图标。
- Web 静态 `favicon.ico` 与入口 HTML 内嵌 favicon。
- Renderer 中代表 LongsysCode 产品的图形：HTML/React 启动壳、标题栏、折叠侧边栏、登录、首次引导、对话草稿空态、更新窗口、Highspeed 品牌位与内置 cloud content 中的 LongsysCode 标识。
- Desktop 自绘 About 窗口中的页内 Logo 和 BrowserWindow 图标。
- README 引用的产品图标。

### 明确排除

- Provider、模型、支付渠道、聊天渠道、文件类型、插件和网页自身的图标不是 LongsysCode 产品品牌，不得替换。
- `model-provider-zai-app.png` 归 Z.AI Provider 所有，不再与 LongsysCode 应用图标绑定；更换产品 Logo 不能改变 Provider 身份。
- DMG 背景中的产品名称 `ZCODE` 是文字，不是图标母版的派生物；本次保留安装指引排版。

## 界面与可访问性

- 页内 Logo 使用同一个可复用图像组件，缩放时使用 `object-contain`，不通过 `currentColor` 重着色。
- 装饰性 Logo 使用空 `alt` 和 `aria-hidden`；代表产品身份的容器保留本地化无关的 `LongsysCode` 可访问名称。
- 新 Logo 自带透明区域，登录、引导与 About 不再叠加为旧单色 Z 标识设计的黑色渐变底壳。
- 草稿空态在浅色/深色主题使用同一彩色资产，只在容器层使用低透明度保证问候文字可读。

## 影响摘要

| 产品节点           | 受影响界面/边界                            | 检查理由                   |
| ------------------ | ------------------------------------------ | -------------------------- |
| 产品品牌资产       | Desktop 打包、Web 入口、Renderer 品牌组件  | 共享同一母版和派生规则     |
| Desktop 平台外壳   | Dock/任务栏/托盘/DMG/NSIS/About            | 消费 PNG、ICO 或 ICNS 投影 |
| Android 平台外壳   | Launcher / round / adaptive icon           | 消费密度分级 PNG 投影      |
| Web Remote Control | HTML data URL + `favicon.ico`              | 非根 base 下仍须直接可用   |
| Renderer 共享 UI   | 登录、引导、空态、更新、Highspeed          | 不得保留旧内联 Z SVG       |
| Agent 模型上下文   | 主 Agent、Subagent、Workflow、辅助模型请求 | Provider 可见品牌必须一致  |
| Provider 品牌      | Z.AI Provider Logo                         | 是隔离边界，必须保持不变   |

品牌资产本身是静态展示投影；Desktop 安装/进程名称的后续迁移单独遵守安装身份规范，不改变
Renderer 状态、Host/Agent 生命周期、任务流、workspace identity、远控传输或任何持久化数据。

本次影响扫描以 `capability.product-brand-logo` 为起点；当前环境没有 codegraph，因此使用精确文本扫描、
现有菜单/About/内置指南单测和 Desktop E2E 用例核对直接消费者。状态所有者与提交路径均无变化：本地化
目录和各平台静态文案只负责显示，原认证回调、Desktop command 和 Host/Agent 仍是唯一行为所有者。

## 验收场景

1. 生成器运行后，母版不变，全部 PNG 尺寸正确，同尺寸投影二进制一致。
2. Desktop 的应用/窗口/托盘/安装图标、Android launcher 和 Web favicon 都为新 Logo，ICO/ICNS 与 Android 密度资源包含所需尺寸。
3. HTML/React 启动壳、标题栏、折叠侧边栏、登录、首次引导、对话草稿空态、About、更新、Highspeed 和内置 cloud content 都显示新 Logo，浅色/深色主题下不变色。
4. 代码中不再存在旧 ZCode 内联 Logo SVG 路径，但 Provider 和其他明确排除的品牌资产完全不受影响。
5. 未认证入口显示“重新认证模型”，点击后仍进入原模型认证流程；帮助菜单和 About 显示“关于 LongsysCode”，
   内置指南显示“LongsysCode 使用指南”。
6. 用户可见目录中不再出现独立的旧品牌名 `ZCode`，但兼容性技术标识保持原值。
7. 主 Agent 和内置 Subagent 的 Provider 请求使用 `LongsysCode` 身份；Workflow、Desktop 上下文、
   会话提示和连通性探测也不再向模型注入旧产品名。`zcode-agent` metadata、协议与持久化标识不变。
8. Web 定向测试、UI/Desktop 定向测试、`pnpm typecheck`、`pnpm lint` 和 `pnpm architecture:check --changed` 通过。
