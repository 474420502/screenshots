# react-screenshots

> a screenshot cropper tool by react

## Install

[![NPM](https://nodei.co/npm/react-screenshots.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/react-screenshots/)

## Usage

1. web 中使用

```ts
import React, { ReactElement, useCallback } from "react";
import Screenshots, { Bounds } from "react-screenshots";
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

- electron 中使用可直接加载渲染进程的页面，页面路径为`require.resolve('react-screenshots/electron/electron.html')`，不推荐自己手动开发主进程，推荐直接使用`electron-screenshots`模块

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
| height   | 画布宽度             | `number`                               | 是       |
| lang     | 多语言支持，默认中文 | `Partial<Lang>`                        | 否       |
| onSave   | 保存按钮回调         | `(blob: Blob, bounds: Bounds) => void` | 否       |
| onCancel | 取消按钮回调         | `() => void`                           | 否       |
| onOk     | 取消按钮回调         | `(blob: Blob, bounds: Bounds) => void` | 否       |
| onEvent  | 截图生命周期统一回调 | `(event: ScreenshotsEvent) => void`    | 否       |
| onError  | 截图扩展错误回调     | `(error: unknown, event?: ScreenshotsEvent<'error'>) => void` | 否 |
| operationItems | 扩展工具栏按钮 | `ScreenshotsOperationItem[]` | 否 |
| extraOperationItems | 追加扩展工具栏按钮 | `ScreenshotsOperationItem[]` | 否 |

### example

```js
import React from "react";

function App() {
  return (
    <Screenshot
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

## Extension API

`operationItems`可以把第三方功能植入截图工具栏，例如 OCR、上传、大模型分析等。按钮默认插入到保存、取消、确定按钮之前，也可以通过`position`指定位置。

```ts
import Screenshots, {
  type ScreenshotsEvent,
  type ScreenshotsOperationItem,
} from "react-screenshots";

const operationItems: ScreenshotsOperationItem[] = [
  {
    key: "ocr",
    title: "OCR",
    label: "OCR",
    position: "before-confirm",
    async onClick(context) {
      const snapshot = context.getSnapshot();
      const blob = await context.compose();

      if (!blob || !snapshot.bounds) {
        return;
      }

      context.emit("custom", {
        key: "ocr",
        bounds: snapshot.bounds,
      });

      // 这里接入自己的 OCR、大模型、上传等业务接口
      await runOcr(blob, snapshot.bounds);
    },
  },
];

function App() {
  const onEvent = (event: ScreenshotsEvent) => {
    if (event.name === "selectionChange") {
      console.log("selection", event.payload?.bounds);
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

### ScreenshotsEvent

`onEvent`会接收选择区、绘制、工具、历史、确认、保存、取消和错误等关键事件。常用事件包括：`captureReady`、`selectionStart`、`selectionChange`、`selectionEnd`、`operationChange`、`historyChange`、`beforeSave`、`save`、`beforeOk`、`ok`、`cancel`、`extensionOperation`、`custom`、`error`。

## Screenshot

![screenshot](../../screenshot.jpg)

## Icons

[Iconfont](https://at.alicdn.com/t/project/572327/6f652e79-fb8b-4164-9fb3-40a705433d93.html?spm=a313x.7781069.1998910419.34)
