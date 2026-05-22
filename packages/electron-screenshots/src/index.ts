import Events from 'node:events';
import { writeFile } from 'node:fs/promises';
import debug, { type Debugger } from 'debug';
import {
  BrowserView,
  BrowserWindow,
  clipboard,
  type DesktopCapturerSource,
  desktopCapturer,
  dialog,
  ipcMain,
  nativeImage,
  screen,
} from 'electron';
import Event from './event.js';
import getDisplay, { type Display } from './getDisplay.js';
import {
  type CreateImageResourceOptions,
  ImageResourceStore,
  type ImageResourceInput,
  type ScreenshotsImageResource,
} from './imageResources.js';
import {
  getOperationItemHandlers,
  mapOperationItemsForRenderer,
  updateOperationItem,
} from './operationItems.js';
import padStart from './padStart.js';
import type {
  Bounds,
  ScreenshotsData,
  ScreenshotsExtensionOperationData,
  ScreenshotsRendererEvent,
} from './preload.js';

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
  logger?: Logger;
  singleWindow?: boolean;
  operationItems?: ElectronScreenshotsOperationItem[];
  operationHandlers?: Record<string, ElectronScreenshotsOperationHandler>;
  forwardEvents?: true | string[];
}

export type ScreenshotsOperationPosition =
  | 'start'
  | 'before-history'
  | 'before-confirm'
  | 'end'
  | {
      before: string;
    }
  | {
      after: string;
    };

export interface ElectronScreenshotsOperationItem {
  key: string;
  title: string;
  icon?: string;
  label?: string;
  handler?: ElectronScreenshotsOperationHandler;
  checked?: boolean;
  disabled?: boolean;
  requiresSelection?: boolean;
  option?: ElectronScreenshotsOperationOption;
  position?: ScreenshotsOperationPosition;
  includeImage?: boolean;
  imageResource?: boolean | CreateImageResourceOptions;
}

export interface ElectronScreenshotsOperationOptionText {
  type?: 'text';
  title?: string;
  description?: string;
  text: string;
}

export interface ElectronScreenshotsOperationOptionList {
  type: 'list';
  title?: string;
  description?: string;
  items: string[];
  ordered?: boolean;
}

export interface ElectronScreenshotsOperationOptionKeyValueItem {
  label: string;
  value: string;
}

export interface ElectronScreenshotsOperationOptionKeyValue {
  type: 'key-value';
  title?: string;
  description?: string;
  items: ElectronScreenshotsOperationOptionKeyValueItem[];
}

export type ElectronScreenshotsOperationOption =
  | string
  | ElectronScreenshotsOperationOptionText
  | ElectronScreenshotsOperationOptionList
  | ElectronScreenshotsOperationOptionKeyValue;

export type ElectronScreenshotsOperationContextPatch = Omit<
  ElectronScreenshotsOperationItemPatch,
  'option'
>;

export interface ElectronScreenshotsOperationContext {
  key: string;
  buffer: Buffer | null;
  bounds: Bounds | null;
  display: Display;
  imageResource?: ScreenshotsImageResource;
  update: (patch: ElectronScreenshotsOperationItemPatch) => Promise<boolean>;
  showOption: (
    option: ElectronScreenshotsOperationOption,
    patch?: ElectronScreenshotsOperationContextPatch,
  ) => Promise<boolean>;
  clearOption: (
    patch?: ElectronScreenshotsOperationContextPatch,
  ) => Promise<boolean>;
  createImageResource: (
    input: ImageResourceInput,
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

export type ElectronScreenshotsOperationItemPatch = Partial<
  Omit<ElectronScreenshotsOperationItem, 'key'>
>;

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

export type {
  Bounds,
  ScreenshotsData,
  ScreenshotsExtensionOperationData,
  ScreenshotsRendererEvent,
} from './preload.js';
export type {
  CreateImageResourceOptions,
  ImageResourceInput,
  ScreenshotsImageResource,
};

const rendererReservedEventNames = new Set([
  'ok',
  'save',
  'cancel',
  'afterSave',
  'windowCreated',
  'windowClosed',
  'captureReady',
  'extensionOperation',
]);

function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error) {
    return new Error(error);
  }

  return new Error(fallbackMessage);
}

function hasActiveSelection(bounds: Bounds | null | undefined): boolean {
  return Boolean(
    bounds && Number(bounds.width) > 0 && Number(bounds.height) > 0,
  );
}

interface PendingCaptureSession {
  resolve: (result: ScreenshotsCaptureResult) => void;
  reject: (error: Error) => void;
  restoreOperationItems: ElectronScreenshotsOperationItem[];
  timeoutId?: NodeJS.Timeout;
}

export default class Screenshots extends Events {
  // 截图窗口对象
  public $win: BrowserWindow | null = null;

  public $view: BrowserView = new BrowserView({
    webPreferences: {
      preload: require.resolve('./preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  private logger: Logger;

  private singleWindow: boolean;

  private operationItems: ElectronScreenshotsOperationItem[];

  private operationHandlers = new Map<
    string,
    ElectronScreenshotsOperationHandler
  >();

  private operationItemHandlers = new Map<
    string,
    ElectronScreenshotsOperationHandler
  >();

  private forwardEvents: true | string[];

  private imageResourceStore = new ImageResourceStore();

  private hasSelection = false;

  private pendingCapture: PendingCaptureSession | null = null;

  private isReady = new Promise<void>((resolve) => {
    ipcMain.once('SCREENSHOTS:ready', () => {
      this.logger('SCREENSHOTS:ready');

      resolve();
    });
  });

  constructor(opts?: ScreenshotsOpts) {
    super();
    this.logger = opts?.logger || debug('screenshots:electron');
    this.singleWindow = opts?.singleWindow || false;
    this.operationItems = opts?.operationItems ?? [];
    this.forwardEvents = opts?.forwardEvents ?? true;
    if (opts?.operationHandlers) {
      this.setOperationHandlers(opts.operationHandlers);
    }
    this.listenIpc();
    this.$view.webContents.loadURL(
      `file://${require.resolve('@474420502/react-screenshots/dist/electron.html')}`,
    );
    if (opts?.lang) {
      this.setLang(opts.lang);
    }
    if (this.operationItems.length) {
      this.setOperationItems(this.operationItems);
    }
  }

  /**
   * 开始截图
   */
  public async startCapture(): Promise<void> {
    this.logger('startCapture');
    this.hasSelection = false;

    const display = getDisplay();
    this.emit('captureStart', new Event(), display);

    const [imageUrl] = await Promise.all([this.capture(display), this.isReady]);

    await this.createWindow(display);

    this.$view.webContents.send(
      'SCREENSHOTS:setOperationItems',
      this.getRendererOperationItems(this.operationItems),
    );
    this.$view.webContents.send('SCREENSHOTS:capture', display, imageUrl);
    this.emit('captureReady', new Event(), display);
  }

  /**
   * 单次截图，返回 Promise 结果而不是走默认写入剪贴板流程
   */
  public captureOnce(
    options?: ScreenshotsCaptureOptions,
  ): Promise<ScreenshotsCaptureResult> {
    if (this.pendingCapture) {
      return Promise.reject(
        new Error('A captureOnce session is already in progress.'),
      );
    }

    const timeoutMs = options?.timeoutMs ?? 30_000;
    const operationItems = options?.operationItems ?? [];
    const restoreOperationItems = this.operationItems;

    return new Promise<ScreenshotsCaptureResult>((resolve, reject) => {
      const pendingCapture: PendingCaptureSession = {
        resolve,
        reject,
        restoreOperationItems,
      };

      if (timeoutMs > 0) {
        pendingCapture.timeoutId = setTimeout(() => {
          void this.rejectPendingCapture(
            new Error('Capture timed out.'),
            pendingCapture,
          );
        }, timeoutMs);
      }

      this.pendingCapture = pendingCapture;

      void (async () => {
        try {
          await this.setOperationItems(operationItems);
          await this.startCapture();
        } catch (error) {
          await this.rejectPendingCapture(
            toError(error, 'Failed to start captureOnce.'),
            pendingCapture,
          );
        }
      })();
    });
  }

  /**
   * 结束截图
   */
  public async endCapture(): Promise<void> {
    this.logger('endCapture');
    await this.reset();

    if (!this.$win) {
      return;
    }

    // 先清除 Kiosk 模式，然后取消全屏才有效
    this.$win.setKiosk(false);
    this.$win.blur();
    this.$win.blurWebView();
    this.$win.unmaximize();
    this.$win.removeBrowserView(this.$view);

    if (this.singleWindow) {
      this.$win.hide();
    } else {
      this.$win.destroy();
    }
  }

  /**
   * 设置语言
   */
  public async setLang(lang: Partial<Lang>): Promise<void> {
    this.logger('setLang', lang);

    await this.isReady;

    this.$view.webContents.send('SCREENSHOTS:setLang', lang);
  }

  /**
   * 设置扩展工具栏按钮
   */
  public async setOperationItems(
    operationItems: ElectronScreenshotsOperationItem[],
  ): Promise<void> {
    this.logger('setOperationItems', operationItems);

    this.operationItems = operationItems;
    this.syncOperationItemHandlers(operationItems);
    await this.isReady;

    this.$view.webContents.send(
      'SCREENSHOTS:setOperationItems',
      this.getRendererOperationItems(operationItems),
    );
  }

  /**
   * 注册单个扩展按钮处理函数
   */
  public setOperationHandler(
    key: string,
    handler: ElectronScreenshotsOperationHandler | undefined,
  ): void {
    this.logger('setOperationHandler %s', key);

    if (!handler) {
      this.operationHandlers.delete(key);
      return;
    }

    this.operationHandlers.set(key, handler);
  }

  /**
   * 批量注册扩展按钮处理函数
   */
  public setOperationHandlers(
    handlers: Partial<Record<string, ElectronScreenshotsOperationHandler>>,
  ): void {
    Object.entries(handlers).forEach(([key, handler]) => {
      this.setOperationHandler(key, handler);
    });
  }

  /**
   * 移除单个扩展按钮处理函数
   */
  public removeOperationHandler(key: string): boolean {
    this.logger('removeOperationHandler %s', key);

    return this.operationHandlers.delete(key);
  }

  /**
   * 更新单个扩展工具栏按钮
   */
  public async updateOperationItem(
    key: string,
    patch: ElectronScreenshotsOperationItemPatch,
  ): Promise<boolean> {
    this.logger('updateOperationItem %s %o', key, patch);

    const result = updateOperationItem(this.operationItems, key, patch);

    if (!result.updated) {
      return false;
    }

    await this.setOperationItems(result.items);
    return true;
  }

  /**
   * 创建临时图片资源，用于把截图结果安全传递给其他窗口或业务流程
   */
  public async createImageResource(
    input: ImageResourceInput,
    options?: CreateImageResourceOptions,
  ): Promise<ScreenshotsImageResource> {
    this.logger('createImageResource %o', options);

    return this.imageResourceStore.create(input, options);
  }

  /**
   * 获取临时图片资源元数据
   */
  public getImageResource(
    token: string,
  ): ScreenshotsImageResource | undefined {
    return this.imageResourceStore.get(token);
  }

  /**
   * 获取临时图片资源文件路径
   */
  public getImageResourcePath(token: string): string | undefined {
    return this.imageResourceStore.getPath(token);
  }

  /**
   * 释放单个临时图片资源
   */
  public async revokeImageResource(token: string): Promise<boolean> {
    this.logger('revokeImageResource %s', token);

    return this.imageResourceStore.revoke(token);
  }

  /**
   * 释放当前实例创建的全部临时图片资源
   */
  public async clearImageResources(): Promise<void> {
    this.logger('clearImageResources');

    await this.imageResourceStore.clear();
  }

  private toCaptureResult(
    buffer: Buffer,
    data: ScreenshotsData,
  ): ScreenshotsCaptureResult {
    const base64 = buffer.toString('base64');

    return {
      buffer,
      data,
      base64,
      dataUrl: `data:image/png;base64,${base64}`,
    };
  }

  private async finalizePendingCapture(
    pendingCapture: PendingCaptureSession,
  ): Promise<void> {
    this.hasSelection = false;
    if (pendingCapture.timeoutId) {
      clearTimeout(pendingCapture.timeoutId);
    }

    this.pendingCapture = null;

    try {
      await this.endCapture();
    } catch {
      // ignore endCapture cleanup failures so the promise still settles
    }

    try {
      await this.setOperationItems(pendingCapture.restoreOperationItems);
    } catch {
      // ignore restore failures; callers can still receive the main result
    }
  }

  private async resolvePendingCapture(
    buffer: Buffer,
    data: ScreenshotsData,
    pendingCapture: PendingCaptureSession,
  ): Promise<void> {
    await this.finalizePendingCapture(pendingCapture);
    pendingCapture.resolve(this.toCaptureResult(buffer, data));
  }

  private async rejectPendingCapture(
    error: Error,
    pendingCapture: PendingCaptureSession,
  ): Promise<void> {
    await this.finalizePendingCapture(pendingCapture);
    pendingCapture.reject(error);
  }

  private async replaceOperationItem(
    key: string,
    updater: (
      operationItem: ElectronScreenshotsOperationItem,
    ) => ElectronScreenshotsOperationItem,
  ): Promise<boolean> {
    const index = this.operationItems.findIndex((item) => item.key === key);

    if (index === -1) {
      return false;
    }

    const operationItem = this.operationItems[index];

    if (!operationItem) {
      return false;
    }

    const nextItems = [...this.operationItems];
    nextItems[index] = updater(operationItem);
    await this.setOperationItems(nextItems);
    return true;
  }

  private syncOperationItemHandlers(
    operationItems: ElectronScreenshotsOperationItem[],
  ): void {
    this.operationItemHandlers = getOperationItemHandlers(operationItems);
  }

  private getRendererOperationItems(
    operationItems: ElectronScreenshotsOperationItem[],
  ): Array<
    Omit<ElectronScreenshotsOperationItem, 'handler' | 'requiresSelection'>
  > {
    return mapOperationItemsForRenderer(operationItems, {
      hasSelection: this.hasSelection,
    });
  }

  private async clearOperationItemOption(
    key: string,
    patch?: ElectronScreenshotsOperationContextPatch,
  ): Promise<boolean> {
    return this.replaceOperationItem(key, (operationItem) => {
      const { option: _removedOption, ...nextOperationItem } = operationItem;

      return {
        ...nextOperationItem,
        ...patch,
        checked: patch?.checked ?? false,
        key: operationItem.key,
      };
    });
  }

  private createOperationHandlerContext(
    buffer: Buffer | null,
    data: ScreenshotsExtensionOperationData,
  ): ElectronScreenshotsOperationContext {
    const key = data.key;
    const baseContext = {
      key,
      buffer,
      bounds: data.bounds,
      display: data.display,
      update: (patch: ElectronScreenshotsOperationItemPatch) =>
        this.updateOperationItem(key, patch),
      showOption: (
        option: ElectronScreenshotsOperationOption,
        patch?: ElectronScreenshotsOperationContextPatch,
      ) =>
        this.updateOperationItem(key, {
          ...patch,
          checked: patch?.checked ?? true,
          option,
        }),
      clearOption: (patch?: ElectronScreenshotsOperationContextPatch) =>
        this.clearOperationItemOption(key, patch),
      createImageResource: (
        input: ImageResourceInput,
        options?: CreateImageResourceOptions,
      ) => this.createImageResource(input, options),
      getImageResource: (token: string) => this.getImageResource(token),
      getImageResourcePath: (token: string) => this.getImageResourcePath(token),
      revokeImageResource: (token: string) => this.revokeImageResource(token),
      endCapture: () => this.endCapture(),
    };

    if (data.imageResource) {
      return {
        ...baseContext,
        imageResource: data.imageResource,
      };
    }

    return baseContext;
  }

  private getOperationItem(
    key: string,
  ): ElectronScreenshotsOperationItem | undefined {
    return this.operationItems.find((item) => item.key === key);
  }

  private getOperationHandler(
    key: string,
  ): ElectronScreenshotsOperationHandler | undefined {
    return this.operationItemHandlers.get(key) ?? this.operationHandlers.get(key);
  }

  private shouldForwardEvent(name: string): boolean {
    if (this.forwardEvents === true) {
      return true;
    }
    return this.forwardEvents.includes(name);
  }

  private async reset() {
    // 重置截图区域
    this.$view.webContents.send('SCREENSHOTS:reset');

    // 保证 UI 有足够的时间渲染
    await Promise.race([
      new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 500);
      }),
      new Promise<void>((resolve) => {
        ipcMain.once('SCREENSHOTS:reset', () => resolve());
      }),
    ]);
  }

  /**
   * 初始化窗口
   */
  private async createWindow(display: Display): Promise<void> {
    // 重置截图区域
    await this.reset();

    // 复用未销毁的窗口
    if (!this.$win || this.$win?.isDestroyed?.()) {
      const windowTypes: Record<string, string | undefined> = {
        darwin: 'panel',
        // linux 必须设置为 undefined，否则会在部分系统上不能触发focus 事件
        // https://github.com/nashaofu/screenshots/issues/203#issuecomment-1518923486
        linux: undefined,
        win32: 'toolbar',
      };

      this.$win = new BrowserWindow({
        title: 'screenshots',
        x: display.x,
        y: display.y,
        width: display.width,
        height: display.height,
        useContentSize: true,
        type: windowTypes[process.platform] as string,
        frame: false,
        show: false,
        autoHideMenuBar: true,
        transparent: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        // focusable 必须设置为 true, 否则窗口不能及时响应esc按键，输入框也不能输入
        focusable: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        /**
         * linux 下必须设置为false，否则不能全屏显示在最上层
         * mac 下设置为false，否则可能会导致程序坞不恢复问题，且与 kiosk 模式冲突
         */
        fullscreen: false,
        // mac fullscreenable 设置为 true 会导致应用崩溃
        fullscreenable: false,
        kiosk: true,
        backgroundColor: '#00000000',
        titleBarStyle: 'hidden',
        hasShadow: false,
        paintWhenInitiallyHidden: false,
        // mac 特有的属性
        roundedCorners: false,
        enableLargerThanScreen: false,
        acceptFirstMouse: true,
      });

      this.emit('windowCreated', this.$win);
      this.$win.on('show', () => {
        this.$win?.focus();
        this.$win?.setKiosk(true);
      });

      this.$win.on('closed', () => {
        this.emit('windowClosed', this.$win);
        this.$win = null;
      });
    }

    this.$win.setBrowserView(this.$view);

    // 适定平台
    if (process.platform === 'darwin') {
      this.$win.setWindowButtonVisibility(false);
    }

    if (process.platform !== 'win32') {
      this.$win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      });
    }

    this.$win.blur();
    this.$win.setBounds(display);
    this.$view.setBounds({
      x: 0,
      y: 0,
      width: display.width,
      height: display.height,
    });
    this.$win.setAlwaysOnTop(true);
    this.$win.show();
  }

  private async capture(display: Display): Promise<string> {
    this.logger('SCREENSHOTS:capture');

    try {
      const { Monitor } = await import('node-screenshots');
      let point = {
        x: display.x + display.width / 2,
        y: display.y + display.height / 2,
      };
      if (process.platform === 'win32') {
        point = screen.screenToDipPoint(point);
      }
      const monitor = Monitor.fromPoint(point.x, point.y);
      this.logger(
        'SCREENSHOTS:capture Monitor.fromPoint arguments %o',
        display,
      );
      this.logger('SCREENSHOTS:capture Monitor.fromPoint return %o', {
        id: monitor?.id,
        name: monitor?.name,
        x: monitor?.x,
        y: monitor?.y,
        width: monitor?.width,
        height: monitor?.height,
        rotation: monitor?.rotation,
        scaleFactor: monitor?.scaleFactor,
        frequency: monitor?.frequency,
        isPrimary: monitor?.isPrimary,
      });

      if (!monitor) {
        throw new Error(`Monitor.fromDisplay(${display.id}) get null`);
      }

      const image = await monitor.captureImage();
      const buffer = await image.toPng(true);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (err) {
      this.logger('SCREENSHOTS:capture Monitor capture() error %o', err);
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: display.width * display.scaleFactor,
          height: display.height * display.scaleFactor,
        },
      });

      let source: DesktopCapturerSource | undefined;
      // Linux系统上，screen.getDisplayNearestPoint 返回的 Display 对象的 id
      // 和这里 source 对象上的 display_id(Linux上，这个值是空字符串) 或 id 的中间部分，都不一致
      // 但是，如果只有一个显示器的话，其实不用判断，直接返回就行
      if (sources.length === 1) {
        [source] = sources;
      } else {
        source = sources.find(
          (item) =>
            item.display_id === display.id.toString() ||
            item.id.startsWith(`screen:${display.id}:`),
        );
      }

      if (!source) {
        this.logger(
          "SCREENSHOTS:capture Can't find screen source. sources: %o, display: %o",
          sources,
          display,
        );
        throw new Error("Can't find screen source");
      }

      return source.thumbnail.toDataURL();
    }
  }

  /**
   * 绑定ipc时间处理
   */
  private listenIpc(): void {
    /**
     * OK事件
     */
    ipcMain.on(
      'SCREENSHOTS:ok',
        (_event, buffer: Buffer, data: ScreenshotsData) => {
        this.logger(
          'SCREENSHOTS:ok buffer.length %d, data: %o',
          buffer.length,
          data,
        );

          const pendingCapture = this.pendingCapture;
          if (pendingCapture) {
            void this.resolvePendingCapture(buffer, data, pendingCapture);
            return;
          }

        const event = new Event();
        this.emit('ok', event, buffer, data);
        if (event.defaultPrevented) {
          return;
        }
        clipboard.writeImage(nativeImage.createFromBuffer(buffer));
        this.endCapture();
      },
    );
    /**
     * CANCEL事件
     */
    ipcMain.on('SCREENSHOTS:cancel', () => {
      this.logger('SCREENSHOTS:cancel');

        const pendingCapture = this.pendingCapture;
        if (pendingCapture) {
          void this.rejectPendingCapture(
            new Error('Capture cancelled.'),
            pendingCapture,
          );
          return;
        }

      const event = new Event();
      this.emit('cancel', event);
      if (event.defaultPrevented) {
        return;
      }
      this.endCapture();
    });

    /**
     * SAVE事件
     */
    ipcMain.on(
      'SCREENSHOTS:save',
      async (_event, buffer: Buffer, data: ScreenshotsData) => {
        this.logger(
          'SCREENSHOTS:save buffer.length %d, data: %o',
          buffer.length,
          data,
        );

        const event = new Event();
        this.emit('save', event, buffer, data);
        if (event.defaultPrevented || !this.$win) {
          return;
        }

        const time = new Date();
        const year = time.getFullYear();
        const month = padStart(time.getMonth() + 1, 2, '0');
        const date = padStart(time.getDate(), 2, '0');
        const hours = padStart(time.getHours(), 2, '0');
        const minutes = padStart(time.getMinutes(), 2, '0');
        const seconds = padStart(time.getSeconds(), 2, '0');
        const milliseconds = padStart(time.getMilliseconds(), 3, '0');

        this.$win.setAlwaysOnTop(false);

        const { canceled, filePath } = await dialog.showSaveDialog(this.$win, {
          defaultPath: `${year}${month}${date}${hours}${minutes}${seconds}${milliseconds}.png`,
          filters: [
            { name: 'Image (png)', extensions: ['png'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (!this.$win) {
          this.emit('afterSave', new Event(), buffer, data, false); // isSaved = false
          return;
        }

        this.$win.setAlwaysOnTop(true);
        if (canceled || !filePath) {
          this.emit('afterSave', new Event(), buffer, data, false); // isSaved = false
          return;
        }

        await writeFile(filePath, buffer);
        this.emit('afterSave', new Event(), buffer, data, true); // isSaved = true
        this.endCapture();
      },
    );

    /**
     * 扩展按钮点击事件
     */
    ipcMain.on(
      'SCREENSHOTS:extensionOperation',
      async (
        _event,
        buffer: Buffer | null,
        data: ScreenshotsExtensionOperationData,
      ) => {
        this.logger('SCREENSHOTS:extensionOperation data: %o', data);

        const operationItem = this.getOperationItem(data.key);
        const shouldCreateImageResource = operationItem?.imageResource;
        let imageResource = data.imageResource;

        if (buffer && shouldCreateImageResource) {
          try {
            imageResource = await this.createImageResource(
              buffer,
              shouldCreateImageResource === true
                ? undefined
                : shouldCreateImageResource,
            );
          } catch (error) {
            this.logger(
              'SCREENSHOTS:extensionOperation createImageResource error %o',
              error,
            );
          }
        }

        const payload = imageResource ? { ...data, imageResource } : data;
        const emittedBuffer = operationItem?.includeImage === false ? null : buffer;

        this.emit('extensionOperation', new Event(), emittedBuffer, payload);

        const operationHandler = this.getOperationHandler(payload.key);

        if (!operationHandler) {
          return;
        }

        try {
          await operationHandler(
            this.createOperationHandlerContext(emittedBuffer, payload),
          );
        } catch (error) {
          this.logger(
            'SCREENSHOTS:extensionOperation handler error %s %o',
            payload.key,
            error,
          );
        }
      },
    );

    /**
     * 渲染进程截图生命周期事件
     */
    ipcMain.on(
      'SCREENSHOTS:event',
      (_event, rendererEvent: ScreenshotsRendererEvent) => {
          if (rendererEvent.name === 'selectionChange') {
            const payload = rendererEvent.payload as
              | { bounds?: Bounds | null }
              | undefined;
            const nextHasSelection = hasActiveSelection(payload?.bounds);

            if (nextHasSelection !== this.hasSelection) {
              this.hasSelection = nextHasSelection;

              this.$view.webContents.send(
                'SCREENSHOTS:setOperationItems',
                this.getRendererOperationItems(this.operationItems),
              );
            }
          }

        if (!this.shouldForwardEvent(rendererEvent.name)) {
          return;
        }

        this.logger(
          'SCREENSHOTS:event %s %o',
          rendererEvent.name,
          rendererEvent,
        );

        const event = new Event();
        this.emit('rendererEvent', event, rendererEvent);
        if (!rendererReservedEventNames.has(rendererEvent.name)) {
          this.emit(rendererEvent.name, event, rendererEvent);
        }
      },
    );
  }
}
