import "reflect-metadata";
import 'es6-shim';

import Compiler from './compiler.js';
import Lexer from './lexer.js';
import Parser from './parser.js';
import VM, { Program } from './vm.js';

export const compile = (source: string) => {
    const tokens = new Lexer(source).run();
    const ast = new Parser(tokens).run();

    return new Compiler(ast).run();
}

export const evaluate = (program: Program) => {
    let vm = VM.create(program);
    const state = vm.run();

    return state
}

export {
    analyzeShortcut,
    capabilityRisk,
    prepareShortcut
} from './shortcut.js';
export type {
    CapabilityRisk,
    PrepareShortcutOptions,
    PreparedShortcut,
    ShortcutAnalysis,
    ShortcutCapability,
    ShortcutDiagnostic,
    ShortcutPolicy
} from './shortcut.js';
