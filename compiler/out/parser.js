"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const explanations_1 = require("./explanations");
const tokens_1 = require("./tokens");
const utilities_1 = require("./utilities");
class PeekableTokenStream {
    constructor(stream, reader) {
        this.nextTokens = [];
        this.stream = stream;
        this.reader = reader;
    }
    next() {
        if (this.nextTokens.length > 0) {
            return this.nextTokens.shift();
        }
        else {
            return this.stream.gen.next().value;
        }
    }
    peek() {
        if (this.nextTokens.length > 0) {
            return this.nextTokens[0];
        }
        this.nextTokens.push(this.stream.gen.next().value);
        return this.nextTokens[0];
    }
    match(type) {
        const next = this.peek();
        return next.type == type;
    }
    consume(type, message) {
        const next = this.next();
        if (next.type != type) {
            (0, utilities_1.panicAt)(this.reader, `[ESCE00010] Expected TokenType.${tokens_1.TokenType[type]}${explanations_1.tokenTypeExplanations.has(type) ? ` (${explanations_1.tokenTypeExplanations.get(type)})` : ''}, got '${next.getSource()}' : ${message}`, next.line, next.char, next.getSource());
        }
    }
}
class IdentifierSubparser {
    parse(parser, token) {
        return new IdentifierExpression(token.getSource());
    }
}
class PrefixOperatorSubparser {
    parse(parser, token) {
        const operand = parser.getExpression();
        return new PrefixOperatorExpression(token.type, operand);
    }
}
class InfixOperatorSubparser {
    parse(parser, left, token) {
        const right = parser.getExpression();
        return new InfixOperatorExpression(token.type, left, right);
    }
}
class Expression {
}
class IdentifierExpression extends Expression {
    constructor(id) {
        super();
        this.id = id;
    }
}
class LiteralExpression extends Expression {
    constructor(value, type) {
        super();
        this.value = value;
        this.type = type;
    }
}
class LiteralSubparser {
    parse(_parser, token) {
        if (token.type == tokens_1.TokenType.CharacterLiteral)
            return new LiteralExpression(token.content, tokens_1.TokenType.CharacterLiteral);
        else if (token.type == tokens_1.TokenType.StringLiteral)
            return new LiteralExpression(token.content, tokens_1.TokenType.StringLiteral);
        else if (token.type == tokens_1.TokenType.NumericLiteral)
            return new LiteralExpression(token.content, tokens_1.TokenType.NumericLiteral);
        else if (token.type == tokens_1.TokenType.BooleanLiteral)
            return new LiteralExpression(token.content, tokens_1.TokenType.BooleanLiteral);
    }
}
class PrefixOperatorExpression {
    constructor(operator, operand) {
        this.operator = operator;
        this.operand = operand;
    }
}
class InfixOperatorExpression extends Expression {
    constructor(operator, left, right) {
        super();
        this.operator = operator;
        this.leftOperand = left;
        this.rightOperand = right;
    }
}
class Parser {
    constructor(source, reader) {
        this.prefixSubparsers = new Map();
        this.infixSubparsers = new Map();
        this.tokenSource = new PeekableTokenStream(source, reader);
        this.registerPrefix(tokens_1.TokenType.Identifier, new IdentifierSubparser());
        this.registerPrefix(tokens_1.TokenType.Plus, new PrefixOperatorSubparser());
        this.registerPrefix(tokens_1.TokenType.Minus, new PrefixOperatorSubparser());
        this.registerPrefix(tokens_1.TokenType.Tilde, new PrefixOperatorSubparser());
        this.registerPrefix(tokens_1.TokenType.Bang, new PrefixOperatorSubparser());
        this.registerPrefix(tokens_1.TokenType.CharacterLiteral, new LiteralSubparser());
        this.registerPrefix(tokens_1.TokenType.StringLiteral, new LiteralSubparser());
        this.registerPrefix(tokens_1.TokenType.NumericLiteral, new LiteralSubparser());
        this.registerPrefix(tokens_1.TokenType.BooleanLiteral, new LiteralSubparser());
    }
    registerPrefix(type, subparser) {
        this.prefixSubparsers.set(type, subparser);
    }
    registerInfix(type, subparser) {
        this.infixSubparsers.set(type, subparser);
    }
    getExpression() {
        const token = this.tokenSource.next();
        if (!this.prefixSubparsers.has(token.type)) {
            (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE00011] Could not parse : '${token.getSource()}'`, token.line, token.char, token.getSource());
        }
        return this.prefixSubparsers.get(token.type).parse(this, token);
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map