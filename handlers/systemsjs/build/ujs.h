#ifndef SJS_H
#define SJS_H

#include <stdint.h>

const char* hello_from_c();
const char* get_system_info();
int perform_low_level_demo();
double fast_math_operation(double a, double b, int operation);
uint64_t get_cpu_cycles();

#endif // SJS_H
