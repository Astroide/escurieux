"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = exports.ImportSection = exports.ContinueExpression = exports.BreakExpression = exports.ReturnExpression = exports.AssignmentExpression = exports.TraitSubparser = exports.TraitExpression = exports.EnumExpression = exports.ClassExpression = exports.FunctionExpression = exports.LambdaFunctionExpression = exports.ForExpression = exports.PostfixOperatorExpression = exports.LetOrConstDeclarationExpression = exports.TypeCastingExpression = exports.LoopExpression = exports.WhileExpression = exports.IfExpression = exports.InfixOperatorExpression = exports.StatementExpression = exports.PrefixOperatorExpression = exports.PropertyAccessExpression = exports.LiteralExpression = exports.IdentifierExpression = exports.ElementAccessExpression = exports.FunctionCallExpression = exports.GroupExpression = exports.Expression = void 0;
const explanations_1 = require("./explanations");
const tokens_1 = require("./tokens");
const utilities_1 = require("./utilities");
// This class is a wrapper around the tokenizer. It allows reading, peeking, matching, skipping, and consuming tokens.
class BetterTokenStream {
    constructor(stream, reader) {
        this.nextTokens = [];
        this.index = 0;
        this.stack = [];
        this.stream = stream;
        this.reader = reader;
    }
    next() {
        this.index++;
        if (this.nextTokens.length > 0) {
            return this.pushToStackAndReturn(this.nextTokens.shift());
        }
        else {
            return this.pushToStackAndReturn(this.stream.gen.next().value);
        }
    }
    pushToStackAndReturn(token) {
        this.stack.push(token);
        return token;
    }
    peek() {
        if (this.nextTokens.length > 0) {
            return this.nextTokens[0];
        }
        this.nextTokens.push(this.stream.gen.next().value);
        return this.nextTokens[0];
    }
    peekN(n) {
        if (this.nextTokens.length > n - 1) {
            return this.nextTokens[n - 1];
        }
        while (!(this.nextTokens.length > n - 1)) {
            this.nextTokens.push(this.stream.gen.next().value);
        }
        return this.nextTokens[n - 1];
    }
    match(type) {
        const next = this.peek();
        return next.type == type;
    }
    consume(type, message) {
        this.index++;
        const next = this.next();
        if (next.type != type) {
            (0, utilities_1.panicAt)(this.reader, `[ESCE00010] Expected TokenType.${tokens_1.TokenType[type]}${explanations_1.tokenTypeExplanations.has(type) ? ` (${explanations_1.tokenTypeExplanations.get(type)})` : ''}, got '${next.getSource()}' : ${message}`, next.line, next.char, next.getSource());
        }
        return this.pushToStackAndReturn(next);
    }
    state() {
        return this.index;
    }
    restore(state) {
        while (this.index != state) {
            this.index--;
            this.nextTokens.unshift(this.stack.pop());
        }
    }
}
// Precedence levels
const Precedence = {
    // const ASSIGNMENT = 1;
    CONDITIONAL: 2,
    SUM: 3,
    PRODUCT: 4,
    EXPONENT: 5,
    PREFIX: 6,
    POSTFIX: 7,
    CALL: 8,
    PROPERTY_ACCESS: 9,
};
// Lock Precedence's properties (it being const doesn't imply its properties are constant)
Object.seal(Precedence);
// Base pattern class
class Pattern {
    // Even if this method exists, it must be overridden by subclasses.
    toString() {
        return 'Pattern';
    }
}
class IdentifierSubparser {
    parse(parser, token) {
        return new IdentifierExpression(token);
    }
}
__decorate([
    utilities_1.logCalls
], IdentifierSubparser.prototype, "parse", null);
class PrefixOperatorSubparser {
    parse(parser, token) {
        const operand = parser.getExpression(Precedence.PREFIX);
        return new PrefixOperatorExpression(token.type, operand);
    }
}
__decorate([
    utilities_1.logCalls
], PrefixOperatorSubparser.prototype, "parse", null);
// All infix operators (except ;, the expression chaining operator) are implemented by this class.
class InfixOperatorSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, left, token) {
        const right = parser.getExpression(Precedence.SUM);
        return new InfixOperatorExpression(token.type, left, right);
    }
}
__decorate([
    utilities_1.logCalls
], InfixOperatorSubparser.prototype, "parse", null);
class GroupSubparser {
    parse(parser, _token) {
        const inside = parser.getExpression(0);
        parser.tokenSource.consume(tokens_1.TokenType.RightParenthesis, 'parenthesized expressions need to be closed');
        return new GroupExpression(inside);
    }
}
__decorate([
    utilities_1.logCalls
], GroupSubparser.prototype, "parse", null);
class FunctionCallSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, callee, _token) {
        const args = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            let argName = null;
            if (parser.tokenSource.peek().type == tokens_1.TokenType.Identifier && parser.tokenSource.peekN(2).type == tokens_1.TokenType.Colon) {
                // Named argument
                argName = parser.tokenSource.next();
                parser.tokenSource.next();
            }
            const arg = parser.getExpression(0);
            args.push(argName ? [arg, argName] : [arg]);
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next();
        return new FunctionCallExpression(callee, args);
    }
}
__decorate([
    utilities_1.logCalls
], FunctionCallSubparser.prototype, "parse", null);
class ElementAccessSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, object, _token) {
        const indices = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate indices and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const index = parser.getExpression(this.precedence);
            indices.push(index);
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Indices should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next();
        return new ElementAccessExpression(object, indices);
    }
}
__decorate([
    utilities_1.logCalls
], ElementAccessSubparser.prototype, "parse", null);
// Base expression class
class Expression {
    // Although this method exists, it must be overridden by subclasses.
    toString() {
        return 'Expression';
    }
}
exports.Expression = Expression;
class GroupExpression extends Expression {
    constructor(content) {
        super();
        this.content = content;
    }
    toString() {
        return `GroupExpression {${this.content.toString()}}`;
    }
}
exports.GroupExpression = GroupExpression;
class FunctionCallExpression extends Expression {
    constructor(callee, args) {
        super();
        this.callee = callee;
        this.args = args;
    }
    toString() {
        return `FunctionCall {${this.callee.toString()}${this.args.length > 0 ? ', ' + this.args.map(x => x.toString()).join(', ') : ''}}`;
    }
}
exports.FunctionCallExpression = FunctionCallExpression;
class ElementAccessExpression extends Expression {
    constructor(left, indices) {
        super();
        this.left = left;
        this.indices = indices;
    }
    toString() {
        return `IndexingExpression {${this.left.toString()}${this.indices.length > 0 ? ', ' + this.indices.map(x => x.toString()).join(', ') : ''}}`;
    }
}
exports.ElementAccessExpression = ElementAccessExpression;
class IdentifierExpression extends Expression {
    constructor(token) {
        super();
        this.token = token;
        this.id = token.identifier;
        this.token = token;
    }
    toString() {
        return `Identifier[${this.id}]`;
    }
}
exports.IdentifierExpression = IdentifierExpression;
class LiteralExpression extends Expression {
    constructor(value, type) {
        super();
        this.value = value;
        this.type = type;
    }
    toString() {
        if (this.type == tokens_1.TokenType.TemplateStringLiteral) {
            let string = `${tokens_1.TokenType[this.type]}[\n`;
            let element = this.value;
            while (element) {
                if (element.data instanceof Expression) {
                    string += '+ ' + element.data.toString() + '\n';
                }
                else {
                    string += '+ string |' + element.data.toString() + '|\n';
                }
                element = element.next;
            }
            string += ']';
            return string;
        }
        else {
            return `${tokens_1.TokenType[this.type]}[${this.value}]`;
        }
    }
}
exports.LiteralExpression = LiteralExpression;
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
        else if (token.type == tokens_1.TokenType.TemplateStringLiteral)
            return new LiteralExpression(token.contents, tokens_1.TokenType.TemplateStringLiteral);
    }
}
__decorate([
    utilities_1.logCalls
], LiteralSubparser.prototype, "parse", null);
class PropertyAccessExpression extends Expression {
    constructor(object, property) {
        super();
        this.object = object;
        this.property = property;
    }
    toString() {
        return `PropertyAccess {${this.object.toString()}, ${this.property}}`;
    }
}
exports.PropertyAccessExpression = PropertyAccessExpression;
class PropertyAccessSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, left, _token) {
        const propertyName = parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected a property name after a dot').getSource();
        return new PropertyAccessExpression(left, propertyName);
    }
}
__decorate([
    utilities_1.logCalls
], PropertyAccessSubparser.prototype, "parse", null);
class PrefixOperatorExpression extends Expression {
    constructor(operator, operand) {
        super();
        this.operator = operator;
        this.operand = operand;
    }
    toString() {
        return tokens_1.TokenType[this.operator] + '.prefix {' + this.operand.toString() + '}';
    }
}
exports.PrefixOperatorExpression = PrefixOperatorExpression;
class StatementExpression extends Expression {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
    toString() {
        return `${this.left} ; ${this.right}`;
    }
}
exports.StatementExpression = StatementExpression;
class StatementSubparser {
    constructor() {
        this.precedence = 0.5;
    }
    parse(parser, left, _token) {
        const right = parser.getExpression(0);
        return new StatementExpression(left, right);
    }
}
__decorate([
    utilities_1.logCalls
], StatementSubparser.prototype, "parse", null);
class Block extends Expression {
    constructor(expression) {
        super();
        this.expression = expression;
        this.label = null;
    }
    toString() {
        return `Block${this.label ? '#' + this.label : ''} {${this.expression.toString()}}`;
    }
}
class BlockSubparser {
    parse(parser, _token) {
        const expression = parser.getExpression(0);
        parser.tokenSource.consume(tokens_1.TokenType.RightCurlyBracket, 'a \'}\' was expected at the end of a block');
        return new Block(expression);
    }
}
__decorate([
    utilities_1.logCalls
], BlockSubparser.prototype, "parse", null);
class InfixOperatorExpression extends Expression {
    constructor(operator, leftOperand, rightOperand) {
        super();
        this.operator = operator;
        this.leftOperand = leftOperand;
        this.rightOperand = rightOperand;
    }
    toString() {
        return `${tokens_1.TokenType[this.operator]}.infix {${this.leftOperand.toString()}, ${this.rightOperand.toString()}}`;
    }
}
exports.InfixOperatorExpression = InfixOperatorExpression;
class IfExpression extends Expression {
    constructor(condition, thenBranch, elseBranch) {
        super();
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
    toString() {
        return `If {${this.condition.toString()}, ${this.thenBranch.toString()}${this.elseBranch ? ', ' + this.elseBranch.toString() : ''}}`;
    }
}
exports.IfExpression = IfExpression;
class WhileExpression extends Expression {
    constructor(condition, body) {
        super();
        this.condition = condition;
        this.body = body;
    }
    toString() {
        return `While {${this.condition.toString()}, ${this.body.toString()}}`;
    }
}
exports.WhileExpression = WhileExpression;
class LoopExpression extends Expression {
    constructor(body) {
        super();
        this.body = body;
        this.label = null;
    }
    toString() {
        return `Loop${this.label ? '#' + this.label : ''} {${this.body.toString()}}`;
    }
}
exports.LoopExpression = LoopExpression;
class IfSubparser {
    parse(parser, _token) {
        const condition = parser.getExpression(0);
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after an if\'s condition');
        const thenBranch = (new BlockSubparser()).parse(parser, token);
        let elseBranch = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Else)) {
            parser.tokenSource.next(); // Consume 'else'
            if (parser.tokenSource.match(tokens_1.TokenType.If)) {
                elseBranch = (new IfSubparser()).parse(parser, parser.tokenSource.next());
            }
            else {
                const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after an \'else\'');
                elseBranch = (new BlockSubparser()).parse(parser, token);
            }
        }
        return new IfExpression(condition, thenBranch, elseBranch);
    }
}
__decorate([
    utilities_1.logCalls
], IfSubparser.prototype, "parse", null);
class ListExpression extends Expression {
    constructor(elements) {
        super();
        this.elements = elements;
    }
    toString() {
        return `ListExpression {${this.elements.map(x => x.toString()).join(', ')}}`;
    }
}
class ListSubparser {
    parse(parser, _token) {
        const elements = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00023] Leading / double commas are not allowed within list literals.', token.line, token.char, token.getSource());
            }
            elements.push(parser.getExpression(0));
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00024] A list literal\'s elements should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the ']'
        return new ListExpression(elements);
    }
}
__decorate([
    utilities_1.logCalls
], ListSubparser.prototype, "parse", null);
class WhileSubparser {
    parse(parser, _token) {
        const condition = parser.getExpression(0);
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after an while\'s condition');
        const body = (new BlockSubparser()).parse(parser, token);
        return new WhileExpression(condition, body);
    }
}
__decorate([
    utilities_1.logCalls
], WhileSubparser.prototype, "parse", null);
class LoopSubparser {
    parse(parser, _token) {
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after a \'loop\'');
        const body = (new BlockSubparser()).parse(parser, token);
        return new LoopExpression(body);
    }
}
__decorate([
    utilities_1.logCalls
], LoopSubparser.prototype, "parse", null);
class TypeCastingExpression extends Expression {
    constructor(type, value) {
        super();
        this.type = type;
        this.value = value;
    }
    toString() {
        return `Typecast {${typeToString(this.type)}, ${this.value.toString()}}`;
    }
}
exports.TypeCastingExpression = TypeCastingExpression;
class TypeCastingSubparser {
    parse(parser, _token) {
        const type = parser.getType();
        parser.tokenSource.consume(tokens_1.TokenType.RightAngleBracket, 'expected a \'>\' after a type cast');
        const expression = parser.getExpression(Precedence.PREFIX);
        return new TypeCastingExpression(type, expression);
    }
}
__decorate([
    utilities_1.logCalls
], TypeCastingSubparser.prototype, "parse", null);
class LetOrConstDeclarationSubparser {
    parse(parser, token) {
        const type = (token && token.type == tokens_1.TokenType.Const) ? 'const' : 'let';
        const pattern = parser.getPattern(0);
        let variableType = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Colon)) {
            parser.tokenSource.next();
            variableType = parser.getType();
        }
        let value = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Equals)) {
            parser.tokenSource.next();
            value = parser.getExpression(0);
        }
        else if (variableType == null) {
            const token = parser.tokenSource.next();
            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00040] A type-inferred let / const declaration must have a value. Either specify a type or add a value.', token.line, token.char, token.getSource());
        }
        return new LetOrConstDeclarationExpression(type, pattern, value, variableType);
    }
}
__decorate([
    utilities_1.logCalls
], LetOrConstDeclarationSubparser.prototype, "parse", null);
class LetOrConstDeclarationExpression extends Expression {
    constructor(type, pattern, value, variableType) {
        super();
        this.type = type;
        this.pattern = pattern;
        this.value = value;
        this.variableType = variableType;
    }
    toString() {
        return `${this.type} {${this.pattern.toString()}, ${this.variableType ? typeToString(this.variableType) : '<inferred type>'}${this.value ? ', ' + this.value.toString() : ''}}`;
    }
}
exports.LetOrConstDeclarationExpression = LetOrConstDeclarationExpression;
function typeToString(type) {
    if (type.plain)
        return type.value.getSource();
    else
        return `${type.value.getSource()}[${type.typeParameters.map(x => typeToString(x)).join(', ')}]`;
}
class PostfixOperatorExpression extends Expression {
    constructor(operator, operand) {
        super();
        this.operator = operator;
        this.operand = operand;
    }
    toString() {
        return `${tokens_1.TokenType[this.operator]}.postfix {${this.operand.toString()}}`;
    }
}
exports.PostfixOperatorExpression = PostfixOperatorExpression;
class PostfixOperatorSubparser {
    constructor() {
        this.precedence = Precedence.POSTFIX;
    }
    parse(parser, left, token) {
        return new PostfixOperatorExpression(token.type, left);
    }
}
__decorate([
    utilities_1.logCalls
], PostfixOperatorSubparser.prototype, "parse", null);
class ForExpression extends Expression {
    constructor(condition, body, kind) {
        super();
        this.condition = condition;
        this.body = body;
        this.kind = kind;
        this.label = null;
    }
    toString() {
        if (this.kind == 'a,b,c')
            return `ForExpression${this.label ? '#' + this.label : ''}.<for a, b, c> {${this.condition.init.toString()}, ${this.condition.condition.toString()}, ${this.condition.repeat.toString()}, ${this.body.toString()}}`;
        else
            return `ForExpression${this.label ? '#' + this.label : ''}.<for a in b> {${this.condition.name.toString()}, ${this.condition.iterator.toString()}, ${this.body.toString()}}`;
    }
}
exports.ForExpression = ForExpression;
class ForSubparser {
    parse(parser, _token) {
        let init = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        let condition = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        let repeat = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        if (!parser.tokenSource.match(tokens_1.TokenType.Comma)) {
            init = parser.getExpression(0);
        }
        if (parser.tokenSource.match(tokens_1.TokenType.In)) {
            const name = expressionAsPattern(init);
            parser.tokenSource.consume(tokens_1.TokenType.In, 'Expected an \'in\', this is an error that shouldn\'t ever happen. Report this to https://github.com/Astroide/escurieux/issues .');
            const iterator = parser.getExpression(0);
            const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected a block start after a for loop\'s iterator expression');
            const body = (new BlockSubparser()).parse(parser, token);
            return new ForExpression({
                name: name,
                iterator: iterator
            }, body, 'a in b');
        }
        else {
            parser.tokenSource.consume(tokens_1.TokenType.Comma, 'expected a comma after a for loop\'s initialization expression');
            if (!parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                condition = parser.getExpression(0);
            }
            parser.tokenSource.consume(tokens_1.TokenType.Comma, 'expected a comma after a for loop\'s condition');
            if (!parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
                repeat = parser.getExpression(0);
            }
            const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected a block start after a for loop\'s repeating expression');
            const loopBody = (new BlockSubparser()).parse(parser, token);
            return new ForExpression({
                condition: condition,
                init: init,
                repeat: repeat
            }, loopBody, 'a,b,c');
        }
    }
}
__decorate([
    utilities_1.logCalls
], ForSubparser.prototype, "parse", null);
class LambdaFunctionExpression extends Expression {
    constructor(args, typesOfArguments, body) {
        super();
        this.args = args;
        this.typesOfArguments = typesOfArguments;
        this.body = body;
    }
    toString() {
        return `LambdaFunction {[${(0, utilities_1.zip)(this.args, this.typesOfArguments).map(([name, type]) => name[0].toString() + (name[1] ? '=' + name[1].toString() : '') + ': ' + (type ? typeToString(type) : '<inferred type>')).join(', ')}], ${this.body.toString()}]`;
    }
}
exports.LambdaFunctionExpression = LambdaFunctionExpression;
class FunctionExpression extends Expression {
    constructor(typeParameters, args, typesOfArguments, body, namePattern, typeConstraints, returnType) {
        super();
        this.typeParameters = typeParameters;
        this.args = args;
        this.typesOfArguments = typesOfArguments;
        this.body = body;
        this.namePattern = namePattern;
        this.typeConstraints = typeConstraints;
        this.returnType = returnType;
    }
    toString() {
        return `Function<${(0, utilities_1.zip)(this.typeParameters, this.typeConstraints).map(x => `${typeToString(x[0])} ${typeConstraintToString(x[1])}`).join(', ')}> -> ${this.returnType ? typeToString(this.returnType) : 'void'} {${this.namePattern.toString()}, [${(0, utilities_1.zip)(this.args, this.typesOfArguments).map(([name, type]) => name[0].toString() + (name[1] ? '=' + name[1].toString() : '') + ': ' + typeToString(type)).join(', ')}], ${this.body ? this.body.toString() : '<no body>'}]`;
    }
}
exports.FunctionExpression = FunctionExpression;
class FunctionSubparser {
    parse(parser, _token, allowEmpty = false, name) {
        let functionName;
        if (!name) {
            functionName = (new IdentifierSubparser()).parse(parser, parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'a function name is required'));
        }
        else {
            functionName = new IdentifierExpression(new tokens_1.Identifier(name.line, name.char, name.getSource(), name.start, name.length, name.getSource()));
        }
        let typeParameters = [];
        let typeConstraints = [];
        if (parser.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(tokens_1.TokenType.LeftParenthesis, '[ESCE00015] A left parenthesis is required to start a function\'s argument list');
        const args = [];
        const typesOfArguments = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const pattern = parser.getPattern(0);
            let defaultValue = null;
            if (!parser.tokenSource.match(tokens_1.TokenType.Colon)) {
                const wrongToken = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00016] Function arguments must be typed', wrongToken.line, wrongToken.char, wrongToken.getSource());
            }
            else {
                parser.tokenSource.next();
                typesOfArguments.push(parser.getType());
            }
            if (parser.tokenSource.match(tokens_1.TokenType.Equals)) {
                parser.tokenSource.next();
                defaultValue = parser.getExpression(0);
            }
            args.push(defaultValue ? [pattern, defaultValue] : [pattern]);
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the ')'
        let returnType = null;
        if (!parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
            returnType = parser.getType();
        }
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected a block start');
        let body;
        if (allowEmpty && parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
            body = null;
            parser.tokenSource.next();
        }
        else {
            body = (new BlockSubparser()).parse(parser, token);
        }
        return new FunctionExpression(typeParameters, args, typesOfArguments, body, functionName, typeConstraints, returnType);
    }
}
__decorate([
    utilities_1.logCalls
], FunctionSubparser.prototype, "parse", null);
class LambdaFunctionSubparser {
    parse(parser, token) {
        const args = [];
        const typesOfArguments = [];
        if (token.type == tokens_1.TokenType.Pipe) {
            // Function potentially has arguments
            while (!parser.tokenSource.match(tokens_1.TokenType.Pipe)) {
                if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                    const token = parser.tokenSource.next();
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                }
                const pattern = parser.getPattern(0);
                let defaultValue = null;
                if (parser.tokenSource.match(tokens_1.TokenType.Colon)) {
                    parser.tokenSource.next();
                    typesOfArguments.push(parser.getType());
                }
                else {
                    typesOfArguments.push(null);
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Equals)) {
                    parser.tokenSource.next();
                    defaultValue = parser.getExpression(0);
                }
                args.push(defaultValue ? [pattern, defaultValue] : [pattern]);
                if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                    parser.tokenSource.next();
                }
                else if (!parser.tokenSource.match(tokens_1.TokenType.Pipe)) {
                    const token = parser.tokenSource.next();
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
                }
            }
            parser.tokenSource.next(); // Consume the '|'
        }
        const body = parser.getExpression(0);
        return new LambdaFunctionExpression(args, typesOfArguments, body);
    }
}
__decorate([
    utilities_1.logCalls
], LambdaFunctionSubparser.prototype, "parse", null);
class ClassExpression extends Expression {
    constructor(name, typeParameters, typeConstraints, methods, properties, isStruct, operatorOverloads) {
        super();
        this.name = name;
        this.typeParameters = typeParameters;
        this.typeConstraints = typeConstraints;
        this.methods = methods;
        this.properties = properties;
        this.isStruct = isStruct;
        this.operatorOverloads = operatorOverloads;
    }
    toString() {
        return `${this.isStruct ? 'Struct' : ''}ClassExpression<${(0, utilities_1.zip)(this.typeParameters, this.typeConstraints).map(([type, constraint]) => typeToString(type) + ' ' + typeConstraintToString(constraint)).join(', ')}> {${this.name.toString()}, [${this.properties.map(([name, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + name.toString()).join(', ')}], [${this.methods.map(([func, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + func.toString()).join(', ')}]}`;
    }
}
exports.ClassExpression = ClassExpression;
class NamedPattern extends Pattern {
    constructor(pattern, name) {
        super();
        this.pattern = pattern;
        this.name = name;
    }
    toString() {
        return `NamedPattern(${this.name.identifier}) {${this.pattern.toString()}}`;
    }
}
class NamedPatternSubparser {
    parse(parser, _token) {
        const token = parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected a pattern name');
        const pattern = parser.getPattern(0);
        return new NamedPattern(pattern, token);
    }
}
__decorate([
    utilities_1.logCalls
], NamedPatternSubparser.prototype, "parse", null);
class NamePattern extends Pattern {
    constructor(name) {
        super();
        this.name = name;
    }
    toString() {
        return `NamePattern[${this.name.identifier}]`;
    }
}
class ObjectDestructuringPattern extends Pattern {
    constructor(typeName, typeParameters, properties) {
        super();
        this.typeName = typeName;
        this.typeParameters = typeParameters;
        this.properties = properties;
    }
}
class NamePatternSubparser {
    parse(parser, token) {
        // if (parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
        // const typeParameters = parser.getTypeParameters();
        // const token = parser.tokenSource.peek();
        // parser.tokenSource.consume(TokenType.LeftCurlyBracket, `[ESCE00049] Expected '{', got '${token.getSource()} (parsing an object destructuring pattern)`);
        // }
        return new NamePattern(token);
    }
}
__decorate([
    utilities_1.logCalls
], NamePatternSubparser.prototype, "parse", null);
class ObjectPattern extends Pattern {
    constructor(properties) {
        super();
        this.properties = properties;
    }
    toString() {
        return `ObjectPattern {${this.properties.map(x => x[0].toString() + (x[1] ? ': ' + x[1].toString() : '')).join(', ')}}`;
    }
}
class ObjectPatternSubparser {
    parse(parser, _token) {
        const properties = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00033] Leading / double commas are not allowed within object literals.', token.line, token.char, token.getSource());
            }
            const propertyName = parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected a property name');
            if (parser.tokenSource.match(tokens_1.TokenType.Colon)) {
                parser.tokenSource.next();
                const propertyPattern = parser.getPattern(0);
                properties.push([propertyName, propertyPattern]);
            }
            else {
                properties.push([propertyName, null]);
            }
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00034] An object pattern\'s property patterns should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the '}'
        return new ObjectPattern(properties);
    }
}
__decorate([
    utilities_1.logCalls
], ObjectPatternSubparser.prototype, "parse", null);
class ListPattern extends Pattern {
    constructor(patterns) {
        super();
        this.patterns = patterns;
    }
    toString() {
        return `ListPattern {${this.patterns.map(x => x.toString()).join(', ')}}`;
    }
}
class ListPatternSubparser {
    parse(parser, _token) {
        const patterns = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const errorToken = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00031] Leading / double commas are not allowed within list patterns.', errorToken.line, errorToken.char, errorToken.getSource());
            }
            patterns.push(parser.getPattern(0));
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (parser.tokenSource.peek().type != tokens_1.TokenType.RightBracket) {
                const errorToken = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00032] A list pattern\'s elements should be separated by commas', errorToken.line, errorToken.char, errorToken.getSource());
            }
        }
        return new ListPattern(patterns);
    }
}
__decorate([
    utilities_1.logCalls
], ListPatternSubparser.prototype, "parse", null);
class ClassSubparser {
    parse(parser, token) {
        const isStruct = token.type === tokens_1.TokenType.Struct;
        const operatorOverloads = {};
        const state = parser.tokenSource.state();
        const name = parser.getPattern(0);
        if (!(name instanceof NamePattern)) {
            parser.tokenSource.restore(state);
            const token = parser.tokenSource.next();
            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00035] Class names must be identifiers', token.line, token.char, token.getSource());
        }
        let typeParameters = [], typeConstraints = [];
        if (parser.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, `expected a '{' after ${typeParameters.length == 0 ? 'the class name' : 'the type parameters'}`);
        const methods = [];
        const properties = [];
        const blocks = [];
        loop: while (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket) || blocks.length > 0) {
            toEnd: do {
                if (parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket) && blocks.length != 0) {
                    blocks.pop();
                    parser.tokenSource.next();
                    continue toEnd;
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                    const errorToken = parser.tokenSource.next();
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00018] Leading or double commas are not allowed in classes', errorToken.line, errorToken.char, errorToken.getSource());
                }
                const token = parser.tokenSource.peek();
                if (![tokens_1.TokenType.Public, tokens_1.TokenType.Fn, tokens_1.TokenType.Identifier, tokens_1.TokenType.Private, tokens_1.TokenType.Protected, tokens_1.TokenType.Const, tokens_1.TokenType.Static, tokens_1.TokenType.Operator].includes(token.type)) {
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, `[ESCE00019] One of ('private', 'protected', 'public', 'const', 'static', <identifier>) was expected, found TokenType.${tokens_1.TokenType[token.type]} instead`, token.line, token.char, token.getSource());
                }
                let modifier = 'instance';
                let accessModifier = 'private';
                if (parser.tokenSource.match(tokens_1.TokenType.Private)) {
                    const token = parser.tokenSource.next();
                    if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    }
                    (0, utilities_1.warnAt)(parser.tokenSource.reader, '[ESCW00002] The \'private\' access specifier is not required, properties and methods are private by default', token.line, token.char, token.getSource());
                }
                else if (parser.tokenSource.match(tokens_1.TokenType.Protected)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('protected')) {
                            blocks.push('protected');
                            parser.tokenSource.next();
                            continue loop;
                        }
                        else {
                            const token = parser.tokenSource.next();
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    }
                    else if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    }
                    else {
                        accessModifier = 'protected';
                    }
                }
                else if (parser.tokenSource.match(tokens_1.TokenType.Public)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('public')) {
                            blocks.push('public');
                            parser.tokenSource.next();
                            continue loop;
                        }
                        else {
                            const token = parser.tokenSource.next();
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    }
                    else if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    }
                    else {
                        accessModifier = 'public';
                    }
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Static)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('static')) {
                            blocks.push('static');
                            parser.tokenSource.next();
                            continue loop;
                        }
                        else {
                            const token = parser.tokenSource.next();
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    }
                    else if (blocks.includes('static')) {
                        const token = parser.tokenSource.next();
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00042] \'static\' is not allowed within static blocks', token.line, token.char, token.getSource());
                    }
                    else {
                        modifier = 'static';
                    }
                }
                if (blocks.includes('static')) {
                    modifier = 'static';
                }
                if (blocks.includes('protected') || blocks.includes('public')) {
                    accessModifier = blocks.includes('protected') ? 'protected' : 'public';
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Fn)) {
                    const method = (new FunctionSubparser()).parse(parser, parser.tokenSource.next());
                    methods.push([method, modifier, accessModifier]);
                }
                else if (parser.tokenSource.match(tokens_1.TokenType.Const)) {
                    const token = parser.tokenSource.peek();
                    const property = (new LetOrConstDeclarationSubparser()).parse(parser, parser.tokenSource.next());
                    for (const [declaration, _, __] of properties) {
                        if (declaration.pattern instanceof NamePattern && property.pattern instanceof NamePattern && declaration.pattern.name.identifier === property.pattern.name.identifier) {
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00043] A property with the same name has already been defined', token.line, token.char, token.getSource());
                        }
                    }
                    properties.push([property, modifier, accessModifier]);
                }
                else if (parser.tokenSource.match(tokens_1.TokenType.Operator)) {
                    parser.tokenSource.next();
                    const operatorToken = parser.tokenSource.next();
                    if (!(0, tokens_1.isOperator)(operatorToken.type)) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, `[ESCE00044] An operator was expected, got '${operatorToken.getSource()}' instead (valid operators are ! * ** / + - | || & && ^ >> << < > >= <= == ~)`, operatorToken.line, operatorToken.char, operatorToken.getSource());
                    }
                    const fnToken = parser.tokenSource.peek();
                    const func = (new FunctionSubparser()).parse(parser, null, false, operatorToken);
                    if (func.args.length > 1) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00045] Operator overloading functions can only have no arguments or one argument', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    if (!(0, tokens_1.isUnaryOperator)(operatorToken.type) && func.args.length == 0) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00046] Non-unary operator overloads must have exactly one argument', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    if ((0, tokens_1.isUnaryOperatorOnly)(operatorToken.type) && func.args.length != 0) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00047] Unary only operator overloads (unary only operators are ~ ++ -- !) must have no arguments', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    operatorOverloads[operatorToken.getSource()] = func;
                }
                else {
                    const token = parser.tokenSource.peek();
                    const property = (new LetOrConstDeclarationSubparser()).parse(parser, null);
                    for (const [declaration, _, __] of properties) {
                        if (declaration.pattern instanceof NamePattern && property.pattern instanceof NamePattern && declaration.pattern.name.identifier === property.pattern.name.identifier) {
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00043] A property with the same name has already been defined', token.line, token.char, token.getSource());
                        }
                    }
                    properties.push([property, modifier, accessModifier]);
                }
                // eslint-disable-next-line no-constant-condition
            } while (false);
            if (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                parser.tokenSource.consume(tokens_1.TokenType.Comma, 'a comma is required after properties / methods');
            }
        }
        parser.tokenSource.consume(tokens_1.TokenType.RightCurlyBracket, '!!!');
        return new ClassExpression(name, typeParameters, typeConstraints, methods, properties, isStruct, operatorOverloads);
    }
}
__decorate([
    utilities_1.logCalls
], ClassSubparser.prototype, "parse", null);
class EnumExpression extends Expression {
    constructor(name, variants, typeParameters) {
        super();
        this.name = name;
        this.variants = variants;
        this.typeParameters = typeParameters;
    }
    toString() {
        return `EnumExpression {${this.name.toString()}, [${this.variants.map(([name, types]) => `${name.toString()} (${types.map(typeToString).join(', ')})`).join(', ')}]}`;
    }
}
exports.EnumExpression = EnumExpression;
class EnumSubparser {
    parse(parser, token) {
        const name = (new NamePatternSubparser()).parse(parser, parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'a name is required for an enum'));
        let typeParameters = null;
        if (parser.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            typeParameters = parser.getTypeParameters();
        }
        const variants = [];
        parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected \'{\' after \'enum <Identifier>\'');
        while (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00048] Double / leading commas are not allowed in enums', token.line, token.char, token.getSource());
            }
            const variantName = (new NamePatternSubparser()).parse(parser, parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'a name is required for an enum variant'));
            const types = [];
            if (parser.tokenSource.match(tokens_1.TokenType.LeftParenthesis)) {
                parser.tokenSource.next();
                while (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                    if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00048] Double / leading commas are not allowed in enums', token.line, token.char, token.getSource());
                    }
                    const type = parser.getType();
                    types.push(type);
                    if (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                        parser.tokenSource.consume(tokens_1.TokenType.Comma, 'a comma is required after enum variant types');
                    }
                }
                parser.tokenSource.next();
            }
            variants.push([variantName, types]);
            if (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                parser.tokenSource.consume(tokens_1.TokenType.Comma, 'a comma is required after enum variants');
            }
        }
        parser.tokenSource.next();
        return new EnumExpression(name, variants, typeParameters);
    }
}
class TraitExpression extends Expression {
    constructor(name, typeParameters, typeConstraints, methods, properties, structural, operatorOverloads) {
        super();
        this.name = name;
        this.typeParameters = typeParameters;
        this.typeConstraints = typeConstraints;
        this.methods = methods;
        this.properties = properties;
        this.structural = structural;
        this.operatorOverloads = operatorOverloads;
    }
    toString() {
        return `TraitExpression${this.structural ? '.Structural' : ''}<${(0, utilities_1.zip)(this.typeParameters, this.typeConstraints).map(([type, constraint]) => typeToString(type) + ' ' + typeConstraintToString(constraint)).join(', ')}> {${this.name.toString()}, [${this.properties.map(([name, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + name.toString()).join(', ')}], [${this.methods.map(([func, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + func.toString()).join(', ')}]}`;
    }
}
exports.TraitExpression = TraitExpression;
class TraitSubparser {
    parse(parser, token) {
        let structural = false;
        if (token.type === tokens_1.TokenType.Structural) {
            parser.tokenSource.consume(tokens_1.TokenType.Trait, 'expected \'structural\' after \'trait\'');
            structural = true;
        }
        const state = parser.tokenSource.state();
        console.log('type: ' + tokens_1.TokenType[parser.tokenSource.peek().type] + ', ' + parser.tokenSource.peek().getSource());
        const name = parser.getPattern(0);
        console.log('type: ' + tokens_1.TokenType[parser.tokenSource.peek().type] + ', ' + parser.tokenSource.peek().getSource());
        if (!(name instanceof NamePattern)) {
            parser.tokenSource.restore(state);
            const token = parser.tokenSource.next();
            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00036] Trait names must be identifiers', token.line, token.char, token.getSource());
        }
        let typeParameters = [], typeConstraints = [];
        console.log('Before Type Parameters');
        console.log('type: ' + tokens_1.TokenType[parser.tokenSource.peek().type] + ', ' + parser.tokenSource.peek().getSource());
        if (parser.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            console.log('Type Parameters');
            parser.tokenSource.next();
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, `expected a '{' after ${typeParameters.length == 0 ? 'the class name' : 'the type parameters'}`);
        const methods = [];
        const properties = [];
        const blocks = [];
        const operatorOverloads = {};
        loop: while (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket) || blocks.length > 0) {
            toEnd: do {
                if (parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket) && blocks.length != 0) {
                    blocks.pop();
                    parser.tokenSource.next();
                    continue toEnd;
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                    const errorToken = parser.tokenSource.next();
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00037] Leading or double commas are not allowed in traits', errorToken.line, errorToken.char, errorToken.getSource());
                }
                const token = parser.tokenSource.peek();
                if (![tokens_1.TokenType.Public, tokens_1.TokenType.Fn, tokens_1.TokenType.Identifier, tokens_1.TokenType.Private, tokens_1.TokenType.Protected, tokens_1.TokenType.Const, tokens_1.TokenType.Static, tokens_1.TokenType.Operator].includes(token.type)) {
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, `[ESCE00038] One of ('private', 'protected', 'public', 'const', 'static', <identifier>) was expected, found TokenType.${tokens_1.TokenType[token.type]} instead`, token.line, token.char, token.getSource());
                }
                let modifier = 'instance';
                let accessModifier = 'public';
                if (parser.tokenSource.match(tokens_1.TokenType.Private)) {
                    const token = parser.tokenSource.next();
                    if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    }
                    (0, utilities_1.warnAt)(parser.tokenSource.reader, '[ESCW00003] Although nothing actually forbids this, putting private members in traits is nonsense.', token.line, token.char, token.getSource());
                }
                else if (parser.tokenSource.match(tokens_1.TokenType.Protected)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('protected')) {
                            blocks.push('protected');
                            parser.tokenSource.next();
                            continue loop;
                        }
                        else {
                            const token = parser.tokenSource.next();
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    }
                    else if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    }
                    else {
                        accessModifier = 'protected';
                    }
                }
                else if (parser.tokenSource.match(tokens_1.TokenType.Public)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('public')) {
                            blocks.push('public');
                            parser.tokenSource.next();
                            continue loop;
                        }
                        else {
                            const token = parser.tokenSource.next();
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    }
                    else if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    }
                    else {
                        accessModifier = 'public';
                    }
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Static)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('static')) {
                            blocks.push('static');
                            parser.tokenSource.next();
                            continue loop;
                        }
                        else {
                            const token = parser.tokenSource.next();
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    }
                    else if (blocks.includes('static')) {
                        const token = parser.tokenSource.next();
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00042] \'static\' is not allowed within static blocks', token.line, token.char, token.getSource());
                    }
                    else {
                        modifier = 'static';
                    }
                }
                if (blocks.includes('static')) {
                    modifier = 'static';
                }
                if (blocks.includes('protected') || blocks.includes('public')) {
                    accessModifier = blocks.includes('protected') ? 'protected' : 'public';
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Fn)) {
                    const method = (new FunctionSubparser()).parse(parser, parser.tokenSource.next(), true);
                    methods.push([method, modifier, accessModifier]);
                }
                else if (parser.tokenSource.match(tokens_1.TokenType.Const)) {
                    const token = parser.tokenSource.peek();
                    const property = (new LetOrConstDeclarationSubparser()).parse(parser, parser.tokenSource.next());
                    for (const [declaration, _, __] of properties) {
                        if (declaration.pattern instanceof NamePattern && property.pattern instanceof NamePattern && declaration.pattern.name.identifier === property.pattern.name.identifier) {
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00043] A property with the same name has already been defined', token.line, token.char, token.getSource());
                        }
                    }
                    if (!property.variableType) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00039] Trait properties must be explicitly typed', token.line, token.char, token.getSource());
                    }
                    properties.push([property, modifier, accessModifier]);
                }
                else if (parser.tokenSource.match(tokens_1.TokenType.Operator)) {
                    parser.tokenSource.next();
                    const operatorToken = parser.tokenSource.next();
                    if (!(0, tokens_1.isOperator)(operatorToken.type)) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, `[ESCE00044] An operator was expected, got '${operatorToken.getSource()}' instead (valid operators are ! * ** / + - | || & && ^ >> << < > >= <= == ~)`, operatorToken.line, operatorToken.char, operatorToken.getSource());
                    }
                    const fnToken = parser.tokenSource.peek();
                    const func = (new FunctionSubparser()).parse(parser, null, true, operatorToken);
                    if (func.args.length > 1) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00045] Operator overloading functions can only have no arguments or one argument', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    if (!(0, tokens_1.isUnaryOperator)(operatorToken.type) && func.args.length == 0) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00046] Non-unary operator overloads must have exactly one argument', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    if ((0, tokens_1.isUnaryOperatorOnly)(operatorToken.type) && func.args.length != 0) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00047] Unary only operator overloads (unary only operators are ~ ++ -- !) must have no arguments', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    operatorOverloads[operatorToken.getSource()] = func;
                }
                else {
                    const token = parser.tokenSource.peek();
                    const property = (new LetOrConstDeclarationSubparser()).parse(parser, null);
                    for (const [declaration, _, __] of properties) {
                        if (declaration.pattern instanceof NamePattern && property.pattern instanceof NamePattern && declaration.pattern.name.identifier === property.pattern.name.identifier) {
                            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00043] A property with the same name has already been defined', token.line, token.char, token.getSource());
                        }
                    }
                    if (!property.variableType) {
                        (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00039] Trait properties must be explicitly typed', token.line, token.char, token.getSource());
                    }
                    properties.push([property, modifier, accessModifier]);
                }
                // eslint-disable-next-line no-constant-condition
            } while (false);
            if (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                parser.tokenSource.consume(tokens_1.TokenType.Comma, 'a comma is required after properties / methods');
            }
        }
        parser.tokenSource.consume(tokens_1.TokenType.RightCurlyBracket, '!!!');
        return new TraitExpression(name, typeParameters, typeConstraints, methods, properties, structural, operatorOverloads);
    }
}
__decorate([
    utilities_1.logCalls
], TraitSubparser.prototype, "parse", null);
exports.TraitSubparser = TraitSubparser;
class AssignmentExpression extends Expression {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
    toString() {
        return `AssignmentExpression {${this.left.toString()}, ${this.right.toString()}}`;
    }
}
exports.AssignmentExpression = AssignmentExpression;
class AssignmentSubparser {
    constructor() {
        this.precedence = 0.9;
    }
    parse(parser, left, token) {
        const right = parser.getExpression(0);
        if (!(left instanceof IdentifierExpression) && !(left instanceof PropertyAccessExpression) && !(left instanceof ElementAccessExpression)) {
            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00019] Left expression of an assignment must be either an identifier, a property access or an indexing expression', token.line, token.char, token.getSource());
        }
        return new AssignmentExpression(left, right);
    }
}
__decorate([
    utilities_1.logCalls
], AssignmentSubparser.prototype, "parse", null);
class AtExpression extends Expression {
    constructor(name, expression) {
        super();
        this.name = name;
        this.expression = expression;
    }
    toString() {
        return `AtExpression {IdentifierExpression[${this.name}], ${this.expression.toString()}}`;
    }
}
class AtSubparser {
    parse(parser, _token) {
        const name = parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected an identifier');
        const expression = parser.getExpression(0);
        return new AtExpression(name, expression);
    }
}
__decorate([
    utilities_1.logCalls
], AtSubparser.prototype, "parse", null);
class ReturnExpression extends Expression {
    constructor(returnValue) {
        super();
        this.returnValue = returnValue;
    }
    toString() {
        return `ReturnExpression {${this.returnValue ? this.returnValue.toString() : ''}}`;
    }
}
exports.ReturnExpression = ReturnExpression;
class ReturnSubparser {
    parse(parser, _token) {
        if (parser.canReadExpression()) {
            return new ReturnExpression(parser.getExpression(0));
        }
        else {
            return new ReturnExpression();
        }
    }
}
__decorate([
    utilities_1.logCalls
], ReturnSubparser.prototype, "parse", null);
class BreakExpression extends Expression {
    constructor(breakValue, label) {
        super();
        this.breakValue = breakValue;
        this.label = label;
    }
    toString() {
        return `BreakExpression${this.label ? '#' + this.label : ''} {${this.breakValue ? this.breakValue.toString() : ''}}`;
    }
}
exports.BreakExpression = BreakExpression;
class BreakSubparser {
    parse(parser, _token) {
        let label = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Label)) {
            label = parser.tokenSource.next().labelText;
        }
        if (parser.canReadExpression()) {
            return new BreakExpression(parser.getExpression(0), label);
        }
        else {
            return new BreakExpression(null, label);
        }
    }
}
__decorate([
    utilities_1.logCalls
], BreakSubparser.prototype, "parse", null);
class ContinueExpression extends Expression {
    constructor(label) {
        super();
        this.label = label;
    }
    toString() {
        return `ContinueExpression${this.label ? '#' + this.label : ''}`;
    }
}
exports.ContinueExpression = ContinueExpression;
class ContinueSubparser {
    parse(parser, _token) {
        return new ContinueExpression(parser.tokenSource.match(tokens_1.TokenType.Label) ? parser.tokenSource.next().labelText : null);
    }
}
__decorate([
    utilities_1.logCalls
], ContinueSubparser.prototype, "parse", null);
function typeConstraintToString(t) {
    if (t == 'unconstrained')
        return t;
    else {
        return `${t.kind == 'extends' ? '<=' : ':'} ${typeToString(t.type)}${t.and ? ` & ${typeConstraintToString(t.and)}` : ''}`;
    }
}
class LabelSubparser {
    parse(parser, token) {
        parser.tokenSource.consume(tokens_1.TokenType.Colon, 'expected a colon after a label');
        const expression = parser.getExpression(Infinity);
        if (!(expression instanceof ForExpression || expression instanceof LoopExpression)) {
            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00022] Cannot label anything that is not a for loop, a \'loop\' loop, or a block.', token.line, token.char, token.getSource());
        }
        const typedExpression = expression;
        typedExpression.label = token.labelText;
        return typedExpression;
    }
}
__decorate([
    utilities_1.logCalls
], LabelSubparser.prototype, "parse", null);
class MapExpression extends Expression {
    constructor(keys, values) {
        super();
        this.keys = keys;
        this.values = values;
    }
    toString() {
        return `MapExpression {${(0, utilities_1.zip)(this.keys, this.values).map(x => x[0].toString() + ': ' + x[1].toString()).join(', ')}}`;
    }
}
class MapSubparser {
    parse(parser, _token) {
        const keys = [];
        const values = [];
        parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected a \'{\' after \'map!\'');
        while (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00025] Leading / double commas are not allowed within map literals.', token.line, token.char, token.getSource());
            }
            keys.push(parser.getExpression(0));
            parser.tokenSource.consume(tokens_1.TokenType.Colon, 'expected a colon after a key');
            values.push(parser.getExpression(0));
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00026] A map literal\'s key/value pairs should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the '}'
        return new MapExpression(keys, values);
    }
}
__decorate([
    utilities_1.logCalls
], MapSubparser.prototype, "parse", null);
function expressionAsPattern(expression) {
    if (expression instanceof IdentifierExpression) {
        return new NamePattern(expression.token);
    }
    else if (expression instanceof AtExpression) {
        return new NamedPattern(expressionAsPattern(expression.expression), expression.name);
    }
    else if (expression instanceof ListExpression) {
        return new ListPattern(expression.elements.map(x => expressionAsPattern(x)));
    }
}
class ImportSection {
    constructor(type, next, content, alias) {
        this.type = type;
        this.next = next;
        this.content = content;
        this.alias = alias;
    }
    toString() {
        if (this.type == 'list') {
            return `{${this.next.map(x => x.toString()).join(', ')}}`;
        }
        else if (this.type == 'element') {
            return `${this.content.identifier}.${this.next.toString()}`;
        }
        else {
            return `${this.content.identifier}${this.alias ? ' as ' + this.alias.identifier : ''}`;
        }
    }
}
exports.ImportSection = ImportSection;
// Main parser class
class Parser {
    constructor(source, reader) {
        this.prefixSubparsers = new Map();
        this.infixSubparsers = new Map();
        this.prefixPatternSubparsers = new Map();
        this.infixPatternSubparsers = new Map();
        this.conditionsOfPrefixSubparsers = new Map();
        this.tokenSource = new BetterTokenStream(source, reader);
        this.registerPrefix(tokens_1.TokenType.Identifier, new IdentifierSubparser());
        const self = this;
        [tokens_1.TokenType.Plus, tokens_1.TokenType.Minus, tokens_1.TokenType.Tilde, tokens_1.TokenType.Bang].forEach(type => {
            self.registerPrefix(type, new PrefixOperatorSubparser());
        });
        [tokens_1.TokenType.BooleanLiteral, tokens_1.TokenType.CharacterLiteral, tokens_1.TokenType.StringLiteral, tokens_1.TokenType.NumericLiteral, tokens_1.TokenType.TemplateStringLiteral].forEach(type => {
            self.registerPrefix(type, new LiteralSubparser());
        });
        this.registerPrefix(tokens_1.TokenType.LeftCurlyBracket, new BlockSubparser());
        this.registerPrefix(tokens_1.TokenType.LeftParenthesis, new GroupSubparser());
        this.registerPrefix(tokens_1.TokenType.If, new IfSubparser());
        this.registerPrefix(tokens_1.TokenType.LeftAngleBracket, new TypeCastingSubparser());
        this.registerPrefix(tokens_1.TokenType.Let, new LetOrConstDeclarationSubparser());
        this.registerPrefix(tokens_1.TokenType.Const, new LetOrConstDeclarationSubparser());
        this.registerPrefix(tokens_1.TokenType.While, new WhileSubparser());
        this.registerPrefix(tokens_1.TokenType.For, new ForSubparser());
        this.registerPrefix(tokens_1.TokenType.Pipe, new LambdaFunctionSubparser());
        this.registerPrefix(tokens_1.TokenType.DoublePipe, new LambdaFunctionSubparser());
        this.registerPrefix(tokens_1.TokenType.Fn, new FunctionSubparser());
        this.registerPrefix(tokens_1.TokenType.Loop, new LoopSubparser());
        this.registerPrefix(tokens_1.TokenType.Struct, new ClassSubparser());
        this.registerPrefix(tokens_1.TokenType.Class, new ClassSubparser());
        this.registerPrefix(tokens_1.TokenType.Return, new ReturnSubparser());
        this.registerPrefix(tokens_1.TokenType.Break, new BreakSubparser());
        this.registerPrefix(tokens_1.TokenType.Continue, new ContinueSubparser());
        this.registerPrefix(tokens_1.TokenType.Label, new LabelSubparser());
        this.registerPrefix(tokens_1.TokenType.LeftBracket, new ListSubparser());
        this.registerPrefix(tokens_1.TokenType.Macro, new MapSubparser());
        this.registerPrefix(tokens_1.TokenType.AtSign, new AtSubparser());
        this.registerPrefix(tokens_1.TokenType.Trait, new TraitSubparser());
        this.registerPrefix(tokens_1.TokenType.Structural, new TraitSubparser());
        this.registerPrefix(tokens_1.TokenType.Enum, new EnumSubparser());
        this.conditionsOfPrefixSubparsers.set(tokens_1.TokenType.Macro, (token => token.identifier == 'map!'));
        [
            [tokens_1.TokenType.Ampersand, Precedence.CONDITIONAL],
            [tokens_1.TokenType.DoubleAmpersand, Precedence.SUM],
            [tokens_1.TokenType.Pipe, Precedence.CONDITIONAL],
            [tokens_1.TokenType.DoublePipe, Precedence.SUM],
            [tokens_1.TokenType.Star, Precedence.PRODUCT],
            [tokens_1.TokenType.DoubleStar, Precedence.EXPONENT],
            [tokens_1.TokenType.Minus, Precedence.SUM],
            [tokens_1.TokenType.Plus, Precedence.SUM],
            [tokens_1.TokenType.Slash, Precedence.PRODUCT],
            [tokens_1.TokenType.Xor, Precedence.SUM],
            [tokens_1.TokenType.DoubleEquals, Precedence.CONDITIONAL],
            [tokens_1.TokenType.GreaterOrEqual, Precedence.CONDITIONAL],
            [tokens_1.TokenType.SmallerOrEqual, Precedence.CONDITIONAL],
            [tokens_1.TokenType.NotEquals, Precedence.CONDITIONAL],
            [tokens_1.TokenType.LeftShift, Precedence.SUM],
            [tokens_1.TokenType.RightShift, Precedence.SUM],
            [tokens_1.TokenType.LeftAngleBracket, Precedence.CONDITIONAL],
            [tokens_1.TokenType.RightAngleBracket, Precedence.CONDITIONAL]
        ].forEach(([type, precedence]) => {
            self.registerInfix(type, new InfixOperatorSubparser(precedence));
        });
        this.registerInfix(tokens_1.TokenType.Dot, new PropertyAccessSubparser(Precedence.PROPERTY_ACCESS));
        this.registerInfix(tokens_1.TokenType.LeftParenthesis, new FunctionCallSubparser(Precedence.CALL));
        this.registerInfix(tokens_1.TokenType.LeftBracket, new ElementAccessSubparser(Precedence.POSTFIX));
        this.registerInfix(tokens_1.TokenType.Semicolon, new StatementSubparser());
        this.registerInfix(tokens_1.TokenType.DoubleMinus, new PostfixOperatorSubparser());
        this.registerInfix(tokens_1.TokenType.DoublePlus, new PostfixOperatorSubparser());
        this.registerInfix(tokens_1.TokenType.Equals, new AssignmentSubparser());
        // Pattern handlers registering
        this.registerPrefixPattern(tokens_1.TokenType.AtSign, new NamedPatternSubparser());
        this.registerPrefixPattern(tokens_1.TokenType.Identifier, new NamePatternSubparser());
        this.registerPrefixPattern(tokens_1.TokenType.LeftBracket, new ListPatternSubparser());
        this.registerPrefixPattern(tokens_1.TokenType.LeftCurlyBracket, new ObjectPatternSubparser());
    }
    registerPrefix(type, subparser) {
        this.prefixSubparsers.set(type, subparser);
    }
    registerInfix(type, subparser) {
        this.infixSubparsers.set(type, subparser);
    }
    registerPrefixPattern(type, subparser) {
        this.prefixPatternSubparsers.set(type, subparser);
    }
    registerInfixPattern(type, subparser) {
        this.infixPatternSubparsers.set(type, subparser);
    }
    getPrecedenceForPattern() {
        const patternSubparser = this.infixPatternSubparsers.get(this.tokenSource.peek().type);
        if (patternSubparser) {
            return patternSubparser.precedence;
        }
        return 0;
    }
    canReadExpression() {
        return this.prefixSubparsers.has(this.tokenSource.peek().type);
    }
    getPrecedence() {
        const subparser = this.infixSubparsers.get(this.tokenSource.peek().type);
        if (subparser) {
            return subparser.precedence;
        }
        return 0;
    }
    getExpression(precedence) {
        let token = this.tokenSource.next();
        if (!this.prefixSubparsers.has(token.type) || (this.conditionsOfPrefixSubparsers.has(token.type) && !this.conditionsOfPrefixSubparsers.get(token.type)(token))) {
            (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE00011] Could not parse : '${token.getSource()}' (expected an expression)`, token.line, token.char, token.getSource());
        }
        let left = this.prefixSubparsers.get(token.type).parse(this, token);
        while (precedence < this.getPrecedence()) {
            token = this.tokenSource.next();
            const infix = this.infixSubparsers.get(token.type);
            try {
                left = infix.parse(this, left, token);
            }
            catch (e) {
                (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE99999] [[Failure]] ${tokens_1.TokenType[token.type]} - please report this error to https://github.com/Astroide/escurieux/issues`, token.line, token.char, token.getSource());
            }
        }
        return left;
    }
    getPattern(precedence) {
        let token = this.tokenSource.next();
        if (!this.prefixPatternSubparsers.has(token.type)) {
            (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE00027] Could not parse : '${token.getSource()}' (expected a pattern)`, token.line, token.char, token.getSource());
        }
        let left = this.prefixPatternSubparsers.get(token.type).parse(this, token);
        while (precedence < this.getPrecedenceForPattern()) {
            token = this.tokenSource.next();
            const infix = this.infixPatternSubparsers.get(token.type);
            try {
                left = infix.parse(this, left, token);
            }
            catch (e) {
                (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE99999] [[Failure]] ${tokens_1.TokenType[token.type]} - please report this error to https://github.com/Astroide/escurieux/issues`, token.line, token.char, token.getSource());
            }
        }
        return left;
    }
    getTypeParameters() {
        this.tokenSource.next(); // Consume the '['
        const names = [];
        const constraints = [];
        while (!this.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = this.tokenSource.next();
                (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            names.push(this.tokenSource.consume(tokens_1.TokenType.Identifier, 'a type parameter name was expected'));
            const innerConstraints = [];
            if (this.tokenSource.match(tokens_1.TokenType.SmallerOrEqual)) {
                this.tokenSource.next();
                innerConstraints.push({
                    kind: 'extends',
                    type: this.getType()
                });
            }
            if (this.tokenSource.match(tokens_1.TokenType.Colon)) {
                this.tokenSource.next();
                if (this.tokenSource.match(tokens_1.TokenType.LeftParenthesis)) {
                    this.tokenSource.next();
                    if (this.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                        const wrongToken = this.tokenSource.next();
                        (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00017] Parentheses in \':\' type constraints must contain something', wrongToken.line, wrongToken.char, wrongToken.getSource());
                    }
                    while (!this.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                        if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                            const token = this.tokenSource.next();
                            (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                        }
                        innerConstraints.push({
                            kind: 'implements',
                            type: this.getType()
                        });
                        if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                            this.tokenSource.next();
                        }
                        else if (!this.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                            const token = this.tokenSource.next();
                            (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
                        }
                    }
                    this.tokenSource.next();
                }
                else {
                    const type = this.getType();
                    innerConstraints.push({
                        kind: 'implements',
                        type: type
                    });
                }
            }
            if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                this.tokenSource.next();
            }
            else if (!this.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = this.tokenSource.next();
                (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
            if (innerConstraints.length == 0) {
                constraints.push('unconstrained');
            }
            else {
                const originalConstraint = innerConstraints[0];
                let constraint = originalConstraint;
                let index = 1;
                while (index < innerConstraints.length) {
                    if (constraint != 'unconstrained') {
                        constraint.and = innerConstraints[index];
                        constraint = constraint.and;
                    }
                    index++;
                }
                constraints.push(originalConstraint);
            }
        }
        this.tokenSource.next(); // Consume the ']'
        return [names.map(x => ({ plain: true, value: x })), constraints];
    }
    getType(raw = false) {
        let type = {
            plain: true,
            value: this.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected a type name')
        };
        if (raw)
            return type;
        if (this.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            this.tokenSource.next();
            type = {
                plain: false,
                value: type.value,
                typeParameters: []
            };
            if (this.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = this.tokenSource.next();
                (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00014] Unexpected empty type parameters', token.line, token.char, token.getSource());
            }
            while (!this.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                    const token = this.tokenSource.next();
                    (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                }
                const parameter = this.getType();
                type.typeParameters.push(parameter);
                if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                    this.tokenSource.next(); // Consume the comma
                }
            }
            this.tokenSource.next(); // Consume the ']'
        }
        return type;
    }
    parseImport() {
        if (this.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
            this.tokenSource.next();
            const list = [];
            while (!this.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                    const token = this.tokenSource.next();
                    (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00028] No leading / double commas are allowed within imports', token.line, token.char, token.getSource());
                }
                list.push(this.parseImport());
                if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                    this.tokenSource.next();
                }
                else if (!this.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                    const token = this.tokenSource.next();
                    (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00029] Expected either \'}\' or an import section', token.line, token.char, token.getSource());
                }
            }
            const token = this.tokenSource.next(); // Consume the '}'
            if (list.length == 0) {
                (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00030] Cannot import nothing from a module', token.line, token.char, token.getSource());
            }
            return new ImportSection('list', list);
        }
        else if (this.tokenSource.match(tokens_1.TokenType.Identifier)) {
            const token = this.tokenSource.next();
            if (this.tokenSource.match(tokens_1.TokenType.Dot)) {
                this.tokenSource.next();
                return new ImportSection('element', this.parseImport(), token);
            }
            else if (this.tokenSource.match(tokens_1.TokenType.As)) {
                this.tokenSource.next(); // Consume the 'as'
                return new ImportSection('terminal', null, token, this.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected an identifier after \'as\''));
            }
            else {
                return new ImportSection('terminal', null, token);
            }
        }
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map