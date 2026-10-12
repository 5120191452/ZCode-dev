# Desktop 开发运行时目录

## 规则与所有者

- macOS 开发启动脚本 `packages/desktop/scripts/dev.mjs` 指定仓库根目录下的
  `.zcode-runtime/desktop-dev` 为 Electron 开发副本目录。
- `dev.mjs` 是开发态 Electron 子进程环境的所有者。IDE 自身由 Electron 启动时可能把
  `ELECTRON_RUN_AS_NODE=1` 传给终端；启动脚本必须仅从 Electron 子进程环境中移除该变量，
  避免 Electron 被当成普通 Node.js 运行，同时不得改写 watcher 或 Vite 的父进程环境。
- `packages/desktop/package.json` 必须提供合法的 SemVer 版本，保证直接运行未打包 Electron 时
  `app.getVersion()` 可被 `electron-updater` 解析。开发态使用 `0.0.0` 占位；正式构建仍由
  build metadata 写入真实版本。
- Linux 源码依赖中的 `chrome-sandbox` 默认由普通用户安装，无法满足 SUID helper 所需的
  `root:root` 与 `4755`。Ubuntu/AppArmor 还可能禁止未受限应用创建 user namespace，因此
  开发启动器不得传递 `--disable-setuid-sandbox` 或 `--no-sandbox` 绕过 Chromium 沙箱；受影响
  的开发机必须在安装依赖后，从仓库根目录执行以下命令配置 Electron 的 SUID helper：

  ```bash
  sudo chown root:root node_modules/electron/dist/chrome-sandbox
  sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
  ```

  重新安装或更新 Electron 可能重置该文件的所有者和权限，发生 sandbox 启动错误时需要重新配置。

- `prepareDevElectronAppBundle` 通过现有 `runtimeRoot` 参数接收目录，并负责创建、
  校验和复用 `<Electron 版本>-<架构>/ZCode Dev.app`。
- 副本保留现有应用身份与 `zcode` 协议声明；Windows、Linux 和打包版本的启动逻辑不变。
- `.zcode-runtime/` 是可重建的本地产物，必须由 `.gitignore` 忽略。

## 切换与失败边界

启动脚本只使用新目录，不自动迁移或删除旧缓存。新目录不存在时，现有准备函数创建
副本；创建失败时沿用现有错误传播行为，不回退到旧目录。

## 验收

1. 启动脚本传入的目录与 `.gitignore` 中的目录一致。
2. 路径仍按 Electron 版本和架构隔离，准备函数的缓存复用和协议声明逻辑不变。
3. 从带有 `ELECTRON_RUN_AS_NODE=1` 的 IDE/终端启动时，Electron 仍以桌面应用模式运行。
4. 未打包开发启动时 `app.getVersion()` 返回合法 SemVer，自动更新模块初始化不再抛错。
5. 受 AppArmor 限制的 Linux 开发机在配置 SUID helper 后可以启动，且启动参数不包含
   `--disable-setuid-sandbox` 或 `--no-sandbox`。
6. 通过脚本语法检查、类型检查、Lint 和架构检查。
