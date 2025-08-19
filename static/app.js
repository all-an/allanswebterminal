// Terminal Logic for Interactive Portfolio

let commandHistory = [];
let historyIndex = -1;
let currentInput = '';

// DOM Elements (will be updated dynamically)
let commandInput = document.getElementById('commandInput');
let terminalContent = document.getElementById('terminalContent');
let cursor = document.querySelector('.cursor');
let typedText = document.getElementById('typedText');

// Terminal state
const terminalState = {
    currentDirectory: '~',
    userName: 'guest',
    isLoggedIn: false,
    awaitingFlashcardChoice: false,
    flashcardsActive: false,
    flashcardsData: null,
    currentQuestionIndex: 0,
    messageMode: false,
    messageData: {
        step: 'name', // 'name', 'email', 'message'
        name: '',
        email: '',
        message: ''
    },
    loginMode: false,
    loginData: {
        step: 'username', // 'username', 'password'
        username: '',
        password: ''
    },
    registerMode: false,
    registerData: {
        step: 'username', // 'username', 'password'
        username: '',
        password: ''
    },
    vimMode: false,
    vimFilename: '',
    vimContent: '',
    vimCursorRow: 0,
    vimCursorCol: 0,
    vimCurrentMode: 'normal', // 'normal', 'insert', 'command'
    vimCommandBuffer: '',
    vimLastKey: ''
};

// Available commands
const commands = {
    projects: {
        description: 'Show available projects',
        execute: () => showProjects()
    },
    help: {
        description: 'Show available commands',
        execute: () => showHelp()
    },
    whoami: {
        description: 'Display current user',
        execute: () => `${terminalState.userName}`
    },
    pwd: {
        description: 'Show current directory',
        execute: () => `/home/${terminalState.userName}${terminalState.currentDirectory === '~' ? '' : '/' + terminalState.currentDirectory}`
    },
    ls: {
        description: 'List directory contents',
        execute: () => executeListDirectory()
    },
    cd: {
        description: 'Change directory',
        execute: (args) => changeDirectory(args[0])
    },
    cat: {
        description: 'Display file contents',
        execute: (args) => catFile(args[0])
    },
    run: {
        description: 'Run project application',
        execute: () => runProject()
    },
    clear: {
        description: 'Clear terminal screen',
        execute: () => clearTerminal()
    },
    about: {
        description: 'About Allan',
        execute: () => showAbout()
    },
    skills: {
        description: 'Show technical skills',
        execute: () => showSkills()
    },
    contact: {
        description: 'Show contact information',
        execute: () => showContact()
    },
    login: {
        description: 'Login with your account',
        execute: (args) => handleLogin(args)
    },
    register: {
        description: 'Register a new account',
        execute: (args) => handleRegister(args)
    },
    logout: {
        description: 'Logout from your account',
        execute: () => handleLogout()
    },
    message: {
        description: 'Send me a message',
        execute: () => startMessageMode()
    },
    vim: {
        description: 'Open vim editor',
        execute: (args) => openVimEditor(args[0])
    }
};

// Command execution functions
function showHelp() {
    let helpText = 'Available commands:\n\n';
    Object.keys(commands).forEach(cmd => {
        helpText += `  ${cmd.padEnd(12)} - ${commands[cmd].description}\n`;
    });
    return helpText;
}

function getHomeDirectoryFiles() {
    return [];
}

function getFlashcardsDirectoryFiles() {
    return [
        '../',
        'README.md',
        'main.go',
        'handlers/',
        'templates/',
        'static/',
        'db/',
        'go.mod',
        'go.sum'
    ];
}

function getCloudSimulatorDirectoryFiles() {
    return [
        '../',
        'README.md',
        'name-convention.md'
    ];
}

function getTextAdventureDirectoryFiles() {
    return [
        '../',
        'README.md',
        'game-engine.go',
        'stories/',
        'saves/',
        'config.json'
    ];
}

function getPortfolioTerminalDirectoryFiles() {
    return [
        '../',
        'index.html',
        'style.css',
        'app.js',
        'README.md',
        'package.json'
    ];
}

function getProjectsDirectoryFiles() {
    return [
        '../',
        'flashcards/',
        'cloudsimulator/',
        'text-adventure/',
        'portfolio-terminal/',
        'README.md'
    ];
}

function getDirectoryFiles(directory) {
    switch (directory) {
        case '~':
            return getHomeDirectoryFiles();
        case 'projects':
            return getProjectsDirectoryFiles();
        case 'projects/flashcards':
            return getFlashcardsDirectoryFiles();
        case 'projects/cloudsimulator':
            return getCloudSimulatorDirectoryFiles();
        case 'projects/text-adventure':
            return getTextAdventureDirectoryFiles();
        case 'projects/portfolio-terminal':
            return getPortfolioTerminalDirectoryFiles();
        default:
            return [];
    }
}

function executeListDirectory() {
    // If not logged in or not in home directory, use sync version
    if (!terminalState.isLoggedIn || terminalState.currentDirectory !== '~') {
        return listDirectorySync();
    }
    
    // For logged in users in home directory, fetch files async
    listDirectoryAsync();
    return ''; // Return empty, let async function handle output
}

function listDirectorySync() {
    const files = getDirectoryFiles(terminalState.currentDirectory);
    
    // Show login message if user is not logged in and in home directory
    if (!terminalState.isLoggedIn && terminalState.currentDirectory === '~') {
        return `📁 Your Files:
   Please login to see your saved files.
   
   Commands:
   • login <username> <password>     - Login to your account
   • register <username> <password>  - Create a new account`;
    }
    
    return files.length > 0 ? files.join('  ') : 'No files found in this directory.';
}

async function listDirectoryAsync() {
    try {
        const response = await fetch('/api/files/list', {
            credentials: 'include'
        });
        if (response.ok) {
            const userFiles = await response.json();
            
            if (userFiles.length > 0) {
                const userFileNames = userFiles.map(file => file.filename).join('  ');
                addOutput(`📁 Your Saved Files:
   ${userFileNames}
   
   Use 'vim filename' to edit files`);
            } else {
                addOutput(`📁 Your Saved Files:
   No saved files yet.
   
   Use 'vim filename.py' to create and edit files`);
            }
        } else {
            addOutput(`📁 Your Saved Files:
   Directory appears to be empty.
   
   Use 'vim filename.py' to create and edit files`);
        }
    } catch (error) {
        console.error('Error fetching user files:', error);
        addOutput(`📁 Your Saved Files:
   Directory appears to be empty.
   
   Use 'vim filename.py' to create and edit files`);
    }
}

function getProjectFiles(directory) {
    if (directory === 'projects') {
        return {
            'README.md': `# Allan's Projects

Welcome to my project directory! Here you'll find various software projects I've developed.

## Available Projects:

### 1. flashcards/
Interactive Flashcards System - A timed learning application with score tracking.
Built with Go backend and vanilla JavaScript frontend.

### 2. cloudsimulator/
CloudSimulator - AWS services in retro BIOS interface style.
Practice AWS CLI commands in a safe simulation environment with authentic BIOS navigation.

### 3. text-adventure/
Text Adventure Game Engine - Interactive story-based game platform (Coming Soon).

### 4. portfolio-terminal/
Portfolio Terminal Interface - You're using it right now!
An interactive terminal-style portfolio built with HTML5, CSS3, and JavaScript.

## Navigation
- Use 'ls' to see available projects
- Use 'cd <project-name>' to enter a project directory
- Use 'cd ..' to go back to the home directory
- Type project numbers (1-4) from home directory for quick access`
        };
    } else if (directory === 'projects/flashcards') {
        return {
            'README.md': `# Interactive Flashcards System

A timed learning application with score tracking built with Go and vanilla JavaScript.

## Features
- User account management
- Course creation and management  
- Timed flashcard sessions
- Score tracking and leaderboards
- Responsive web interface

## Tech Stack
- Backend: Go (Gin framework)
- Frontend: Vanilla JavaScript, HTML5, CSS3
- Database: PostgreSQL
- Testing: Go testing framework, Chai.js

## Running the Application
Use the 'run' command to start the application.`,
            'main.go': `package main

import (
    "log"
    "net/http"
    "allanswebterminal/handlers/flashcards"
    "allanswebterminal/handlers/login"
    "allanswebterminal/handlers/messages"
)

func main() {
    // Setup routes and handlers
    log.Println("Starting flashcards server on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}`
        };
    } else if (directory === 'projects/cloudsimulator') {
        return {
            'README.md': `# CloudSimulator

A BIOS-style AWS cloud services simulator that provides an interactive learning environment for AWS CLI commands.

## Overview

CloudSimulator presents AWS services in a retro BIOS interface style, allowing users to explore and practice AWS CLI commands in a safe, simulated environment. Each service provides common AWS CLI commands that can be executed to see mock responses.

## Features

- **BIOS-Style Interface**: Retro blue BIOS design with grid layout for services
- **Interactive Terminal**: Click-to-execute commands with simulated AWS CLI responses
- **12 AWS Services**: EC2, S3, RDS, Lambda, VPC, IAM, CloudWatch, SNS, SQS, CloudFormation, API Gateway, DynamoDB
- **Mock Responses**: Realistic JSON and text responses for learning purposes
- **Keyboard Navigation**: ESC key for navigation
- **Modular Design**: Separated CSS and JavaScript files for maintainability

## AWS Services Included

1. **EC2** - Elastic Compute Cloud (instances, security groups)
2. **S3** - Simple Storage Service (buckets, objects)
3. **RDS** - Relational Database Service (databases, snapshots)
4. **Lambda** - Serverless Compute (functions, invocation)
5. **VPC** - Virtual Private Cloud (networks, subnets)
6. **IAM** - Identity & Access Management (users, roles, policies)
7. **CloudWatch** - Monitoring & Logging (metrics, logs)
8. **SNS** - Simple Notification Service (topics, subscriptions)
9. **SQS** - Simple Queue Service (queues, messages)
10. **CloudFormation** - Infrastructure as Code (stacks, templates)
11. **API Gateway** - API Management (APIs, deployments)
12. **DynamoDB** - NoSQL Database (tables, items)

## Educational Purpose

This simulator is designed for:
- AWS CLI learning and practice
- Understanding AWS service relationships
- Safe experimentation with commands
- Retro computing nostalgia`,
            'name-convention.md': `# CloudSimulator Naming Conventions

This document outlines the naming conventions used in the CloudSimulator project.

## File Structure
- templates/cloudsimulator.html - Main HTML template
- static/cloudsimulator.css - BIOS-style CSS
- static/cloudsimulator.js - Interactive functionality

## JavaScript Functions
- All functions follow camelCase convention
- Functions are organized in CloudSimulator object
- Small, testable functions for unit testing

## CSS Classes
- kebab-case for class names
- Semantic naming (e.g., .service-item, .bios-header)
- BEM methodology where applicable

## AWS Service Keys
- Lowercase service identifiers
- Match AWS CLI service names where possible
- Examples: ec2, s3, rds, lambda, vpc, iam`
        };
    } else if (directory === 'projects/text-adventure') {
        return {
            'README.md': `# Text Adventure Game Engine

An interactive story-based game platform with branching narratives.

## Status: In Development

This project will feature:
- Interactive story system
- Branching dialogue options
- Save/load functionality
- Multiple story paths
- Character progression

## Coming Soon!`,
            'game-engine.go': `package main

// Text Adventure Game Engine
// Coming soon...

func main() {
    // Game engine implementation
}`
        };
    } else if (directory === 'projects/portfolio-terminal') {
        return {
            'README.md': `# Portfolio Terminal Interface

An interactive terminal-style portfolio built with HTML5, CSS3, and JavaScript.

## Features
- Terminal command simulation
- Interactive navigation
- Project showcase
- Contact form integration
- Responsive design

## You're using it right now!`,
            'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Allan - Software Engineer</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Terminal interface structure -->
</body>
</html>`,
            'style.css': `/* Terminal Simulator Styles */
body {
    background: #000000;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    color: #00ff00;
}`,
            'app.js': `// Terminal Logic for Interactive Portfolio
let terminalState = {
    currentDirectory: '~',
    userName: 'guest',
    isLoggedIn: false
};`
        };
    }
    return {};
}

function catFile(filename) {
    const homeFiles = {
        'about.txt': showAbout(),
        'skills.txt': showSkills(),
        'contact.txt': showContact(),
        'resume.pdf': 'Error: Cannot display binary file. Use a PDF viewer.'
    };
    
    if (!filename) {
        return 'cat: missing file operand\nUsage: cat <filename>';
    }
    
    // Check project-specific files first
    const projectFiles = getProjectFiles(terminalState.currentDirectory);
    if (projectFiles[filename]) {
        return projectFiles[filename];
    }
    
    // Check home directory files
    if (terminalState.currentDirectory === '~' && homeFiles[filename]) {
        return homeFiles[filename];
    }
    
    return `cat: ${filename}: No such file or directory`;
}

function showAbout() {
    return `Allan Pereira Abrahão
Software Engineer & Full-Stack Developer

Location: Brazil
Experience: 3+ years in software development

Passionate about creating scalable, efficient solutions and solving 
complex technical challenges. Experienced in full-stack development,
cloud technologies, and system architecture.

Interests:
- Microservices architecture
- Cloud computing (AWS)
- DevOps practices
- Open source contributions`;
}

function showSkills() {
    return `Technical Skills:

Backend Technologies:
  • Java (Spring Boot, Spring Framework)
  • Go (Gin, Fiber)
  • Python (Django, Flask)
  • Node.js (Express, NestJS)

Frontend Technologies:
  • JavaScript (ES6+, TypeScript)
  • Angular (2+, RxJS)
  • React (Hooks, Redux)
  • HTML5, CSS3, SASS

Databases:
  • PostgreSQL
  • MySQL
  • MongoDB
  • Redis

DevOps & Cloud:
  • Docker & Kubernetes
  • AWS (EC2, S3, Lambda, RDS)
  • CI/CD (Jenkins, GitHub Actions)
  • Linux administration
  • Prometheus, Grafana
  • Elasticsearch, Kibana

Tools & Practices:
  • Git version control
  • Agile/Scrum methodologies
  • Test-driven development
  • Code review processes`;
}

function showProjects() {
    return `🚀 Featured Projects:

1. Interactive Flashcards System
   - Timed learning application with score tracking
   - Built with Go backend and vanilla JavaScript
   - Features: User accounts, course management, leaderboards

2. CloudSimulator
   - AWS services in retro BIOS interface style
   - Practice AWS CLI commands in safe simulation environment
   - Features: 12 AWS services, interactive commands, BIOS navigation, mock responses
   - Status: Active

3. Text Adventure Game Engine
   - Interactive story-based game platform
   - Branching narratives with save/load functionality
   - Status: Coming Soon
   
4. Portfolio Terminal Interface
   - You're using it right now! 
   - Interactive terminal-style portfolio
   - Built with HTML5, CSS3, and vanilla JavaScript

Type the project number (1-4) to open it, or visit /projects for all details.`;
}

function showContact() {
    return `Contact Information:

📧 Email: Send message through portfolio
🔗 GitHub: https://github.com/all-an
💼 LinkedIn: https://www.linkedin.com/in/allan-pereira-abrahao/

Feel free to reach out for collaboration opportunities,
technical discussions, or just to say hello!

Type 'message' to open contact form.`;
}

function loginUser(username) {
    if (!username) {
        return 'Usage: login <username>\nExample: login john';
    }
    
    // For demo purposes, accept any username
    terminalState.userName = username.toLowerCase();
    terminalState.isLoggedIn = true;
    updatePrompt();
    return `Welcome back, ${username}! You now have full access to the system.`;
}

async function handleLogin(args) {
    // If no arguments, start step-by-step login
    if (args.length === 0) {
        return startLoginMode();
    }
    
    // Legacy support: if both username and password provided
    if (args.length === 2) {
        const [username, password] = args;
        return await performLogin(username, password);
    }
    
    // If only username provided
    if (args.length === 1) {
        return `Starting login for ${args[0]}...
Please use 'login' without arguments for step-by-step login, or provide both username and password.`;
    }
    
    return `Usage: login
This will guide you through step-by-step login.

Legacy usage: login <username> <password>
Don't have an account? Use 'register <username> <password>' to create one.`;
}

function startLoginMode() {
    terminalState.loginMode = true;
    terminalState.loginData = {
        step: 'username',
        username: '',
        password: ''
    };
    
    return `🔐 Login to your account

Enter your username (or "cancel" to exit):`;
}

function handleLoginInput(input) {
    if (input.toLowerCase() === 'cancel') {
        exitLoginMode(true);
        return;
    }

    switch (terminalState.loginData.step) {
        case 'username':
            terminalState.loginData.username = input.trim();
            if (!terminalState.loginData.username) {
                addOutput('Please enter a valid username:');
                return;
            }
            terminalState.loginData.step = 'password';
            addOutput('Enter your password:');
            break;

        case 'password':
            terminalState.loginData.password = input.trim();
            if (!terminalState.loginData.password) {
                addOutput('Please enter your password:');
                return;
            }
            performLoginFromMode();
            break;
    }
}

async function performLoginFromMode() {
    const { username, password } = terminalState.loginData;
    
    addOutput('');
    addOutput('🔐 Authenticating...');
    
    try {
        const result = await performLogin(username, password);
        addOutput(result);
        exitLoginMode();
    } catch (error) {
        addOutput(`❌ Login error: ${error.message}`);
        addOutput('Please try again or type "cancel" to exit.');
        // Reset to username step to try again
        terminalState.loginData.step = 'username';
        terminalState.loginData.username = '';
        terminalState.loginData.password = '';
        addOutput('');
        addOutput('Enter your username (or "cancel" to exit):');
    }
}

async function performLogin(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            terminalState.userName = username.toLowerCase();
            terminalState.isLoggedIn = true;
            updatePrompt();
            return `✅ Welcome back, ${username}! You now have full access to the system.
You can now save and load files using 'vim filename.py'`;
        } else {
            return `❌ Login failed: ${result.message}
Don't have an account? Use 'register' to create one.`;
        }
    } catch (error) {
        throw new Error(`${error.message}. Please check your connection and try again.`);
    }
}

function exitLoginMode(cancelled = false) {
    terminalState.loginMode = false;
    terminalState.loginData = { step: 'username', username: '', password: '' };
    if (cancelled) {
        addOutput('');
        addOutput('Login cancelled. Type "help" for available commands.');
    }
}

async function handleRegister(args) {
    // If no arguments, start step-by-step registration
    if (args.length === 0) {
        return startRegisterMode();
    }
    
    // Legacy support: if both username and password provided
    if (args.length === 2) {
        const [username, password] = args;
        return await performRegister(username, password);
    }
    
    // If only username provided
    if (args.length === 1) {
        return `Starting registration for ${args[0]}...
Please use 'register' without arguments for step-by-step registration, or provide both username and password.`;
    }
    
    return `Usage: register
This will guide you through step-by-step registration.

Legacy usage: register <username> <password>
Password must be at least 6 characters long.`;
}

function startRegisterMode() {
    terminalState.registerMode = true;
    terminalState.registerData = {
        step: 'username',
        username: '',
        password: ''
    };
    
    return `📝 Create a new account

Enter your username (or "cancel" to exit):`;
}

function handleRegisterInput(input) {
    if (input.toLowerCase() === 'cancel') {
        exitRegisterMode(true);
        return;
    }

    switch (terminalState.registerData.step) {
        case 'username':
            terminalState.registerData.username = input.trim();
            if (!terminalState.registerData.username) {
                addOutput('Please enter a valid username:');
                return;
            }
            terminalState.registerData.step = 'password';
            addOutput('Enter your password (at least 6 characters):');
            break;

        case 'password':
            terminalState.registerData.password = input.trim();
            if (!terminalState.registerData.password) {
                addOutput('Please enter your password:');
                return;
            }
            if (terminalState.registerData.password.length < 6) {
                addOutput('❌ Password must be at least 6 characters long. Please try again:');
                return;
            }
            performRegisterFromMode();
            break;
    }
}

async function performRegisterFromMode() {
    const { username, password } = terminalState.registerData;
    
    addOutput('');
    addOutput('📝 Creating account...');
    
    try {
        const result = await performRegister(username, password);
        addOutput(result);
        exitRegisterMode();
    } catch (error) {
        addOutput(`❌ Registration error: ${error.message}`);
        addOutput('Please try again or type "cancel" to exit.');
        // Reset to username step to try again
        terminalState.registerData.step = 'username';
        terminalState.registerData.username = '';
        terminalState.registerData.password = '';
        addOutput('');
        addOutput('Enter your username (or "cancel" to exit):');
    }
}

async function performRegister(username, password) {
    if (password.length < 6) {
        return `❌ Password must be at least 6 characters long.`;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            return `✅ Account created successfully for ${username}!
Now you can use 'login' to sign in to your new account.`;
        } else {
            return `❌ Registration failed: ${result.message}
Try a different username or check your password requirements.`;
        }
    } catch (error) {
        throw new Error(`${error.message}. Please check your connection and try again.`);
    }
}

function exitRegisterMode(cancelled = false) {
    terminalState.registerMode = false;
    terminalState.registerData = { step: 'username', username: '', password: '' };
    if (cancelled) {
        addOutput('');
        addOutput('Registration cancelled. Type "help" for available commands.');
    }
}

function handleLogout() {
    if (!terminalState.isLoggedIn) {
        return 'You are not logged in.';
    }
    
    terminalState.userName = 'guest';
    terminalState.isLoggedIn = false;
    updatePrompt();
    
    // Clear any stored session on server
    try {
        fetch('/logout', { method: 'POST' });
    } catch (error) {
        console.error('Error during logout:', error);
    }
    
    return '✅ Logged out successfully. You are now browsing as guest.';
}

function clearTerminal() {
    // Remove all content except welcome message and current line
    const welcomeMsg = document.querySelector('.welcome-message');
    
    // Create new current line with proper structure
    const newCurrentLine = document.createElement('div');
    newCurrentLine.className = 'terminal-line current-line';
    newCurrentLine.innerHTML = `
        <span class="prompt">${getPrompt()}</span>
        <span id="typedText" class="typed-text"></span>
        <span class="cursor">_</span>
        <input type="text" id="commandInput" class="command-input" autocomplete="off" autofocus>
    `;
    
    // Clear content and rebuild
    terminalContent.innerHTML = '';
    if (welcomeMsg) terminalContent.appendChild(welcomeMsg.cloneNode(true));
    terminalContent.appendChild(document.createElement('br'));
    terminalContent.appendChild(newCurrentLine);
    
    // Re-initialize input handling after clear
    setTimeout(() => {
        reinitializeInput();
    }, 50);
    
    return '';
}

function reinitializeInput() {
    // Update DOM element references
    commandInput = document.getElementById('commandInput');
    typedText = document.getElementById('typedText');
    cursor = document.querySelector('.cursor');
    
    if (commandInput && typedText) {
        // Remove any existing listeners first to prevent duplicates
        commandInput.removeEventListener('keydown', handleKeyPress);
        commandInput.removeEventListener('input', handleInput);
        commandInput.removeEventListener('blur', ensureFocus);
        
        // Re-setup input events
        commandInput.addEventListener('keydown', handleKeyPress);
        commandInput.addEventListener('input', handleInput);
        commandInput.addEventListener('blur', ensureFocus);
        
        // Re-setup focus events for new input
        setupFocusEventsForInput(commandInput);
        
        // Ensure focus
        commandInput.focus();
    }
}

function setupFocusEventsForInput(inputElement) {
    // Remove old listeners to avoid duplicates
    document.removeEventListener('click', ensureFocus);
    document.removeEventListener('mousedown', ensureFocus);
    document.removeEventListener('mouseup', ensureFocus);
    
    // Add new listener that respects text selection
    document.addEventListener('click', (event) => {
        // Don't focus if user is selecting text
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            return;
        }
        
        // Delay focus to allow text selection to complete
        setTimeout(() => ensureFocus(event), 100);
    });
}

function changeDirectory(path) {
    if (!path) {
        return 'cd: missing operand\nUsage: cd <directory>';
    }
    
    if (path === '..') {
        if (terminalState.currentDirectory.startsWith('projects/')) {
            terminalState.currentDirectory = 'projects';
            updatePrompt();
            return '';
        } else if (terminalState.currentDirectory === 'projects') {
            terminalState.currentDirectory = '~';
            updatePrompt();
            return '';
        }
    } else if (path === 'projects' && terminalState.currentDirectory === '~') {
        terminalState.currentDirectory = 'projects';
        updatePrompt();
        return '';
    } else if (terminalState.currentDirectory === 'projects') {
        // Navigate to project subdirectories
        if (path === 'flashcards') {
            terminalState.currentDirectory = 'projects/flashcards';
            updatePrompt();
            return '';
        } else if (path === 'cloudsimulator') {
            terminalState.currentDirectory = 'projects/cloudsimulator';
            updatePrompt();
            return '';
        } else if (path === 'text-adventure') {
            terminalState.currentDirectory = 'projects/text-adventure';
            updatePrompt();
            return '';
        } else if (path === 'portfolio-terminal') {
            terminalState.currentDirectory = 'projects/portfolio-terminal';
            updatePrompt();
            return '';
        }
    }
    
    return `cd: ${path}: No such directory`;
}

function runProject() {
    if (terminalState.currentDirectory === 'projects/flashcards') {
        addOutput('Starting Interactive Flashcards System...');
        addOutput('Server starting on http://localhost:8080');
        setTimeout(() => {
            window.location.href = '/projects/flashcards';
        }, 2000);
        return '';
    } else if (terminalState.currentDirectory === 'projects/cloudsimulator') {
        addOutput('Launching CloudSimulator BIOS interface...');
        addOutput('Loading AWS service configurations...');
        addOutput('✓ BIOS styling loaded');
        addOutput('✓ Arrow key navigation enabled');
        addOutput('✓ 12 AWS services configured');
        addOutput('');
        addOutput('Opening CloudSimulator...');
        setTimeout(() => {
            window.location.href = '/cloudsimulator';
        }, 2000);
        return '';
    } else if (terminalState.currentDirectory === 'projects/text-adventure') {
        return 'This project is still in development. Coming soon!';
    } else if (terminalState.currentDirectory === 'projects/portfolio-terminal') {
        return 'You\'re already running this project! This terminal interface is the portfolio terminal.';
    } else {
        return 'No runnable project in current directory. Navigate to a project directory first.';
    }
}

function handleProjectSelection(projectNumber) {
    switch (projectNumber) {
        case 1:
            addOutput('🎯 Interactive Flashcards System');
            addOutput('Choose how you want to play:');
            addOutput('');
            addOutput('  guest     - Play without login (no progress saved)');
            addOutput('  login     - Login to save your progress and scores');
            addOutput('  directory - Enter project directory to explore files');
            addOutput('');
            addOutput('Type your choice: guest, login, or directory');
            
            // Set a temporary state to handle the next input
            terminalState.awaitingFlashcardChoice = true;
            break;
        case 2:
            addOutput('Entering CloudSimulator directory...');
            terminalState.currentDirectory = 'projects/cloudsimulator';
            updatePrompt();
            addOutput('AWS services in retro BIOS interface style!');
            addOutput('');
            addOutput('Type "run" to launch the BIOS simulator interface.');
            break;
        case 3:
            addOutput('Entering Text Adventure Game directory...');
            terminalState.currentDirectory = 'projects/text-adventure';
            updatePrompt();
            addOutput('This project is currently in development.');
            break;
        case 4:
            addOutput('Entering Portfolio Terminal directory...');
            terminalState.currentDirectory = 'projects/portfolio-terminal';
            updatePrompt();
            addOutput('You\'re currently using this project! Type "ls" to see source files.');
            break;
        default:
            addOutput('Invalid project number. Please enter 1, 2, 3, or 4.');
    }
}


function handleFlashcardChoice(choice) {
    terminalState.awaitingFlashcardChoice = false;
    
    if (choice.toLowerCase() === 'guest') {
        return startFlashcardsGuest();
    } else if (choice.toLowerCase() === 'login') {
        return startFlashcardsLogin();
    } else if (choice.toLowerCase() === 'directory') {
        return enterFlashcardsDirectory();
    } else {
        return handleInvalidFlashcardChoice();
    }
}

function startFlashcardsGuest() {
    addOutput('🎮 Starting Flashcards in Guest Mode...');
    addOutput('Note: Your progress will not be saved.');
    addOutput('');
    loadGuestFlashcards();
    return '';
}

function startFlashcardsLogin() {
    if (!terminalState.isLoggedIn) {
        addOutput('🔐 Please login first to save your progress.');
        addOutput('Type: login allan');
        return '';
    }
    addOutput('🎮 Starting Flashcards with progress saving...');
    addOutput('');
    startFlashcardsTerminal(true);
    return '';
}

function enterFlashcardsDirectory() {
    terminalState.currentDirectory = 'projects/flashcards';
    updatePrompt();
    return 'Type "ls" to see files or "run" to start.';
}

function handleInvalidFlashcardChoice() {
    terminalState.awaitingFlashcardChoice = true;
    return 'Invalid choice. Type: guest, login, or directory';
}

function startFlashcardsTerminal(saveProgress) {
    loadFlashcardsCourses(saveProgress);
}

async function loadFlashcardsCourses(saveProgress) {
    addOutput('Loading flashcards...');
    try {
        const courses = await fetchCourses();
        displayCoursesInTerminal(courses, saveProgress);
    } catch (error) {
        addOutput('Error: ' + error.message);
    }
}

async function loadGuestFlashcards() {
    addOutput('Loading available flashcards...');
    try {
        const flashcards = await fetchGuestFlashcards();
        displayGuestFlashcardsInTerminal(flashcards);
    } catch (error) {
        addOutput('Error: ' + error.message);
    }
}

function displayCoursesInTerminal(courses, saveProgress) {
    if (!courses.length) {
        addOutput('No courses available.');
        return;
    }
    
    addOutput('Available courses:');
    courses.forEach((course, index) => {
        addOutput(`  ${index + 1}. ${course.name}`);
    });
    addOutput('Type course number to start:');
    
    setFlashcardsState(courses, saveProgress);
}

function setFlashcardsState(courses, saveProgress) {
    terminalState.flashcardsActive = true;
    terminalState.flashcardsData = {
        courses: courses,
        saveProgress: saveProgress,
        awaitingCourseSelection: true
    };
}

function displayGuestFlashcardsInTerminal(flashcards) {
    if (!flashcards.length) {
        addOutput('No flashcards available for guest mode.');
        return;
    }
    
    addOutput('Available flashcards (select by typing numbers):');
    addOutput('');
    flashcards.forEach((flashcard, index) => {
        addOutput(`  ${index + 1}. <span style="color: #ffff00;">${flashcard.question}</span> (${flashcard.time}s)`);
        addOutput(`      Answer: ${flashcard.answer}`);
        addOutput('');
    });
    addOutput('');
    addOutput('<span style="color: #00aaff;">Examples:</span>');
    addOutput('<span style="color: #00aaff;">  "1,3,5"    - Select flashcards 1, 3, and 5</span>');
    addOutput('<span style="color: #00aaff;">  "1-4"      - Select flashcards 1, 2, 3, and 4</span>');
    addOutput('<span style="color: #00aaff;">  "1,3-5,7"  - Select flashcards 1, 3, 4, 5, and 7</span>');
    addOutput('<span style="color: #00aaff;">  "all"      - Select all flashcards</span>');
    addOutput('');
    addOutput('Type your selection:');
    
    setGuestFlashcardsState(flashcards);
}

function setGuestFlashcardsState(flashcards) {
    terminalState.flashcardsActive = true;
    terminalState.flashcardsData = {
        flashcards: flashcards,
        saveProgress: false,
        awaitingGuestSelection: true,
        selectedFlashcards: []
    };
}

function parseFlashcardSelection(input, maxIndex) {
    const selected = new Set();
    
    if (input.toLowerCase() === 'all') {
        for (let i = 1; i <= maxIndex; i++) {
            selected.add(i);
        }
        return Array.from(selected).sort((a, b) => a - b);
    }
    
    const parts = input.split(',');
    
    for (const part of parts) {
        const trimmed = part.trim();
        
        if (trimmed.includes('-')) {
            // Handle range like "3-5"
            const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
            if (isNaN(start) || isNaN(end) || start < 1 || end > maxIndex || start > end) {
                throw new Error(`Invalid range: ${trimmed}`);
            }
            for (let i = start; i <= end; i++) {
                selected.add(i);
            }
        } else {
            // Handle single number
            const num = parseInt(trimmed);
            if (isNaN(num) || num < 1 || num > maxIndex) {
                throw new Error(`Invalid number: ${trimmed}`);
            }
            selected.add(num);
        }
    }
    
    return Array.from(selected).sort((a, b) => a - b);
}

async function fetchCourses() {
    const response = await fetch('/api/flashcards/courses');
    if (!response.ok) throw new Error('Failed to fetch courses');
    return await response.json();
}

async function fetchGuestFlashcards() {
    const response = await fetch('/api/flashcards/guest');
    if (!response.ok) throw new Error('Failed to fetch guest flashcards');
    return await response.json();
}

function handleFlashcardsInput(input) {
    if (input.toLowerCase() === 'quit') {
        exitFlashcards();
        return;
    }
    
    if (terminalState.flashcardsData.awaitingNext) {
        if (input.toLowerCase() === 'next') {
            handleNextCommand();
        } else {
            addOutput('❌ Please type "next" to continue to the next question...');
        }
        return;
    }
    
    if (terminalState.flashcardsData.awaitingGuestSelection) {
        selectGuestFlashcards(input);
    } else if (terminalState.flashcardsData.awaitingCourseSelection) {
        selectCourse(input);
    } else if (terminalState.flashcardsData.currentQuestion) {
        submitAnswer(input);
    }
}

function selectGuestFlashcards(input) {
    try {
        const flashcards = terminalState.flashcardsData.flashcards;
        const selectedIndices = parseFlashcardSelection(input, flashcards.length);
        
        if (selectedIndices.length === 0) {
            addOutput('No flashcards selected. Please try again:');
            return;
        }
        
        const selectedFlashcards = selectedIndices.map(index => flashcards[index - 1]);
        
        addOutput(`Selected ${selectedFlashcards.length} flashcard(s):`);
        selectedFlashcards.forEach((card, i) => {
            addOutput(`  ${i + 1}. ${card.question}`);
        });
        addOutput('');
        addOutput('Starting game...');
        
        startGuestGame(selectedFlashcards);
        
    } catch (error) {
        addOutput(`Error: ${error.message}`);
        addOutput('Please try again (e.g., "1,3-5" or "all"):');
    }
}

async function startGuestGame(selectedFlashcards) {
    try {
        const flashcardIds = selectedFlashcards.map(card => card.id);
        const response = await fetch('/api/flashcards/start-guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flashcard_ids: flashcardIds })
        });
        
        if (!response.ok) throw new Error('Failed to start guest game');
        
        const gameData = await response.json();
        setupGuestGame(gameData);
        
    } catch (error) {
        addOutput('Error: ' + error.message);
    }
}

function setupGuestGame(gameData) {
    terminalState.flashcardsData.awaitingGuestSelection = false;
    terminalState.flashcardsData.session_id = gameData.session_id;
    terminalState.flashcardsData.totalQuestions = gameData.total_questions;
    terminalState.flashcardsData.gameFlashcards = gameData.flashcards || []; // Store all flashcards for guest mode
    terminalState.flashcardsData.guestScore = {
        correct: 0,
        total: 0,
        totalTime: 0
    };
    terminalState.currentQuestionIndex = 0;
    showQuestionWithTimer(gameData.first_card);
}

function selectCourse(input) {
    const courseIndex = parseInt(input) - 1;
    const courses = terminalState.flashcardsData.courses;
    
    if (isValidCourseSelection(courseIndex, courses)) {
        startGame(courses[courseIndex]);
    } else {
        addOutput('Invalid course number. Try again:');
    }
}

function isValidCourseSelection(index, courses) {
    return index >= 0 && index < courses.length;
}

function startGame(course) {
    addOutput(`Starting ${course.name}...`);
    loadGameData(course.id);
}

async function loadGameData(courseId) {
    try {
        const gameData = await fetchGameStart(courseId);
        setupGame(gameData);
    } catch (error) {
        addOutput('Error: ' + error.message);
    }
}

async function fetchGameStart(courseId) {
    const response = await fetch(`/api/flashcards/start?course_id=${courseId}`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to start game');
    return await response.json();
}

function setupGame(gameData) {
    terminalState.flashcardsData.awaitingCourseSelection = false;
    terminalState.flashcardsData.session_id = gameData.session_id;
    terminalState.flashcardsData.totalQuestions = gameData.total_questions;
    terminalState.currentQuestionIndex = 0;
    showQuestion(gameData.first_card);
}

function showQuestion(card) {
    terminalState.flashcardsData.currentQuestion = card;
    addOutput('─'.repeat(40));
    addOutput(`Q${terminalState.currentQuestionIndex + 1}/${terminalState.flashcardsData.totalQuestions}: ${card.question}`);
    addOutput('Answer (or "quit" to exit):');
}

function showQuestionWithTimer(card) {
    terminalState.flashcardsData.currentQuestion = card;
    terminalState.flashcardsData.questionStartTime = Date.now();
    terminalState.flashcardsData.timeLimit = card.time * 1000; // Convert to milliseconds
    
    // Remove any existing progress bars first
    const existingBars = document.querySelectorAll('.timer-container');
    existingBars.forEach(bar => bar.parentElement.remove());
    
    addOutput('─'.repeat(50));
    addOutput(`Q${terminalState.currentQuestionIndex + 1}/${terminalState.flashcardsData.totalQuestions}: ${card.question}`);
    addOutput(`⏱️ Time limit: ${card.time} seconds`);
    
    // Create progress bar container and add it immediately after the question
    const progressContainer = createProgressBar();
    addOutputElement(progressContainer);
    
    addOutput('Your answer (or "quit" to exit):');
    
    // Start the countdown timer
    startQuestionTimer(card);
}

function createProgressBar() {
    const container = document.createElement('div');
    container.className = 'timer-container';
    container.style.cssText = `
        margin: 10px 0;
        background: #333;
        border-radius: 10px;
        height: 20px;
        position: relative;
        overflow: hidden;
    `;
    
    const progressBar = document.createElement('div');
    progressBar.className = 'timer-progress';
    progressBar.style.cssText = `
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #FFC107, #FF5722);
        width: 100%;
        border-radius: 10px;
        transition: width 0.1s linear;
    `;
    
    const timeText = document.createElement('div');
    timeText.className = 'timer-text';
    timeText.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-weight: bold;
        font-size: 12px;
        z-index: 1;
    `;
    
    container.appendChild(progressBar);
    container.appendChild(timeText);
    
    return container;
}

function addOutputElement(element) {
    // This should behave like addOutput but with an element instead of text
    const currentLine = document.querySelector('.current-line');
    const outputDiv = document.createElement('div');
    outputDiv.className = 'output';
    outputDiv.appendChild(element);
    
    // Insert right before the current input line (same as addOutput)
    terminalContent.insertBefore(outputDiv, currentLine);
    scrollToBottom();
}

function startQuestionTimer(card) {
    const startTime = terminalState.flashcardsData.questionStartTime;
    const timeLimit = terminalState.flashcardsData.timeLimit;
    
    const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, timeLimit - elapsed);
        const percentage = (remaining / timeLimit) * 100;
        
        const progressBar = document.querySelector('.timer-progress');
        const timeText = document.querySelector('.timer-text');
        
        if (progressBar && timeText) {
            progressBar.style.width = `${percentage}%`;
            timeText.textContent = `${Math.ceil(remaining / 1000)}s`;
            
            // Change color based on time remaining
            if (percentage > 50) {
                progressBar.style.background = '#4CAF50'; // Green
            } else if (percentage > 25) {
                progressBar.style.background = '#FFC107'; // Yellow
            } else {
                progressBar.style.background = '#FF5722'; // Red
            }
        }
        
        if (remaining <= 0) {
            // Time's up!
            clearInterval(terminalState.flashcardsData.timerInterval);
            handleTimeUp(card);
            return;
        }
        
        // Continue timer if question is still active
        if (terminalState.flashcardsData.currentQuestion === card) {
            terminalState.flashcardsData.timerInterval = setTimeout(updateTimer, 100);
        }
    };
    
    // Start the timer
    terminalState.flashcardsData.timerInterval = setTimeout(updateTimer, 100);
}

function handleTimeUp(card) {
    // Remove progress bar since time is up
    const existingBars = document.querySelectorAll('.timer-container');
    existingBars.forEach(bar => bar.parentElement.remove());
    
    addOutput('');
    addOutput('⏰ Time\'s up!');
    addOutput(`Correct answer: ${card.correct_answer || card.answer}`);
    
    // Record as incorrect with max time
    const timeScore = card.time;
    recordAnswer(false, timeScore);
    
    setTimeout(() => {
        nextQuestionOrEnd();
    }, 2000);
}

function submitAnswer(answer) {
    // Stop the timer if running
    if (terminalState.flashcardsData.timerInterval) {
        clearTimeout(terminalState.flashcardsData.timerInterval);
        terminalState.flashcardsData.timerInterval = null;
    }
    
    // Calculate time taken
    const timeElapsed = terminalState.flashcardsData.questionStartTime ? 
        Math.ceil((Date.now() - terminalState.flashcardsData.questionStartTime) / 1000) : 10;
    
    // Remove progress bar since question is answered
    const existingBars = document.querySelectorAll('.timer-container');
    existingBars.forEach(bar => bar.parentElement.remove());
    
    addOutput(`Your answer: ${answer}`);
    processAnswerWithTimer(answer, timeElapsed);
}

function processAnswerWithTimer(answer, timeScore) {
    const currentCard = terminalState.flashcardsData.currentQuestion;
    const isCorrect = checkAnswerLocally(answer, currentCard.answer);
    
    if (isCorrect) {
        addOutput('✅ Correct!');
        addOutput(`⏱️ Time: ${timeScore}s`);
        recordAnswer(isCorrect, timeScore);
        
        setTimeout(() => {
            nextQuestionOrEnd();
        }, 1500);
    } else {
        addOutput('❌ Incorrect');
        addOutput(`⏱️ Time: ${timeScore}s`);
        addOutput(`💡 Correct Answer: ${currentCard.answer}`);
        addOutput('');
        addOutput('📝 Type "next" to continue to the next question...');
        
        recordAnswer(isCorrect, timeScore);
        terminalState.flashcardsData.awaitingNext = true;
    }
}

function checkAnswerLocally(userAnswer, correctAnswer) {
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

function recordAnswer(isCorrect, timeScore) {
    if (!terminalState.flashcardsData.guestScore) {
        terminalState.flashcardsData.guestScore = {
            correct: 0,
            total: 0,
            totalTime: 0
        };
    }
    
    terminalState.flashcardsData.guestScore.total++;
    terminalState.flashcardsData.guestScore.totalTime += timeScore;
    
    if (isCorrect) {
        terminalState.flashcardsData.guestScore.correct++;
    }
}

function nextQuestionOrEnd() {
    terminalState.currentQuestionIndex++;
    
    if (terminalState.currentQuestionIndex >= terminalState.flashcardsData.totalQuestions) {
        // Game complete - show guest score
        showGuestFinalScore();
    } else {
        // Next question - get from stored flashcards for guest mode
        if (terminalState.flashcardsData.gameFlashcards && terminalState.flashcardsData.gameFlashcards.length > 0) {
            const nextCard = terminalState.flashcardsData.gameFlashcards[terminalState.currentQuestionIndex];
            showQuestionWithTimer(nextCard);
        } else {
            // Fallback for regular course mode
            const nextCard = terminalState.flashcardsData.currentQuestion;
            showQuestionWithTimer(nextCard);
        }
    }
}

function showGuestFinalScore() {
    const score = terminalState.flashcardsData.guestScore;
    const accuracy = score.total > 0 ? (score.correct / score.total * 100) : 0;
    const avgTime = score.total > 0 ? (score.totalTime / score.total) : 0;
    
    addOutput('');
    addOutput('🎉 Guest Game Complete!');
    addOutput('═'.repeat(40));
    addOutput(`📊 Final Score:`);
    addOutput(`   Correct Answers: ${score.correct}/${score.total}`);
    addOutput(`   Accuracy: ${accuracy.toFixed(1)}%`);
    addOutput(`   Total Time: ${score.totalTime} seconds`);
    addOutput(`   Average Time: ${avgTime.toFixed(1)}s per question`);
    addOutput('═'.repeat(40));
    
    if (accuracy >= 90) {
        addOutput('🌟 Excellent work! Outstanding performance!');
    } else if (accuracy >= 70) {
        addOutput('👍 Great job! Good performance!');
    } else if (accuracy >= 50) {
        addOutput('👌 Not bad! Keep practicing to improve!');
    } else {
        addOutput('💪 Keep studying! Practice makes perfect!');
    }
    
    addOutput('');
    addOutput('Note: As a guest, your score was not saved.');
    addOutput('Type "help" for more commands.');
    
    exitFlashcards();
}

async function processAnswer(answer) {
    try {
        const result = await submitAnswerToAPI(answer);
        showResult(result);
    } catch (error) {
        addOutput('Error: ' + error.message);
    }
}

async function submitAnswerToAPI(answer) {
    const sessionId = terminalState.flashcardsData.session_id;
    const response = await fetch(`/api/flashcards/answer?session_id=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            answer: answer,
            time_score: 10,
            flashcard_id: terminalState.flashcardsData.currentQuestion.id
        })
    });
    if (!response.ok) throw new Error('Failed to submit answer');
    return await response.json();
}

function showResult(result) {
    if (result.correct) {
        addOutput('✅ Correct!');
        addOutput(`💡 Answer: ${result.correct_answer}`);
        
        if (result.game_complete) {
            showFinalScore(result.final_score);
        } else {
            nextQuestion(result.next_card);
        }
    } else {
        addOutput('❌ Incorrect');
        addOutput(`💡 Correct Answer: ${result.correct_answer}`);
        addOutput('');
        addOutput('📝 Type "next" to continue to the next question...');
        
        terminalState.flashcardsData.awaitingNext = true;
        terminalState.flashcardsData.nextCard = result.next_card;
        terminalState.flashcardsData.gameComplete = result.game_complete;
        terminalState.flashcardsData.finalScore = result.final_score;
    }
}

function handleNextCommand() {
    terminalState.flashcardsData.awaitingNext = false;
    
    if (terminalState.flashcardsData.gameComplete) {
        showFinalScore(terminalState.flashcardsData.finalScore);
    } else if (terminalState.flashcardsData.nextCard) {
        nextQuestion(terminalState.flashcardsData.nextCard);
    } else {
        // For guest mode with local game state
        nextQuestionOrEnd();
    }
    
    // Clear stored data
    terminalState.flashcardsData.nextCard = null;
    terminalState.flashcardsData.gameComplete = false;
    terminalState.flashcardsData.finalScore = null;
}

function nextQuestion(nextCard) {
    terminalState.currentQuestionIndex++;
    setTimeout(() => showQuestion(nextCard), 1000);
}

function showFinalScore(score) {
    addOutput('');
    addOutput('🎉 Game Complete!');
    addOutput(`Score: ${score.correct_answers}/${score.total_questions}`);
    addOutput(`Accuracy: ${score.accuracy_percent.toFixed(1)}%`);
    exitFlashcards();
}

function exitFlashcards() {
    terminalState.flashcardsActive = false;
    terminalState.flashcardsData = null;
    terminalState.currentQuestionIndex = 0;
    addOutput('');
    addOutput('Thanks for playing! Type "help" for commands.');
}

function startMessageMode() {
    terminalState.messageMode = true;
    terminalState.messageData = {
        step: 'name',
        name: '',
        email: '',
        message: ''
    };
    
    addOutput('📩 Send me a message!');
    addOutput('');
    addOutput('Let\'s get your details:');
    addOutput('What\'s your name? (type your name or "cancel" to exit)');
    return '';
}

function handleMessageInput(input) {
    if (input.toLowerCase() === 'cancel') {
        exitMessageMode();
        return;
    }

    switch (terminalState.messageData.step) {
        case 'name':
            terminalState.messageData.name = input.trim();
            if (!terminalState.messageData.name) {
                addOutput('Please enter a valid name:');
                return;
            }
            terminalState.messageData.step = 'email';
            addOutput(`Nice to meet you, ${terminalState.messageData.name}!`);
            addOutput('What\'s your email address?');
            break;

        case 'email':
            if (!isValidEmail(input.trim())) {
                addOutput('Please enter a valid email address:');
                return;
            }
            terminalState.messageData.email = input.trim();
            terminalState.messageData.step = 'message';
            addOutput('Great! Now, what\'s your message?');
            break;

        case 'message':
            terminalState.messageData.message = input.trim();
            if (!terminalState.messageData.message) {
                addOutput('Please enter your message:');
                return;
            }
            sendMessage();
            break;
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function sendMessage() {
    addOutput('');
    addOutput('📤 Sending your message...');

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: terminalState.messageData.name,
                email: terminalState.messageData.email,
                message: terminalState.messageData.message
            })
        });

        if (response.ok) {
            addOutput('✅ Message sent successfully!');
            addOutput(`Thank you, ${terminalState.messageData.name}. I'll get back to you soon!`);
        } else {
            const errorData = await response.json();
            addOutput('❌ Failed to send message: ' + (errorData.error || 'Unknown error'));
        }
    } catch (error) {
        addOutput('❌ Failed to send message: Network error');
    }

    exitMessageMode();
}

function exitMessageMode() {
    terminalState.messageMode = false;
    terminalState.messageData = { step: 'name', name: '', email: '', message: '' };
    addOutput('');
    addOutput('Type "help" for available commands.');
}

function openVimEditor(filename) {
    if (!filename) {
        filename = 'untitled.py';
    }
    
    // Create and show the modal vim editor
    if (window.VimEditor) {
        const vimEditor = new window.VimEditor();
        const modal = vimEditor.createModal(filename);
        document.body.appendChild(modal);
        
        // Load file content into the vim editor
        loadFileIntoVimEditor(filename, vimEditor);
        
        // Make addOutput available to vim editor
        window.addOutput = addOutput;
    } else {
        return 'Error: Vim editor not available';
    }
    
    return ''; // Don't show any output, vim will handle display
}

async function loadFileIntoVimEditor(filename, vimEditor) {
    try {
        const response = await fetch(`/api/files/load?filename=${encodeURIComponent(filename)}`, {
            credentials: 'include'
        });
        if (response.ok) {
            const fileData = await response.json();
            vimEditor.initializeContent(fileData.content);
        } else if (response.status === 404) {
            // New file - use default content
            vimEditor.initializeContent();
        } else {
            vimEditor.initializeContent();
        }
    } catch (error) {
        // New file or error - start with default content
        vimEditor.initializeContent();
    }
}


// Terminal UI functions
function addOutput(output, isCommand = false) {
    if (output === '') return;
    
    // Handle test environment where terminalContent might not exist
    if (!terminalContent) {
        terminalContent = document.getElementById('terminalContent');
        if (!terminalContent) {
            // In test environment, just track the output
            if (typeof global !== 'undefined' && global.addOutputCalls) {
                global.addOutputCalls.push(output);
            }
            return;
        }
    }
    
    const currentLine = document.querySelector('.current-line');
    const outputDiv = document.createElement('div');
    outputDiv.className = 'output';
    
    if (isCommand) {
        outputDiv.innerHTML = `<span class="prompt">${getPrompt()}</span><span class="command">${output}</span>`;
    } else {
        outputDiv.innerHTML = output.replace(/\n/g, '<br>');
    }
    
    terminalContent.insertBefore(outputDiv, currentLine);
    scrollToBottom();
}

function getPrompt() {
    return `${terminalState.userName}@terminal:${terminalState.currentDirectory}$`;
}

function updatePrompt() {
    // Create a fresh command line with updated prompt
    refreshCurrentLine();
}

function refreshCurrentLine() {
    const currentLine = document.querySelector('.current-line');
    if (!currentLine) return;
    
    // Create new current line with updated prompt
    const newCurrentLine = document.createElement('div');
    newCurrentLine.className = 'terminal-line current-line';
    newCurrentLine.innerHTML = `
        <span class="prompt">${getPrompt()}</span>
        <span id="typedText" class="typed-text"></span>
        <span class="cursor">_</span>
        <input type="text" id="commandInput" class="command-input" autocomplete="off" autofocus>
    `;
    
    // Replace the old current line with the new one
    currentLine.parentNode.replaceChild(newCurrentLine, currentLine);
    
    // Update DOM references
    commandInput = document.getElementById('commandInput');
    typedText = document.getElementById('typedText');
    cursor = document.querySelector('.cursor');
    
    // Ensure focus and setup events for new input
    ensureFocus();
    setupInputEvents();
    scrollToBottom();
}

function scrollToBottom() {
    const terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
}


// Input handling functions
function processCommand(input) {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    
    // Add command to history
    commandHistory.unshift(trimmedInput);
    historyIndex = -1;
    
    // Display the command
    addOutput(trimmedInput, true);
    
    // Handle flashcard choice if awaiting
    if (terminalState.awaitingFlashcardChoice) {
        const result = handleFlashcardChoice(trimmedInput);
        if (result) addOutput(result);
        return;
    }
    
    // Handle flashcards input if active
    if (terminalState.flashcardsActive) {
        handleFlashcardsInput(trimmedInput);
        return;
    }
    
    // Handle message input if in message mode
    if (terminalState.messageMode) {
        handleMessageInput(trimmedInput);
        return;
    }
    
    // Handle login input if in login mode
    if (terminalState.loginMode) {
        handleLoginInput(trimmedInput);
        return;
    }
    
    // Handle register input if in register mode
    if (terminalState.registerMode) {
        handleRegisterInput(trimmedInput);
        return;
    }
    
    // Parse command and arguments
    const parts = trimmedInput.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Execute command
    if (commands[command]) {
        const result = commands[command].execute(args);
        if (result && typeof result.then === 'function') {
            // Handle async commands
            result.then(output => {
                if (output) {
                    addOutput(output);
                }
            }).catch(error => {
                addOutput(`Error: ${error.message}`);
            });
        } else if (result) {
            addOutput(result);
        }
    } else if (/^[1-4]$/.test(command)) {
        // Handle numbered project selection
        handleProjectSelection(parseInt(command));
    } else {
        addOutput(`Command not found: ${command}. Type 'help' for available commands.`);
    }
    
    // Special command handling
    if (command === 'clear') {
        // Clear was handled in the command function
        return;
    }
    
    
}

function handleKeyPress(event) {
    
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = commandInput.value;
        processCommand(input);
        commandInput.value = '';
        typedText.textContent = '';
        currentInput = '';
        return;
    }
    
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        navigateHistory('up');
        return;
    }
    
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        navigateHistory('down');
        return;
    }
    
    if (event.key === 'Tab') {
        event.preventDefault();
        handleTabCompletion();
        return;
    }
    
    // Update current input for history
    currentInput = commandInput.value;
}

function handleInput(event) {
    // Don't update display if in vim mode
    if (terminalState.vimMode) {
        return;
    }
    
    // Update the visual display of typed text
    if (typedText) {
        // Replace spaces with non-breaking spaces to ensure they're visible
        const value = event.target.value.replace(/ /g, '\u00A0');
        typedText.textContent = value;
    }
}

function handleTabCompletion() {
    const input = commandInput.value;
    const cursorPos = commandInput.selectionStart;
    const beforeCursor = input.substring(0, cursorPos);
    const afterCursor = input.substring(cursorPos);
    
    const completions = getCompletions(beforeCursor);
    
    if (completions.length === 1) {
        // Single completion - apply it
        const completion = completions[0];
        const newValue = completion + afterCursor;
        commandInput.value = newValue;
        typedText.textContent = newValue;
        commandInput.setSelectionRange(completion.length, completion.length);
    } else if (completions.length > 1) {
        // Multiple completions - show them
        showCompletions(completions);
    }
}

function getCompletions(input) {
    const parts = input.split(' ');
    
    if (parts.length === 1) {
        // Command completion
        const commandPrefix = parts[0];
        return Object.keys(commands)
            .filter(cmd => cmd.startsWith(commandPrefix))
            .map(cmd => cmd + ' ');
    } else if (parts.length >= 2) {
        // File/directory completion
        const command = parts[0];
        const pathPrefix = parts[parts.length - 1];
        
        if (command === 'cd' || command === 'cat' || command === 'ls') {
            return getPathCompletions(pathPrefix, input);
        }
    }
    
    return [];
}

function getPathCompletions(pathPrefix, fullInput) {
    const currentFiles = getDirectoryFiles(terminalState.currentDirectory);
    const matchingFiles = currentFiles.filter(file => file.startsWith(pathPrefix));
    
    return matchingFiles.map(file => {
        const beforeLastWord = fullInput.substring(0, fullInput.lastIndexOf(' ') + 1);
        const completion = beforeLastWord + file;
        
        // Add space after directories (those ending with /)
        if (file.endsWith('/')) {
            return completion;
        } else {
            return completion + ' ';
        }
    });
}

function showCompletions(completions) {
    if (completions.length === 0) return;
    
    // Show available completions
    const completionText = completions.map(comp => comp.trim()).join('  ');
    addOutput(`Available completions: ${completionText}`);
    
    // Find common prefix
    const commonPrefix = findCommonPrefix(completions);
    if (commonPrefix && commonPrefix.length > commandInput.value.length) {
        commandInput.value = commonPrefix;
        typedText.textContent = commonPrefix;
        commandInput.setSelectionRange(commonPrefix.length, commonPrefix.length);
    }
}

function findCommonPrefix(strings) {
    if (strings.length === 0) return '';
    if (strings.length === 1) return strings[0];
    
    const firstString = strings[0];
    let commonLength = 0;
    
    for (let i = 0; i < firstString.length; i++) {
        const char = firstString[i];
        if (strings.every(str => str[i] === char)) {
            commonLength = i + 1;
        } else {
            break;
        }
    }
    
    return firstString.substring(0, commonLength);
}

function navigateHistory(direction) {
    if (direction === 'up' && historyIndex < commandHistory.length - 1) {
        historyIndex++;
        commandInput.value = commandHistory[historyIndex];
        typedText.textContent = commandHistory[historyIndex];
    } else if (direction === 'down') {
        if (historyIndex > 0) {
            historyIndex--;
            commandInput.value = commandHistory[historyIndex];
            typedText.textContent = commandHistory[historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            commandInput.value = currentInput;
            typedText.textContent = currentInput;
        }
    }
}



// Focus management functions
// Global flag to control terminal focus management
window.terminalFocusEnabled = true;

function ensureFocus(event) {
    // Don't steal focus if user is selecting text
    if (window.getSelection && window.getSelection().toString().length > 0) {
        return;
    }
    
    // Don't steal focus if user is in the middle of a text selection
    if (event && (event.type === 'mousedown' || event.type === 'mouseup')) {
        // Check if this is part of a text selection gesture
        const selection = window.getSelection();
        if (selection && (selection.isCollapsed === false || event.detail > 1)) {
            return;
        }
    }
    
    // Always maintain focus on input to capture keyboard events, even in vim mode
    if (commandInput) {
        commandInput.focus();
    }
}


function setupFocusEvents() {
    if (!commandInput) return;
    
    // Re-focus when clicking anywhere, but allow text selection
    document.addEventListener('click', (event) => {
        // Don't focus if vim modal editor is open
        if (document.querySelector('.vim-editor-modal')) {
            return;
        }
        
        // Don't focus if user is selecting text or clicked on selectable content
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            return;
        }
        
        // Delay focus to allow text selection to complete
        setTimeout(() => ensureFocus(event), 100);
    });
    
    // Don't interfere with mousedown/mouseup for text selection
    // Only handle blur events
    commandInput.addEventListener('blur', (event) => {
        // Don't refocus if vim modal editor is open
        if (document.querySelector('.vim-editor-modal')) {
            return;
        }
        
        // Delay refocus to allow text selection
        setTimeout(() => ensureFocus(event), 50);
    });
}

function setupVisibilityEvents() {
    // Re-focus when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            ensureFocus();
        }
    });
    
    // Re-focus when window gains focus
    window.addEventListener('focus', ensureFocus);
}

function setupInputEvents() {
    if (!commandInput) return;
    
    commandInput.addEventListener('keydown', handleKeyPress);
    commandInput.addEventListener('input', handleInput);
}

function initializeInputFocus() {
    if (!commandInput) return;
    
    ensureFocus();
    // Force focus after a short delay to ensure DOM is ready
    setTimeout(ensureFocus, 100);
}

function setupModalEvents() {
    // Modal events removed - using terminal-based messaging instead
}

function setupEscapeKeyHandler() {
    // ESC key handling moved to vim.js for vim mode
}

// Initialize terminal

function initTerminal() {
    initializeInputFocus();
    setupFocusEvents();
    setupVisibilityEvents();
    setupInputEvents();
    setupModalEvents();
    setupEscapeKeyHandler();
}





// Make functions globally accessible
window.clearTerminal = clearTerminal;
window.navigateHistory = navigateHistory;

// Start terminal when page loads
document.addEventListener('DOMContentLoaded', initTerminal);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        terminalState,
        commands,
        showHelp,
        getHomeDirectoryFiles,
        getFlashcardsDirectoryFiles,
        getCloudSimulatorDirectoryFiles,
        getTextAdventureDirectoryFiles,
        getPortfolioTerminalDirectoryFiles,
        getProjectsDirectoryFiles,
        getDirectoryFiles,
        listDirectorySync,
        listDirectoryAsync,
        executeListDirectory,
        getProjectFiles,
        catFile,
        changeDirectory,
        runProject,
        showAbout,
        showSkills,
        showProjects,
        showContact,
        loginUser,
        handleProjectSelection,
        processCommand,
        getPrompt,
        updatePrompt,
        refreshCurrentLine,
        navigateHistory,
        ensureFocus,
        setupFocusEvents,
        setupVisibilityEvents,
        setupInputEvents,
        initializeInputFocus,
        setupModalEvents,
        setupEscapeKeyHandler,
        initTerminal,
        handleFlashcardChoice,
        startFlashcardsGuest,
        startFlashcardsLogin,
        enterFlashcardsDirectory,
        handleInvalidFlashcardChoice,
        setFlashcardsState,
        handleFlashcardsInput,
        selectCourse,
        isValidCourseSelection,
        exitFlashcards,
        startMessageMode,
        handleMessageInput,
        sendMessage,
        exitMessageMode,
        isValidEmail,
        openVimEditor,
        handleTabCompletion,
        getCompletions,
        getPathCompletions,
        showCompletions,
        findCommonPrefix,
        handleNextCommand
    };
}