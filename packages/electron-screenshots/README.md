# @474420502/electron-screenshots

> Extensible Electron screenshot toolkit

This package is independently maintained by 474420502 and is based on the MIT-licensed `nashaofu/screenshots` project.

For legal attribution and project lineage, see the root `NOTICE.md` and `LICENSE` files.

## Prerequisites

- electron >= 11

## Install

```bash
pnpm add @474420502/electron-screenshots
```

## As Git Submodule

如果你当前不走 npm 发布，推荐把整个仓库作为 Git 子模块接入业务项目，再通过 `pnpm workspace` 引用这个包。

```bash
git submodule add https://github.com/474420502/screenshots.git vendor/screenshots
git submodule update --init --recursive
```

由于 Electron 包依赖 React 包，目标项目根目录的 `pnpm-workspace.yaml` 至少要包含：

```yaml
packages:
  - vendor/screenshots/packages/**
```

目标项目里的依赖建议同时声明这两个包：

```json
{
  "dependencies": {
    "@474420502/react-screenshots": "workspace:*",
    "@474420502/electron-screenshots": "workspace:*"
  }
}
```

安装完成后执行：

```bash
pnpm install
pnpm --filter @474420502/react-screenshots build
pnpm --filter @474420502/electron-screenshots build
```

更完整的子模块接入约定见根目录 README。

如果宿主项目通过 `pnpm workspace` + `electron-builder` 打包 Electron 应用，`@474420502/electron-screenshots` 现在已经去掉了对 `fs-extra/jsonfile` 运行时链路的依赖，避免 Linux 打包产物里出现 `Cannot find module 'jsonfile/utils'` 这类由跨树解析引起的问题。

### Packaging Notes

把 `@474420502/electron-screenshots` 作为 `pnpm workspace` 依赖接入另一个 Electron 宿主应用，并使用 `electron-builder` 打包，是支持的场景。

推荐做法：

- 宿主项目把 `@474420502/electron-screenshots` 和 `@474420502/react-screenshots` 声明为生产依赖
- 打包宿主应用前，先构建这两个 workspace 包
- 如果主进程使用 webpack、vite 或其他 bundler，请按本 README 的 external 配置方式保留运行时加载
- 如果宿主项目对 workspace 包或 native 模块做了裁剪、白名单或额外 external 处理，请确认 `debug`、`node-screenshots` 等运行时依赖在 packaged app 中仍然可见

额外说明：

- 从当前版本开始，Electron 包运行时文件操作已改为内置 `node:fs/promises`，不再依赖 `fs-extra -> jsonfile` 链路
- 这意味着 Linux packaged app 里此前常见的 `Cannot find module 'jsonfile/utils'` 错误，不应再是 `@474420502/electron-screenshots` 的默认风险点
- `node-screenshots` 仍然是原生依赖，宿主项目如果对原生模块的打包位置有特殊要求，需要继续按自己的 `electron-builder` 规则处理

## 0.7.0

这一版把 Electron 侧的自定义按钮能力整理成对外可发布 API：

- 主进程可以直接通过 `operationItems` 配置可序列化按钮
- 主进程可以直接在 `operationItems` 里内联 `handler`，让按钮定义和业务处理写在一起
- 点击按钮后，会收到统一的 `extensionOperation` 回调
- 可通过 `updateOperationItem` 在异步任务期间更新按钮状态
- 可通过 `imageResource` 把截图自动转换成临时文件 + token，方便交给 OCR / AI / 外部窗口
- 可通过可序列化 `option` 结果面板，把 OCR / AI 结果直接展示在截图界面内
- 可通过 `forwardEvents` 转发选区、历史、错误等渲染事件，给业务逻辑做联动
- 针对 `pnpm workspace + electron-builder` 的宿主应用打包场景，运行时代码已经移除 `fs-extra/jsonfile` 依赖链，减少 packaged app 的跨树解析风险

## Usage

```ts
import debug from "electron-debug";
import { app, globalShortcut } from "electron";
import Screenshots from "./screenshots";

app.whenReady().then(() => {
  app.setAppUserModelId('com.electron.screenshots')
  const screenshots = new Screenshots();
  globalShortcut.register("ctrl+shift+a", () => {
    screenshots.startCapture();
    screenshots.$view.webContents.openDevTools();
  });
  // 点击确定按钮回调事件
  screenshots.on("ok", (e, buffer, bounds) => {
    console.log("capture", buffer, bounds);
  });
  // 点击取消按钮回调事件
  screenshots.on("cancel", () => {
    console.log("capture", "cancel1");
  });
  screenshots.on("cancel", (e) => {
    // 执行了preventDefault
    // 点击取消不会关闭截图窗口
    e.preventDefault();
    console.log("capture", "cancel2");
  });
  // 点击保存按钮回调事件
  screenshots.on("save", (e, buffer, bounds) => {
    console.log("capture", buffer, bounds);
  });
  // 保存后的回调事件
  screenshots.on("afterSave", (e, buffer, bounds, isSaved) => {
    console.log("capture", buffer, bounds);
    console.log("isSaved", isSaved); // 是否保存成功
  });
  debug({ showDevTools: true, devToolsMode: "undocked" });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
```

### 注意

- 如果使用了 webpack 打包主进程，请在主进程 webpack 配置中修改如下配置，否则可能会出现不能调用截图窗口的情况

```js
{
  externals: {
    '@474420502/electron-screenshots': 'require("@474420502/electron-screenshots")'
  }
}
```

- `vue-cli-plugin-electron-builder`配置示例

```js
// vue.config.js
module.exports = {
  publicPath: ".",
  pluginOptions: {
    electronBuilder: {
      // 不打包，使用 require 加载
      externals: ["@474420502/electron-screenshots"],
    },
  },
};
```

- vite 配置示例：

```js
// vite.config.js
import { defineConfig } from "vite";
import viteExternals from "vite-plugin-externals";

export default defineConfig({
  plugins: [
    viteExternals({
      "@474420502/electron-screenshots": 'require("@474420502/electron-screenshots")', // 模块名称: 全局变量
    }),
  ],
});
```

- esc 取消截图，可用以下代码实现按 esc 取消截图

```js
globalShortcut.register("esc", () => {
  if (screenshots.$win?.isFocused()) {
    screenshots.endCapture();
  }
});
```

- 加速截图界面展示，不销毁`BrowserWindow`，减少创建窗口的开销，可用以下代码实现。**需注意，启用该功能，会导致`window-all-closed`事件不触发，因此需要手动关闭截图窗口**

```js
// 是否复用截图窗口，加快截图窗口显示，默认值为 false
// 如果设置为 true 则会在第一次调用截图窗口时创建，后续调用时直接使用
// 且由于窗口不会 close，所以不会触发 app 的 `window-all-closed` 事件
const screenshots = new Screenshots({
  singleWindow: true,
});
```

## Methods

- `Debugger`类型产考[debug](https://github.com/debug-js/debug)中的`Debugger`类型

```ts
export type LoggerFn = (...args: unknown[]) => void;
export type Logger = Debugger | LoggerFn;

export interface Lang {
  magnifier_position_label?: string;
  operation_ok_title?: string;
  operation_cancel_title?: string;
  operation_save_title?: string;
  operation_redo_title?: string;
  operation_undo_title?: string;
  operation_mosaic_title?: string;
  operation_text_title?: string;
  operation_brush_title?: string;
  operation_arrow_title?: string;
  operation_ellipse_title?: string;
  operation_rectangle_title?: string;
}

export interface ScreenshotsOpts {
  lang?: Lang;
  // 调用日志，默认值为 debug('screenshots:electron')
  // debug https://www.npmjs.com/package/debug
  logger?: Logger;
  // 是否复用截图窗口，加快截图窗口显示，默认值为 false
  // 如果设置为 true 则会在第一次调用截图窗口时创建，后续调用时直接使用
  // 且由于窗口不会 close，所以不会触发 app 的 `window-all-closed` 事件
  singleWindow?: boolean;
  // 扩展工具栏按钮，支持可序列化配置和主进程 inline handler
  operationItems?: ElectronScreenshotsOperationItem[];
  // 也可以分离注册 handler，适合后续动态替换业务实现
  operationHandlers?: Record<string, ElectronScreenshotsOperationHandler>;
  // 转发渲染进程截图事件，默认转发全部事件，也可以传事件名数组
  forwardEvents?: true | string[];
}

export interface ElectronScreenshotsOperationItem {
  key: string;
  title: string;
  icon?: string;
  iconSvg?: string;
  label?: string;
  handler?: ElectronScreenshotsOperationHandler;
  checked?: boolean;
  disabled?: boolean;
  requiresSelection?: boolean;
  option?: ElectronScreenshotsOperationOption;
  imageResource?: boolean | CreateImageResourceOptions;
  position?:
    | "start"
    | "before-history"
    | "before-confirm"
    | "end"
    | { before: string }
    | { after: string };
  // 默认 true，点击按钮时一并回传当前选区 png buffer
  includeImage?: boolean;
}

export type ElectronScreenshotsOperationItemPatch = Partial<
  Omit<ElectronScreenshotsOperationItem, "key">
>;

export interface CreateImageResourceOptions {
  directory?: string;
  fileNamePrefix?: string;
  mimeType?: string;
}

export interface ScreenshotsImageResource {
  token: string;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

export type ElectronScreenshotsOperationOption =
  | string
  | {
      type?: "text";
      title?: string;
      description?: string;
      text: string;
    }
  | {
      type: "list";
      title?: string;
      description?: string;
      items: string[];
      ordered?: boolean;
    }
  | {
      type: "key-value";
      title?: string;
      description?: string;
      items: { label: string; value: string }[];
    };

export interface ElectronScreenshotsOperationContext {
  key: string;
  buffer: Buffer | null;
  bounds: Bounds | null;
  display: Display;
  imageResource?: ScreenshotsImageResource;
  update: (patch: ElectronScreenshotsOperationItemPatch) => Promise<boolean>;
  showOption: (
    option: ElectronScreenshotsOperationOption,
    patch?: Omit<ElectronScreenshotsOperationItemPatch, "option">,
  ) => Promise<boolean>;
  clearOption: (
    patch?: Omit<ElectronScreenshotsOperationItemPatch, "option">,
  ) => Promise<boolean>;
  createImageResource: (
    input: Buffer | ArrayBuffer | Uint8Array | string,
    options?: CreateImageResourceOptions,
  ) => Promise<ScreenshotsImageResource>;
  getImageResource: (token: string) => ScreenshotsImageResource | undefined;
  getImageResourcePath: (token: string) => string | undefined;
  revokeImageResource: (token: string) => Promise<boolean>;
  endCapture: () => Promise<void>;
}

export type ElectronScreenshotsOperationHandler = (
  context: ElectronScreenshotsOperationContext,
) => unknown | Promise<unknown>;

export interface ScreenshotsCaptureOptions {
  timeoutMs?: number;
  operationItems?: ElectronScreenshotsOperationItem[];
}

export interface ScreenshotsCaptureResult {
  buffer: Buffer;
  data: ScreenshotsData;
  dataUrl: string;
  base64: string;
}
```

| 名称                                              | 说明             | 返回值 |
| ------------------------------------------------- | ---------------- | ------ |
| `constructor(opts: ScreenshotsOpts): Screenshots` | 调用截图方法截图 | -      |
| `startCapture(): Promise<void>`                   | 调用截图方法截图 | -      |
| `captureOnce(options?: ScreenshotsCaptureOptions): Promise<ScreenshotsCaptureResult>` | 单次截图并直接返回结果，不走默认写入剪贴板流程 | 截图结果 |
| `endCapture(): Promise<void>`                     | 手动结束截图     | -      |
| `setLang(lang: Lang): Promise<void>`              | 修改语言         | -      |
| `setOperationItems(items: ElectronScreenshotsOperationItem[]): Promise<void>` | 设置扩展工具栏按钮 | - |
| `setOperationHandler(key: string, handler?: ElectronScreenshotsOperationHandler): void` | 注册单个扩展按钮处理函数 | - |
| `setOperationHandlers(handlers: Record<string, ElectronScreenshotsOperationHandler>): void` | 批量注册扩展按钮处理函数 | - |
| `removeOperationHandler(key: string): boolean` | 移除单个扩展按钮处理函数 | 是否存在对应 key |
| `updateOperationItem(key: string, patch: ElectronScreenshotsOperationItemPatch): Promise<boolean>` | 更新单个扩展工具栏按钮 | 是否找到对应 key |
| `createImageResource(input: Buffer \| ArrayBuffer \| Uint8Array \| string, options?: CreateImageResourceOptions): Promise<ScreenshotsImageResource>` | 手动创建临时图片资源 | 资源元数据 |
| `getImageResource(token: string): ScreenshotsImageResource \| undefined` | 获取资源元数据 | 资源或 `undefined` |
| `getImageResourcePath(token: string): string \| undefined` | 获取资源文件路径 | 文件路径或 `undefined` |
| `revokeImageResource(token: string): Promise<boolean>` | 释放单个资源 | 是否找到对应 token |
| `clearImageResources(): Promise<void>` | 释放当前实例创建的全部资源 | - |

## Custom Toolbar Buttons

`@474420502/electron-screenshots`适合“主进程决定业务能力，渲染进程继续复用内建截图 UI”的场景。对外最推荐的接法是：直接在 `operationItems` 里内联 `handler`，让按钮定义、状态更新和结果面板都收敛在主进程一处。

### Quick Start

```ts
const screenshots = new Screenshots({
  operationItems: [
    {
      key: "ocr",
      title: "OCR",
      label: "OCR",
      position: "before-confirm",
      requiresSelection: true,
      imageResource: {
        fileNamePrefix: "ocr",
      },
      async handler(context) {
        if (!context.imageResource) {
          return;
        }

        await context.showOption("Recognizing...", {
          disabled: true,
        });

        try {
          const text = await runOcrFromFile(
            context.imageResource.filePath,
            context.bounds,
            context.display,
          );

          await context.showOption(
            {
              type: "text",
              title: "OCR Result",
              text,
            },
            {
              disabled: false,
            },
          );
        } finally {
          await context.revokeImageResource(context.imageResource.token);
        }
      },
    },
    {
      key: "ask-ai",
      title: "Analyze with AI",
      label: "AI",
      requiresSelection: true,
      position: { after: "ocr" },
      includeImage: true,
      async handler(context) {
        if (!context.buffer) {
          return;
        }

        await context.showOption("Analyzing...", {
          disabled: true,
        });

        const summary = await askModel(context.buffer, context.bounds, context.display);

        await context.showOption(
          {
            type: "list",
            title: "AI Summary",
            items: summary,
          },
          {
            disabled: false,
          },
        );
      },
    },
  ],
});

screenshots.on("selectionChange", (_event, rendererEvent) => {
  console.log("selection", rendererEvent.payload);
});
```

如果你不想把 handler 和按钮定义写在一起，也可以继续用 `operationHandlers` 或 `extensionOperation` 事件分离注册；但从接入成本来看，inline `handler` 是最推荐的默认路径。

### Config Fields

`ElectronScreenshotsOperationItem` 当前支持以下字段：

| 字段 | 说明 |
| ---- | ---- |
| `key` | 按钮唯一标识，必填 |
| `title` | 鼠标悬停提示文本 |
| `icon` | 按钮 icon class |
| `label` | 按钮文字，适合 OCR / AI 这类简短标签 |
| `handler` | 主进程处理函数，推荐默认使用；点击按钮后库会自动调用它 |
| `checked` | 按钮是否高亮 |
| `disabled` | 按钮是否禁用 |
| `requiresSelection` | 是否要求先有选区；为 `true` 时会在没有选区时自动禁用 |
| `option` | 可序列化结果面板，适合显示 OCR 文本、模型摘要、结构化元数据 |
| `imageResource` | 是否自动把截图转换成临时图片资源，支持布尔值或资源创建选项 |
| `position` | 按钮插入位置，语义与 React 包保持一致 |
| `includeImage` | 是否在点击时回传当前选区 PNG，默认 `true` |

### Recommended Flow

推荐接入流程：

1. 在 `operationItems` 中声明 OCR、AI、上传等按钮
2. 优先直接给按钮写 `handler(context)`，把业务逻辑、状态更新和结果面板收在一起
3. 如果按钮有异步处理过程，用 `context.showOption` / `context.update` 控制 `disabled` / `checked` / `option`
4. 如果需要把截图交给外部 OCR / AI 窗口，优先开启 `imageResource`
5. 如果按钮必须依赖用户已经框选内容，优先直接设置 `requiresSelection: true`
6. 只有在业务规则比“是否已有选区”更复杂时，再打开 `forwardEvents` 自己监听 `selectionChange` / `error`

例如只在用户已经选区时才启用 OCR：

```ts
const screenshots = new Screenshots({
  operationItems: [
    {
      key: "ocr",
      title: "OCR",
      label: "OCR",
      requiresSelection: true,
      includeImage: false,
      imageResource: {
        fileNamePrefix: "ocr",
      },
    },
  ],
});
```

如果你只想临时打开一次截图 UI，并在确认后直接拿到结果，可以使用：

```ts
const result = await screenshots.captureOnce({
  timeoutMs: 30_000,
});

console.log(result.data.bounds);
console.log(result.dataUrl);
console.log(result.base64);
```

`captureOnce()` 默认会用空的 `operationItems` 启动一次截图流程，这样宿主可以得到更接近“确认后立即返回图片”的标准交互。如果你仍然想在这次单次截图里保留自定义按钮，也可以通过 `options.operationItems` 显式传入。

  ### Official Image Resource Handoff

  如果你的业务项目需要把截图结果交给另一个 BrowserWindow、OCR 窗口、上传任务或历史记录系统，推荐优先使用官方 `imageResource` 机制，而不是自己在业务侧重复写“buffer 转临时文件”的逻辑。

  启用方式：

  ```ts
  const screenshots = new Screenshots({
    operationItems: [
      {
        key: "ocr",
        title: "OCR",
        label: "OCR",
        includeImage: false,
        imageResource: {
          fileNamePrefix: "ocr",
        },
      },
    ],
  });

  screenshots.on("extensionOperation", async (_event, buffer, data) => {
    if (data.key !== "ocr" || !data.imageResource) {
      return;
    }

    // includeImage 为 false 时，这里可以只依赖 imageResource
    console.log(buffer); // null

    ocrWindow.webContents.send("open-image-resource", {
      token: data.imageResource.token,
      filePath: data.imageResource.filePath,
    });
  });
  ```

  `extensionOperation` 里的 `data.imageResource` 会带上：

  ```ts
  interface ScreenshotsImageResource {
    token: string;
    filePath: string;
    mimeType: string;
    size: number;
    createdAt: number;
  }
  ```

  这适合几类常见业务场景：

  - 把截图交给 OCR / AI 窗口，而不是把大图塞进 URL query
  - 把截图结果交给上传队列、审计流水或后台任务
  - 先结束截图，再由业务主窗口继续消费这张图

  消费完成后，建议主动释放资源：

  ```ts
  await screenshots.revokeImageResource(token);
  ```

  如果需要一次性清理当前实例创建的全部资源：

  ```ts
  await screenshots.clearImageResources();
  ```

  ### Manual Resource Creation For History Or Data URLs

  除了自定义按钮回调，你也可以手动把历史记录里的 data URL 或业务层拿到的 buffer 转成官方资源。

  这适合你当前这种场景：历史记录里只有 data URL，但还需要再次拉起 OCR 窗口。

  ```ts
  const resource = await screenshots.createImageResource(historyItem.dataUrl, {
    fileNamePrefix: "history-item",
  });

  ocrWindow.webContents.send("open-image-resource", {
    token: resource.token,
    filePath: resource.filePath,
  });
  ```

  如果另一个窗口只想拿 token，再回头查路径，也可以：

  ```ts
  const filePath = screenshots.getImageResourcePath(token);
  ```

  ### Result Panels Inside The Screenshot UI

  如果你的业务希望“识别完后直接把结果留在截图界面里”，而不是再弹一个单独窗口，现在可以直接用 `option` 配合 `checked` 做结果面板桥接。

  最简单的写法是直接把 OCR 文本作为字符串回写：

  ```ts
  const screenshots = new Screenshots({
    operationItems: [
      {
        key: "ocr",
        title: "OCR",
        label: "OCR",
        includeImage: true,
      },
    ],
  });

  screenshots.on("extensionOperation", async (_event, buffer, data) => {
    if (data.key !== "ocr" || !buffer) {
      return;
    }

    await screenshots.updateOperationItem("ocr", {
      title: "OCR...",
      checked: true,
      disabled: true,
      option: "Recognizing...",
    });

    try {
      const text = await runOcr(buffer, data.bounds, data.display);

      await screenshots.updateOperationItem("ocr", {
        title: "OCR",
        checked: true,
        disabled: false,
        option: text,
      });
    } catch (error) {
      await screenshots.updateOperationItem("ocr", {
        title: "OCR",
        checked: true,
        disabled: false,
        option: {
          type: "text",
          title: "OCR failed",
          text: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
  ```

  如果结果是结构化的，也可以传列表或键值对：

  ```ts
  await screenshots.updateOperationItem("ask-ai", {
    checked: true,
    option: {
      type: "key-value",
      title: "Analysis Summary",
      items: [
        { label: "Language", value: "zh-CN" },
        { label: "Confidence", value: "0.98" },
        { label: "Category", value: "Invoice" },
      ],
    },
  });
  ```

  这套桥接的边界也很明确：

  - 适合文本结果、摘要、分项列表、结构化元数据
  - 适合“识别后在截图界面内快速预览”
  - 不适合复杂表单、富交互面板、多轮对话或自定义 React 组件

  如果你的需求已经超出这个边界，还是建议直接切到 `@474420502/react-screenshots` 自定义渲染层。

  ### OCR / AI Integration In Business Apps

  在实际业务项目中，推荐把 Electron 侧自定义按钮当成“截图任务入口”，把真正的 OCR / AI 处理放在你自己的主进程服务层里。

  比较稳的模式是：

  1. 在 `operationItems` 中声明 OCR、AI、上传等按钮
  2. 在 `selectionChange` 里按选区状态启用或禁用按钮
  3. 在 `extensionOperation` 里按 `data.key` 把请求分发给不同能力
  4. 在异步任务期间用 `updateOperationItem` 更新 `title`、`checked`、`disabled`
  5. 如果需要展示复杂结果，把结果发回你自己的主窗口、侧边栏或对话面板

  例如：

  ```ts
  const screenshots = new Screenshots({
    forwardEvents: ["selectionChange", "error"],
    operationItems: [
      {
        key: "ocr",
        title: "OCR",
        label: "OCR",
        disabled: true,
        includeImage: false,
        imageResource: {
          fileNamePrefix: "ocr",
        },
      },
      {
        key: "ask-ai",
        title: "Ask AI",
        label: "AI",
        disabled: true,
        includeImage: false,
        imageResource: {
          fileNamePrefix: "ask-ai",
        },
        position: { after: "ocr" },
      },
    ],
  });

  screenshots.on("selectionChange", async (_event, rendererEvent) => {
    const hasBounds = Boolean(
      (rendererEvent.payload as { bounds?: unknown } | undefined)?.bounds,
    );

    await screenshots.updateOperationItem("ocr", { disabled: !hasBounds });
    await screenshots.updateOperationItem("ask-ai", { disabled: !hasBounds });
  });

  screenshots.on("extensionOperation", async (_event, buffer, data) => {
    if (data.key === "ocr" && data.imageResource) {
      await screenshots.updateOperationItem("ocr", {
        title: "OCR...",
        checked: true,
        disabled: true,
      });

      try {
        const text = await runOcrFromFile(
          data.imageResource.filePath,
          data.bounds,
          data.display,
        );
        mainWindow.webContents.send("ocr-result", {
          bounds: data.bounds,
          text,
        });
      } finally {
        await screenshots.updateOperationItem("ocr", {
          title: "OCR",
          checked: false,
          disabled: false,
        });
        await screenshots.revokeImageResource(data.imageResource.token);
      }
    }

    if (data.key === "ask-ai" && data.imageResource) {
      await screenshots.updateOperationItem("ask-ai", {
        title: "Analyzing...",
        checked: true,
        disabled: true,
      });

      try {
        const result = await askModelFromFile(
          data.imageResource.filePath,
          data.bounds,
          data.display,
        );
        mainWindow.webContents.send("ai-result", result);
      } finally {
        await screenshots.updateOperationItem("ask-ai", {
          title: "Ask AI",
          checked: false,
          disabled: false,
        });
        await screenshots.revokeImageResource(data.imageResource.token);
      }
    }
  });
  ```

  如果你的需求已经不只是“点按钮触发主进程任务”，而是要做复杂弹窗、表单、富文本结果面板或多轮对话，建议直接切到 `@474420502/react-screenshots` 自定义渲染层，而不是继续把交互堆在 Electron 按钮描述里。

如果需要复杂的 React UI、弹窗、表单或自定义渲染函数，建议直接使用`@474420502/react-screenshots`自定义渲染进程页面；Electron 主进程扩展按钮只支持可结构化克隆的数据，不能传函数、DOM、ReactNode 或 Blob。当前支持的动态状态主要是 `checked`、`disabled`、`iconSvg` 以及通过 `setOperationItems` / `updateOperationItem` 更新可序列化字段。

## Events

- 数据类型

```ts
interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Display {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotsData {
  bounds: Bounds;
  display: Display;
}

class Event {
  public defaultPrevented = false;

  public preventDefault(): void {
    this.defaultPrevented = true;
  }
}
```

| 名称          | 说明                                                        | 回调参数                                                                          |
| ------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| ok            | 截图确认事件                                                | `(event: Event, buffer: Buffer, data: ScreenshotsData) => void`                   |
| cancel        | 截图取消事件                                                | `(event: Event) => void`                                                          |
| save          | 截图保存事件                                                | `(event: Event, buffer: Buffer, data: ScreenshotsData) => void`                   |
| afterSave     | 截图保存（取消保存）后的事件                                | `(event: Event, buffer: Buffer, data: ScreenshotsData, isSaved: boolean) => void` |
| windowCreated | 截图窗口被创建后触发                                        | `($win: BrowserWindow) => void`                                                   |
| windowClosed  | 截图窗口被关闭后触发，对`BrowserWindow` `closed` 事件的转发 | `($win: BrowserWindow) => void`                                                   |
| captureStart  | 开始捕获屏幕前触发                                          | `(event: Event, display: Display) => void`                                        |
| captureReady  | 截图窗口收到屏幕图像后触发                                  | `(event: Event, display: Display) => void`                                        |
| rendererEvent | 渲染进程统一事件转发                                        | `(event: Event, rendererEvent: ScreenshotsRendererEvent) => void`                 |
| selectionChange | 选区变化事件                                              | `(event: Event, rendererEvent: ScreenshotsRendererEvent) => void`                 |
| operationChange | 当前工具变化事件                                          | `(event: Event, rendererEvent: ScreenshotsRendererEvent) => void`                 |
| historyChange | 标注历史变化事件                                            | `(event: Event, rendererEvent: ScreenshotsRendererEvent) => void`                 |
| extensionOperation | 扩展按钮点击事件                                      | `(event: Event, buffer: Buffer | null, data: ScreenshotsExtensionOperationData) => void` |
| error         | 渲染进程扩展错误事件                                        | `(event: Event, rendererEvent: ScreenshotsRendererEvent) => void`                 |

### 说明

- event: 事件对象
- buffer: png 图片 buffer
- bounds: 截图区域信息
- display: 截图的屏幕
- `event`对象可调用`preventDefault`方法来阻止默认事件，例如阻止默认保存事件

```ts
const screenshots = new Screenshots({
  lang: {
    magnifier_position_label: "Position",
    operation_ok_title: "Ok",
    operation_cancel_title: "Cancel",
    operation_save_title: "Save",
    operation_redo_title: "Redo",
    operation_undo_title: "Undo",
    operation_mosaic_title: "Mosaic",
    operation_text_title: "Text",
    operation_brush_title: "Brush",
    operation_arrow_title: "Arrow",
    operation_ellipse_title: "Ellipse",
    operation_rectangle_title: "Rectangle",
  },
});

screenshots.on("save", (e, buffer, data) => {
  // 阻止插件自带的保存功能
  // 用户自己控制保存功能
  e.preventDefault();
  // 用户可在这里自己定义保存功能
  console.log("capture", buffer, data);
});

screenshots.startCapture();
```

## Screenshot

![screenshot](../../screenshot.jpg)
