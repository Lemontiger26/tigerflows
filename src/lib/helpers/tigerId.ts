import { customAlphabet } from 'nanoid';
import { nolookalikes } from 'nanoid-dictionary';
import defaults from '@src/config/defaults';

const tigeridFun = customAlphabet(nolookalikes, defaults.id_length);

export const tigerid = (len = defaults.id_length) => tigeridFun(len);
