import { customAlphabet } from 'nanoid';
import { nolookalikes } from 'nanoid-dictionary';
import defaults from '@src/config/defaults';

export const idLength = defaults.id_length;
export const tigerid = customAlphabet(nolookalikes, idLength);

export const SYSTEM_USER_ID = 'SYSTEM';
export const LOCAL_USER_ID = 'LOCAL';

export const flowStatusValues = ['active', 'completed', 'abandoned'] as const;

export const stepTypeValues = ['boolean', 'text', 'number', 'date', 'enum_single', 'enum_multi', 'agent'] as const;

export const executorTypeValues = ['human', 'agent'] as const;

export const inputSourceKindValues = [
	'log_file',
	'rest_health',
	'systemctl_status',
	'email',
	'sql_query',
	'http_get',
	'rag_corpus',
	'webhook',
	'custom'
] as const;

export const executionGateKindValues = [
	'human_approval',
	'predicate',
	'budget',
	'time_window',
	'dependency',
	'rate_limit',
	'custom'
] as const;

export const gatePositionValues = [
	'pre',
	'post',
	'pre_branch',
	'post_branch',
	'pre_merge',
	'post_merge',
	'pre_loop',
	'post_loop'
] as const;

export function nowIso() {
	return new Date().toISOString();
}
