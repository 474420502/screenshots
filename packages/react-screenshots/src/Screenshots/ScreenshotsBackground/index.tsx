import type { ReactElement, PointerEvent as ReactPointerEvent } from 'react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import useBounds from '../hooks/useBounds';
import useDispatcher from '../hooks/useDispatcher';
import useStore from '../hooks/useStore';
import ScreenshotsMagnifier from '../ScreenshotsMagnifier';
import type { Point, Position } from '../types';
import getBoundsByPoints from './getBoundsByPoints';
import './index.less';

export default memo(function ScreenshotsBackground(): ReactElement | null {
  const { url, image, width, height } = useStore();
  const { emitEvent } = useDispatcher();
  const [bounds, boundsDispatcher] = useBounds();

  const elRef = useRef<HTMLDivElement>(null);
  const pointRef = useRef<Point | null>(null);
  // 用来判断鼠标是否移动过
  // 如果没有移动过位置，则pointerup时不更新
  const isMoveRef = useRef<boolean>(false);
  const [position, setPosition] = useState<Position | null>(null);

  const updateBounds = useCallback(
    (p1: Point, p2: Point) => {
      if (!elRef.current) {
        return null;
      }
      const { x, y } = elRef.current.getBoundingClientRect();

      const nextBounds = getBoundsByPoints(
        {
          x: p1.x - x,
          y: p1.y - y,
        },
        {
          x: p2.x - x,
          y: p2.y - y,
        },
        width,
        height,
      );
      boundsDispatcher.set(nextBounds);
      emitEvent?.('selectionChange', { bounds: nextBounds });
      return nextBounds;
    },
    [width, height, boundsDispatcher, emitEvent],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // e.button 鼠标左键
      if (pointRef.current || bounds || e.button !== 0) {
        return;
      }
      pointRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
      isMoveRef.current = false;
      emitEvent?.('selectionStart', {
        point: pointRef.current,
        bounds: null,
      });
    },
    [bounds, emitEvent],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (elRef.current) {
        const rect = elRef.current.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientY < rect.top ||
          e.clientX > rect.right ||
          e.clientY > rect.bottom
        ) {
          setPosition(null);
        } else {
          setPosition({
            x: e.clientX - rect.x,
            y: e.clientY - rect.y,
          });
        }
      }

      if (!pointRef.current) {
        return;
      }
      updateBounds(pointRef.current, {
        x: e.clientX,
        y: e.clientY,
      });
      isMoveRef.current = true;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointRef.current) {
        return;
      }

      let nextBounds = bounds;
      if (isMoveRef.current) {
        nextBounds = updateBounds(pointRef.current, {
          x: e.clientX,
          y: e.clientY,
        });
      }
      emitEvent?.('selectionEnd', { bounds: nextBounds });
      pointRef.current = null;
      isMoveRef.current = false;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [bounds, updateBounds, emitEvent]);

  useLayoutEffect(() => {
    if (!image || bounds) {
      // 重置位置
      setPosition(null);
    }
  }, [image, bounds]);

  // 没有加载完不显示图片
  if (!url || !image) {
    return null;
  }

  return (
    <div
      ref={elRef}
      className="screenshots-background"
      onPointerDown={onPointerDown}
    >
      <img className="screenshots-background-image" src={url} />
      <div className="screenshots-background-mask" />
      {position && !bounds && (
        <ScreenshotsMagnifier x={position?.x} y={position?.y} />
      )}
    </div>
  );
});
