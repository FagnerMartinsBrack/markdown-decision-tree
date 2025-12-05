# Agent Instructions

## Project Purpose

A parser and converter for Markdown Decision Tree (MDT) format - a constrained Markdown dialect for representing branching conditional logic (witness preparation, interview planning, diagnostic flowcharts).

## Core Design Decisions

### Parser Architecture
- **Custom line-by-line parsing** for list items (not markdown-it) to enforce strict 2-space indentation
- markdown-it is available but only used for potential future heading detection
- Stack-based tree building tracks parent-child relationships across indent levels
- Q-node IDs assigned via **pre-order depth-first traversal** (parent before children, left-to-right siblings)

### Type Naming Convention
- All format-specific types prefixed with `MDT` (e.g., `MDTDocument`, `MDTNode`)
- Node types use discriminated unions with `type` field (`'question'`, `'if'`, `'topic'`)

### Error Handling
- `ParseError` class includes 1-indexed `lineNumber` property
- Error messages must match README specification exactly
- Validation order: final newline → tabs → indent → markers → structure

## Key Constraints

### MDT Format Rules (enforced by parser)
- **2-space indentation** per level (not 4, not tabs)
- Only `**Q:**` and `**IF:**` markers allowed (case-sensitive)
- Q-nodes can only have IF-node children
- IF-nodes can only have Q-node children
- IF-nodes cannot appear at indent level 0
- Document must end with newline character
- No `**` sequences allowed in node text

### Output Formats
- **Mermaid**: Edge labels preserve quotes unescaped; node text escapes `"`, `<`, `>`, `[`, `]`
- **Ink**: Uses `+` for choices, 4-space indentation for nesting

## Testing Conventions

- Tests co-located with source (`*.test.ts` next to `*.ts`)
- README examples are canonical - integration tests verify exact output matches
- All error conditions from README spec must have corresponding test

## When Modifying

- Run `npm test` before committing (93 tests must pass)
- Run `npm run build` to verify TypeScript compilation
- Update tests when changing parser behavior or error messages
