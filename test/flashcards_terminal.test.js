const { expect } = require('chai');

// Mock fetch for terminal tests
global.fetch = function() {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            { id: 1, name: 'Course 1', description: 'First course' },
            { id: 2, name: 'Course 2', description: 'Second course' }
        ])
    });
};

// Mock DOM for testing
beforeEach(function() {
    global.terminalContent = {
        insertBefore: function() {},
        appendChild: function() {}
    };

    global.document = {
        getElementById: function(id) {
            if (id === 'terminalContent') return global.terminalContent;
            return null;
        },
        querySelector: function(selector) { 
            if (selector === '.current-line') {
                return {
                    querySelector: function() {
                        return { textContent: '' };
                    }
                };
            }
            return null; 
        },
        createElement: function() { return { className: '', innerHTML: '' }; },
        addEventListener: function() {}
    };
    
    global.window = { location: { href: '' } };
    global.setTimeout = function(fn) { fn(); return 1; };
    global.scrollToBottom = function() {};
    
    // Mock addOutput for testing
    global.addOutputCalls = [];
    global.addOutput = function(output) {
        global.addOutputCalls.push(output);
    };
    
    // Mock updatePrompt
    global.updatePrompt = function() {};
});

const {
    terminalState,
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
    handleNextCommand
} = require('../static/app.js');

describe('Flashcards Terminal Integration', function() {
    beforeEach(function() {
        // Reset terminal state
        terminalState.userName = 'guest';
        terminalState.isLoggedIn = false;
        terminalState.awaitingFlashcardChoice = false;
        terminalState.flashcardsActive = false;
        terminalState.flashcardsData = null;
        global.addOutputCalls = [];
    });

    describe('handleFlashcardChoice', function() {
        it('should handle guest choice', function() {
            const result = handleFlashcardChoice('guest');
            expect(result).to.equal('');
            expect(terminalState.awaitingFlashcardChoice).to.be.false;
            expect(global.addOutputCalls[0]).to.include('Starting Flashcards in Guest Mode');
        });

        it('should handle login choice when not logged in', function() {
            terminalState.isLoggedIn = false;
            const result = handleFlashcardChoice('login');
            expect(result).to.equal('');
            expect(global.addOutputCalls[0]).to.include('Please login first');
        });

        it('should handle login choice when logged in', function() {
            terminalState.isLoggedIn = true;
            const result = handleFlashcardChoice('login');
            expect(result).to.equal('');
            expect(global.addOutputCalls[0]).to.include('Starting Flashcards with progress saving');
        });

        it('should handle directory choice', function() {
            const result = handleFlashcardChoice('directory');
            expect(result).to.include('Type "ls" to see files');
            expect(terminalState.currentDirectory).to.equal('projects/flashcards');
        });

        it('should handle invalid choice', function() {
            const result = handleFlashcardChoice('invalid');
            expect(result).to.include('Invalid choice');
            expect(terminalState.awaitingFlashcardChoice).to.be.true;
        });

        it('should be case insensitive', function() {
            const result = handleFlashcardChoice('GUEST');
            expect(result).to.equal('');
            expect(global.addOutputCalls[0]).to.include('Starting Flashcards in Guest Mode');
        });
    });

    describe('flashcards state management', function() {
        it('should set flashcards state correctly', function() {
            const courses = [{ id: 1, name: 'Test Course' }];
            setFlashcardsState(courses, true);

            expect(terminalState.flashcardsActive).to.be.true;
            expect(terminalState.flashcardsData.courses).to.deep.equal(courses);
            expect(terminalState.flashcardsData.saveProgress).to.be.true;
            expect(terminalState.flashcardsData.awaitingCourseSelection).to.be.true;
        });

        it('should handle guest mode correctly', function() {
            const courses = [{ id: 1, name: 'Test Course' }];
            setFlashcardsState(courses, false);

            expect(terminalState.flashcardsData.saveProgress).to.be.false;
        });
    });

    describe('course selection', function() {
        beforeEach(function() {
            const courses = [
                { id: 1, name: 'Course 1' },
                { id: 2, name: 'Course 2' }
            ];
            setFlashcardsState(courses, true);
        });

        describe('isValidCourseSelection', function() {
            it('should validate correct course indices', function() {
                const courses = [{ id: 1 }, { id: 2 }];
                expect(isValidCourseSelection(0, courses)).to.be.true;
                expect(isValidCourseSelection(1, courses)).to.be.true;
            });

            it('should reject invalid course indices', function() {
                const courses = [{ id: 1 }, { id: 2 }];
                expect(isValidCourseSelection(-1, courses)).to.be.false;
                expect(isValidCourseSelection(2, courses)).to.be.false;
                expect(isValidCourseSelection(10, courses)).to.be.false;
            });

            it('should handle empty courses array', function() {
                const courses = [];
                expect(isValidCourseSelection(0, courses)).to.be.false;
            });
        });

        describe('selectCourse', function() {
            it('should select valid course', function() {
                global.addOutputCalls = [];
                selectCourse('1');
                expect(global.addOutputCalls[0]).to.include('Starting Course 1');
            });

            it('should handle invalid course number', function() {
                global.addOutputCalls = [];
                selectCourse('3');
                expect(global.addOutputCalls[0]).to.include('Invalid course number');
            });

            it('should handle non-numeric input', function() {
                global.addOutputCalls = [];
                selectCourse('abc');
                expect(global.addOutputCalls[0]).to.include('Invalid course number');
            });
        });
    });

    describe('flashcards input handling', function() {
        it('should handle quit command', function() {
            terminalState.flashcardsActive = true;
            global.addOutputCalls = [];
            
            handleFlashcardsInput('quit');
            
            expect(terminalState.flashcardsActive).to.be.false;
            expect(global.addOutputCalls).to.include('Thanks for playing! Type "help" for commands.');
        });

        it('should handle course selection', function() {
            const courses = [{ id: 1, name: 'Test Course' }];
            setFlashcardsState(courses, true);
            global.addOutputCalls = [];
            
            handleFlashcardsInput('1');
            
            expect(global.addOutputCalls[0]).to.include('Starting Test Course');
        });

        it('should handle case insensitive quit', function() {
            terminalState.flashcardsActive = true;
            
            handleFlashcardsInput('QUIT');
            
            expect(terminalState.flashcardsActive).to.be.false;
        });

        it('should handle next command when awaiting next', function() {
            terminalState.flashcardsActive = true;
            terminalState.flashcardsData = {
                awaitingNext: true,
                gameComplete: true,
                finalScore: {
                    total_questions: 3,
                    correct_answers: 2,
                    accuracy_percent: 66.7
                }
            };
            global.addOutputCalls = [];
            
            handleFlashcardsInput('next');
            
            expect(terminalState.flashcardsData.awaitingNext).to.be.false;
        });

        it('should reject non-next commands when awaiting next', function() {
            terminalState.flashcardsActive = true;
            terminalState.flashcardsData = {
                awaitingNext: true
            };
            global.addOutputCalls = [];
            
            handleFlashcardsInput('some other command');
            
            expect(global.addOutputCalls[0]).to.include('Please type "next" to continue');
            expect(terminalState.flashcardsData.awaitingNext).to.be.true;
        });

        it('should handle case insensitive next command', function() {
            terminalState.flashcardsActive = true;
            terminalState.flashcardsData = {
                awaitingNext: true,
                gameComplete: false,
                nextCard: null
            };
            global.addOutputCalls = [];
            
            handleFlashcardsInput('NEXT');
            
            expect(terminalState.flashcardsData.awaitingNext).to.be.false;
        });
    });

    describe('exit functionality', function() {
        it('should reset flashcards state on exit', function() {
            // Set up active state
            terminalState.flashcardsActive = true;
            terminalState.flashcardsData = { test: 'data' };
            terminalState.currentQuestionIndex = 5;
            
            global.addOutputCalls = [];
            exitFlashcards();
            
            expect(terminalState.flashcardsActive).to.be.false;
            expect(terminalState.flashcardsData).to.be.null;
            expect(terminalState.currentQuestionIndex).to.equal(0);
            expect(global.addOutputCalls).to.include('Thanks for playing! Type "help" for commands.');
        });
    });

    describe('integration with login system', function() {
        it('should require login for progress saving', function() {
            terminalState.isLoggedIn = false;
            
            const result = handleFlashcardChoice('login');
            
            expect(result).to.equal('');
            expect(global.addOutputCalls[0]).to.include('Please login first');
            expect(global.addOutputCalls[1]).to.include('Type: login allan');
        });

        it('should allow progress saving when logged in', function() {
            terminalState.isLoggedIn = true;
            terminalState.userName = 'john';
            
            const result = handleFlashcardChoice('login');
            
            expect(result).to.equal('');
            expect(global.addOutputCalls[0]).to.include('Starting Flashcards with progress saving');
        });
    });

    describe('handleNextCommand', function() {
        beforeEach(function() {
            terminalState.flashcardsData = {
                awaitingNext: true,
                gameComplete: false,
                nextCard: null,
                finalScore: null,
                totalQuestions: 3,
                gameFlashcards: [
                    { id: 1, question: 'Q1', answer: 'A1', time: 30 },
                    { id: 2, question: 'Q2', answer: 'A2', time: 30 },
                    { id: 3, question: 'Q3', answer: 'A3', time: 30 }
                ]
            };
            terminalState.currentQuestionIndex = 0;
            global.addOutputCalls = [];
            
            // Additional DOM mocks for this test
            global.document.querySelectorAll = function() {
                return [];
            };
        });

        it('should reset awaitingNext flag', function() {
            handleNextCommand();
            expect(terminalState.flashcardsData.awaitingNext).to.be.false;
        });

        it('should clear stored data after processing', function() {
            terminalState.flashcardsData.nextCard = { id: 1, question: 'test' };
            terminalState.flashcardsData.gameComplete = true;
            terminalState.flashcardsData.finalScore = { score: 10 };

            handleNextCommand();

            expect(terminalState.flashcardsData.nextCard).to.be.null;
            expect(terminalState.flashcardsData.gameComplete).to.be.false;
            expect(terminalState.flashcardsData.finalScore).to.be.null;
        });

        it('should handle game completion scenario', function() {
            terminalState.flashcardsData.gameComplete = true;
            terminalState.flashcardsData.finalScore = {
                total_questions: 3,
                correct_answers: 2,
                accuracy_percent: 66.7
            };

            handleNextCommand();

            expect(global.addOutputCalls).to.include('🎉 Game Complete!');
        });

        it('should handle next card scenario', function() {
            terminalState.flashcardsData.nextCard = {
                id: 2,
                question: 'Next question',
                answer: 'Next answer',
                time: 30
            };

            // Mock setTimeout to execute immediately
            const originalSetTimeout = global.setTimeout;
            global.setTimeout = function(fn) { fn(); return 1; };

            handleNextCommand();

            // Restore setTimeout
            global.setTimeout = originalSetTimeout;

            expect(terminalState.currentQuestionIndex).to.equal(1);
        });
    });
});

describe('Flashcards Terminal Display Functions', function() {
    beforeEach(function() {
        global.addOutputCalls = [];
    });

    describe('startFlashcardsGuest', function() {
        it('should display guest mode message', function() {
            const result = startFlashcardsGuest();
            
            expect(result).to.equal('');
            expect(global.addOutputCalls[0]).to.include('Starting Flashcards in Guest Mode');
            expect(global.addOutputCalls[1]).to.include('Note: Your progress will not be saved');
        });
    });

    describe('startFlashcardsLogin', function() {
        it('should handle not logged in state', function() {
            terminalState.isLoggedIn = false;
            
            const result = startFlashcardsLogin();
            
            expect(result).to.equal('');
            expect(global.addOutputCalls[0]).to.include('Please login first');
        });

        it('should handle logged in state', function() {
            terminalState.isLoggedIn = true;
            
            const result = startFlashcardsLogin();
            
            expect(result).to.equal('');
            expect(global.addOutputCalls[0]).to.include('Starting Flashcards with progress saving');
        });
    });

    describe('enterFlashcardsDirectory', function() {
        it('should change to flashcards directory', function() {
            const result = enterFlashcardsDirectory();
            
            expect(result).to.include('Type "ls" to see files');
            expect(terminalState.currentDirectory).to.equal('projects/flashcards');
        });
    });

    describe('handleInvalidFlashcardChoice', function() {
        it('should set awaiting choice state', function() {
            const result = handleInvalidFlashcardChoice();
            
            expect(result).to.include('Invalid choice');
            expect(terminalState.awaitingFlashcardChoice).to.be.true;
        });
    });
});