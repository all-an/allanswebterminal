package flashcards

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"allanswebterminal/db"
	"allanswebterminal/handlers/login"
)

type Flashcard struct {
	ID       int    `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Time     int    `json:"time"` // time limit in seconds
}

type Course struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type GameSession struct {
	CourseID      int           `json:"course_id"`
	CurrentIndex  int           `json:"current_index"`
	Flashcards    []Flashcard   `json:"flashcards"`
	StartTime     time.Time     `json:"start_time"`
	Scores        []ScoreResult `json:"scores"`
}

type ScoreResult struct {
	FlashcardID   int  `json:"flashcard_id"`
	TimeScore     int  `json:"time_score"`     // time taken in seconds
	CorrectAnswer bool `json:"correct_answer"`
}

type AnswerRequest struct {
	Answer      string `json:"answer"`
	TimeScore   int    `json:"time_score"`
	FlashcardID int    `json:"flashcard_id"`
}

type AnswerResponse struct {
	Correct       bool        `json:"correct"`
	CorrectAnswer string      `json:"correct_answer"`
	NextCard      *Flashcard  `json:"next_card"`
	GameComplete  bool        `json:"game_complete"`
	FinalScore    *FinalScore `json:"final_score,omitempty"`
}

type FinalScore struct {
	TotalQuestions    int     `json:"total_questions"`
	CorrectAnswers    int     `json:"correct_answers"`
	AverageTime       float64 `json:"average_time"`
	TotalTime         int     `json:"total_time"`
	AccuracyPercent   float64 `json:"accuracy_percent"`
}

var gameSessions = make(map[string]*GameSession)

func FlashcardsPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	courses, err := getAllCourses()
	if err != nil {
		log.Printf("Error getting courses: %v", err)
		http.Error(w, "Error loading courses", http.StatusInternalServerError)
		return
	}

	tmpl, err := template.ParseFiles("templates/flashcards.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := struct {
		Courses []Course
	}{
		Courses: courses,
	}

	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func CoursesAPIHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	courses, err := getAllCourses()
	if err != nil {
		log.Printf("Error getting courses: %v", err)
		http.Error(w, "Error loading courses", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(courses)
}

func GuestFlashcardsAPIHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	flashcards, err := getGuestFlashcards()
	if err != nil {
		log.Printf("Error getting guest flashcards: %v", err)
		http.Error(w, "Error loading flashcards", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(flashcards)
}

func StartGameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	courseID, err := parseCourseID(r)
	if err != nil {
		http.Error(w, "Invalid course ID", http.StatusBadRequest)
		return
	}

	flashcards, err := validateAndGetFlashcards(courseID)
	if err != nil {
		if err.Error() == "no flashcards found" {
			http.Error(w, "No flashcards found for this course", http.StatusNotFound)
		} else {
			log.Printf("Error getting flashcards: %v", err)
			http.Error(w, "Error loading flashcards", http.StatusInternalServerError)
		}
		return
	}

	session := createGameSession(courseID, flashcards)
	sessionID := generateSessionID(courseID)
	storeGameSession(sessionID, session)

	response := buildStartGameResponse(sessionID, flashcards)
	json.NewEncoder(w).Encode(response)
}

func StartGuestGameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Parse selected flashcard IDs from request body
	var req struct {
		FlashcardIDs []int `json:"flashcard_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if len(req.FlashcardIDs) == 0 {
		http.Error(w, "No flashcards selected", http.StatusBadRequest)
		return
	}

	flashcards, err := getSelectedFlashcards(req.FlashcardIDs)
	if err != nil {
		log.Printf("Error getting selected flashcards: %v", err)
		http.Error(w, "Error loading flashcards", http.StatusInternalServerError)
		return
	}

	if len(flashcards) == 0 {
		http.Error(w, "No valid flashcards found", http.StatusNotFound)
		return
	}

	session := createGuestGameSession(flashcards)
	sessionID := generateGuestSessionID()
	storeGameSession(sessionID, session)

	response := buildStartGameResponse(sessionID, flashcards)
	json.NewEncoder(w).Encode(response)
}

func SubmitAnswerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	sessionID, err := getSessionID(r)
	if err != nil {
		http.Error(w, "Session ID required", http.StatusBadRequest)
		return
	}

	session, err := getGameSession(sessionID)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusBadRequest)
		return
	}

	var req AnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if err := validateGameInProgress(session); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	currentCard := session.Flashcards[session.CurrentIndex]
	isCorrect := checkAnswer(req.Answer, currentCard.Answer)

	score := createScoreResult(currentCard.ID, req.TimeScore, isCorrect)
	session.Scores = append(session.Scores, score)

	saveScoreIfLoggedIn(r, score)
	session.CurrentIndex++

	response := buildAnswerResponse(isCorrect, currentCard.Answer, session, sessionID)
	json.NewEncoder(w).Encode(response)
}

func getAllCourses() ([]Course, error) {
	query := "SELECT id, name, description FROM courses ORDER BY name"
	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []Course
	for rows.Next() {
		var course Course
		err := rows.Scan(&course.ID, &course.Name, &course.Description)
		if err != nil {
			return nil, err
		}
		courses = append(courses, course)
	}

	// Ensure we return an empty slice instead of nil
	if courses == nil {
		courses = []Course{}
	}

	return courses, nil
}

func getFlashcardsByCourse(courseID int) ([]Flashcard, error) {
	query := `
		SELECT f.id, f.question, f.answer, f.time 
		FROM flashcards f
		JOIN course_flashcards cf ON f.id = cf.flashcard_id
		WHERE cf.course_id = $1
		ORDER BY cf.order_index
	`

	rows, err := db.DB.Query(query, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flashcards []Flashcard
	for rows.Next() {
		var card Flashcard
		err := rows.Scan(&card.ID, &card.Question, &card.Answer, &card.Time)
		if err != nil {
			return nil, err
		}
		flashcards = append(flashcards, card)
	}

	return flashcards, nil
}

func getGuestFlashcards() ([]Flashcard, error) {
	query := `
		SELECT f.id, f.question, f.answer, f.time 
		FROM flashcards f
		WHERE f.id NOT IN (
			SELECT DISTINCT cf.flashcard_id 
			FROM course_flashcards cf
		)
		ORDER BY f.id
	`

	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flashcards []Flashcard
	for rows.Next() {
		var card Flashcard
		err := rows.Scan(&card.ID, &card.Question, &card.Answer, &card.Time)
		if err != nil {
			return nil, err
		}
		flashcards = append(flashcards, card)
	}

	return flashcards, nil
}

func checkAnswer(userAnswer, correctAnswer string) bool {
	// Simple exact comparison
	// You can make this more sophisticated (case-insensitive, trim spaces, handle synonyms, etc.)
	return strings.TrimSpace(userAnswer) == strings.TrimSpace(correctAnswer)
}

func saveScore(accountID int, score ScoreResult) error {
	query := `
		INSERT INTO account_score (account_id, flashcard_id, time_score, correct_answer) 
		VALUES ($1, $2, $3, $4)
	`
	_, err := db.DB.Exec(query, accountID, score.FlashcardID, score.TimeScore, score.CorrectAnswer)
	return err
}

// Helper functions for StartGameHandler
func parseCourseID(r *http.Request) (int, error) {
	courseIDStr := r.URL.Query().Get("course_id")
	return strconv.Atoi(courseIDStr)
}

func validateAndGetFlashcards(courseID int) ([]Flashcard, error) {
	flashcards, err := getFlashcardsByCourse(courseID)
	if err != nil {
		return nil, err
	}
	
	if len(flashcards) == 0 {
		return nil, fmt.Errorf("no flashcards found")
	}
	
	return flashcards, nil
}

func generateSessionID(courseID int) string {
	return fmt.Sprintf("session_%d_%d", courseID, time.Now().Unix())
}

func generateGuestSessionID() string {
	return fmt.Sprintf("guest_session_%d", time.Now().Unix())
}

func createGameSession(courseID int, flashcards []Flashcard) *GameSession {
	return &GameSession{
		CourseID:     courseID,
		CurrentIndex: 0,
		Flashcards:   flashcards,
		StartTime:    time.Now(),
		Scores:       make([]ScoreResult, 0),
	}
}

func createGuestGameSession(flashcards []Flashcard) *GameSession {
	return &GameSession{
		CourseID:     -1, // Use -1 to indicate guest session
		CurrentIndex: 0,
		Flashcards:   flashcards,
		StartTime:    time.Now(),
		Scores:       make([]ScoreResult, 0),
	}
}

func getSelectedFlashcards(flashcardIDs []int) ([]Flashcard, error) {
	if len(flashcardIDs) == 0 {
		return []Flashcard{}, nil
	}

	// Create placeholder string for SQL IN clause
	placeholders := make([]string, len(flashcardIDs))
	args := make([]interface{}, len(flashcardIDs))
	for i, id := range flashcardIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, question, answer, time 
		FROM flashcards 
		WHERE id IN (%s)
		ORDER BY id
	`, strings.Join(placeholders, ","))

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flashcards []Flashcard
	for rows.Next() {
		var card Flashcard
		err := rows.Scan(&card.ID, &card.Question, &card.Answer, &card.Time)
		if err != nil {
			return nil, err
		}
		flashcards = append(flashcards, card)
	}

	return flashcards, nil
}

func storeGameSession(sessionID string, session *GameSession) {
	gameSessions[sessionID] = session
}

func buildStartGameResponse(sessionID string, flashcards []Flashcard) map[string]interface{} {
	return map[string]interface{}{
		"session_id":      sessionID,
		"total_questions": len(flashcards),
		"first_card":      flashcards[0],
		"flashcards":      flashcards, // Include all flashcards for guest mode
	}
}

// Helper functions for SubmitAnswerHandler
func getSessionID(r *http.Request) (string, error) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		return "", fmt.Errorf("session ID required")
	}
	return sessionID, nil
}

func getGameSession(sessionID string) (*GameSession, error) {
	session, exists := gameSessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("invalid session")
	}
	return session, nil
}

func validateGameInProgress(session *GameSession) error {
	if session.CurrentIndex >= len(session.Flashcards) {
		return fmt.Errorf("game already complete")
	}
	return nil
}

func createScoreResult(flashcardID, timeScore int, isCorrect bool) ScoreResult {
	return ScoreResult{
		FlashcardID:   flashcardID,
		TimeScore:     timeScore,
		CorrectAnswer: isCorrect,
	}
}

func saveScoreIfLoggedIn(r *http.Request, score ScoreResult) {
	user, _ := login.GetCurrentUser(r)
	if user != nil {
		saveScore(user.ID, score)
	}
}

func buildAnswerResponse(isCorrect bool, correctAnswer string, session *GameSession, sessionID string) AnswerResponse {
	response := AnswerResponse{
		Correct:       isCorrect,
		CorrectAnswer: correctAnswer,
	}

	if session.CurrentIndex >= len(session.Flashcards) {
		// Game complete
		response.GameComplete = true
		response.FinalScore = calculateFinalScore(session.Scores)
		delete(gameSessions, sessionID)
	} else {
		// Next question
		response.NextCard = &session.Flashcards[session.CurrentIndex]
	}

	return response
}

// Helper functions for score calculation
func countCorrectAnswers(scores []ScoreResult) int {
	correct := 0
	for _, score := range scores {
		if score.CorrectAnswer {
			correct++
		}
	}
	return correct
}

func calculateTotalTime(scores []ScoreResult) int {
	totalTime := 0
	for _, score := range scores {
		totalTime += score.TimeScore
	}
	return totalTime
}

func calculateAverageTime(totalTime int, questionCount int) float64 {
	if questionCount == 0 {
		return 0
	}
	return float64(totalTime) / float64(questionCount)
}

func calculateAccuracyPercent(correct int, total int) float64 {
	if total == 0 {
		return 0
	}
	return (float64(correct) / float64(total)) * 100
}

func calculateFinalScore(scores []ScoreResult) *FinalScore {
	if len(scores) == 0 {
		return &FinalScore{}
	}

	correct := countCorrectAnswers(scores)
	totalTime := calculateTotalTime(scores)
	avgTime := calculateAverageTime(totalTime, len(scores))
	accuracy := calculateAccuracyPercent(correct, len(scores))

	return &FinalScore{
		TotalQuestions:  len(scores),
		CorrectAnswers:  correct,
		AverageTime:     avgTime,
		TotalTime:       totalTime,
		AccuracyPercent: accuracy,
	}
}