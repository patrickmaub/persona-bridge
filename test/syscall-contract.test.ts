import { expect, test } from '@jest/globals';
import { compile, evaluate } from '../src/index.js';

test('file paths must be strings', () => {
    expect(() => evaluate(compile('saveFile(123, "contents");')))
        .toThrow('Argument 1 of saveFile must be a string');
    expect(() => evaluate(compile('appendFile(123, "contents");')))
        .toThrow('Argument 1 of appendFile must be a string');
});

test('weather locations must be strings', () => {
    expect(() => evaluate(compile('getCurrentWeather(123);')))
        .toThrow('Argument 1 of getCurrentWeather must be a string');
});
