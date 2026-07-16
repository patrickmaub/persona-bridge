import 'es6-shim';
import 'reflect-metadata';
import interpret from './interpret.js';
import VM, { VMImage } from '../src/vm.js';
import {StringValue, Value} from '../src/value.js';
import { coerceSyscallReturnValue } from '../src/syscall.js';

const VM_TIME_LIMIT_FOR_EXECUTION = 150;
const VM_MAX_TOTAL_INSTRUCTIONS = 1_000_000;
const MAX_SOURCE_BYTES = 32_768;

const getParams = () => {
	const data = window.location.href;

	const matches = [
		...data.matchAll(/data:text\/html;((?:[^=;]*=[^;]*;)+)base64/g),
	];

	const params = {};

	matches[0][1].split(';').forEach((param) => {
		const [key, value] = param.split('=');

		if (!key) return;

		params[key] = decodeURIComponent(value);
	});

	return params;
};

const begin = (sourceCode: string): void => {
    const source = atob(sourceCode);

	if (!source) {
		console.log('No source code found in query params.');
        return;
    }

    if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES) {
        throw new Error(`Source code exceeds the ${MAX_SOURCE_BYTES} byte limit.`);
    }

    const result = interpret(source, VM_TIME_LIMIT_FOR_EXECUTION, VM_MAX_TOTAL_INSTRUCTIONS);

	document.write(btoa(JSON.stringify(result)));
};

const resume = (save: string, value): void => {
	const image = JSON.parse(atob(save)) as VMImage;
	const decodedValue = value ? atob(value) : '';
	const syscallId = image?.syscall?.name;
	const coercedValue = syscallId
		? coerceSyscallReturnValue(syscallId, decodedValue)
		: new StringValue(decodedValue);
	const vm = VM.deserialize(image, coercedValue);
    const result = vm.run(VM_TIME_LIMIT_FOR_EXECUTION, VM_MAX_TOTAL_INSTRUCTIONS);

	document.write(btoa(JSON.stringify(result)));
};

((): void => {
	const params = getParams();

	const state = params['resume'];
	const sourceCode = params['begin'];
	const value = params['value'];

	try {
		if (state) {
			resume(state, value);
		} else if (sourceCode) {
			begin(sourceCode);
		} else {
			document.write(
				btoa(JSON.stringify({
					error: 'No source code found in query params.'
				}))
			);
		}
	} catch (e) {
		document.write(btoa(
			JSON.stringify({
				error: e.message,
			})));
	}
})();
