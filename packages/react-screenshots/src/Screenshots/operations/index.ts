import { defaultOperationLayout } from '../operationItems';
import Arrow from './Arrow';
import Brush from './Brush';
import Cancel from './Cancel';
import Ellipse from './Ellipse';
import Mosaic from './Mosaic';
import Ok from './Ok';
import Rectangle from './Rectangle';
import Redo from './Redo';
import Save from './Save';
import Text from './Text';
import Undo from './Undo';

export type {
  BuiltinOperationKey,
  OperationLayoutItem,
} from '../operationItems';

export const builtinOperationComponents = {
  Rectangle,
  Ellipse,
  Arrow,
  Brush,
  Text,
  Mosaic,
  Undo,
  Redo,
  Save,
  Cancel,
  Ok,
};

export default defaultOperationLayout.map((item) => {
  if (item === '|') {
    return item;
  }
  return builtinOperationComponents[item];
});
