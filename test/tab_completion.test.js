const { expect } = require('chai');

// Mock DOM elements for testing
global.commandInput = {
    value: '',
    selectionStart: 0,
    setSelectionRange: function(start, end) {
        this.selectionStart = start;
        this.selectionEnd = end;
    }
};

global.typedText = {
    textContent: ''
};

global.document = {
    getElementById: function(id) {
        if (id === 'commandInput') return global.commandInput;
        if (id === 'typedText') return global.typedText;
        return null;
    }
};

// Mock addOutput for testing
global.addOutputCalls = [];
global.addOutput = function(output) {
    global.addOutputCalls.push(output);
};

const {
    getCompletions,
    getPathCompletions,
    findCommonPrefix,
    commands,
    terminalState,
    getDirectoryFiles
} = require('../static/app.js');

describe('Tab Completion Functions', function() {
    beforeEach(function() {
        // Reset terminal state
        terminalState.currentDirectory = '~';
        global.addOutputCalls = [];
    });

    describe('getCompletions', function() {
        it('should return command completions for single word input', function() {
            const completions = getCompletions('he');
            expect(completions).to.include('help ');
        });

        it('should return all commands for empty input', function() {
            const completions = getCompletions('');
            expect(completions.length).to.equal(Object.keys(commands).length);
            expect(completions).to.include('help ');
            expect(completions).to.include('projects ');
            expect(completions).to.include('ls ');
        });

        it('should return exact command match', function() {
            const completions = getCompletions('help');
            expect(completions).to.deep.equal(['help ']);
        });

        it('should return multiple matching commands', function() {
            const completions = getCompletions('c');
            expect(completions).to.include('clear ');
            expect(completions).to.include('contact ');
            expect(completions).to.include('cat ');
            expect(completions).to.include('cd ');
        });

        it('should return no completions for non-matching input', function() {
            const completions = getCompletions('xyz');
            expect(completions).to.be.empty;
        });

        it('should handle file completion for cd command', function() {
            terminalState.currentDirectory = '~';
            const completions = getCompletions('cd pro');
            expect(completions).to.include('cd projects/');
        });

        it('should handle file completion for cat command', function() {
            terminalState.currentDirectory = '~';
            const completions = getCompletions('cat about');
            expect(completions).to.include('cat about.txt ');
        });

        it('should return empty for non-file commands with args', function() {
            const completions = getCompletions('help something');
            expect(completions).to.be.empty;
        });
    });

    describe('getPathCompletions', function() {
        it('should complete file names in home directory', function() {
            terminalState.currentDirectory = '~';
            const completions = getPathCompletions('about', 'cat about');
            expect(completions).to.include('cat about.txt ');
        });

        it('should complete directory names with slash', function() {
            terminalState.currentDirectory = '~';
            const completions = getPathCompletions('pro', 'cd pro');
            expect(completions).to.include('cd projects/');
        });

        it('should handle empty prefix', function() {
            terminalState.currentDirectory = '~';
            const completions = getPathCompletions('', 'ls ');
            const expectedFiles = getDirectoryFiles('~');
            expect(completions.length).to.equal(expectedFiles.length);
        });

        it('should handle no matches', function() {
            terminalState.currentDirectory = '~';
            const completions = getPathCompletions('xyz', 'cat xyz');
            expect(completions).to.be.empty;
        });

        it('should complete files in projects directory', function() {
            terminalState.currentDirectory = 'projects';
            const completions = getPathCompletions('flash', 'cd flash');
            expect(completions).to.include('cd flashcards/');
        });

        it('should preserve command structure', function() {
            terminalState.currentDirectory = '~';
            const completions = getPathCompletions('about', 'cat about');
            expect(completions[0]).to.match(/^cat about\.txt /);
        });
    });

    describe('findCommonPrefix', function() {
        it('should return empty string for empty array', function() {
            const prefix = findCommonPrefix([]);
            expect(prefix).to.equal('');
        });

        it('should return the string itself for single element', function() {
            const prefix = findCommonPrefix(['hello']);
            expect(prefix).to.equal('hello');
        });

        it('should find common prefix of multiple strings', function() {
            const prefix = findCommonPrefix(['hello', 'help', 'hero']);
            expect(prefix).to.equal('he');
        });

        it('should return full string when all are identical', function() {
            const prefix = findCommonPrefix(['test', 'test', 'test']);
            expect(prefix).to.equal('test');
        });

        it('should return empty string when no common prefix', function() {
            const prefix = findCommonPrefix(['abc', 'def', 'ghi']);
            expect(prefix).to.equal('');
        });

        it('should handle single character prefix', function() {
            const prefix = findCommonPrefix(['cat', 'clear', 'contact']);
            expect(prefix).to.equal('c');
        });

        it('should handle longer common prefixes', function() {
            const prefix = findCommonPrefix(['projects', 'projector']);
            expect(prefix).to.equal('project');
        });
    });

    describe('Integration Tests', function() {
        it('should complete "he" to "help "', function() {
            const completions = getCompletions('he');
            expect(completions).to.deep.equal(['help ']);
        });

        it('should show multiple completions for "c"', function() {
            const completions = getCompletions('c');
            expect(completions.length).to.be.greaterThan(1);
            expect(completions).to.include('cat ');
            expect(completions).to.include('cd ');
            expect(completions).to.include('clear ');
            expect(completions).to.include('contact ');
        });

        it('should complete file paths correctly', function() {
            terminalState.currentDirectory = '~';
            const completions = getCompletions('cd projects');
            expect(completions).to.include('cd projects/');
        });

        it('should handle nested directory completion', function() {
            terminalState.currentDirectory = 'projects';
            const completions = getCompletions('ls README');
            expect(completions).to.include('ls README.md ');
        });
    });

    describe('Edge Cases', function() {
        it('should handle whitespace in input', function() {
            const completions = getCompletions('  he  ');
            expect(completions).to.include('  help   ');
        });

        it('should handle multiple spaces between command and argument', function() {
            const completions = getCompletions('cd   pro');
            expect(completions).to.include('cd   projects/');
        });

        it('should handle commands with no file completion support', function() {
            const completions = getCompletions('whoami test');
            expect(completions).to.be.empty;
        });

        it('should handle invalid directory states', function() {
            terminalState.currentDirectory = 'nonexistent';
            const completions = getCompletions('ls test');
            expect(completions).to.be.empty;
        });
    });
});

describe('Tab Completion Functional Tests', function() {
    describe('Command Completion', function() {
        it('should complete partial commands correctly', function() {
            const testCases = [
                { input: 'h', expected: ['help '] },
                { input: 'pr', expected: ['projects '] },
                { input: 'sk', expected: ['skills '] },
                { input: 'ab', expected: ['about '] }
            ];

            testCases.forEach(({ input, expected }) => {
                const result = getCompletions(input);
                expect(result).to.deep.equal(expected);
            });
        });

        it('should handle case sensitivity', function() {
            const completions = getCompletions('HELP');
            expect(completions).to.be.empty; // Commands are case sensitive
        });
    });

    describe('File Path Completion', function() {
        it('should complete files in different directories', function() {
            // Test home directory
            terminalState.currentDirectory = '~';
            let completions = getCompletions('cat sk');
            expect(completions).to.include('cat skills.txt ');

            // Test projects directory
            terminalState.currentDirectory = 'projects';
            completions = getCompletions('cd flash');
            expect(completions).to.include('cd flashcards/');
        });

        it('should distinguish between files and directories', function() {
            terminalState.currentDirectory = '~';
            const completions = getCompletions('cat ');
            
            // Files should have space after completion
            const fileCompletions = completions.filter(c => c.includes('.txt'));
            fileCompletions.forEach(comp => {
                expect(comp).to.match(/.txt $/);
            });

            // Directories should end with /
            const dirCompletions = completions.filter(c => c.includes('projects'));
            dirCompletions.forEach(comp => {
                expect(comp).to.match(/projects\/$/);
            });
        });
    });
});