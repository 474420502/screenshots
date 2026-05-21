import type { ReactElement } from 'react';
import { useCallback } from 'react';
import composeImage from '../../composeImage';
import useCall from '../../hooks/useCall';
import useCanvasContextRef from '../../hooks/useCanvasContextRef';
import useDispatcher from '../../hooks/useDispatcher';
import useHistory from '../../hooks/useHistory';
import useReset from '../../hooks/useReset';
import useStore from '../../hooks/useStore';
import ScreenshotsButton from '../../ScreenshotsButton';

export default function Save(): ReactElement {
  const { image, width, height, history, bounds, lang } = useStore();
  const canvasContextRef = useCanvasContextRef();
  const [, historyDispatcher] = useHistory();
  const { emitEvent } = useDispatcher();
  const call = useCall();
  const reset = useReset();

  const onClick = useCallback(() => {
    historyDispatcher.clearSelect();
    setTimeout(() => {
      if (!canvasContextRef.current || !image || !bounds) {
        return;
      }
      emitEvent?.('beforeSave', { bounds });
      composeImage({
        image,
        width,
        height,
        history,
        bounds,
      })
        .then((blob) => {
          emitEvent?.('save', { blob, bounds });
          call('onSave', blob, bounds);
          reset('save');
        })
        .catch((error) => {
          emitEvent?.('error', { error, source: 'save' });
        });
    });
  }, [
    canvasContextRef,
    historyDispatcher,
    image,
    width,
    height,
    history,
    bounds,
    emitEvent,
    call,
    reset,
  ]);

  return (
    <ScreenshotsButton
      title={lang.operation_save_title}
      icon="icon-save"
      onClick={onClick}
    />
  );
}
