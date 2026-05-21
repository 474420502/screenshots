import type { ReactElement } from 'react';
import { useCallback } from 'react';
import useCall from '../../hooks/useCall';
import useDispatcher from '../../hooks/useDispatcher';
import useLang from '../../hooks/useLang';
import useReset from '../../hooks/useReset';
import ScreenshotsButton from '../../ScreenshotsButton';

export default function Cancel(): ReactElement {
  const call = useCall();
  const { emitEvent } = useDispatcher();
  const reset = useReset();
  const lang = useLang();

  const onClick = useCallback(() => {
    emitEvent?.('cancel', { source: 'button' });
    call('onCancel');
    reset('cancel');
  }, [call, reset, emitEvent]);

  return (
    <ScreenshotsButton
      title={lang.operation_cancel_title}
      icon="icon-cancel"
      onClick={onClick}
    />
  );
}
