const { expect } = require('chai');

// Mock global fetch
global.fetch = function() {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ questions: [] })
    });
};
global.Date = Date;

// Mock additional globals for flashcards
beforeEach(function() {
    global.clearInterval = function() {};
    
    // Mock DOM for flashcards tests
    global.document = {
        getElementById: function(id) {
            return { 
                textContent: '',
                value: '',
                disabled: false,
                style: { display: 'none' },
                addEventListener: function() {},
                focus: function() {}
            };
        },
        querySelector: function() { 
            return { textContent: '' }; 
        },
        createElement: function() {
            return {
                className: '',
                innerHTML: '',
                appendChild: function() {},
                style: { display: 'none' }
            };
        },
        addEventListener: function() {}
    };
});

const {
    gameState,
    elements,
    initializeElements,
    initializeGameState,
    validateQuestions,
    canSubmitAnswer,
    getCurrentAnswerData,
    updateScore,
    recordAnswer,
    calculateTotalGameTime,
    createGameCompletionData,
    calculateAccuracy,
    calculateAverageTime,
    updateResultsDisplay
} = require('../static/flashcards.js');

describe('Flashcards Game State Management', function() {
    beforeEach(function() {
        // Initialize elements and reset game state before each test
        initializeElements();
        gameState.courseId = null;
        gameState.questions = [];
        gameState.currentQuestionIndex = 0;
        gameState.score = 0;
        gameState.answers = [];
        gameState.startTime = null;
    });

    describe('initializeGameState', function() {
        it('should initialize game state with provided data', function() {
            const courseId = 'course123';
            const questions = [{ id: 1, question: 'Test?' }, { id: 2, question: 'Test2?' }];
            
            initializeGameState(courseId, questions);
            
            expect(gameState.courseId).to.equal('course123');
            expect(gameState.questions).to.deep.equal(questions);
            expect(gameState.currentQuestionIndex).to.equal(0);
            expect(gameState.score).to.equal(0);
            expect(gameState.answers).to.be.an('array').that.is.empty;
            expect(gameState.startTime).to.be.a('number');
        });

        it('should handle empty questions array', function() {
            initializeGameState('course123', []);
            
            expect(gameState.questions).to.be.an('array').that.is.empty;
        });

        it('should handle null questions', function() {
            initializeGameState('course123', null);
            
            expect(gameState.questions).to.be.an('array').that.is.empty;
        });
    });
});

describe('Question Validation', function() {
    describe('validateQuestions', function() {
        it('should return true for valid questions array', function() {
            const questions = [{ id: 1, question: 'Test?' }];
            expect(validateQuestions(questions)).to.be.true;
        });

        it('should return false for empty array', function() {
            expect(validateQuestions([])).to.be.false;
        });

        it('should return false for null', function() {
            expect(validateQuestions(null)).to.be.false;
        });

        it('should return false for undefined', function() {
            expect(validateQuestions(undefined)).to.be.false;
        });
    });
});

describe('Answer Submission Logic', function() {
    beforeEach(function() {
        // Initialize elements and set up for answer submission tests
        initializeElements();
        if (elements.submitAnswer) {
            elements.submitAnswer.disabled = false;
        }
    });

    describe('canSubmitAnswer', function() {
        it('should return true when submit button is not disabled', function() {
            elements.submitAnswer.disabled = false;
            expect(canSubmitAnswer(false)).to.be.true;
        });

        it('should return false when submit button is disabled and not timeout', function() {
            elements.submitAnswer.disabled = true;
            expect(canSubmitAnswer(false)).to.be.false;
        });

        it('should return true when timeout even if button is disabled', function() {
            elements.submitAnswer.disabled = true;
            expect(canSubmitAnswer(true)).to.be.true;
        });
    });

    describe('getCurrentAnswerData', function() {
        beforeEach(function() {
            initializeElements();
            if (elements.answerInput) {
                elements.answerInput.value = '  test answer  ';
            }
            gameState.questionStartTime = Date.now() - 5000; // 5 seconds ago
            gameState.currentQuestionIndex = 0;
            gameState.questions = [{ id: 1, question: 'Test question?' }];
        });

        it('should return trimmed answer and calculated time', function() {
            const data = getCurrentAnswerData();
            
            expect(data.answer).to.equal('test answer');
            expect(data.timeSpent).to.be.approximately(5, 1);
            expect(data.question).to.deep.equal({ id: 1, question: 'Test question?' });
        });

        it('should handle empty answer', function() {
            if (elements.answerInput) {
                elements.answerInput.value = '   ';
            }
            
            const data = getCurrentAnswerData();
            expect(data.answer).to.equal('');
        });
    });
});

describe('Score Management', function() {
    beforeEach(function() {
        gameState.score = 0;
        gameState.answers = [];
    });

    describe('updateScore', function() {
        it('should increment score when answer is correct', function() {
            updateScore(true);
            expect(gameState.score).to.equal(1);
        });

        it('should not increment score when answer is incorrect', function() {
            updateScore(false);
            expect(gameState.score).to.equal(0);
        });

        it('should handle multiple correct answers', function() {
            updateScore(true);
            updateScore(true);
            updateScore(false);
            updateScore(true);
            
            expect(gameState.score).to.equal(3);
        });
    });

    describe('recordAnswer', function() {
        it('should add answer to game state', function() {
            recordAnswer('q1', 'user answer', 'correct answer', true, 10);
            
            expect(gameState.answers).to.have.length(1);
            expect(gameState.answers[0]).to.deep.equal({
                questionId: 'q1',
                userAnswer: 'user answer',
                correctAnswer: 'correct answer',
                correct: true,
                timeSpent: 10
            });
        });

        it('should handle multiple answers', function() {
            recordAnswer('q1', 'answer1', 'correct1', true, 10);
            recordAnswer('q2', 'answer2', 'correct2', false, 15);
            
            expect(gameState.answers).to.have.length(2);
        });
    });
});

describe('Game Completion Logic', function() {
    beforeEach(function() {
        gameState.courseId = 'course123';
        gameState.score = 8;
        gameState.questions = new Array(10).fill({ id: 1 });
        gameState.answers = [
            { timeSpent: 10 },
            { timeSpent: 15 },
            { timeSpent: 20 }
        ];
        gameState.startTime = Date.now() - 60000; // 1 minute ago
    });

    describe('calculateTotalGameTime', function() {
        it('should calculate time difference in seconds', function() {
            const totalTime = calculateTotalGameTime();
            expect(totalTime).to.be.approximately(60, 5);
        });
    });

    describe('createGameCompletionData', function() {
        it('should create complete game data object', function() {
            const gameData = createGameCompletionData();
            
            expect(gameData).to.have.property('courseId', 'course123');
            expect(gameData).to.have.property('score', 8);
            expect(gameData).to.have.property('totalQuestions', 10);
            expect(gameData).to.have.property('answers');
            expect(gameData).to.have.property('totalTime');
            expect(gameData.totalTime).to.be.a('number');
        });
    });
});

describe('Results Calculation', function() {
    describe('calculateAccuracy', function() {
        it('should calculate accuracy percentage correctly', function() {
            expect(calculateAccuracy(8, 10)).to.equal(80);
            expect(calculateAccuracy(7, 10)).to.equal(70);
            expect(calculateAccuracy(10, 10)).to.equal(100);
            expect(calculateAccuracy(0, 10)).to.equal(0);
        });

        it('should handle edge cases', function() {
            expect(calculateAccuracy(1, 3)).to.equal(33); // rounds down
            expect(calculateAccuracy(2, 3)).to.equal(67); // rounds up
        });
    });

    describe('calculateAverageTime', function() {
        it('should calculate average time correctly', function() {
            const answers = [
                { timeSpent: 10 },
                { timeSpent: 20 },
                { timeSpent: 15 }
            ];
            
            expect(calculateAverageTime(answers)).to.equal(15);
        });

        it('should handle single answer', function() {
            const answers = [{ timeSpent: 25 }];
            expect(calculateAverageTime(answers)).to.equal(25);
        });

        it('should handle empty answers array', function() {
            expect(calculateAverageTime([])).to.equal(0);
        });

        it('should handle decimal averages', function() {
            const answers = [
                { timeSpent: 10 },
                { timeSpent: 11 }
            ];
            
            expect(calculateAverageTime(answers)).to.equal(10.5);
        });
    });
});

describe('UI Display Updates', function() {
    beforeEach(function() {
        initializeElements();
    });

    describe('updateResultsDisplay', function() {
        it('should update all result elements correctly', function() {
            updateResultsDisplay(8, 10, 80, 15.5);
            
            expect(elements.finalScore.textContent).to.equal('8/10');
            expect(elements.finalAccuracy.textContent).to.equal('80%');
            expect(elements.finalAvgTime.textContent).to.equal('16s'); // rounded
        });

        it('should handle zero scores', function() {
            updateResultsDisplay(0, 5, 0, 0);
            
            expect(elements.finalScore.textContent).to.equal('0/5');
            expect(elements.finalAccuracy.textContent).to.equal('0%');
            expect(elements.finalAvgTime.textContent).to.equal('0s');
        });

        it('should handle perfect scores', function() {
            updateResultsDisplay(10, 10, 100, 12.3);
            
            expect(elements.finalScore.textContent).to.equal('10/10');
            expect(elements.finalAccuracy.textContent).to.equal('100%');
            expect(elements.finalAvgTime.textContent).to.equal('12s');
        });
    });
});

describe('Integration Tests', function() {
    describe('Complete Game Flow Functions', function() {
        it('should handle complete answer recording flow', function() {
            gameState.score = 0;
            gameState.answers = [];
            
            // Simulate correct answer
            updateScore(true);
            recordAnswer('q1', 'correct', 'correct', true, 12);
            
            expect(gameState.score).to.equal(1);
            expect(gameState.answers).to.have.length(1);
            expect(gameState.answers[0].correct).to.be.true;
        });

        it('should handle complete results calculation flow', function() {
            const mockAnswers = [
                { timeSpent: 10 },
                { timeSpent: 15 },
                { timeSpent: 20 },
                { timeSpent: 25 }
            ];
            
            const accuracy = calculateAccuracy(3, 4);
            const avgTime = calculateAverageTime(mockAnswers);
            
            expect(accuracy).to.equal(75);
            expect(avgTime).to.equal(17.5);
        });
    });
});