# 产品 Logo 资产规范

## 产品规则

- ZCode 自身的产品标识统一使用 `public/logo/brand-logo.png` 作为唯一母版。母版是用户交付的
  `1254 x 1254` RGBA PNG，不重画、不反色、不裁切内容，不叠加额外底色、边框或圆角。
- 主题只能影响 Logo 所在的页面表面，不能改变 Logo 自身的红蓝颜色。
- 应用运行时、安装包、托盘、Web favicon、README、登录/引导、对话草稿空态、关于窗口、更新窗口和
  Highspeed 卡片中的 ZCode 品牌标识必须来自该母版或可机械校验的等比缩放版。
- `scripts/generate-product-logo-assets.mjs` 是派生资产的唯一写入路径。生成结果随源码提交，打包和启动阶段不再临时改写 Logo。

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
- Renderer 中代表 ZCode 产品的图形：HTML/React 启动壳、标题栏、折叠侧边栏、登录、首次引导、对话草稿空态、更新窗口、Highspeed 品牌位与内置 cloud content 中的 ZCode 标识。
- Desktop 自绘 About 窗口中的页内 Logo 和 BrowserWindow 图标。
- README 引用的产品图标。

### 明确排除

- Provider、模型、支付渠道、聊天渠道、文件类型、插件和网页自身的图标不是 ZCode 产品品牌，不得替换。
- `model-provider-zai-app.png` 归 Z.AI Provider 所有，不再与 ZCode 应用图标绑定；更换产品 Logo 不能改变 Provider 身份。
- DMG 背景中的产品名称 `ZCODE` 是文字，不是图标母版的派生物；本次保留安装指引排版。

## 界面与可访问性

- 页内 Logo 使用同一个可复用图像组件，缩放时使用 `object-contain`，不通过 `currentColor` 重着色。
- 装饰性 Logo 使用空 `alt` 和 `aria-hidden`；代表产品身份的容器保留本地化无关的 `ZCode` 可访问名称。
- 新 Logo 自带透明区域，登录、引导与 About 不再叠加为旧单色 Z 标识设计的黑色渐变底壳。
- 草稿空态在浅色/深色主题使用同一彩色资产，只在容器层使用低透明度保证问候文字可读。

## 影响摘要

| 产品节点           | 受影响界面/边界                           | 检查理由                   |
| ------------------ | ----------------------------------------- | -------------------------- |
| 产品品牌资产       | Desktop 打包、Web 入口、Renderer 品牌组件 | 共享同一母版和派生规则     |
| Desktop 平台外壳   | Dock/任务栏/托盘/DMG/NSIS/About           | 消费 PNG、ICO 或 ICNS 投影 |
| Android 平台外壳   | Launcher / round / adaptive icon          | 消费密度分级 PNG 投影      |
| Web Remote Control | HTML data URL + `favicon.ico`             | 非根 base 下仍须直接可用   |
| Renderer 共享 UI   | 登录、引导、空态、更新、Highspeed         | 不得保留旧内联 Z SVG       |
| Provider 品牌      | Z.AI Provider Logo                        | 是隔离边界，必须保持不变   |

这是静态展示资产替换，不改变 Renderer 状态、Host/Agent 生命周期、任务流、workspace identity、远控传输或任何持久化数据。

## 验收场景

1. 生成器运行后，母版不变，全部 PNG 尺寸正确，同尺寸投影二进制一致。
2. Desktop 的应用/窗口/托盘/安装图标、Android launcher 和 Web favicon 都为新 Logo，ICO/ICNS 与 Android 密度资源包含所需尺寸。
3. HTML/React 启动壳、标题栏、折叠侧边栏、登录、首次引导、对话草稿空态、About、更新、Highspeed 和内置 cloud content 都显示新 Logo，浅色/深色主题下不变色。
4. 代码中不再存在旧 ZCode 内联 Logo SVG 路径，但 Provider 和其他明确排除的品牌资产完全不受影响。
5. Web 定向测试、UI/Desktop 定向测试、`pnpm typecheck`、`pnpm lint` 和 `pnpm architecture:check --changed` 通过。
