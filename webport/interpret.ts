import { compile } from '../src/index.js';
import VM, { VMImage } from '../src/vm.js';

const interpret = (source: string, timeLimitMilliseconds: number = Infinity, maxInstructions: number = 1_000_000): VMImage => {
	const program = compile(source);

	const vm = VM.create(program);

    const res = vm.run(timeLimitMilliseconds, maxInstructions);

	return res;
};

export default interpret;
