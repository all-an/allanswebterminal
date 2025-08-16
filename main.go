package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os/exec"

	"allanswebterminal/db"
	"allanswebterminal/handlers/messages"
	"allanswebterminal/handlers/flashcards"
	"allanswebterminal/handlers/login"
	"allanswebterminal/handlers/files"

	"github.com/joho/godotenv"
)

type PageData struct {
	Title   string
	Message string
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/home.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := PageData{
		Title:   "Simple Go Web App",
		Message: "Welcome to our simple webpage!",
	}

	err = tmpl.Execute(w, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func projectsHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/projects.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables or defaults")
	}

	if err := db.Connect(); err != nil {
		log.Printf("Database connection failed: %v", err)
		log.Println("Continuing without database...")
	} else {
		if err := db.RunMigrations(); err != nil {
			log.Printf("Migration failed: %v", err)
		}
	}

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static/"))))
	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/projects", projectsHandler)
	
	// Auth routes
	http.HandleFunc("/login", login.LoginPageHandler)
	http.HandleFunc("/register", login.RegisterPageHandler)
	http.HandleFunc("/logout", login.LogoutHandler)
	http.HandleFunc("/api/login", login.LoginAPIHandler)
	http.HandleFunc("/api/register", login.RegisterAPIHandler)
	http.HandleFunc("/api/check-username", login.CheckUsernameAPIHandler)
	
	// Flashcards routes
	http.HandleFunc("/flashcards", flashcards.FlashcardsPageHandler)
	http.HandleFunc("/api/flashcards/courses", flashcards.CoursesAPIHandler)
	http.HandleFunc("/api/flashcards/guest", flashcards.GuestFlashcardsAPIHandler)
	http.HandleFunc("/api/flashcards/start", flashcards.StartGameHandler)
	http.HandleFunc("/api/flashcards/start-guest", flashcards.StartGuestGameHandler)
	http.HandleFunc("/api/flashcards/answer", flashcards.SubmitAnswerHandler)
	
	// Messages route
	http.HandleFunc("/api/messages", messages.MessagesHandler)
	
	// File management routes
	http.HandleFunc("/api/files/save", files.SaveFileHandler)
	http.HandleFunc("/api/files/load", files.LoadFileHandler)
	http.HandleFunc("/api/files/list", files.ListFilesHandler)
	http.HandleFunc("/api/files/delete", files.DeleteFileHandler)

	// UnleashedJS demo endpoint
	http.HandleFunc("/run-ujs-demo", func(w http.ResponseWriter, r *http.Request) {
		// Execute the UnleashedJS demo
		cmd := exec.Command("go", "run", "./handlers/unleashedjs/unleashedjs.go")
		cmd.Dir = "."
		
		output, err := cmd.CombinedOutput()
		if err != nil {
			w.Header().Set("Content-Type", "text/plain")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Sprintf("Error running UnleashedJS demo: %v\n%s", err, string(output))))
			return
		}
		
		w.Header().Set("Content-Type", "text/plain")
		w.Write(output)
	})

	fmt.Println("Server running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
