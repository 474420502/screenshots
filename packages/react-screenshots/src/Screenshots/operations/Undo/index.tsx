import type { ReactElement } from 'react';
import { useCallback } from 'react';
import useDispatcher from '../../hooks/useDispatcher';
import useHistory from '../../hooks/useHistory';
import useLang from '../../hooks/useLang';
import ScreenshotsButton from '../../ScreenshotsButton';

export default function Undo(): ReactElement {
  const lang = useLang();
  const { emitEvent } = useDispatcher();
  const [history, historyDispatcher] = useHistory();

  const onClick = useCallback(() => {
    historyDispatcher.undo();
    emitEvent?.('undo', { history });
  }, [history, historyDispatcher, emitEvent]);

  return (
    <ScreenshotsButton
      title={lang.operation_undo_title}
      icon="icon-undo"
      disabled={history.index === -1}
      onClick={onClick}
    />
  );
}
