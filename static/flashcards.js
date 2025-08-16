// Flashcards Game State
let gameState = {
    courseId: null,
    sessionId: null,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    startTime: null,
    questionStartTime: null,
    answers: [],
    timer: null,
    timeLeft: 30
};

// DOM Elements
const elements = {
    coursesSection: null,
    questionSelectionSection: null,
    gameSection: null,
    resultsSection: null,
    questionNumber: null,
    totalQuestions: null,
    timer: null,
    questionText: null,
    answerInput: null,
    submitAnswer: null,
    feedback: null,
    feedbackTitle: null,
    feedbackText: null,
    nextQuestion: null,
    finalScore: null,
    finalAccuracy: null,
    finalAvgTime: null,
    playAgain: null,
    loadGuestQuestions: null,
    questionsPreview: null,
    selectAllQuestions: null,
    deselectAllQuestions: null,
    startSelectedQuestions: null,
    backToMenu: null
};

// Initialize DOM elements
function initializeElements() {
    elements.coursesSection = document.querySelector('.courses-section');
    elements.questionSelectionSection = document.getElementById('questionSelectionSection');
    elements.gameSection = document.getElementById('gameSection');
    elements.resultsSection = document.getElementById('resultsSection');
    elements.questionNumber = document.getElementById('questionNumber');
    elements.totalQuestions = document.getElementById('totalQuestions');
    elements.timer = document.getElementById('timer');
    elements.questionText = document.getElementById('questionText');
    elements.answerInput = document.getElementById('answerInput');
    elements.submitAnswer = document.getElementById('submitAnswer');
    elements.feedback = document.getElementById('feedback');
    elements.feedbackTitle = document.getElementById('feedbackTitle');
    elements.feedbackText = document.getElementById('feedbackText');
    elements.nextQuestion = document.getElementById('nextQuestion');
    elements.finalScore = document.getElementById('finalScore');
    elements.finalAccuracy = document.getElementById('finalAccuracy');
    elements.finalAvgTime = document.getElementById('finalAvgTime');
    elements.playAgain = document.getElementById('playAgain');
    elements.loadGuestQuestions = document.getElementById('loadGuestQuestions');
    elements.questionsPreview = document.getElementById('questionsPreview');
    elements.selectAllQuestions = document.getElementById('selectAllQuestions');
    elements.deselectAllQuestions = document.getElementById('deselectAllQuestions');
    elements.startSelectedQuestions = document.getElementById('startSelectedQuestions');
    elements.backToMenu = document.getElementById('backToMenu');
}

// Event Listeners
function attachEventListeners() {
    // Course selection buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('start-course')) {
            const courseId = e.target.dataset.courseId;
            startGame(courseId);
        }
    });

    // Submit answer button
    if (elements.submitAnswer) {
        elements.submitAnswer.addEventListener('click', submitAnswer);
    }

    // Enter key for answer submission
    if (elements.answerInput) {
        elements.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !elements.submitAnswer.disabled) {
                submitAnswer();
            }
        });
    }

    // Next question button
    if (elements.nextQuestion) {
        elements.nextQuestion.addEventListener('click', nextQuestion);
    }

    // Play again button
    if (elements.playAgain) {
        elements.playAgain.addEventListener('click', () => {
            resetGame();
            showCoursesSection();
        });
    }

    // Guest questions button
    if (elements.loadGuestQuestions) {
        elements.loadGuestQuestions.addEventListener('click', loadGuestQuestions);
    }

    // Back to menu button
    if (elements.backToMenu) {
        elements.backToMenu.addEventListener('click', () => {
            showCoursesSection();
        });
    }

    // Select all questions
    if (elements.selectAllQuestions) {
        elements.selectAllQuestions.addEventListener('click', selectAllQuestions);
    }

    // Deselect all questions
    if (elements.deselectAllQuestions) {
        elements.deselectAllQuestions.addEventListener('click', deselectAllQuestions);
    }

    // Start selected questions
    if (elements.startSelectedQuestions) {
        elements.startSelectedQuestions.addEventListener('click', startSelectedQuestions);
    }
}

// Fetch questions from API
async function fetchGameQuestions(courseId) {
    const response = await fetch(`/api/flashcards/start/${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
        throw new Error('Failed to start game');
    }
    
    return await response.json();
}

// Initialize game state
function initializeGameState(courseId, questions) {
    gameState.courseId = courseId;
    gameState.questions = questions || [];
    gameState.currentQuestionIndex = 0;
    gameState.score = 0;
    gameState.answers = [];
    gameState.startTime = Date.now();
}

// Validate questions availability
function validateQuestions(questions) {
    if (!questions || !Array.isArray(questions)) {
        return false;
    }
    return questions.length > 0;
}

// Setup game UI
function setupGameUI() {
    elements.totalQuestions.textContent = gameState.questions.length;
    showGameSection();
    displayCurrentQuestion();
}

// Start game with selected course
async function startGame(courseId) {
    try {
        showLoadingState();
        
        const data = await fetchGameQuestions(courseId);
        const questions = data.questions;
        
        if (!validateQuestions(questions)) {
            showError('No questions available for this course.');
            return;
        }
        
        initializeGameState(courseId, questions);
        setupGameUI();
        
    } catch (error) {
        console.error('Error starting game:', error);
        showError('Failed to start game. Please try again.');
    }
}

// Display current question
function displayCurrentQuestion() {
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        endGame();
        return;
    }
    
    const question = gameState.questions[gameState.currentQuestionIndex];
    
    elements.questionNumber.textContent = gameState.currentQuestionIndex + 1;
    elements.questionText.textContent = question.question;
    elements.answerInput.value = '';
    elements.answerInput.disabled = false;
    elements.submitAnswer.disabled = false;
    elements.answerInput.focus();
    
    gameState.questionStartTime = Date.now();
    gameState.timeLeft = 30;
    startTimer();
    hideFeedback();
}

// Start countdown timer
function startTimer() {
    clearInterval(gameState.timer);
    
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        elements.timer.textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            submitAnswer(true); // Auto-submit when time runs out
        }
    }, 1000);
}

// Check if answer submission is allowed
function canSubmitAnswer(isTimeout) {
    return !elements.submitAnswer.disabled || isTimeout;
}

// Get current answer data
function getCurrentAnswerData() {
    const answer = elements.answerInput.value.trim();
    const timeSpent = Math.round((Date.now() - gameState.questionStartTime) / 1000);
    const question = gameState.questions[gameState.currentQuestionIndex];
    
    return { answer, timeSpent, question };
}

// Disable answer input controls
function disableAnswerControls() {
    elements.answerInput.disabled = true;
    elements.submitAnswer.disabled = true;
}

// Submit answer to API
async function submitAnswerToAPI(questionId, answer, timeSpent) {
    const url = gameState.sessionId ? 
        `/api/flashcards/answer?session_id=${gameState.sessionId}` : 
        '/api/flashcards/answer';
        
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            flashcard_id: questionId,
            answer: answer,
            time_score: timeSpent
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to submit answer');
    }
    
    return await response.json();
}

// Update game score
function updateScore(isCorrect) {
    if (isCorrect) {
        gameState.score++;
    }
}

// Record answer in game state
function recordAnswer(questionId, userAnswer, correctAnswer, isCorrect, timeSpent) {
    gameState.answers.push({
        questionId: questionId,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        correct: isCorrect,
        timeSpent: timeSpent
    });
}

// Submit answer
async function submitAnswer(isTimeout = false) {
    if (!canSubmitAnswer(isTimeout)) {
        return;
    }
    
    clearInterval(gameState.timer);
    const { answer, timeSpent, question } = getCurrentAnswerData();
    
    disableAnswerControls();
    
    try {
        const result = await submitAnswerToAPI(question.id, answer, timeSpent);
        const isCorrect = result.correct;
        const correctAnswer = result.correct_answer || question.answer;
        
        updateScore(isCorrect);
        recordAnswer(question.id, answer, correctAnswer, isCorrect, timeSpent);
        showFeedback(isCorrect, correctAnswer, isTimeout);
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        showFeedback(false, question.answer, false);
    }
}

// Show feedback for answer
function showFeedback(isCorrect, correctAnswer, isTimeout = false) {
    if (isTimeout) {
        elements.feedbackTitle.textContent = 'Time\'s Up!';
        elements.feedbackText.textContent = `The correct answer was: ${correctAnswer}`;
        elements.feedback.style.backgroundColor = '#f39c12';
    } else if (isCorrect) {
        elements.feedbackTitle.textContent = 'Correct!';
        elements.feedbackText.textContent = 'Well done!';
        elements.feedback.style.backgroundColor = '#27ae60';
    } else {
        elements.feedbackTitle.textContent = 'Incorrect';
        elements.feedbackText.textContent = `The correct answer was: ${correctAnswer}`;
        elements.feedback.style.backgroundColor = '#e74c3c';
    }
    
    elements.feedback.style.display = 'block';
}

// Hide feedback
function hideFeedback() {
    elements.feedback.style.display = 'none';
}

// Move to next question
function nextQuestion() {
    gameState.currentQuestionIndex++;
    hideFeedback();
    
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        endGame();
    } else {
        displayCurrentQuestion();
    }
}

// Calculate total game time
function calculateTotalGameTime() {
    return Math.round((Date.now() - gameState.startTime) / 1000);
}

// Create game completion data
function createGameCompletionData() {
    return {
        courseId: gameState.courseId,
        score: gameState.score,
        totalQuestions: gameState.questions.length,
        answers: gameState.answers,
        totalTime: calculateTotalGameTime()
    };
}

// Submit game results to server
async function submitGameResults(gameData) {
    await fetch('/api/flashcards/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
    });
}

// End game and show results
async function endGame() {
    clearInterval(gameState.timer);
    
    try {
        const gameData = createGameCompletionData();
        await submitGameResults(gameData);
    } catch (error) {
        console.error('Error saving game results:', error);
    }
    
    showResultsSection();
    displayResults();
}

// Calculate accuracy percentage
function calculateAccuracy(score, totalQuestions) {
    return Math.round((score / totalQuestions) * 100);
}

// Calculate average time per question
function calculateAverageTime(answers) {
    if (answers.length === 0) return 0;
    const totalTime = answers.reduce((sum, answer) => sum + answer.timeSpent, 0);
    return totalTime / answers.length;
}

// Update results display
function updateResultsDisplay(score, totalQuestions, accuracy, avgTime) {
    elements.finalScore.textContent = `${score}/${totalQuestions}`;
    elements.finalAccuracy.textContent = `${accuracy}%`;
    elements.finalAvgTime.textContent = `${Math.round(avgTime)}s`;
}

// Display final results
function displayResults() {
    const totalQuestions = gameState.questions.length;
    const accuracy = calculateAccuracy(gameState.score, totalQuestions);
    const avgTime = calculateAverageTime(gameState.answers);
    
    updateResultsDisplay(gameState.score, totalQuestions, accuracy, avgTime);
}

// Guest Questions Functions
async function fetchGuestQuestions() {
    const response = await fetch('/api/flashcards/guest');
    if (!response.ok) {
        throw new Error('Failed to fetch guest questions');
    }
    return await response.json();
}

async function loadGuestQuestions() {
    try {
        const questions = await fetchGuestQuestions();
        if (!questions || questions.length === 0) {
            showError('No practice questions available.');
            return;
        }
        displayQuestionsForSelection(questions);
        showQuestionSelectionSection();
    } catch (error) {
        console.error('Error loading guest questions:', error);
        showError('Failed to load practice questions.');
    }
}

function displayQuestionsForSelection(questions) {
    elements.questionsPreview.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-preview-card';
        questionCard.innerHTML = `
            <div class="question-preview-header">
                <input type="checkbox" id="question_${question.id}" class="question-checkbox" data-question-id="${question.id}">
                <label for="question_${question.id}" class="question-checkbox-label">Question ${index + 1}</label>
                <span class="question-time">${question.time}s</span>
            </div>
            <div class="question-preview-content">
                <div class="question-text"><strong>Q:</strong> ${question.question}</div>
                <div class="answer-text"><strong>A:</strong> ${question.answer}</div>
            </div>
        `;
        elements.questionsPreview.appendChild(questionCard);
    });

    // Add event listeners to checkboxes
    document.querySelectorAll('.question-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateStartButtonState);
    });
}

function selectAllQuestions() {
    document.querySelectorAll('.question-checkbox').forEach(checkbox => {
        checkbox.checked = true;
    });
    updateStartButtonState();
}

function deselectAllQuestions() {
    document.querySelectorAll('.question-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateStartButtonState();
}

function updateStartButtonState() {
    const selectedQuestions = document.querySelectorAll('.question-checkbox:checked');
    elements.startSelectedQuestions.disabled = selectedQuestions.length === 0;
}

async function startSelectedQuestions() {
    const selectedQuestions = document.querySelectorAll('.question-checkbox:checked');
    const selectedIds = Array.from(selectedQuestions).map(cb => parseInt(cb.dataset.questionId));
    
    if (selectedIds.length === 0) {
        return;
    }

    try {
        const response = await fetch('/api/flashcards/start-guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flashcard_ids: selectedIds })
        });

        if (!response.ok) {
            throw new Error('Failed to start guest game');
        }

        const data = await response.json();
        gameState.sessionId = data.session_id;
        initializeGameState('guest', data.flashcards);
        setupGameUI();
    } catch (error) {
        console.error('Error starting selected questions:', error);
        showError('Failed to start practice session.');
    }
}

// UI State Management
function showCoursesSection() {
    elements.coursesSection.style.display = 'block';
    elements.questionSelectionSection.style.display = 'none';
    elements.gameSection.style.display = 'none';
    elements.resultsSection.style.display = 'none';
}

function showQuestionSelectionSection() {
    elements.coursesSection.style.display = 'none';
    elements.questionSelectionSection.style.display = 'block';
    elements.gameSection.style.display = 'none';
    elements.resultsSection.style.display = 'none';
}

function showGameSection() {
    elements.coursesSection.style.display = 'none';
    elements.questionSelectionSection.style.display = 'none';
    elements.gameSection.style.display = 'block';
    elements.resultsSection.style.display = 'none';
}

function showResultsSection() {
    elements.coursesSection.style.display = 'none';
    elements.questionSelectionSection.style.display = 'none';
    elements.gameSection.style.display = 'none';
    elements.resultsSection.style.display = 'block';
}

function showLoadingState() {
    elements.questionText.textContent = 'Loading questions...';
}

function showError(message) {
    elements.questionText.textContent = message;
    elements.answerInput.disabled = true;
    elements.submitAnswer.disabled = true;
}

// Reset game state
function resetGame() {
    clearInterval(gameState.timer);
    gameState = {
        courseId: null,
        sessionId: null,
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        startTime: null,
        questionStartTime: null,
        answers: [],
        timer: null,
        timeLeft: 30
    };
}

// Initialize application
function init() {
    initializeElements();
    attachEventListeners();
    showCoursesSection();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        gameState,
        elements,
        initializeElements,
        fetchGameQuestions,
        initializeGameState,
        validateQuestions,
        setupGameUI,
        startGame,
        canSubmitAnswer,
        getCurrentAnswerData,
        disableAnswerControls,
        submitAnswerToAPI,
        updateScore,
        recordAnswer,
        submitAnswer,
        calculateTotalGameTime,
        createGameCompletionData,
        submitGameResults,
        endGame,
        calculateAccuracy,
        calculateAverageTime,
        updateResultsDisplay,
        displayResults,
        resetGame
    };
}