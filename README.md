# Escurieux
![Build Status - MacOS](https://github.com/astroide/escurieux/actions/workflows/macos.yml/badge.svg)
![Build Status - Ubuntu](https://github.com/astroide/escurieux/actions/workflows/ubuntu.yml/badge.svg)
![Build Status - Windows](https://github.com/astroide/escurieux/actions/workflows/windows.yml/badge.svg)

A statically typed programming language, that (for now) will be compiled to bytecode, to be executed by a VM written in C.

### Current State
> Note: Altough this project is under active development, it'll probably take a long time to make the language good enough to actually do something useful.

<!-- As of now, the parser and the tokenizer are written (and the compiler will be) in [TypeScript](https://typescriptlang.org), but once Escurieux will be in an appropriate state, they will be rewritten in Escurieux to remove the TypeScript/Node.js dependencies. -->

```
             _
             V
   ┌─────────┰──────────┰──────────────┰──────────────┐
Tokenizer  Parser    Compiler   Standard Library   Rewriting
                       and                       the compiler
                       VM                        in Escurieux
```
<!-- [The documentation](https://astroide.github.io/escurieux) is being written in parallel with the development of the language. -->
