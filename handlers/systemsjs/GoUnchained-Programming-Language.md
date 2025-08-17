# GoUnchained Programming Language

## Complete Language Specification and Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Language Philosophy](#language-philosophy)
3. [Memory Management](#memory-management)
4. [Syntax and Keywords](#syntax-and-keywords)
5. [Compiler Implementation](#compiler-implementation)
6. [GC Strategies](#gc-strategies)
7. [Code Examples](#code-examples)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Tooling and Ecosystem](#tooling-and-ecosystem)

---

## Overview

**GoUnchained** is a systems programming language that provides Go's familiar syntax and semantics while removing the constraints that prevent Go from being used in performance-critical and real-time systems.

### Key Features

- **Familiar Go syntax** - Easy migration from Go
- **Hybrid memory management** - ORC by default, manual control in `nogc` blocks
- **Zero-cost abstractions** - Performance when you need it
- **Real-time capable** - Deterministic memory management
- **Systems programming** - Direct hardware access, inline assembly
- **Gradual optimization** - Start high-level, optimize incrementally

### File Extensions
- Source files: `.gu` (GoUnchained)
- Alternative: `.go` (Go compatibility mode)

### Tooling
```bash
gou build main.gu
gou run server.gu
gou test ./...
gou mod init myproject
```

---

## Language Philosophy

GoUnchained removes Go's constraints while preserving its strengths:

### **Go's Strengths (Preserved)**
- Simple, readable syntax
- Fast compilation
- Built-in concurrency
- Strong standard library
- Excellent tooling

### **Go's Constraints (Removed)**
- ❌ Unpredictable GC pauses → ✅ Deterministic ORC
- ❌ Memory safety always enforced → ✅ `nogc` escape hatches
- ❌ High-level only → ✅ Systems programming features
- ❌ Single memory model → ✅ Multiple allocation strategies

---

## Memory Management

GoUnchained provides a **hybrid memory management system**:

### Default Mode: Optimized Reference Counting (ORC)
```go
func businessLogic() {
    // ORC-managed - deterministic cleanup
    var users = make([]User, 1000)
    var cache = new(Cache)
    var data = processUsers(users)
    
    // Deterministic cleanup when refcount hits 0
    return data
}
```

### Manual Mode: nogc Blocks
```go
func realtimeHandler() {
    nogc {
        // Manual memory management - zero overhead
        var buffer = stackalloc(4096)
        var heap = malloc(1024)
        defer free(heap)
        
        // Predictable performance
        processRealtime(buffer, heap)
    }
}
```

### Allocation Types

#### **ORC-Managed Allocations**
```go
// Standard Go-style allocations with deterministic cleanup
var slice = make([]int, 100)           // ORC heap
var ptr = new(MyStruct)                // ORC heap  
var data = MyStruct{field: "value"}    // ORC heap
```

#### **Stack Allocations**
```go
nogc {
    // Fixed-size stack allocation
    var buffer = stackalloc(1024)              // []byte, 1024 bytes
    var array = stackarray(int, 100)           // [100]int
    var local = stacknew(MyStruct)             // *MyStruct on stack
    
    // Automatically freed when leaving nogc block
}
```

#### **Manual Heap Allocations**
```go
nogc {
    // Raw memory allocation
    var raw = malloc(1024)                     // unsafe.Pointer
    defer free(raw)
    
    // Typed manual allocation
    var typed = malloc_typed(MyStruct)         // *MyStruct
    defer free_typed(typed)
    
    // Array allocation
    var arr = malloc_array(int, 100)           // []int, manual
    defer free_array(arr)
}
```

#### **Arena Allocations**
```go
// Arena for batch allocations
var arena = new_arena(1024*1024)  // 1MB arena (ORC-managed arena object)
defer arena.free()

nogc {
    // Allocate from arena (no individual frees needed)
    var batch = arena.alloc(sizeof(Batch))
    var items = arena.alloc_array(Item, 1000)
    
    // All freed when arena.free() is called
}
```

### Performance Characteristics

| Allocation Type | Speed | Predictability | Memory Overhead | Use Case |
|----------------|-------|----------------|-----------------|----------|
| **ORC** | Fast | Highest | Low | General purpose |
| **Stack** | Fastest | Highest | Lowest | Temporary data |
| **Manual Heap** | Fast | High | Low | Long-lived data |
| **Arena** | Fast | High | Medium | Batch processing |

---

## Syntax and Keywords

### Core Keywords
```go
// Standard Go keywords (preserved)
func var if else return for range switch case default
break continue type struct interface map chan

// Memory management
nogc        // Manual memory management block
new make    // ORC allocation (like Go)

// Low-level features  
inline_asm  // Inline assembly
ptr         // Raw pointer operations
volatile    // Volatile memory access
atomic      // Atomic operations
packed      // Packed structs
align       // Memory alignment
```

### Token Types (Lexer Implementation)
```go
type TokenType int

const (
    ILLEGAL TokenType = iota
    EOF
    
    // Identifiers and literals
    IDENT
    INT
    STRING
    
    // Operators
    ASSIGN
    PLUS
    MINUS
    MULTIPLY
    DIVIDE
    
    // Delimiters
    COMMA
    SEMICOLON
    LPAREN
    RPAREN
    LBRACE
    RBRACE
    
    // Keywords
    FUNCTION
    VAR
    IF
    ELSE
    RETURN
    
    // GoUnchained-specific
    INLINE_ASM
    NOGC
    PTR
    NEW
    MAKE
)
```

### Lexer Test Examples
```go
func TestLexer_NoGCFeatures(t *testing.T) {
    input := `nogc {
        ptr := stackalloc(1024);
        inline_asm("mov %rax, %rbx");
    }`

    expectedTokens := []Token{
        {NOGC, "nogc"},
        {LBRACE, "{"},
        {IDENT, "ptr"},
        {ASSIGN, ":="},
        {IDENT, "stackalloc"},
        {LPAREN, "("},
        {INT, "1024"},
        {RPAREN, ")"},
        {SEMICOLON, ";"},
        {INLINE_ASM, "inline_asm"},
        {LPAREN, "("},
        {STRING, "mov %rax, %rbx"},
        {RPAREN, ")"},
        {SEMICOLON, ";"},
        {RBRACE, "}"},
        {EOF, ""},
    }
    
    // Test implementation...
}
```

---

## Compiler Implementation

### Architecture Overview

GoUnchained uses a **hybrid Go + C implementation**:

- **Frontend (Go)**: Lexer, parser, semantic analysis
- **Backend (C)**: Code generation, optimization, runtime
- **Runtime (C)**: ORC implementation, memory management

### Compilation Pipeline

```
Source Code (.gu) 
    ↓
Lexer (Go) → Tokens
    ↓  
Parser (Go) → AST
    ↓
Semantic Analysis (Go) → Annotated AST
    ↓
Code Generator (Go) → C Code
    ↓
C Compiler → Native Binary
```

### AST Node Definitions

```go
// Core AST interfaces
type Node interface {
    TokenLiteral() string
    String() string
}

type Statement interface {
    Node
    statementNode()
}

type Expression interface {
    Node
    expressionNode()
}

// Program root
type Program struct {
    Statements []Statement
}

// Variable declaration
type VarStatement struct {
    Token Token // the 'var' token
    Name  *Identifier
    Value Expression
}

// NoGC block statement
type NoGCStatement struct {
    Token Token // the 'nogc' token
    Body  *BlockStatement
}

// Block statement
type BlockStatement struct {
    Token      Token // the '{' token
    Statements []Statement
}

// Expressions
type Identifier struct {
    Token Token
    Value string
}

type IntegerLiteral struct {
    Token Token
    Value int64
}
```

### Parser Implementation

```go
type Parser struct {
    l *Lexer

    curToken  Token
    peekToken Token

    errors []string

    prefixParseFns map[TokenType]prefixParseFn
    infixParseFns  map[TokenType]infixParseFn
}

func (p *Parser) parseStatement() Statement {
    switch p.curToken.Type {
    case VAR:
        return p.parseVarStatement()
    case NOGC:
        return p.parseNoGCStatement()
    default:
        return nil
    }
}

func (p *Parser) parseNoGCStatement() *NoGCStatement {
    stmt := &NoGCStatement{Token: p.curToken}

    if !p.expectPeek(LBRACE) {
        return nil
    }

    stmt.Body = p.parseBlockStatement()
    return stmt
}
```

### Code Generation

```go
type CodeGenerator interface {
    Generate(program *Program) (string, error)
    SetTarget(target string) error
}

// C code generator
type CCodeGenerator struct {
    target string // x86_64, arm64, etc.
    output strings.Builder
}

func (c *CCodeGenerator) Generate(program *Program) (string, error) {
    c.output.WriteString("#include <stdint.h>\n")
    c.output.WriteString("#include <stdlib.h>\n")
    c.output.WriteString("#include \"gou_runtime.h\"\n\n")
    
    for _, stmt := range program.Statements {
        c.generateStatement(stmt)
    }
    
    return c.output.String(), nil
}
```

---

## GC Strategies

GoUnchained supports multiple garbage collection strategies:

### Compile-Time GC Selection

```go
//go:gc orc
package main

// OR compile with flags:
// gou build -gc=orc main.gu
// gou build -gc=arc main.gu  
// gou build -gc=concurrent main.gu
```

### ORC (Optimized Reference Counting) - Default

**Benefits for Real-Time:**
- ✅ **Deterministic**: No unpredictable pause times
- ✅ **Bounded Latency**: Deallocation happens immediately
- ✅ **No Stop-the-World**: Work distributed across execution
- ✅ **Cache Friendly**: Objects freed when "hot"

**Implementation:**
```c
// Object header layout
typedef struct {
    uint32_t refcount;
    uint32_t type_id;
    char data[];
} ORCObject;

// Runtime functions
void* orc_alloc(size_t size);
void orc_retain(void* ptr);
void orc_release(void* ptr);
```

**Generated Code:**
```c
// var obj = new(MyStruct)
MyStruct* obj = (MyStruct*)orc_alloc(sizeof(MyStruct));

// var copy = obj  
MyStruct* copy = orc_retain(obj);

// Cleanup
orc_release(copy);
orc_release(obj);
```

### ARC (Automatic Reference Counting) - Maximum Determinism

**For Hard Real-Time:**
```go
//go:gc arc,deterministic
package realtime

func criticalHandler() {
    var buffer = new(RealTimeBuffer)
    // Immediate reference counting, no optimizations
    processRealTime(buffer)
}
```

### Real-Time Configuration

```go
// Deterministic mode - no deferred operations
//go:gc arc,deterministic

// Soft real-time with time budget
//go:gc orc,cycles=100us

// No cycle collection for maximum predictability  
//go:gc orc,nocycles
```

### ORC Optimizations

#### **Redundant Operation Elimination**
```go
// Source:
for i, item := range items {
    process(item.field)  // No refcount ops - compiler optimization
}

// Generated (optimized):
for (int i = 0; i < len; i++) {
    process(items[i].field);  // No orc_retain/release calls
}
```

#### **Deferred Reference Counting**
```c
// Batch operations for better cache performance
typedef struct {
    void* object;
    int delta;  // +1 for retain, -1 for release
} RCOp;

typedef struct {
    RCOp operations[256];
    int count;
} DeferredRC;
```

#### **Cycle Collection (Optional)**
```go
//go:gc orc,cycles=100us

// Time-bounded cycle collection
func detectCycles() {
    start := time.Now()
    for candidate := range potentialCycles {
        if time.Since(start) > 100*time.Microsecond {
            break  // Respect time budget
        }
        markAndSweepCycle(candidate)
    }
}
```

---

## Code Examples

### Complete Real-Time Example

```go
//go:gc orc,deterministic
package main

import "unsafe"

type RealTimeData struct {
    samples [1024]int32
    timestamp uint64
}

func main() {
    // ORC-managed setup
    var inputQueue = make(chan *RealTimeData, 100)
    var outputBuffer = make([]*RealTimeData, 0, 100)
    
    for {
        select {
        case data := <-inputQueue:
            result := processRealTime(data)
            outputBuffer = append(outputBuffer, result)
            
        default:
            // Hot path with zero allocations
            nogc {
                fastProcessBatch(&outputBuffer)
            }
        }
    }
}

func processRealTime(input *RealTimeData) *RealTimeData {
    // ORC allocation - deterministic cleanup
    result := new(RealTimeData)
    result.timestamp = getCurrentTime()
    
    nogc {
        // Stack allocation for temporary work
        var workspace = stackalloc(4096)
        var temp = (*[1024]int32)(workspace)
        
        // Inline assembly for performance-critical operations
        inline_asm(`
            movq %[input], %%rsi
            movq %[temp], %%rdi
            movq $1024, %%rcx
            rep movsl
        ` : : [input] "m" (input.samples), [temp] "m" (*temp) : "rsi", "rdi", "rcx")
        
        // Process using stack-allocated workspace
        for i := 0; i < 1024; i++ {
            result.samples[i] = temp[i] * 2
        }
        
        // workspace automatically freed when leaving nogc
    }
    
    return result  // ORC manages cleanup
}

func fastProcessBatch(buffer *[]*RealTimeData) {
    // Manual memory management for zero-latency path
    var scratchpad = malloc(8192)
    defer free(scratchpad)
    
    // Direct pointer manipulation
    ptr := (*uint64)(scratchpad)
    for i := 0; i < len(*buffer); i++ {
        *ptr = (*buffer)[i].timestamp
        ptr = (*uint64)(unsafe.Pointer(uintptr(unsafe.Pointer(ptr)) + 8))
    }
    
    // Batch processing logic...
}

func getCurrentTime() uint64 {
    var result uint64
    inline_asm("rdtsc" : "=A" (result))
    return result
}
```

### Mixed Allocation Strategies

```go
func serverHandler(request *Request) *Response {
    // ORC-managed response
    response := new(Response)
    
    nogc {
        // Arena for request processing
        arena := stackalloc(64 * 1024)  // 64KB stack arena
        
        // Manual parsing without allocations
        parser := (*RequestParser)(arena)
        initParser(parser, request.body)
        
        // Process request using arena memory
        for parser.hasMore() {
            field := parser.nextField()  // Uses arena memory
            processField(response, field)
        }
        
        // Arena automatically freed
    }
    
    // Response managed by ORC
    return response
}
```

### Hardware Interface

```go
//go:gc arc,deterministic
package driver

type MemoryMappedDevice struct {
    baseAddr uintptr
}

func (d *MemoryMappedDevice) WriteRegister(offset uint32, value uint32) {
    nogc {
        // Direct hardware access
        volatile regAddr := (*uint32)(unsafe.Pointer(d.baseAddr + uintptr(offset)))
        atomic.Store(regAddr, value)
        
        // Memory barrier
        inline_asm("mfence")
    }
}

func (d *MemoryMappedDevice) ReadRegister(offset uint32) uint32 {
    nogc {
        volatile regAddr := (*uint32)(unsafe.Pointer(d.baseAddr + uintptr(offset)))
        return atomic.Load(regAddr)
    }
}

packed struct NetworkPacket {
    header   uint32
    length   uint16
    flags    uint8
    reserved uint8
    data     [1500]uint8
}

func processPacket(packet *NetworkPacket) {
    nogc {
        // Zero-copy packet processing
        if packet.flags&FLAG_CHECKSUM != 0 {
            var checksum uint32
            
            // Optimized checksum with inline assembly
            inline_asm(`
                movl $0, %%eax
                movq %[data], %%rsi
                movl %[len], %%ecx
            checksum_loop:
                addl (%%rsi), %%eax
                addq $4, %%rsi
                loop checksum_loop
                movl %%eax, %[result]
            ` : [result] "=m" (checksum) 
              : [data] "m" (packet.data), [len] "m" (packet.length)
              : "eax", "rsi", "rcx")
              
            packet.header = checksum
        }
    }
}
```

---

## Implementation Roadmap

### Phase 1: Core Language (Months 1-3)
- [x] Lexer implementation
- [x] Parser for basic constructs
- [x] AST definition
- [ ] Basic code generation to C
- [ ] Simple ORC runtime

### Phase 2: Memory Management (Months 4-6)
- [ ] Complete ORC implementation
- [ ] `nogc` block code generation
- [ ] Stack allocation support
- [ ] Arena allocators
- [ ] Memory safety analysis

### Phase 3: Low-Level Features (Months 7-9)
- [ ] Inline assembly support
- [ ] Volatile and atomic operations
- [ ] Packed structs and alignment
- [ ] Pointer arithmetic in `nogc` blocks
- [ ] Hardware interface primitives

### Phase 4: Optimization (Months 10-12)
- [ ] ORC optimization passes
- [ ] Redundant operation elimination
- [ ] Escape analysis
- [ ] Cross-module optimization
- [ ] Profile-guided optimization

### Phase 5: Advanced Features (Year 2)
- [ ] Multiple GC backends (ARC, concurrent)
- [ ] Cycle collection algorithms
- [ ] Real-time scheduling integration
- [ ] NUMA-aware allocation
- [ ] WebAssembly backend

### Phase 6: Ecosystem (Year 2-3)
- [ ] Standard library
- [ ] Package manager
- [ ] IDE integration
- [ ] Debugging tools
- [ ] Performance profilers

---

## Tooling and Ecosystem

### Compiler
```bash
# Build commands
gou build main.gu                    # Build executable
gou build -o myapp main.gu           # Custom output name
gou build -gc=orc main.gu            # Specify GC strategy
gou build -target=arm64 main.gu      # Cross-compilation
gou build -opt=3 main.gu             # Optimization level

# Development commands
gou run main.gu                      # Run directly
gou test ./...                       # Run tests
gou bench ./...                      # Run benchmarks
gou fmt ./...                        # Format code
gou vet ./...                        # Static analysis
```

### Package Management
```bash
# Module management
gou mod init myproject               # Initialize module
gou mod tidy                         # Update dependencies
gou mod download                     # Download dependencies
gou mod verify                       # Verify dependencies

# Package operations
gou get github.com/user/package      # Add dependency
gou get -u github.com/user/package   # Update dependency
gou list -m all                      # List modules
```

### Development Tools
```bash
# Profiling and debugging
gou profile cpu main.gu              # CPU profiling
gou profile mem main.gu              # Memory profiling
gou profile rt main.gu               # Real-time profiling
gou debug main.gu                    # Interactive debugger

# Analysis tools
gou escape main.gu                   # Escape analysis
gou rc-trace main.gu                 # Reference counting trace
gou cycles main.gu                   # Cycle detection analysis
gou bounds main.gu                   # Bounds checking analysis
```

### IDE Integration

**VS Code Extension:**
- Syntax highlighting for `.gu` files
- IntelliSense and autocomplete
- Real-time error checking
- Memory allocation visualization
- Reference counting profiler integration

**Language Server Features:**
- Go-to definition
- Find references
- Refactoring support
- Memory lifetime analysis
- Performance hints

### Runtime Environment

**Environment Variables:**
```bash
export GOU_GC=orc                    # Default GC strategy
export GOU_GC_DEBUG=1                # Enable GC debugging
export GOU_RT_BUDGET=100us           # Real-time time budget
export GOU_HEAP_SIZE=1GB             # Initial heap size
export GOU_STACK_SIZE=8MB            # Default stack size
```

**Runtime Flags:**
```go
// Programmatic runtime configuration
import "runtime/gou"

func init() {
    gou.SetGCStrategy(gou.ORC)
    gou.SetTimeBudget(100 * time.Microsecond)
    gou.EnableCycleCollection(false)
    gou.SetDeterministicMode(true)
}
```

---

## Conclusion

**GoUnchained** represents the evolution of Go into a true systems programming language. By combining Go's excellent syntax and developer experience with deterministic memory management and low-level control, GoUnchained enables developers to write everything from web services to real-time systems with a single, coherent language.

The hybrid memory management approach allows for gradual optimization: start with familiar ORC-managed code for rapid development, then optimize critical paths with `nogc` blocks for maximum performance. This makes GoUnchained uniquely positioned for modern systems development where both productivity and performance matter.

**Key Differentiators:**
- **Deterministic performance** via ORC
- **Zero-cost abstractions** when needed
- **Familiar Go syntax** for easy adoption
- **Real-time capable** for critical systems
- **Gradual optimization** path

**Target Use Cases:**
- Game engines and real-time graphics
- Embedded and IoT systems  
- High-frequency trading systems
- Operating system components
- Network infrastructure
- Database engines
- Scientific computing

GoUnchained: **Go, but unchained from its limitations.**

---

*This specification is a living document and will evolve as the language implementation progresses. For the latest updates, visit the GoUnchained GitHub repository.*