#!/bin/bash

# Wrapper script to run SystemsJS with precompiled library
export LD_LIBRARY_PATH="$(dirname "$0")/build:$LD_LIBRARY_PATH"
exec "$@"