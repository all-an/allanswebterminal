#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#include "ujs.h"

// Simple hello function from C
const char* hello_from_c() {
    return "Hello from UnleashedJS C runtime!";
}

// Demo function showing C capabilities for JavaScript
const char* get_system_info() {
    static char buffer[256];
    
    const char* arch = 
        #ifdef __x86_64__
            "x86_64";
        #elif __aarch64__
            "arm64";
        #else
            "unknown";
        #endif
        
    const char* compiler = 
        #ifdef __GNUC__
            "GCC";
        #elif defined(__clang__)
            "Clang";
        #else
            "Unknown";
        #endif
        
    const char* version = 
        #ifdef __GNUC__
            __VERSION__;
        #elif defined(__clang__)
            __clang_version__;
        #else
            "0.0.0";
        #endif
    
    snprintf(buffer, sizeof(buffer), 
        "UnleashedJS Runtime v1.0.0\n"
        "Architecture: %s\n"
        "Compiler: %s %s\n"
        "Features: ORC Memory Management, Native Performance",
        arch, compiler, version
    );
    return buffer;
}

// Memory management demo for JavaScript objects
typedef struct {
    int ref_count;
    char* data;
    size_t size;
} JSObject;

JSObject* create_js_object(const char* data) {
    JSObject* obj = malloc(sizeof(JSObject));
    if (!obj) return NULL;
    
    obj->ref_count = 1;
    obj->size = strlen(data) + 1;
    obj->data = malloc(obj->size);
    
    if (obj->data) {
        strcpy(obj->data, data);
    }
    
    return obj;
}

void retain_js_object(JSObject* obj) {
    if (obj) {
        obj->ref_count++;
    }
}

void release_js_object(JSObject* obj) {
    if (obj && --obj->ref_count == 0) {
        free(obj->data);
        free(obj);
    }
}

const char* js_object_get_data(JSObject* obj) {
    return obj ? obj->data : "null";
}

// Demonstration of low-level operations for JavaScript
int perform_low_level_demo() {
    // Create a JavaScript-like object
    JSObject* jsObj = create_js_object("JavaScript object managed by C!");
    
    if (!jsObj) {
        return -1;
    }
    
    // Simulate reference counting (typical in UnleashedJS ORC)
    retain_js_object(jsObj);
    retain_js_object(jsObj);
    
    // Release references
    release_js_object(jsObj);
    release_js_object(jsObj);
    release_js_object(jsObj); // Final release - object should be freed
    
    return 0;
}

// Math operations optimized in C for JavaScript
double fast_math_operation(double a, double b, int operation) {
    switch (operation) {
        case 0: return a + b;
        case 1: return a - b;
        case 2: return a * b;
        case 3: return b != 0 ? a / b : 0;
        default: return 0;
    }
}

// Inline assembly example for systems programming
#ifdef __x86_64__
uint64_t get_cpu_cycles() {
    uint32_t hi, lo;
    __asm__ volatile ("rdtsc" : "=a"(lo), "=d"(hi));
    return ((uint64_t)lo) | (((uint64_t)hi) << 32);
}
#else
uint64_t get_cpu_cycles() {
    return 0; // Fallback for non-x86 architectures
}
#endif