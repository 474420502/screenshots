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

## @474420502/electron-screenshots

[@474420502/electron-screenshots](./packages/electron-screenshots/README.md)是`screenshots`的一个子项目，提供了与`electron`截图相关的功能。

### 安装

```bash
pnpm add @474420502/electron-screenshots
```

## @474420502/react-screenshots

[@474420502/react-screenshots](./packages/react-screenshots/README.md)是`screenshots`的另一个子项目，提供了与`react`相关的截图界面插件，可以与`@474420502/electron-screenshots`渲染进程界面配合使用，当然也可以单独使用。

### 安装

```bash
pnpm add @474420502/react-screenshots
```
