package flashcards

import (
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestParseCourseID(t *testing.T) {
	tests := []struct {
		name      string
		courseID  string
		expected  int
		shouldErr bool
	}{
		{"Valid course ID", "123", 123, false},
		{"Invalid course ID", "abc", 0, true},
		{"Empty course ID", "", 0, true},
		{"Zero course ID", "0", 0, false},
		{"Negative course ID", "-1", -1, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a mock request with the course_id query parameter
			req := httptest.NewRequest("POST", "http://example.com/start?course_id="+tt.courseID, nil)
			
			result, err := parseCourseID(req)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
			if result != tt.expected {
				t.Errorf("Expected %d, got %d", tt.expected, result)
			}
		})
	}
}

func TestValidateAndGetFlashcards(t *testing.T) {
	t.Skip("Skipping database-dependent test - requires database setup")
	// Note: This test would require database setup in a real scenario
	// For now, we'll test the logic with mocked data
	
	t.Run("Empty flashcards", func(t *testing.T) {
		// This would normally call the database
		// For testing, we can mock this or use a test database
		_, err := validateAndGetFlashcards(999) // Non-existent course
		if err == nil {
			t.Errorf("Expected error for non-existent course")
		}
	})
}

func TestGenerateSessionID(t *testing.T) {
	courseID := 123
	sessionID := generateSessionID(courseID)
	
	if !strings.Contains(sessionID, "session_123_") {
		t.Errorf("Session ID should contain course ID, got: %s", sessionID)
	}
	
	// Test format - should be "session_{courseID}_{timestamp}"
	parts := strings.Split(sessionID, "_")
	if len(parts) != 3 {
		t.Errorf("Session ID should have 3 parts separated by underscores, got: %s", sessionID)
	}
	if parts[0] != "session" {
		t.Errorf("First part should be 'session', got: %s", parts[0])
	}
	if parts[1] != "123" {
		t.Errorf("Second part should be course ID '123', got: %s", parts[1])
	}
	// Third part should be a timestamp (numeric)
	if parts[2] == "" {
		t.Errorf("Timestamp part should not be empty")
	}
}

func TestCreateGameSession(t *testing.T) {
	courseID := 123
	flashcards := []Flashcard{
		{ID: 1, Question: "Q1", Answer: "A1", Time: 30},
		{ID: 2, Question: "Q2", Answer: "A2", Time: 45},
	}
	
	session := createGameSession(courseID, flashcards)
	
	if session.CourseID != courseID {
		t.Errorf("Expected course ID %d, got %d", courseID, session.CourseID)
	}
	if session.CurrentIndex != 0 {
		t.Errorf("Expected current index 0, got %d", session.CurrentIndex)
	}
	if len(session.Flashcards) != len(flashcards) {
		t.Errorf("Expected %d flashcards, got %d", len(flashcards), len(session.Flashcards))
	}
	if len(session.Scores) != 0 {
		t.Errorf("Expected empty scores, got %d", len(session.Scores))
	}
	if session.StartTime.IsZero() {
		t.Errorf("StartTime should be set")
	}
}

func TestStoreAndGetGameSession(t *testing.T) {
	sessionID := "test_session_123"
	session := &GameSession{
		CourseID:     123,
		CurrentIndex: 0,
		Flashcards:   []Flashcard{{ID: 1, Question: "Q1", Answer: "A1", Time: 30}},
		StartTime:    time.Now(),
		Scores:       []ScoreResult{},
	}
	
	// Test storing session
	storeGameSession(sessionID, session)
	
	// Test retrieving session
	retrievedSession, err := getGameSession(sessionID)
	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}
	if retrievedSession.CourseID != session.CourseID {
		t.Errorf("Expected course ID %d, got %d", session.CourseID, retrievedSession.CourseID)
	}
	
	// Test retrieving non-existent session
	_, err = getGameSession("non_existent_session")
	if err == nil {
		t.Errorf("Expected error for non-existent session")
	}
	
	// Clean up
	delete(gameSessions, sessionID)
}

func TestBuildStartGameResponse(t *testing.T) {
	sessionID := "test_session_123"
	flashcards := []Flashcard{
		{ID: 1, Question: "Q1", Answer: "A1", Time: 30},
		{ID: 2, Question: "Q2", Answer: "A2", Time: 45},
	}
	
	response := buildStartGameResponse(sessionID, flashcards)
	
	if response["session_id"] != sessionID {
		t.Errorf("Expected session_id %s, got %v", sessionID, response["session_id"])
	}
	if response["total_questions"] != len(flashcards) {
		t.Errorf("Expected total_questions %d, got %v", len(flashcards), response["total_questions"])
	}
	if response["first_card"] != flashcards[0] {
		t.Errorf("Expected first_card to be first flashcard")
	}
}

func TestGetSessionID(t *testing.T) {
	tests := []struct {
		name      string
		sessionID string
		shouldErr bool
	}{
		{"Valid session ID", "session_123", false},
		{"Empty session ID", "", true},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request with session_id parameter
			params := url.Values{}
			if tt.sessionID != "" {
				params.Set("session_id", tt.sessionID)
			}
			req := httptest.NewRequest("POST", "http://example.com/answer?"+params.Encode(), nil)
			
			sessionID, err := getSessionID(req)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
			if !tt.shouldErr && sessionID != tt.sessionID {
				t.Errorf("Expected session ID %s, got %s", tt.sessionID, sessionID)
			}
		})
	}
}

func TestValidateGameInProgress(t *testing.T) {
	tests := []struct {
		name         string
		currentIndex int
		totalCards   int
		shouldErr    bool
	}{
		{"Game in progress", 2, 5, false},
		{"Game at start", 0, 5, false},
		{"Game complete", 5, 5, true},
		{"Game over complete", 6, 5, true},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := &GameSession{
				CurrentIndex: tt.currentIndex,
				Flashcards:   make([]Flashcard, tt.totalCards),
			}
			
			err := validateGameInProgress(session)
			
			if tt.shouldErr && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.shouldErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
		})
	}
}

func TestCreateScoreResult(t *testing.T) {
	flashcardID := 123
	timeScore := 45
	isCorrect := true
	
	score := createScoreResult(flashcardID, timeScore, isCorrect)
	
	if score.FlashcardID != flashcardID {
		t.Errorf("Expected flashcard ID %d, got %d", flashcardID, score.FlashcardID)
	}
	if score.TimeScore != timeScore {
		t.Errorf("Expected time score %d, got %d", timeScore, score.TimeScore)
	}
	if score.CorrectAnswer != isCorrect {
		t.Errorf("Expected correct answer %v, got %v", isCorrect, score.CorrectAnswer)
	}
}

func TestCountCorrectAnswers(t *testing.T) {
	scores := []ScoreResult{
		{CorrectAnswer: true},
		{CorrectAnswer: false},
		{CorrectAnswer: true},
		{CorrectAnswer: true},
	}
	
	expected := 3
	result := countCorrectAnswers(scores)
	
	if result != expected {
		t.Errorf("Expected %d correct answers, got %d", expected, result)
	}
}

func TestCalculateTotalTime(t *testing.T) {
	scores := []ScoreResult{
		{TimeScore: 10},
		{TimeScore: 20},
		{TimeScore: 30},
	}
	
	expected := 60
	result := calculateTotalTime(scores)
	
	if result != expected {
		t.Errorf("Expected total time %d, got %d", expected, result)
	}
}

func TestCalculateAverageTime(t *testing.T) {
	tests := []struct {
		name          string
		totalTime     int
		questionCount int
		expected      float64
	}{
		{"Normal calculation", 60, 3, 20.0},
		{"Zero questions", 60, 0, 0.0},
		{"Zero time", 0, 3, 0.0},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateAverageTime(tt.totalTime, tt.questionCount)
			if result != tt.expected {
				t.Errorf("Expected average time %.1f, got %.1f", tt.expected, result)
			}
		})
	}
}

func TestCalculateAccuracyPercent(t *testing.T) {
	tests := []struct {
		name     string
		correct  int
		total    int
		expected float64
	}{
		{"Perfect score", 5, 5, 100.0},
		{"Half correct", 3, 6, 50.0},
		{"No correct", 0, 5, 0.0},
		{"Zero total", 5, 0, 0.0},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateAccuracyPercent(tt.correct, tt.total)
			if result != tt.expected {
				t.Errorf("Expected accuracy %.1f%%, got %.1f%%", tt.expected, result)
			}
		})
	}
}

func TestCalculateFinalScore(t *testing.T) {
	t.Run("Empty scores", func(t *testing.T) {
		scores := []ScoreResult{}
		finalScore := calculateFinalScore(scores)
		
		if finalScore.TotalQuestions != 0 {
			t.Errorf("Expected 0 total questions, got %d", finalScore.TotalQuestions)
		}
	})
	
	t.Run("Mixed scores", func(t *testing.T) {
		scores := []ScoreResult{
			{CorrectAnswer: true, TimeScore: 10},
			{CorrectAnswer: false, TimeScore: 20},
			{CorrectAnswer: true, TimeScore: 30},
		}
		
		finalScore := calculateFinalScore(scores)
		
		expectedTotal := 3
		expectedCorrect := 2
		expectedTotalTime := 60
		expectedAvgTime := 20.0
		expectedAccuracy := 66.66666666666667
		
		if finalScore.TotalQuestions != expectedTotal {
			t.Errorf("Expected %d total questions, got %d", expectedTotal, finalScore.TotalQuestions)
		}
		if finalScore.CorrectAnswers != expectedCorrect {
			t.Errorf("Expected %d correct answers, got %d", expectedCorrect, finalScore.CorrectAnswers)
		}
		if finalScore.TotalTime != expectedTotalTime {
			t.Errorf("Expected %d total time, got %d", expectedTotalTime, finalScore.TotalTime)
		}
		if finalScore.AverageTime != expectedAvgTime {
			t.Errorf("Expected %.1f average time, got %.1f", expectedAvgTime, finalScore.AverageTime)
		}
		// Use a tolerance for floating point comparison
		tolerance := 0.01
		if finalScore.AccuracyPercent < expectedAccuracy-tolerance || finalScore.AccuracyPercent > expectedAccuracy+tolerance {
			t.Errorf("Expected %.2f%% accuracy (±%.2f), got %.2f%%", expectedAccuracy, tolerance, finalScore.AccuracyPercent)
		}
	})
}

func TestCheckAnswer(t *testing.T) {
	tests := []struct {
		name          string
		userAnswer    string
		correctAnswer string
		expected      bool
	}{
		{"Exact match", "Paris", "Paris", true},
		{"Different case", "paris", "Paris", false}, // Current implementation is case-sensitive
		{"Wrong answer", "London", "Paris", false},
		{"Empty answer", "", "Paris", false},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := checkAnswer(tt.userAnswer, tt.correctAnswer)
			if result != tt.expected {
				t.Errorf("Expected %v for '%s' vs '%s', got %v", tt.expected, tt.userAnswer, tt.correctAnswer, result)
			}
		})
	}
}