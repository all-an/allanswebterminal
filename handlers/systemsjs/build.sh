#!/bin/bash

# Build script for SystemsJS precompiled library
# This creates a shared library that can be linked at runtime

set -e

BUILD_DIR="build"
TARGET_ARCH="x86_64-linux"
LIB_NAME="libsjs"

echo "Building SystemsJS precompiled library for ${TARGET_ARCH}..."

# Create build directory
mkdir -p $BUILD_DIR

# Compile the C library as a shared object
gcc -std=c99 -fPIC -O3 -shared \
    -o "${BUILD_DIR}/${LIB_NAME}.so" \
    sjs.c \
    -lc

# Create static library version as well
gcc -std=c99 -O3 -c sjs.c -o "${BUILD_DIR}/sjs.o"
ar rcs "${BUILD_DIR}/${LIB_NAME}.a" "${BUILD_DIR}/sjs.o"

# Copy header file
cp sjs.h "${BUILD_DIR}/"

echo "✓ Built shared library: ${BUILD_DIR}/${LIB_NAME}.so"
echo "✓ Built static library: ${BUILD_DIR}/${LIB_NAME}.a"
echo "✓ Copied header: ${BUILD_DIR}/sjs.h"

# Show library info
echo -e "\nLibrary info:"
file "${BUILD_DIR}/${LIB_NAME}.so"
ls -la "${BUILD_DIR}/"