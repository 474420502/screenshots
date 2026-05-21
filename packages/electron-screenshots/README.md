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
  // 扩展工具栏按钮，只支持可序列化配置
  operationItems?: ElectronScreenshotsOperationItem[];
  // 转发渲染进程截图事件，默认转发全部事件，也可以传事件名数组
  forwardEvents?: true | string[];
}

export interface ElectronScreenshotsOperationItem {
  key: string;
  title: string;
  icon?: string;
  label?: string;
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
```

| 名称                                              | 说明             | 返回值 |
| ------------------------------------------------- | ---------------- | ------ |
| `constructor(opts: ScreenshotsOpts): Screenshots` | 调用截图方法截图 | -      |
| `startCapture(): Promise<void>`                   | 调用截图方法截图 | -      |
| `endCapture(): Promise<void>`                     | 手动结束截图     | -      |
| `setLang(lang: Lang): Promise<void>`              | 修改语言         | -      |
| `setOperationItems(items: ElectronScreenshotsOperationItem[]): Promise<void>` | 设置扩展工具栏按钮 | - |

## Extension API

`@474420502/electron-screenshots`可以在主进程配置可序列化的扩展按钮。点击按钮后，渲染进程会把按钮`key`、当前选区、屏幕信息和可选 png buffer 回传到主进程，适合接入 OCR、大模型、上传、审计等业务能力。

```ts
const screenshots = new Screenshots({
  operationItems: [
    {
      key: "ocr",
      title: "OCR",
      label: "OCR",
      position: "before-confirm",
      includeImage: true,
    },
    {
      key: "ask-ai",
      title: "Analyze with AI",
      label: "AI",
      position: { after: "ocr" },
      includeImage: true,
    },
  ],
});

screenshots.on("extensionOperation", async (event, buffer, data) => {
  if (data.key === "ocr" && buffer) {
    await runOcr(buffer, data.bounds, data.display);
  }

  if (data.key === "ask-ai" && buffer) {
    await askModel(buffer, data.bounds, data.display);
  }
});

screenshots.on("selectionChange", (_event, rendererEvent) => {
  console.log("selection", rendererEvent.payload);
});
```

如果需要复杂的 React UI、弹窗、表单或自定义渲染函数，建议直接使用`@474420502/react-screenshots`自定义渲染进程页面；Electron 主进程扩展按钮只支持可结构化克隆的数据，不能传函数、DOM、ReactNode 或 Blob。

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
