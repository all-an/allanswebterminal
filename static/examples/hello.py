#!/usr/bin/env python3

def greet(name):
    """Simple greeting function"""
    return f"Hello, {name}!"

def main():
    # Get user input
    name = input("Enter your name: ")
    
    # Display greeting
    message = greet(name)
    print(message)
    
    # Some basic math
    numbers = [1, 2, 3, 4, 5]
    total = sum(numbers)
    print(f"Sum of {numbers} = {total}")

if __name__ == "__main__":
    main()