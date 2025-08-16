# UnleashedJS Compiler

## JavaScript Compiler with Systems Programming Power

---

## Overview

**UnleashedJS** is a next-generation JavaScript compiler written in Go and C that brings the power of systems programming to JavaScript. Inspired by the GoUnchained programming language philosophy, UnleashedJS provides JavaScript developers with low-level control, deterministic memory management, and native performance while maintaining JavaScript's familiar syntax and ecosystem.

### Key Features

- **JavaScript Syntax Preserved** - Write familiar JavaScript code
- **Hybrid Memory Management** - ORC by default, manual control in `nogc` blocks  
- **Zero-cost Abstractions** - Performance when you need it
- **Native Code Generation** - Compile to optimized native binaries
- **Systems Programming** - Direct hardware access, inline assembly
- **C Interoperability** - Seamless integration with existing C libraries
- **Gradual Optimization** - Start high-level, optimize incrementally

### File Extensions
- Source files: `.ujs` (UnleashedJS)
- Alternative: `.js` (JavaScript compatibility mode)

### Tooling
```bash
ujs build main.ujs
ujs run server.ujs  
ujs test ./...
ujs init myproject
```

---

## Language Philosophy

UnleashedJS removes JavaScript's constraints while preserving its strengths:

### **JavaScript's Strengths (Preserved)**
- Familiar, expressive syntax
- Rich ecosystem and libraries
- Rapid development cycle
- Event-driven programming model
- Dynamic and flexible typing

### **JavaScript's Constraints (Removed)**
- ❌ Garbage collection pauses → ✅ Deterministic ORC
- ❌ Memory safety always enforced → ✅ `nogc` escape hatches
- ❌ High-level only → ✅ Systems programming features
- ❌ Single runtime environment → ✅ Native compilation
- ❌ Limited performance → ✅ Zero-cost abstractions

---

## Memory Management

UnleashedJS provides a **hybrid memory management system**:

### Default Mode: Optimized Reference Counting (ORC)
```javascript
function businessLogic() {
    // ORC-managed - deterministic cleanup
    const users = new Array(1000);
    const cache = new Map();
    const data = processUsers(users);
    
    // Deterministic cleanup when refcount hits 0
    return data;
}
```

### Manual Mode: nogc Blocks
```javascript
function realtimeHandler() {
    nogc {
        // Manual memory management - zero overhead
        const buffer = stackalloc(4096);
        const heap = malloc(1024);
        defer free(heap);
        
        // Predictable performance
        processRealtime(buffer, heap);
    }
}
```

### Allocation Types

#### **ORC-Managed Allocations**
```javascript
// Standard JavaScript-style allocations with deterministic cleanup
const array = new Array(100);           // ORC heap
const obj = new MyClass();              // ORC heap  
const data = {field: "value"};          // ORC heap
```

#### **Stack Allocations**
```javascript
nogc {
    // Fixed-size stack allocation
    const buffer = stackalloc(1024);              // Uint8Array, 1024 bytes
    const array = stackarray(Int32Array, 100);    // Int32Array[100]
    const local = stacknew(MyClass);              // MyClass instance on stack
    
    // Automatically freed when leaving nogc block
}
```

#### **Manual Heap Allocations**
```javascript
nogc {
    // Raw memory allocation
    const raw = malloc(1024);                     // ArrayBuffer
    defer free(raw);
    
    // Typed manual allocation
    const typed = malloc_typed(MyClass);          // MyClass instance
    defer free_typed(typed);
    
    // Array allocation
    const arr = malloc_array(Int32Array, 100);    // Int32Array, manual
    defer free_array(arr);
}
```

#### **Arena Allocations**
```javascript
// Arena for batch allocations
const arena = new Arena(1024*1024);  // 1MB arena (ORC-managed arena object)
defer arena.free();

nogc {
    // Allocate from arena (no individual frees needed)
    const batch = arena.alloc(Batch.size);
    const items = arena.alloc_array(Item, 1000);
    
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

## Compiler Architecture

### Implementation Overview

UnleashedJS uses a **hybrid Go + C implementation** similar to GoUnchained:

- **Frontend (Go)**: Lexer, parser, semantic analysis, JavaScript AST processing
- **Backend (C)**: Code generation, optimization, runtime system
- **Runtime (C)**: ORC implementation, memory management, JavaScript compatibility layer

### Compilation Pipeline

```
JavaScript Source (.ujs/.js) 
    ↓
JavaScript Lexer (Go) → Tokens
    ↓  
JavaScript Parser (Go) → AST
    ↓
Semantic Analysis (Go) → Annotated AST
    ↓
Code Generator (Go) → C Code
    ↓
C Compiler → Native Binary
```

### Key Components

#### **JavaScript-Specific AST Nodes**
```go
// JavaScript function expression
type FunctionExpression struct {
    Token      Token
    Name       *Identifier
    Parameters []*Identifier
    Body       *BlockStatement
    IsAsync    bool
    IsArrow    bool
}

// JavaScript object literal
type ObjectLiteral struct {
    Token Token // the '{' token
    Pairs map[Expression]Expression
}

// JavaScript array literal  
type ArrayLiteral struct {
    Token    Token // the '[' token
    Elements []Expression
}

// NoGC block (UnleashedJS extension)
type NoGCBlock struct {
    Token Token // the 'nogc' token
    Body  *BlockStatement
}
```

---

## Code Generation

### JavaScript to C Translation

#### **Objects and Prototypes**
```javascript
// JavaScript source
class Vehicle {
    constructor(wheels) {
        this.wheels = wheels;
    }
    
    move() {
        console.log(`Moving on ${this.wheels} wheels`);
    }
}

// Generated C code
typedef struct Vehicle {
    ORCObject header;
    int32_t wheels;
    void (*move)(struct Vehicle*);
} Vehicle;

Vehicle* Vehicle_new(int32_t wheels) {
    Vehicle* self = (Vehicle*)orc_alloc(sizeof(Vehicle));
    self->wheels = wheels;
    self->move = Vehicle_move;
    return self;
}

void Vehicle_move(Vehicle* self) {
    printf("Moving on %d wheels\n", self->wheels);
}
```

#### **Closures and Scope**
```javascript
// JavaScript source
function createCounter(initial) {
    let count = initial;
    return function() {
        return ++count;
    };
}

// Generated C code
typedef struct CounterClosure {
    ORCObject header;
    int32_t count;
} CounterClosure;

typedef struct CounterFunction {
    ORCObject header;
    CounterClosure* closure;
} CounterFunction;

int32_t counter_call(CounterFunction* fn) {
    return ++fn->closure->count;
}

CounterFunction* createCounter(int32_t initial) {
    CounterClosure* closure = (CounterClosure*)orc_alloc(sizeof(CounterClosure));
    closure->count = initial;
    
    CounterFunction* fn = (CounterFunction*)orc_alloc(sizeof(CounterFunction));
    fn->closure = orc_retain(closure);
    
    return fn;
}
```

---

## Advanced Features

### Real-Time JavaScript Example

```javascript
//gc:orc,deterministic
class AudioProcessor {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.buffer = new Float32Array(1024);
    }
    
    processAudio(input, output) {
        // ORC-managed processing
        const processed = this.applyEffects(input);
        
        nogc {
            // Zero-allocation hot path
            const workspace = stackalloc(4096);
            const temp = new Float32Array(workspace, 0, 1024);
            
            // Inline assembly for DSP operations
            inline_asm(`
                movq %[input], %%rsi
                movq %[temp], %%rdi  
                movq $1024, %%rcx
                
            dsp_loop:
                movss (%%rsi), %%xmm0
                mulss %[gain], %%xmm0
                movss %%xmm0, (%%rdi)
                addq $4, %%rsi
                addq $4, %%rdi
                loop dsp_loop
            ` : : [input] "m" (processed), [temp] "m" (temp), [gain] "m" (this.gain) 
              : "rsi", "rdi", "rcx", "xmm0");
            
            // Copy processed data to output
            output.set(temp);
        }
    }
    
    applyEffects(input) {
        // High-level effect processing with ORC
        return input.map(sample => this.processOneSample(sample));
    }
}
```

### Hardware Interface

```javascript
//gc:arc,deterministic
class MemoryMappedDevice {
    constructor(baseAddress) {
        this.baseAddr = baseAddress;
    }
    
    writeRegister(offset, value) {
        nogc {
            // Direct hardware access
            const regAddr = this.baseAddr + offset;
            volatile_write_u32(regAddr, value);
            
            // Memory barrier
            inline_asm("mfence");
        }
    }
    
    readRegister(offset) {
        nogc {
            const regAddr = this.baseAddr + offset;
            return volatile_read_u32(regAddr);
        }
    }
}

// Packed struct for network protocols
packed class NetworkPacket {
    constructor() {
        this.header = 0;      // uint32
        this.length = 0;      // uint16
        this.flags = 0;       // uint8
        this.reserved = 0;    // uint8
        this.data = new Uint8Array(1500); // uint8[1500]
    }
}
```

### Event Loop Integration

```javascript
class EventLoop {
    constructor() {
        this.tasks = [];
        this.microtasks = [];
    }
    
    async run() {
        while (true) {
            // ORC-managed task processing
            const task = this.tasks.shift();
            if (task) {
                await task();
            }
            
            // Zero-allocation microtask processing
            nogc {
                const arena = stackalloc(64 * 1024);  // 64KB stack arena
                
                while (this.microtasks.length > 0) {
                    const microtask = this.microtasks.shift();
                    
                    // Process using arena memory
                    const result = this.processMicrotask(microtask, arena);
                    if (result) {
                        this.handleResult(result);
                    }
                }
                
                // Arena automatically freed
            }
            
            // Platform-specific event polling
            this.pollSystemEvents();
        }
    }
}
```

---

## Standard Library Extensions

### Low-Level Memory Operations
```javascript
// Memory manipulation
const Memory = {
    copy: (dest, src, size) => memcpy(dest, src, size),
    move: (dest, src, size) => memmove(dest, src, size),
    set: (ptr, value, size) => memset(ptr, value, size),
    compare: (a, b, size) => memcmp(a, b, size),
    
    // Atomic operations
    atomicLoad: (ptr) => atomic_load(ptr),
    atomicStore: (ptr, value) => atomic_store(ptr, value),
    atomicExchange: (ptr, value) => atomic_exchange(ptr, value),
    atomicCompareExchange: (ptr, expected, desired) => 
        atomic_compare_exchange(ptr, expected, desired)
};

// Hardware interfaces
const Hardware = {
    readPort: (port) => inb(port),
    writePort: (port, value) => outb(port, value),
    
    // CPU features
    cpuid: (leaf) => __cpuid(leaf),
    rdtsc: () => __rdtsc(),
    
    // Memory barriers
    mfence: () => inline_asm("mfence"),
    sfence: () => inline_asm("sfence"),
    lfence: () => inline_asm("lfence")
};
```

### Enhanced ArrayBuffer Operations
```javascript
class FastBuffer extends ArrayBuffer {
    constructor(size, alignment = 16) {
        nogc {
            // Aligned allocation for SIMD operations
            const ptr = aligned_alloc(alignment, size);
            super(ptr, size, true); // true = manual management
        }
    }
    
    simdAdd(other) {
        nogc {
            // SIMD vectorized addition
            inline_asm(`
                movq %[a], %%rsi
                movq %[b], %%rdi
                movq %[len], %%rcx
                shrq $4, %%rcx    // Process 16 bytes at a time
                
            simd_loop:
                movdqu (%%rsi), %%xmm0
                movdqu (%%rdi), %%xmm1
                paddb %%xmm1, %%xmm0
                movdqu %%xmm0, (%%rsi)
                addq $16, %%rsi
                addq $16, %%rdi
                loop simd_loop
            ` : : [a] "m" (this.ptr), [b] "m" (other.ptr), [len] "m" (this.byteLength)
              : "rsi", "rdi", "rcx", "xmm0", "xmm1");
        }
        return this;
    }
}
```

---

## Development Workflow

### Project Structure
```
myproject/
├── ujs.json          # Project configuration
├── src/
│   ├── main.ujs      # Entry point
│   ├── modules/
│   │   ├── audio.ujs # Audio processing module
│   │   └── network.ujs # Network module
│   └── native/
│       ├── bindings.c  # C bindings
│       └── bindings.h  # C headers
├── test/
│   ├── main.test.ujs # Unit tests
│   └── bench.ujs     # Benchmarks
└── build/
    ├── debug/          # Debug builds
    └── release/        # Release builds
```

### Configuration File (ujs.json)
```json
{
  "name": "myproject",
  "version": "1.0.0",
  "entry": "src/main.ujs",
  "target": "x86_64-linux",
  "gc": {
    "strategy": "orc",
    "deterministic": true,
    "cycleCollection": false,
    "timeBudget": "100us"
  },
  "optimization": {
    "level": 3,
    "escapeAnalysis": true,
    "inlining": true,
    "vectorization": true
  },
  "dependencies": {
    "ujs-std": "^1.0.0",
    "ujs-audio": "^0.5.0"
  },
  "nativeDependencies": {
    "libssl": "^1.1.0",
    "libz": "^1.2.0"
  }
}
```

### Build Commands
```bash
# Development builds
ujs build                           # Build debug version
ujs build --release                 # Build optimized release
ujs build --target=arm64-linux      # Cross-compile for ARM64
ujs build --gc=arc                  # Use ARC instead of ORC

# Testing and profiling  
ujs test                            # Run unit tests
ujs bench                           # Run benchmarks
ujs profile cpu                     # CPU profiling
ujs profile memory                  # Memory profiling
ujs profile realtime                # Real-time profiling

# Analysis tools
ujs analyze escape                  # Escape analysis
ujs analyze refs                    # Reference counting trace
ujs analyze cycles                  # Potential cycle detection
ujs lint                           # Code linting
```

---

## Status and Roadmap

### Current Status: **In Development**

### Implementation Phases

#### **Phase 1: Core Compiler (Months 1-4)**
- [x] JavaScript lexer with UJS extensions
- [x] JavaScript parser supporting ES6+ syntax
- [x] AST representation for JS constructs
- [ ] Basic code generation to C
- [ ] Simple ORC runtime for JS objects

#### **Phase 2: Memory Management (Months 5-8)**
- [ ] Complete ORC implementation for JS objects
- [ ] `nogc` block code generation
- [ ] Stack allocation support
- [ ] Arena allocators integration
- [ ] Prototype chain and closure handling

#### **Phase 3: JavaScript Compatibility (Months 9-12)**
- [ ] Complete object model implementation
- [ ] Prototype inheritance system
- [ ] Closures and lexical scoping
- [ ] Event loop integration
- [ ] Standard library implementation

#### **Phase 4: Advanced Features (Year 2)**
- [ ] Inline assembly support
- [ ] Hardware interface primitives
- [ ] SIMD operations
- [ ] WebAssembly interop
- [ ] Node.js compatibility layer

#### **Phase 5: Optimization (Year 2-3)**
- [ ] Advanced escape analysis
- [ ] JIT compilation for hot paths
- [ ] Profile-guided optimization
- [ ] Cross-module optimization
- [ ] LLVM backend integration

---

## Target Use Cases

UnleashedJS is designed for scenarios where JavaScript's familiarity meets systems programming requirements:

### **Real-Time Applications**
- Audio/video processing and DSP
- Game engines and real-time graphics
- High-frequency trading systems
- Real-time communication systems

### **Systems Programming**
- Operating system utilities
- Device drivers and firmware
- Embedded systems programming
- IoT applications

### **High-Performance Computing**
- Scientific computing and simulations  
- Cryptocurrency and blockchain
- Database engines
- Network infrastructure

### **Desktop Applications**
- Native desktop applications
- Performance-critical tools
- System utilities
- Developer tooling

---

## Conclusion

**UnleashedJS** bridges the gap between JavaScript's accessibility and systems programming's power. By combining familiar JavaScript syntax with deterministic memory management and native performance, UnleashedJS enables JavaScript developers to tackle previously impossible domains while maintaining their existing knowledge and skills.

The hybrid memory management approach allows for gradual optimization: start with familiar ORC-managed JavaScript code for rapid development, then optimize critical paths with `nogc` blocks and inline assembly for maximum performance.

**Key Differentiators:**
- **JavaScript syntax preserved** for easy adoption
- **Deterministic performance** via ORC  
- **Zero-cost abstractions** when needed
- **Native compilation** for optimal performance
- **Systems programming** capabilities
- **Gradual optimization** path

**UnleashedJS: JavaScript, but with systems programming superpowers.**

---

*This project is inspired by the GoUnchained programming language philosophy and aims to bring similar capabilities to the JavaScript ecosystem. For the latest updates and contributing guidelines, visit the UnleashedJS GitHub repository.*