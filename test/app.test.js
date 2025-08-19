const { expect } = require('chai');

// Mock DOM for testing
beforeEach(function() {
    global.terminalContent = {
        insertBefore: function() {},
        appendChild: function() {}
    };

    global.document = {
        getElementById: function(id) {
            if (id === 'terminalContent') return global.terminalContent;
            return { 
                focus: function() {},
                addEventListener: function() {},
                style: { display: 'none' },
                querySelector: function() { 
                    return { textContent: '' }; 
                }
            };
        },
        querySelector: function(selector) { 
            if (selector === '.current-line') {
                return {
                    querySelector: function() {
                        return { textContent: '' };
                    },
                    parentNode: {
                        insertBefore: function() {},
                        replaceChild: function() {}
                    }
                };
            }
            return { textContent: 'guest@terminal:~$' }; 
        },
        addEventListener: function() {},
        createElement: function() {
            return {
                className: '',
                innerHTML: '',
                appendChild: function() {},
                cloneNode: function() { return this; }
            };
        }
    };
    
    global.window = {
        location: { href: '' }
    };
    
    // Mock functions that interact with DOM
    global.scrollToBottom = function() {};
    global.addOutput = function() {};
    global.updatePrompt = function() {};
});

const {
    terminalState,
    commands,
    showHelp,
    getHomeDirectoryFiles,
    getFlashcardsDirectoryFiles,
    getTextAdventureDirectoryFiles,
    getPortfolioTerminalDirectoryFiles,
    getDirectoryFiles,
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
    getPrompt
} = require('../static/app.js');

describe('Terminal State Management', function() {
    beforeEach(function() {
        // Reset terminal state
        terminalState.currentDirectory = '~';
        terminalState.userName = 'guest';
        terminalState.isLoggedIn = false;
    });

    describe('getPrompt', function() {
        it('should return correct prompt for guest user', function() {
            expect(getPrompt()).to.equal('guest@terminal:~$');
        });

        it('should return correct prompt for logged in user', function() {
            terminalState.userName = 'allan';
            expect(getPrompt()).to.equal('allan@terminal:~$');
        });

        it('should handle different directories', function() {
            terminalState.currentDirectory = 'projects';
            expect(getPrompt()).to.equal('guest@terminal:projects$');
        });
    });
});

describe('Command System', function() {
    describe('showHelp', function() {
        it('should return help text with available commands', function() {
            const result = showHelp();
            expect(result).to.include('Available commands:');
            expect(result).to.include('help');
            expect(result).to.include('whoami');
            expect(result).to.include('ls');
        });

        it('should include command descriptions', function() {
            const result = showHelp();
            expect(result).to.include('Show available commands');
            expect(result).to.include('Display current user');
        });
    });

    describe('Directory File Functions', function() {
        describe('getHomeDirectoryFiles', function() {
            it('should return empty array for home directory files', function() {
                const files = getHomeDirectoryFiles();
                expect(files).to.deep.equal([]);
            });
        });

        describe('getFlashcardsDirectoryFiles', function() {
            it('should return flashcards project files', function() {
                const files = getFlashcardsDirectoryFiles();
                expect(files).to.include('../');
                expect(files).to.include('README.md');
                expect(files).to.include('main.go');
                expect(files).to.include('handlers/');
                expect(files).to.include('templates/');
            });
        });

        describe('getDirectoryFiles', function() {
            it('should return empty array for home directory', function() {
                const files = getDirectoryFiles('~');
                expect(files).to.deep.equal([]);
            });

            it('should return correct files for flashcards directory', function() {
                const files = getDirectoryFiles('projects/flashcards');
                expect(files).to.include('README.md');
                expect(files).to.include('main.go');
            });

            it('should return empty array for unknown directory', function() {
                const files = getDirectoryFiles('unknown/path');
                expect(files).to.deep.equal([]);
            });
        });
    });


    describe('catFile', function() {
        beforeEach(function() {
            terminalState.currentDirectory = '~';
        });

        it('should return file contents for valid home files', function() {
            const result = catFile('about.txt');
            expect(result).to.include('Allan Pereira Abrahão');
            expect(result).to.include('Software Engineer');
        });

        it('should return project file contents when in project directory', function() {
            terminalState.currentDirectory = 'projects/flashcards';
            const result = catFile('README.md');
            expect(result).to.include('Interactive Flashcards System');
            expect(result).to.include('Go and vanilla JavaScript');
        });

        it('should return main.go content in flashcards directory', function() {
            terminalState.currentDirectory = 'projects/flashcards';
            const result = catFile('main.go');
            expect(result).to.include('package main');
            expect(result).to.include('Starting flashcards server');
        });

        it('should return error for invalid files', function() {
            const result = catFile('nonexistent.txt');
            expect(result).to.include('No such file or directory');
        });

        it('should return usage message when no filename provided', function() {
            const result = catFile();
            expect(result).to.include('missing file operand');
            expect(result).to.include('Usage: cat <filename>');
        });

        it('should handle binary files appropriately', function() {
            const result = catFile('resume.pdf');
            expect(result).to.include('Cannot display binary file');
        });
    });
});

describe('Content Display Functions', function() {
    describe('showAbout', function() {
        it('should return personal information', function() {
            const result = showAbout();
            expect(result).to.include('Allan Pereira Abrahão');
            expect(result).to.include('Software Engineer');
            expect(result).to.include('Brazil');
            expect(result).to.include('3+ years');
        });

        it('should include interests section', function() {
            const result = showAbout();
            expect(result).to.include('Interests:');
            expect(result).to.include('Microservices');
            expect(result).to.include('Cloud computing');
        });
    });

    describe('showSkills', function() {
        it('should include all major skill categories', function() {
            const result = showSkills();
            expect(result).to.include('Backend Technologies:');
            expect(result).to.include('Frontend Technologies:');
            expect(result).to.include('Databases:');
            expect(result).to.include('DevOps & Cloud:');
        });

        it('should include specific technologies', function() {
            const result = showSkills();
            expect(result).to.include('Java');
            expect(result).to.include('Go');
            expect(result).to.include('JavaScript');
            expect(result).to.include('PostgreSQL');
            expect(result).to.include('Docker');
            expect(result).to.include('AWS');
        });
    });

    describe('showProjects', function() {
        it('should include featured projects', function() {
            const result = showProjects();
            expect(result).to.include('Featured Projects:');
            expect(result).to.include('Interactive Flashcards');
            expect(result).to.include('Text Adventure');
        });

        it('should include project descriptions', function() {
            const result = showProjects();
            expect(result).to.include('Timed learning application');
            expect(result).to.include('Go backend');
        });

        it('should include numbered navigation instructions', function() {
            const result = showProjects();
            expect(result).to.include('Type the project number (1-4) to open it');
        });

        it('should not include URL references', function() {
            const result = showProjects();
            expect(result).to.not.include('URL: /projects');
        });
    });

    describe('showContact', function() {
        it('should include contact methods', function() {
            const result = showContact();
            expect(result).to.include('Contact Information:');
            expect(result).to.include('GitHub');
            expect(result).to.include('LinkedIn');
        });

        it('should include social media links', function() {
            const result = showContact();
            expect(result).to.include('https://github.com/all-an');
            expect(result).to.include('linkedin.com/in/allan-pereira-abrahao');
        });
    });
});

describe('User Authentication', function() {
    beforeEach(function() {
        terminalState.userName = 'guest';
        terminalState.isLoggedIn = false;
    });

    describe('loginUser', function() {
        it('should login successfully with any username', function() {
            const result = loginUser('john');
            expect(result).to.include('Welcome back, john');
            expect(terminalState.userName).to.equal('john');
            expect(terminalState.isLoggedIn).to.be.true;
        });

        it('should accept different usernames', function() {
            const result = loginUser('sarah');
            expect(result).to.include('Welcome back, sarah');
            expect(terminalState.userName).to.equal('sarah');
            expect(terminalState.isLoggedIn).to.be.true;
        });

        it('should be case insensitive', function() {
            const result = loginUser('ALLAN');
            expect(result).to.include('Welcome back');
            expect(terminalState.userName).to.equal('allan');
        });

        it('should require username parameter', function() {
            const result = loginUser();
            expect(result).to.include('Usage: login <username>');
            expect(result).to.include('Example: login john');
            expect(terminalState.userName).to.equal('guest');
        });
    });
});

describe('Command Validation', function() {
    it('should have all expected commands available', function() {
        const expectedCommands = [
            'help', 'whoami', 'pwd', 'ls', 'cat', 'clear',
            'about', 'skills', 'projects', 'contact', 'login'
        ];
        
        expectedCommands.forEach(cmd => {
            expect(commands).to.have.property(cmd);
            expect(commands[cmd]).to.have.property('description');
            expect(commands[cmd]).to.have.property('execute');
        });
    });

    it('should have proper command descriptions', function() {
        Object.keys(commands).forEach(cmd => {
            expect(commands[cmd].description).to.be.a('string');
            expect(commands[cmd].description.length).to.be.greaterThan(0);
        });
    });

    it('should have executable functions for all commands', function() {
        Object.keys(commands).forEach(cmd => {
            expect(commands[cmd].execute).to.be.a('function');
        });
    });
});

describe('Directory Navigation', function() {
    describe('changeDirectory', function() {
        beforeEach(function() {
            terminalState.currentDirectory = '~';
        });

        it('should require a path argument', function() {
            const result = changeDirectory();
            expect(result).to.include('missing operand');
            expect(result).to.include('Usage: cd <directory>');
        });

        it('should navigate back from project directory', function() {
            terminalState.currentDirectory = 'projects/flashcards';
            const result = changeDirectory('..');
            expect(result).to.equal('');
            expect(terminalState.currentDirectory).to.equal('~');
        });

        it('should navigate to projects directory', function() {
            const result = changeDirectory('projects');
            expect(result).to.equal('');
            expect(terminalState.currentDirectory).to.equal('projects');
        });

        it('should handle invalid directory', function() {
            const result = changeDirectory('nonexistent');
            expect(result).to.include('No such directory');
        });
    });

    describe('runProject', function() {
        let mockAddOutput;
        let addOutputCalls = [];
        
        beforeEach(function() {
            addOutputCalls = [];
            mockAddOutput = global.addOutput;
            global.addOutput = function(output) {
                addOutputCalls.push(output);
            };
            global.setTimeout = function(fn, delay) {
                return 123;
            };
            global.window = { location: { href: '' } };
        });
        
        afterEach(function() {
            global.addOutput = mockAddOutput;
        });

        it('should run flashcards project', function() {
            terminalState.currentDirectory = 'projects/flashcards';
            const result = runProject();
            expect(result).to.equal('');
            expect(addOutputCalls[0]).to.include('Starting Interactive Flashcards');
            expect(addOutputCalls[1]).to.include('localhost:8080');
        });

        it('should handle text-adventure project', function() {
            terminalState.currentDirectory = 'projects/text-adventure';
            const result = runProject();
            expect(result).to.include('still in development');
        });

        it('should handle portfolio-terminal project', function() {
            terminalState.currentDirectory = 'projects/portfolio-terminal';
            const result = runProject();
            expect(result).to.include('already running this project');
        });

        it('should handle non-project directory', function() {
            terminalState.currentDirectory = '~';
            const result = runProject();
            expect(result).to.include('No runnable project in current directory');
        });
    });

    describe('getProjectFiles', function() {
        it('should return flashcards project files', function() {
            const files = getProjectFiles('projects/flashcards');
            expect(files).to.have.property('README.md');
            expect(files).to.have.property('main.go');
            expect(files['README.md']).to.include('Interactive Flashcards System');
        });

        it('should return text-adventure project files', function() {
            const files = getProjectFiles('projects/text-adventure');
            expect(files).to.have.property('README.md');
            expect(files).to.have.property('game-engine.go');
            expect(files['README.md']).to.include('Text Adventure Game Engine');
        });

        it('should return empty object for non-project directory', function() {
            const files = getProjectFiles('~');
            expect(files).to.deep.equal({});
        });
    });
});

describe('Project Navigation', function() {
    describe('handleProjectSelection', function() {
        let mockAddOutput, mockSetTimeout;
        let addOutputCalls = [];
        
        beforeEach(function() {
            addOutputCalls = [];
            // Mock addOutput function
            global.addOutput = function(output) {
                addOutputCalls.push(output);
            };
            
            // Mock updatePrompt function
            global.updatePrompt = function() {};
            
            // Mock setTimeout
            mockSetTimeout = global.setTimeout;
            global.setTimeout = function(fn, delay) {
                return 123;
            };
            
            // Mock window.location
            global.window = {
                location: { href: '' }
            };
            
            // Reset terminal state
            terminalState.currentDirectory = '~';
        });
        
        afterEach(function() {
            global.setTimeout = mockSetTimeout;
        });

        it('should handle project 1 selection', function() {
            handleProjectSelection(1);
            expect(addOutputCalls[0]).to.include('Interactive Flashcards System');
            expect(addOutputCalls[1]).to.include('Choose how you want to play');
            expect(addOutputCalls).to.some(call => call.includes('guest'));
            expect(addOutputCalls).to.some(call => call.includes('login'));
        });

        it('should handle project 2 selection', function() {
            handleProjectSelection(2);
            expect(addOutputCalls[0]).to.include('Entering CloudSimulator');
            expect(terminalState.currentDirectory).to.equal('projects/cloudsimulator');
        });

        it('should handle project 3 selection', function() {
            handleProjectSelection(3);
            expect(addOutputCalls[0]).to.include('Entering Text Adventure Game');
            expect(terminalState.currentDirectory).to.equal('projects/text-adventure');
            expect(addOutputCalls[1]).to.include('currently in development');
        });

        it('should handle project 4 selection', function() {
            handleProjectSelection(4);
            expect(addOutputCalls[0]).to.include('Entering Portfolio Terminal');
            expect(terminalState.currentDirectory).to.equal('projects/portfolio-terminal');
            expect(addOutputCalls[1]).to.include('currently using this project');
        });

        it('should handle invalid project numbers', function() {
            handleProjectSelection(5);
            expect(addOutputCalls[0]).to.include('Invalid project number');
            expect(terminalState.currentDirectory).to.equal('~');
        });
    });
});

describe('Integration Tests', function() {
    describe('Command Execution Flow', function() {
        it('should handle basic command execution', function() {
            const whoamiResult = commands.whoami.execute();
            expect(whoamiResult).to.equal('guest');
            
            const helpResult = commands.help.execute();
            expect(helpResult).to.include('Available commands:');
        });

        it('should handle commands with arguments', async function() {
            const catResult = await commands.cat.execute(['about.txt']);
            expect(catResult).to.include('Allan Pereira');
            
            const loginResult = await commands.login.execute(['john']);
            expect(loginResult).to.include('Welcome back');
        });
    });

    describe('State Changes', function() {
        it('should maintain state across command executions', async function() {
            // Reset state first
            terminalState.userName = 'guest';
            terminalState.isLoggedIn = false;
            
            // Initial state
            expect(terminalState.userName).to.equal('guest');
            
            // Login
            await commands.login.execute(['john']);
            expect(terminalState.userName).to.equal('john');
            expect(terminalState.isLoggedIn).to.be.true;
            
            // Whoami should reflect new state
            const whoamiResult = await commands.whoami.execute();
            expect(whoamiResult).to.equal('john');
        });
    });
});