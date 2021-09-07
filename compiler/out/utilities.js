"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFile = exports.Result = exports.StringReader = exports.warnAt = exports.panicAt = exports.warn = exports.print = exports.panic = void 0;
const process_1 = require("process");
const promises_1 = require("fs/promises");
function panic(message) {
    console.error('\u001b[31mFatal error\u001b[0m: ' + message + '\nRun escurieux -h or escurieux --help for help.');
    (0, process_1.exit)(1);
}
exports.panic = panic;
function print(message) {
    console.error(message);
}
exports.print = print;
function warn(message) {
    console.error(`\u001b[33mWarning\u001b[0m: ${message}`);
}
exports.warn = warn;
function doSomethingAt(fn, source, message, line, char, text) {
    let lineCount = source.lineCount();
    let lineText;
    if (char != -1 && text != '\n') {
        lineText = (source.getLine(line).slice(0, char)
            + '\u001b[7m' + text + '\u001b[0m'
            + source.getLine(line).slice(char + text.length));
    }
    else {
        lineText = '\u001b[7m' + source.getLine(line).slice(0, 1) + '\u001b[0m' + source.getLine(line).slice(1);
    }
    let currentLine = '';
    let errorOrWarningId = message.match(/\[ESC(W|E)\d\d\d\d\d\]/)[0].slice(1, -1);
    fn(`\n${message}
On line ${line + 1} at character ${char + 1}:
 \u001b[34m${(line - 1).toString().padEnd(6, ' ')}      \u001b[0m| ${line - 2 >= 0 ? (currentLine = source.getLine(line - 2)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line).toString().padEnd(6, ' ')}      \u001b[0m| ${line - 1 >= 0 ? (currentLine = source.getLine(line - 1)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line + 1).toString().padEnd(6, ' ')} here >\u001b[0m ${lineText.slice(0, lineText.length - 1)}
 \u001b[34m${(line + 2).toString().padEnd(6, ' ')}      \u001b[0m| ${line + 1 < lineCount ? (currentLine = source.getLine(line + 1)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line + 3).toString().padEnd(6, ' ')}      \u001b[0m| ${line + 2 < lineCount ? (currentLine = source.getLine(line + 2)).slice(0, currentLine.length - 1) : ''}
Run escurieux -e ${errorOrWarningId} or escurieux --explain ${errorOrWarningId} for more informations about this error.\n`);
}
let panicAt = (source, message, line, char, text) => doSomethingAt(panic, source, message, line, char, text);
exports.panicAt = panicAt;
let warnAt = (source, message, line, char, text) => doSomethingAt(warn, source, message, line, char, text);
exports.warnAt = warnAt;
class StringReader {
    constructor(source) {
        this.source = source;
        this.current = 0;
        this.currentCharacter = 0;
        this.currentLine = 0;
    }
    next() {
        this.currentCharacter++;
        if (this.source[this.current] == '\n') {
            this.currentLine++;
            this.currentCharacter = 0;
        }
        let char = this.source[this.current++];
        if (char === undefined) {
            (0, exports.panicAt)(this, "[ESCE00005] Trying to access a character past EOF", this.currentLine + (this.currentCharacter == 0 ? -1 : 0), this.currentCharacter - 1, this.last);
        }
        this.last = char;
        return char;
    }
    peek() {
        return this.source[this.current];
    }
    peekSome(number) {
        return this.source.slice(this.current, this.current + number);
    }
    done() {
        return this.current == this.source.length;
    }
    update(source) {
        this.source = source;
        this.current = 0;
        this.currentCharacter = 0;
        this.currentLine = 0;
    }
    getLine(lineNumber) {
        StringReader.lineReader.update(this.source);
        while (StringReader.lineReader.currentLine != lineNumber) {
            StringReader.lineReader.next();
        }
        let line = '';
        while (StringReader.lineReader.currentLine != lineNumber + 1 && !StringReader.lineReader.done()) {
            line += StringReader.lineReader.next();
        }
        return line;
    }
    lineCount() {
        StringReader.lineReader.update(this.source);
        while (!StringReader.lineReader.done())
            StringReader.lineReader.next();
        return StringReader.lineReader.currentLine;
    }
}
exports.StringReader = StringReader;
_a = StringReader;
(() => {
    _a.lineReader = new StringReader('');
})();
class Result {
    constructor() { }
    static Ok(value) {
        let result = new Result();
        result.variant = "Ok";
        result.value = value;
        return result;
    }
    static Err(errorMessage) {
        let result = new Result();
        result.variant = "Err";
        result.errorMessage = errorMessage;
        return result;
    }
    ok() {
        return this.variant == "Ok";
    }
    err() {
        return this.variant == "Err";
    }
}
exports.Result = Result;
async function readFile(filename) {
    let contents = await new Promise((resolve) => {
        (0, promises_1.readFile)(filename, { encoding: 'utf-8', flag: 'r' })
            .then((fileContents) => resolve(Result.Ok(fileContents)))
            .catch((errorMessage) => resolve(Result.Err("" + errorMessage)));
    });
    return contents;
}
exports.readFile = readFile;
//# sourceMappingURL=utilities.js.map