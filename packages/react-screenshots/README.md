# @474420502/react-screenshots

> Extensible screenshot cropper tool for React

This package is independently maintained by 474420502 and is based on the MIT-licensed `nashaofu/screenshots` project.

For legal attribution and project lineage, see the root `NOTICE.md` and `LICENSE` files.

## Install

```bash
pnpm add @474420502/react-screenshots
```

## As Git Submodule

如果你当前不走 npm 发布，也可以把整个仓库作为 Git 子模块接入业务项目，再通过 `pnpm workspace` 引用这个包。

```bash
git submodule add https://github.com/474420502/screenshots.git vendor/screenshots
git submodule update --init --recursive
```

目标项目根目录的 `pnpm-workspace.yaml` 至少要包含：

```yaml
packages:
  - vendor/screenshots/packages/**
```

如果你只使用 React 包，目标项目里的依赖可以写成：

```json
{
  "dependencies": {
    "@474420502/react-screenshots": "workspace:*"
  }
}
```

安装完成后执行：

```bash
pnpm install
pnpm --filter @474420502/react-screenshots build
```

如果你还要同时接入 Electron 包，建议查看根文档中的子模块说明和 workspace 结构约定。

## 0.7.0

这一版把自定义按钮 API 稳定成对外能力，适合直接给业务侧接 OCR、大模型、上传、审核等扩展功能。

- `operationItems` / `extraOperationItems` 支持自定义按钮和分隔符
- 自定义按钮支持 `checked`、`disabled`、`option`、`render`、`position` 和 `onClick(context)`
- `onEvent` / `onError` 可统一监听扩展生命周期和异常
- 非法按钮配置会在运行时发出 `error` 事件并忽略无效项

## Usage

1. web 中使用

```ts
import React, { ReactElement, useCallback } from "react";
import Screenshots, { Bounds } from "@474420502/react-screenshots";
import url from "./image.jpg";

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function App(): ReactElement {
  const onSave = useCallback((blob: Blob, bounds: Bounds) => {
    console.log("save", blob, bounds);
    console.log(URL.createObjectURL(blob));
  }, []);
  const onCancel = useCallback(() => {
    console.log("cancel");
  }, []);
  const onOk = useCallback((blob: Blob, bounds: Bounds) => {
    console.log("ok", blob, bounds);
    console.log(URL.createObjectURL(blob));
  }, []);

  return (
    <Screenshots
      url={url}
      width={window.innerWidth}
      height={window.innerHeight}
      lang={{
        operation_undo_title: "Undo",
        operation_mosaic_title: "Mosaic",
        operation_text_title: "Text",
        operation_brush_title: "Brush",
        operation_arrow_title: "Arrow",
        operation_ellipse_title: "Ellipse",
        operation_rectangle_title: "Rectangle",
      }}
      onSave={onSave}
      onCancel={onCancel}
      onOk={onOk}
    />
  );
}
```

2. electron 中使用

- electron 中使用可直接加载渲染进程的页面，页面路径为`require.resolve('@474420502/react-screenshots/dist/electron.html')`，不推荐自己手动开发主进程，推荐直接使用`@474420502/electron-screenshots`模块

```ts
interface ScreenshotsData {
  bounds: Bounds
  display: Display
}

interface GlobalScreenshots {
  ready: () => void
  reset: () => void
  save: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => void
  cancel: () => void
  ok: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => void
  extensionOperation: (arrayBuffer: ArrayBuffer | null, data: {
    key: string
    bounds: Bounds | null
    display: Display
  }) => void
  event: (event: unknown) => void
  on: (channel: string, fn: ScreenshotsListener) => void
  off: (channel: string, fn: ScreenshotsListener) => void
}

// 需要在electron的preload中提前初始化这个对象，用于渲染进程与主进程通信
window.screenshots: GlobalScreenshots
```

## Props

```ts
interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Lang {
  magnifier_position_label: string;
  operation_ok_title: string;
  operation_cancel_title: string;
  operation_save_title: string;
  operation_redo_title: string;
  operation_undo_title: string;
  operation_mosaic_title: string;
  operation_text_title: string;
  operation_brush_title: string;
  operation_arrow_title: string;
  operation_ellipse_title: string;
  operation_rectangle_title: string;
}
```

| 名称     | 说明                 | 类型                                   | 是否必选 |
| -------- | -------------------- | -------------------------------------- | -------- |
| url      | 要编辑的图像资源地址 | `string`                               | 是       |
| width    | 画布宽度             | `number`                               | 是       |
| height   | 画布高度             | `number`                               | 是       |
| lang     | 多语言支持，默认中文 | `Partial<Lang>`                        | 否       |
| onSave   | 保存按钮回调         | `(blob: Blob, bounds: Bounds) => void` | 否       |
| onCancel | 取消按钮回调         | `() => void`                           | 否       |
| onOk     | 确认按钮回调         | `(blob: Blob, bounds: Bounds) => void` | 否       |
| onEvent  | 截图生命周期统一回调 | `(event: ScreenshotsEvent) => void`    | 否       |
| onError  | 截图扩展错误回调     | `(error: unknown, event?: ScreenshotsEvent<'error'>) => void` | 否 |
| operationItems | 扩展工具栏按钮 | `ScreenshotsOperationItem[]` | 否 |
| extraOperationItems | 追加扩展工具栏按钮 | `ScreenshotsOperationItem[]` | 否 |

### example

```js
import React from "react";

function App() {
  return (
    <Screenshots
      url="./example.png"
      width={window.innerWidth}
      height={window.innerHeight}
      onSave={() => {}}
      onCancel={() => {}}
      onOk={() => {}}
    />
  );
}
```

## Custom Toolbar Buttons

`operationItems` 和 `extraOperationItems` 都可以把第三方功能植入截图工具栏，例如 OCR、上传、大模型分析、审计、同步到知识库等。

- `operationItems`：主入口，适合完整声明自定义按钮布局
- `extraOperationItems`：附加入口，会与 `operationItems` 合并后一起参与布局计算和校验
- 默认插入位置是保存、取消、确定按钮之前，也就是 `before-confirm`

### Quick Start

```ts
import Screenshots, {
  type ScreenshotsEvent,
  type ScreenshotsOperationItem,
} from "@474420502/react-screenshots";

const operationItems: ScreenshotsOperationItem[] = [
  {
    key: "ocr",
    title: "OCR",
    label: "OCR",
    position: "before-confirm",
    disabled: (context) => !context.getSnapshot().bounds,
    async onClick(context) {
      const snapshot = context.getSnapshot();

      if (!snapshot.bounds) {
        return;
      }

      const blob = await context.compose(snapshot.bounds);

      if (!blob) {
        return;
      }

      // 统一记录业务事件，外部可以在 onEvent 中消费
      context.emit("custom", { key: "ocr", bounds: snapshot.bounds });

      // 这里接入自己的 OCR、大模型、上传等业务接口
      await runOcr(blob, snapshot.bounds);
    },
  },
  {
    type: "divider",
    key: "ext-divider",
    position: { after: "ocr" },
  },
  {
    key: "ask-ai",
    title: "Ask AI",
    label: "AI",
    position: { after: "ext-divider" },
    disabled: (context) => !context.getSnapshot().bounds,
    async onClick(context) {
      const snapshot = context.getSnapshot();

      if (!snapshot.bounds) {
        return;
      }

      const blob = await context.compose(snapshot.bounds);
      if (!blob) {
        return;
      }

      await askModel(blob, snapshot.bounds);
    },
  },
];

function App() {
  const onEvent = (event: ScreenshotsEvent) => {
    if (event.name === "selectionChange") {
      console.log("selection", event.payload?.bounds);
    }

    if (event.name === "extensionOperation") {
      console.log("clicked", event.payload?.key);
    }
  };

  return (
    <Screenshots
      url="./example.png"
      width={window.innerWidth}
      height={window.innerHeight}
      operationItems={operationItems}
      onEvent={onEvent}
    />
  );
}
```

### OCR / AI Integration In Business Apps

在业务项目里接 OCR / AI 时，通常不只是“点一下按钮调接口”，还会一起处理以下事情：

- 只有用户已经选区时才允许点击
- 请求进行中时给按钮加 `checked` / `disabled` 状态
- 把识别结果或分析结果展示在按钮浮层、侧栏或你自己的业务面板里
- 通过 `custom` / `error` 事件把行为接进埋点、日志或告警系统

一个更贴近业务项目的写法如下：

```tsx
import React, { useMemo, useState } from "react";
import Screenshots, {
  type ScreenshotsOperationItem,
} from "@474420502/react-screenshots";

export default function App() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [aiResult, setAiResult] = useState("");

  const operationItems = useMemo<ScreenshotsOperationItem[]>(
    () => [
      {
        key: "ocr",
        title: "OCR",
        label: "OCR",
        checked: busyKey === "ocr",
        disabled: (context) =>
          busyKey !== null || !context.getSnapshot().bounds,
        option: ocrText ? <pre>{ocrText}</pre> : undefined,
        async onClick(context) {
          const { bounds } = context.getSnapshot();

          if (!bounds) {
            return;
          }

          setBusyKey("ocr");

          try {
            const blob = await context.compose(bounds);

            if (!blob) {
              return;
            }

            const text = await runOcr(blob, bounds);
            setOcrText(text);
            context.emit("custom", {
              type: "ocr-completed",
              bounds,
              textLength: text.length,
            });
          } finally {
            setBusyKey(null);
          }
        },
      },
      {
        key: "ask-ai",
        title: "Ask AI",
        label: "AI",
        checked: busyKey === "ask-ai",
        disabled: (context) =>
          busyKey !== null || !context.getSnapshot().bounds,
        option: aiResult ? <div>{aiResult}</div> : undefined,
        async onClick(context) {
          const { bounds } = context.getSnapshot();

          if (!bounds) {
            return;
          }

          setBusyKey("ask-ai");

          try {
            const blob = await context.compose(bounds);

            if (!blob) {
              return;
            }

            const result = await askModel(blob, bounds);
            setAiResult(result);
            context.emit("custom", {
              type: "ai-completed",
              bounds,
            });
          } finally {
            setBusyKey(null);
          }
        },
      },
    ],
    [aiResult, busyKey, ocrText],
  );

  return (
    <Screenshots
      url="./example.png"
      width={window.innerWidth}
      height={window.innerHeight}
      operationItems={operationItems}
      onError={(error) => reportError(error)}
    />
  );
}
```

建议把职责分开：

- `compose(bounds)` 只负责拿到当前选区和标注后的图片
- OCR / AI 请求由你自己的 service 层处理
- `option` 适合展示轻量结果
- 如果要做复杂表单、侧边栏、对话历史或多轮分析，建议把结果渲染到你自己的业务组件里

### Item Fields

`ScreenshotsOperationItem` 支持两种类型：

- 按钮项：`{ key, title, icon?, iconNode?, label?, checked?, disabled?, option?, position?, render?, onClick? }`
- 分隔符：`{ type: "divider", key?, position? }`

常用字段说明：

| 字段 | 说明 |
| ---- | ---- |
| `key` | 自定义按钮唯一标识，必填，不能与内建按钮重名 |
| `title` | 鼠标悬停提示文本 |
| `icon` / `iconNode` / `label` | 按钮视觉表现，三者任选其一或组合 |
| `checked` | 按钮激活态，可传布尔值或 `(context) => boolean` |
| `disabled` | 按钮禁用态，可传布尔值或 `(context) => boolean` |
| `option` | 按钮激活时显示的浮层内容，可传 `ReactNode` 或函数 |
| `render` | 完全自定义渲染当前按钮 |
| `position` | 控制插入位置，支持内建锚点和自定义锚点 |
| `onClick` | 自定义点击逻辑，支持异步，异常会进入 `onError` / `error` 事件 |

### Position and Validation

`position` 支持以下值：

- `start`
- `before-history`
- `before-confirm`
- `end`
- `{ before: string }`
- `{ after: string }`

内建锚点包括：`Rectangle`、`Ellipse`、`Arrow`、`Brush`、`Text`、`Mosaic`、`Undo`、`Redo`、`Save`、`Cancel`、`Ok`。

运行时校验规则：

- `key` 不能为空
- 不能与已有自定义按钮或内建按钮重名
- `before` / `after` 指向的锚点必须存在
- 非法项不会静默追加到末尾，而是会发出 `error` 事件并被忽略

### ScreenshotsActionContext

扩展按钮的`onClick(context)`会收到以下稳定入口：

| 名称 | 说明 |
| ---- | ---- |
| `getSnapshot()` | 获取当前截图状态，包括选区、历史、当前工具、图片尺寸等 |
| `compose(bounds?)` | 合成当前选区和标注，返回`Blob | null` |
| `reset(source?)` | 重置截图状态 |
| `emit(name, payload?)` | 触发统一`onEvent`事件 |
| `setBounds(bounds)` | 设置或清空选区 |
| `setOperation(operation)` | 切换当前操作工具 |

### Lifecycle Events

`onEvent` 会接收选择区、绘制、工具、历史、确认、保存、取消和错误等关键事件。自定义按钮接入时最常用的是：

- `captureReady`
- `selectionStart` / `selectionChange` / `selectionEnd`
- `operationChange`
- `historyChange`
- `beforeSave` / `save`
- `beforeOk` / `ok`
- `cancel`
- `extensionOperation`
- `custom`
- `error`

其中：

- 点击自定义按钮时，组件会先发出 `extensionOperation`
- 自己在业务代码中调用 `context.emit("custom", payload)` 时，会继续进入统一事件流
- `onClick` 抛错或返回 rejected promise 时，会进入 `error` 事件并触发 `onError`

## Screenshot

![screenshot](../../screenshot.jpg)

## Icons

[Iconfont](https://at.alicdn.com/t/project/572327/6f652e79-fb8b-4164-9fb3-40a705433d93.html?spm=a313x.7781069.1998910419.34)
