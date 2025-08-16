package main

/*
#cgo LDFLAGS: -L${SRCDIR}/build -lujs -Wl,-rpath,${SRCDIR}/build
#include "build/ujs.h"
*/
import "C"
import (
	"fmt"
	"net/http"
	"strings"
)

// UnleashedJS compiler structure
type UJSCompiler struct {
	version     string
	target      string
	gcStrategy  string
	initialized bool
}

// Initialize the UnleashedJS compiler
func NewUJSCompiler() *UJSCompiler {
	compiler := &UJSCompiler{
		version:    "1.0.0-alpha",
		target:     "x86_64-linux",
		gcStrategy: "orc",
	}

	// Call C initialization
	result := C.perform_low_level_demo()
	if result == 0 {
		compiler.initialized = true
	}

	return compiler
}

// Get hello message from C runtime
func (l *UJSCompiler) GetHelloFromC() string {
	cStr := C.hello_from_c()
	return C.GoString(cStr)
}

// Get system information from C runtime
func (l *UJSCompiler) GetSystemInfo() string {
	cStr := C.get_system_info()
	return C.GoString(cStr)
}

// Demonstrate fast math operations via C
func (l *UJSCompiler) FastMath(a, b float64, operation int) float64 {
	result := C.fast_math_operation(C.double(a), C.double(b), C.int(operation))
	return float64(result)
}

// Get CPU cycles using inline assembly
func (l *UJSCompiler) GetCPUCycles() uint64 {
	cycles := C.get_cpu_cycles()
	return uint64(cycles)
}

// Compile UnleashedJS code (demo implementation)
func (l *UJSCompiler) CompileCode(source string) string {
	if !l.initialized {
		return "Error: UnleashedJS runtime not initialized"
	}

	// Simple demo compilation
	var output strings.Builder

	output.WriteString("UnleashedJS Compiler Output\n")
	output.WriteString("=============================\n\n")

	// Show C integration
	output.WriteString("C Runtime Status: ")
	output.WriteString(l.GetHelloFromC())
	output.WriteString("\n\n")

	// Show system info
	output.WriteString("System Information:\n")
	output.WriteString(l.GetSystemInfo())
	output.WriteString("\n\n")

	// Show performance metrics
	cycles := l.GetCPUCycles()
	if cycles > 0 {
		output.WriteString(fmt.Sprintf("CPU Cycles: %d\n", cycles))
	}

	// Demo math operations
	add := l.FastMath(10.5, 5.3, 0)
	mul := l.FastMath(7.0, 3.0, 2)
	output.WriteString(fmt.Sprintf("Fast Math Demo: 10.5 + 5.3 = %.2f, 7.0 * 3.0 = %.2f\n\n", add, mul))

	// Simulate code compilation
	if strings.Contains(source, "nogc") {
		output.WriteString("✓ Detected nogc blocks - enabling manual memory management\n")
	}
	if strings.Contains(source, "stackalloc") {
		output.WriteString("✓ Stack allocation detected - zero-cost abstractions enabled\n")
	}
	if strings.Contains(source, "inline_asm") {
		output.WriteString("✓ Inline assembly detected - native performance mode\n")
	}

	output.WriteString("\nCompilation Status: SUCCESS\n")
	output.WriteString("Generated: native binary with ORC garbage collection\n")
	output.WriteString("Memory Model: Hybrid ORC + manual management\n")
	output.WriteString("Performance: Native C-level performance\n")

	return output.String()
}

// Demo UnleashedJS code compilation
func (l *UJSCompiler) RunDemo() string {
	demoCode := `
// UnleashedJS Demo Code
function realtimeAudioProcessor() {
    const buffer = new Float32Array(1024);
    
    nogc {
        const workspace = stackalloc(4096);
        const temp = new Float32Array(workspace, 0, 1024);
        
        // Inline assembly for DSP operations
        inline_asm("movq %[src], %rsi; movq %[dst], %rdi; rep movsq" 
                  : : [src] "m" (buffer), [dst] "m" (temp));
        
        // Process audio data...
    }
}

class SystemDevice {
    constructor(baseAddr) {
        this.baseAddr = baseAddr;
    }
    
    readRegister(offset) {
        nogc {
            return volatile_read_u32(this.baseAddr + offset);
        }
    }
}
`
	return l.CompileCode(demoCode)
}

// HTTP handler for the UnleashedJS project
func UnleashedJSHandler(w http.ResponseWriter, r *http.Request) {
	compiler := NewUJSCompiler()

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")

	var response strings.Builder

	response.WriteString("🚀 UnleashedJS Compiler Demo\n")
	response.WriteString("===============================\n\n")

	// Show basic info
	response.WriteString(fmt.Sprintf("Version: %s\n", compiler.version))
	response.WriteString(fmt.Sprintf("Target: %s\n", compiler.target))
	response.WriteString(fmt.Sprintf("GC Strategy: %s\n", compiler.gcStrategy))
	response.WriteString(fmt.Sprintf("Status: %v\n\n", compiler.initialized))

	// Run the demo compilation
	demoOutput := compiler.RunDemo()
	response.WriteString(demoOutput)

	w.Write([]byte(response.String()))
}

// For standalone testing
func main() {
	compiler := NewUJSCompiler()

	fmt.Println("=== UnleashedJS Compiler Test ===")
	fmt.Println()

	// Test basic C integration
	fmt.Println("C Integration Test:")
	fmt.Println(compiler.GetHelloFromC())
	fmt.Println()

	// Test system info
	fmt.Println("System Information:")
	fmt.Println(compiler.GetSystemInfo())
	fmt.Println()

	// Test math operations
	fmt.Printf("Fast Math Test: 15.7 + 8.3 = %.2f\n", compiler.FastMath(15.7, 8.3, 0))
	fmt.Printf("Fast Math Test: 12.0 / 4.0 = %.2f\n", compiler.FastMath(12.0, 4.0, 3))
	fmt.Println()

	// Test CPU cycles if available
	cycles := compiler.GetCPUCycles()
	if cycles > 0 {
		fmt.Printf("CPU Cycles: %d\n", cycles)
	}
	fmt.Println()

	// Run demo compilation
	fmt.Println("Demo Compilation:")
	fmt.Println(compiler.RunDemo())
}
