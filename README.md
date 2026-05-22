# screenshots

`screenshots`是一个独立维护的截图工具项目，基于`electron`和`react`提供截图、选区、标注、保存和扩展能力。它支持马赛克、文本、画笔、箭头、椭圆、矩形等截图操作，也提供多语言和三方扩展 API，方便接入 OCR、大模型、上传、审计等业务能力。

> 本项目基于 MIT 许可的 `nashaofu/screenshots` 独立维护，来源和版权说明见 [NOTICE.md](NOTICE.md) 与 [LICENSE](LICENSE)。

![react-screenshots](./screenshot.jpg)

## 特性

- 双击页面完成截图，触发`ok`事件，如果未选择截图区域，双击截取全屏，如果选择了截图区域，双击截取选择区域
- 右键点击取消截图，触发`cancel`事件
- 多语言支持
- 截图操作：马赛克、文本、画笔、箭头、椭圆、矩形
- 扩展 API：支持三方在工具栏添加 OCR、大模型、上传等自定义按钮，并监听选区、工具、历史、确认、保存、取消等关键事件

## 0.7.0

这一版把“自定义按钮”正式整理成可发布能力：

- React 侧支持通过 `operationItems` / `extraOperationItems` 植入按钮、分隔符、自定义状态和扩展回调
- Electron 侧支持通过 `operationItems` 配置主进程按钮，并用 `updateOperationItem` 在异步任务期间更新 `checked` / `disabled` 状态
- 文档已经补到包 README，便于直接对外说明接入方式

发布说明见 [CHANGELOG.md](./CHANGELOG.md)。

## 作为 Git 子模块接入

如果你当前不走 npm 发布，推荐把整个仓库作为 Git 子模块接入业务项目，再通过 `pnpm workspace` 方式引用包。

这样做更适合当前仓库结构：

- 根目录是 monorepo，真正可复用的包在 `packages/react-screenshots` 和 `packages/electron-screenshots`
- Electron 包依赖 React 包，仓库内部当前使用 workspace 依赖管理
- 对你自己的多个项目复用时，子模块方案比手工复制代码或发布私包更稳定

### 1. 添加子模块

```bash
git submodule add https://github.com/474420502/screenshots.git vendor/screenshots
git submodule update --init --recursive
```

### 2. 把子模块纳入 pnpm workspace

目标项目根目录的 `pnpm-workspace.yaml` 可以写成：

```yaml
packages:
	- apps/**
	- packages/**
	- vendor/screenshots/packages/**
```

如果你的项目不是 `apps/**` / `packages/**` 结构，只需要保留你自己的原有规则，并额外加上：

```yaml
- vendor/screenshots/packages/**
```

### 3. 在目标项目中引用依赖

如果你要在自己的 Electron 项目中直接使用这两个包，`package.json` 可以这样写：

```json
{
	"dependencies": {
		"@474420502/react-screenshots": "workspace:*",
		"@474420502/electron-screenshots": "workspace:*"
	}
}
```

如果你只需要 React 截图界面，也可以只引用：

```json
{
	"dependencies": {
		"@474420502/react-screenshots": "workspace:*"
	}
}
```

### 4. 安装并构建

```bash
pnpm install
pnpm --filter @474420502/react-screenshots build
pnpm --filter @474420502/electron-screenshots build
```

如果你的主项目依赖它们的构建产物，建议在主项目构建前先执行上面两条 build。

### 5. 更新子模块版本

当这个仓库有新功能或修复时，在目标项目里执行：

```bash
cd vendor/screenshots
git pull
cd ../..
git add vendor/screenshots
git commit -m "chore: bump screenshots submodule"
```

### 注意事项

- 新同事拉项目后，需要执行 `git submodule update --init --recursive`
- CI 也要初始化子模块，否则 `vendor/screenshots` 目录是空的
- 如果你希望业务项目拿到固定版本，推荐在子模块里锁定到指定 commit，而不是一直跟随分支头部
- 当前仓库更适合“源码集成 / 子模块复用”场景；如果后面要面向外部团队做标准包分发，再考虑 npm 或 GitHub Packages 会更合理

## @474420502/electron-screenshots

[@474420502/electron-screenshots](./packages/electron-screenshots/README.md)是`screenshots`的一个子项目，提供了与`electron`截图相关的功能。

### 安装

```bash
pnpm add @474420502/electron-screenshots
```

自定义按钮说明和主进程接入示例见 [packages/electron-screenshots/README.md](./packages/electron-screenshots/README.md)。

## @474420502/react-screenshots

[@474420502/react-screenshots](./packages/react-screenshots/README.md)是`screenshots`的另一个子项目，提供了与`react`相关的截图界面插件，可以与`@474420502/electron-screenshots`渲染进程界面配合使用，当然也可以单独使用。

### 安装

```bash
pnpm add @474420502/react-screenshots
```

自定义按钮说明、布局规则和 `ScreenshotsActionContext` 用法见 [packages/react-screenshots/README.md](./packages/react-screenshots/README.md)。
