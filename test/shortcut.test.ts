import { expect, test } from '@jest/globals';
import { compile } from '../src/index.js';
import { analyzeShortcut, prepareShortcut } from '../src/shortcut.js';
import VM from '../src/vm.js';

test('analyzes low-risk and sensitive capabilities', () => {
    const result = analyzeShortcut(`
        let messages = findMessage("today");
        print(messages);
    `);

    expect(result.valid).toBe(true);
    expect(result.capabilities).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'findMessage', risk: 'sensitive' }),
        expect.objectContaining({ name: 'print', risk: 'low' })
    ]));
});

test('reports invalid source without throwing', () => {
    const result = analyzeShortcut('let = ;');

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_SOURCE', severity: 'error' })
    ]));
});

test('prepares an exact runnable URL for a low-risk program', () => {
    const source = 'print("hello world");';
    const result = prepareShortcut(source);

    expect(result.valid).toBe(true);
    expect(result.url).toBeDefined();
    const url = new URL(result.url);
    expect(url.protocol).toBe('shortcuts:');
    expect(url.searchParams.get('name')).toBe('melon');
    expect(url.searchParams.get('input')).toBe('text');
    expect(url.searchParams.get('text')).toBe(source);
});

test('requires explicit approval for sensitive capabilities', () => {
    const denied = prepareShortcut('print(findMessage("today"));');
    expect(denied.valid).toBe(false);
    expect(denied.url).toBeUndefined();
    expect(denied.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'CAPABILITY_NOT_ALLOWED' })
    ]));

    const approved = prepareShortcut('print(findMessage("today"));', {
        allowedCapabilities: ['findMessage']
    });
    expect(approved.valid).toBe(true);
    expect(approved.url).toBeDefined();
});

test('additional risk approvals retain the default low-risk allowance', () => {
    const result = prepareShortcut('print(findMessage("today"));', {
        allowedRisks: ['sensitive']
    });
    expect(result.valid).toBe(true);
});

test('rejects direct syscalls unless arbitrary execution is explicitly approved', () => {
    const source = 'syscall("is.workflow.actions.showresult", "hello");';
    const denied = prepareShortcut(source);
    expect(denied.valid).toBe(false);
    expect(denied.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'ARBITRARY_SYSCALL', severity: 'warning' }),
        expect.objectContaining({ code: 'CAPABILITY_NOT_ALLOWED', severity: 'error' })
    ]));

    const approved = prepareShortcut(source, { allowedRisks: ['low', 'arbitrary'] });
    expect(approved.valid).toBe(true);
});

test('rejects an aliased raw syscall', () => {
    const result = prepareShortcut('let raw = syscall; raw("anything", "value");');
    expect(result.valid).toBe(false);
    expect(result.capabilities).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'syscall', risk: 'arbitrary' })
    ]));
});

test('finds a capability even when the function is aliased', () => {
    const result = analyzeShortcut('let read = getClipboard; print(read());');
    expect(result.capabilities).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'getClipboard', risk: 'sensitive' })
    ]));
});

test('rejects links above the configured transport limit', () => {
    const result = prepareShortcut(`print("${'x'.repeat(100)}");`, { maxUrlLength: 80 });
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'URL_TOO_LARGE' })
    ]));
});

test('stops programs that exceed their instruction budget', () => {
    const vm = VM.create(compile('while (true) {}'));
    expect(() => vm.run(Infinity, 50)).toThrow('Execution stopped after 50 instructions');
});
