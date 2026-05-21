import type { ReactElement } from 'react';
import { useCallback } from 'react';
import useDispatcher from '../../hooks/useDispatcher';
import useHistory from '../../hooks/useHistory';
import useLang from '../../hooks/useLang';
import ScreenshotsButton from '../../ScreenshotsButton';

export default function Redo(): ReactElement {
  const lang = useLang();
  const { emitEvent } = useDispatcher();
  const [history, historyDispatcher] = useHistory();

  const onClick = useCallback(() => {
    historyDispatcher.redo();
    emitEvent?.('redo', { history });
  }, [history, historyDispatcher, emitEvent]);

  return (
    <ScreenshotsButton
      title={lang.operation_redo_title}
      icon="icon-redo"
      disabled={
        !history.stack.length || history.stack.length - 1 === history.index
      }
      onClick={onClick}
    />
  );
}
