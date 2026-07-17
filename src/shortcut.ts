import Compiler from './compiler.js';
import Lexer from './lexer.js';
import Parser, { ASTNode, Call, Identifier, Literal } from './parser.js';
import syscalls from './syscall.js';
import { TokenType } from './lexer.js';

export type CapabilityRisk = 'low' | 'sensitive' | 'write' | 'destructive' | 'arbitrary';

export interface ShortcutCapability {
    name: string;
    syscallId: string;
    risk: CapabilityRisk;
    line: number;
}

export interface ShortcutDiagnostic {
    severity: 'error' | 'warning';
    code: string;
    message: string;
    line?: number;
}

export interface ShortcutAnalysis {
    valid: boolean;
    sourceBytes: number;
    capabilities: ShortcutCapability[];
    diagnostics: ShortcutDiagnostic[];
}

export interface ShortcutPolicy {
    allowedRisks?: CapabilityRisk[];
    allowedCapabilities?: string[];
    maxSourceBytes?: number;
    maxUrlLength?: number;
}

export interface PrepareShortcutOptions extends ShortcutPolicy {
    shortcutName?: string;
}

export interface PreparedShortcut extends ShortcutAnalysis {
    url?: string;
    shortcutName: string;
}

const LOW_RISK = new Set([
    'print', 'input', 'exit', 'alert', 'confirm', 'speak', 'vibrate', 'wait',
    'connectedToCharger', 'isCharging', 'getOrientation', 'getBatteryLevel',
    'getDeviceDetail', 'isOnline', 'expandURL', 'searchWeb', 'getURLDetail',
    'getURLHeaders', 'getURLs', 'getRSS', 'getRSSFeeds', 'searchAppStore',
    'getPodcasts', 'searchPodcasts', 'startShazam', 'define', 'getEmojiName',
    'getRichTextFromMarkdown', 'makeHTML', 'makeMarkdown', 'getRichTextFromHTML',
    'lowercase', 'uppercase', 'hash', 'base64Encode', 'base64Decode',
    'getCurrentWeather'
]);

const SENSITIVE = new Set([
    'getClipboard', 'findEmail', 'findMessage', 'findConversation',
    'getFocusMode', 'getWallpaper', 'getAllWallpapers', 'getOnScreenContent',
    'getWebContents', 'getArticle', 'getCurrentURL', 'takeScreenshot',
    'recordAudio', 'takePhoto', 'takeVideo', 'searchVoiceMemos', 'getContacts',
    'selectContact', 'selectEmailAddress', 'getEmails', 'getPhoneNumbers',
    'selectPhoneNumber', 'getContactDetail', 'getTextFromImage',
    'transcribeText', 'getFile', 'getCurrentLocation'
]);

const DESTRUCTIVE = new Set(['reboot', 'shutdown']);

export const capabilityRisk = (name: string): CapabilityRisk => {
    if (name === 'syscall') return 'arbitrary';
    if (DESTRUCTIVE.has(name)) return 'destructive';
    if (SENSITIVE.has(name)) return 'sensitive';
    if (LOW_RISK.has(name)) return 'low';
    return 'write';
};

const walkAst = (value: unknown, visit: (node: ASTNode) => void): void => {
    if (value instanceof ASTNode) {
        visit(value);
        for (const child of Object.values(value))
            walkAst(child, visit);
        return;
    }

    if (Array.isArray(value)) {
        for (const child of value)
            walkAst(child, visit);
        return;
    }

    if (value instanceof Map) {
        for (const child of value.values())
            walkAst(child, visit);
    }
};

const sourceByteLength = (source: string): number => {
    let bytes = 0;
    for (const character of source) {
        const point = character.codePointAt(0) ?? 0;
        bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    }
    return bytes;
};

export const analyzeShortcut = (source: string): ShortcutAnalysis => {
    const diagnostics: ShortcutDiagnostic[] = [];
    const capabilities = new Map<string, ShortcutCapability>();

    try {
        const ast = new Parser(new Lexer(source).run()).run();
        // Compilation catches errors that a parse-only preflight would miss.
        new Compiler(ast).run();

        walkAst(ast, (node) => {
            if (node instanceof Identifier) {
                const name = node.name.value;
                const definition = syscalls[name];
                if (definition) {
                    const key = `${name}:${definition.syscallId}`;
                    if (!capabilities.has(key)) {
                        capabilities.set(key, {
                            name,
                            syscallId: definition.syscallId,
                            risk: capabilityRisk(name),
                            line: node.lineNumber
                        });
                    }
                }
            }

            if (node instanceof Call && node.func instanceof Identifier && node.func.name.value === 'syscall') {
                const firstArgument = node.args[0];
                const literalId = firstArgument instanceof Literal && firstArgument.value.type === TokenType.STRING
                    ? firstArgument.value.value
                    : 'dynamic';
                const key = `syscall:${literalId}`;
                if (!capabilities.has(key)) {
                    capabilities.set(key, {
                        name: 'syscall',
                        syscallId: literalId,
                        risk: 'arbitrary',
                        line: node.lineNumber
                    });
                }
                diagnostics.push({
                    severity: 'warning',
                    code: 'ARBITRARY_SYSCALL',
                    message: literalId === 'dynamic'
                        ? 'Dynamic syscall IDs cannot be audited before execution.'
                        : `Direct syscall ${literalId} bypasses the typed standard library.`,
                    line: node.lineNumber
                });
            }
        });
    } catch (error) {
        diagnostics.push({
            severity: 'error',
            code: 'INVALID_SOURCE',
            message: error instanceof Error ? error.message : String(error)
        });
    }

    return {
        valid: !diagnostics.some(diagnostic => diagnostic.severity === 'error'),
        sourceBytes: sourceByteLength(source),
        capabilities: [...capabilities.values()].sort((a, b) => a.line - b.line || a.name.localeCompare(b.name)),
        diagnostics
    };
};

const createRunUrl = (shortcutName: string, source: string): string =>
    `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}&input=text&text=${encodeURIComponent(source)}`;

export const prepareShortcut = (source: string, options: PrepareShortcutOptions = {}): PreparedShortcut => {
    const analysis = analyzeShortcut(source);
    const diagnostics = [...analysis.diagnostics];
    const shortcutName = options.shortcutName ?? 'Persona Bridge';
    const allowedRisks = new Set<CapabilityRisk>(['low', ...(options.allowedRisks ?? [])]);
    const allowedCapabilities = new Set(options.allowedCapabilities ?? []);
    const maxSourceBytes = options.maxSourceBytes ?? 32_768;
    const maxUrlLength = options.maxUrlLength ?? 8_000;

    if (analysis.sourceBytes > maxSourceBytes) {
        diagnostics.push({
            severity: 'error',
            code: 'SOURCE_TOO_LARGE',
            message: `Source is ${analysis.sourceBytes} bytes; the configured limit is ${maxSourceBytes}.`
        });
    }

    for (const capability of analysis.capabilities) {
        const explicitlyAllowed = allowedCapabilities.has(capability.name)
            || allowedCapabilities.has(capability.syscallId);
        if (!explicitlyAllowed && !allowedRisks.has(capability.risk)) {
            diagnostics.push({
                severity: 'error',
                code: 'CAPABILITY_NOT_ALLOWED',
                message: `${capability.name} requires ${capability.risk} capability approval.`,
                line: capability.line
            });
        }
    }

    const url = createRunUrl(shortcutName, source);
    if (url.length > maxUrlLength) {
        diagnostics.push({
            severity: 'error',
            code: 'URL_TOO_LARGE',
            message: `Run URL is ${url.length} characters; the configured limit is ${maxUrlLength}. Use clipboard or a hosted payload instead.`
        });
    }

    const valid = !diagnostics.some(diagnostic => diagnostic.severity === 'error');
    return {
        ...analysis,
        valid,
        diagnostics,
        shortcutName,
        url: valid ? url : undefined
    };
};
