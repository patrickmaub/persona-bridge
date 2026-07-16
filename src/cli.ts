#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { analyzeShortcut, CapabilityRisk, prepareShortcut } from './shortcut.js';

const USAGE = `Usage:
  melon check [file|-]
  melon link [file|-] [--name NAME] [--allow CAPABILITY] [--allow-risk RISK]

Commands emit JSON for easy use by agents and chat servers. If file is omitted or '-',
source is read from stdin. Risks: low, sensitive, write, destructive, arbitrary.`;

const readStdin = async (): Promise<string> => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin)
        chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
};

const readSource = async (path?: string): Promise<string> =>
    !path || path === '-' ? readStdin() : readFile(path, 'utf8');

const valuesFor = (args: string[], flag: string): string[] => {
    const values: string[] = [];
    for (let index = 0; index < args.length; index++) {
        if (args[index] === flag && args[index + 1])
            values.push(args[++index]);
    }
    return values;
};

const firstPositional = (args: string[]): string | undefined => {
    const flagsWithValues = new Set(['--name', '--allow', '--allow-risk']);
    for (let index = 0; index < args.length; index++) {
        if (flagsWithValues.has(args[index])) {
            index++;
            continue;
        }
        if (!args[index].startsWith('--'))
            return args[index];
    }
    return undefined;
};

const main = async (): Promise<void> => {
    const [command, ...args] = process.argv.slice(2);
    if (!command || command === '--help' || command === '-h') {
        console.log(USAGE);
        return;
    }

    if (command !== 'check' && command !== 'link')
        throw new Error(`Unknown command: ${command}\n\n${USAGE}`);

    const source = await readSource(firstPositional(args));
    const allowedRisks = valuesFor(args, '--allow-risk') as CapabilityRisk[];
    const result = command === 'check'
        ? analyzeShortcut(source)
        : prepareShortcut(source, {
            shortcutName: valuesFor(args, '--name').at(-1),
            allowedCapabilities: valuesFor(args, '--allow'),
            allowedRisks: allowedRisks.length > 0 ? allowedRisks : undefined
        });

    console.log(JSON.stringify(result, null, 2));
    if (!result.valid)
        process.exitCode = 1;
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
