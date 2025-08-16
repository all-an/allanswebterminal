package db

import (
	"fmt"
	"log"
)

type Migration struct {
	Version int
	Name    string
	Up      string
	Down    string
}

var migrations = []Migration{
	{
		Version: 1,
		Name:    "create_messages_table",
		Up: `
			CREATE TABLE IF NOT EXISTS messages (
				id SERIAL PRIMARY KEY,
				email VARCHAR(255) NOT NULL,
				name VARCHAR(100) NOT NULL,
				message TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`,
		Down: `DROP TABLE IF EXISTS messages;`,
	},
	{
		Version: 2,
		Name:    "create_accounts_table",
		Up: `
			CREATE TABLE IF NOT EXISTS accounts (
				id SERIAL PRIMARY KEY,
				username VARCHAR(50) UNIQUE NOT NULL,
				password VARCHAR(255) NOT NULL,
				role VARCHAR(20) DEFAULT 'user',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`,
		Down: `DROP TABLE IF EXISTS accounts;`,
	},
	{
		Version: 3,
		Name:    "create_flashcards_table",
		Up: `
			CREATE TABLE IF NOT EXISTS flashcards (
				id SERIAL PRIMARY KEY,
				question TEXT NOT NULL,
				answer TEXT NOT NULL,
				time INTEGER NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`,
		Down: `DROP TABLE IF EXISTS flashcards;`,
	},
	{
		Version: 4,
		Name:    "create_courses_table",
		Up: `
			CREATE TABLE IF NOT EXISTS courses (
				id SERIAL PRIMARY KEY,
				name VARCHAR(100) NOT NULL,
				description TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`,
		Down: `DROP TABLE IF EXISTS courses;`,
	},
	{
		Version: 5,
		Name:    "create_course_flashcards_table",
		Up: `
			CREATE TABLE IF NOT EXISTS course_flashcards (
				id SERIAL PRIMARY KEY,
				course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
				flashcard_id INTEGER REFERENCES flashcards(id) ON DELETE CASCADE,
				order_index INTEGER DEFAULT 0,
				UNIQUE(course_id, flashcard_id)
			);
		`,
		Down: `DROP TABLE IF EXISTS course_flashcards;`,
	},
	{
		Version: 6,
		Name:    "create_account_score_table",
		Up: `
			CREATE TABLE IF NOT EXISTS account_score (
				id SERIAL PRIMARY KEY,
				account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
				flashcard_id INTEGER REFERENCES flashcards(id) ON DELETE CASCADE,
				time_score INTEGER NOT NULL,
				correct_answer BOOLEAN NOT NULL,
				answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`,
		Down: `DROP TABLE IF EXISTS account_score;`,
	},
	{
		Version: 7,
		Name:    "create_account_course_table",
		Up: `
			CREATE TABLE IF NOT EXISTS account_course (
				id SERIAL PRIMARY KEY,
				account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
				course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
				enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(account_id, course_id)
			);
		`,
		Down: `DROP TABLE IF EXISTS account_course;`,
	},
	{
		Version: 8,
		Name:    "add_account_id_to_courses",
		Up: `
			ALTER TABLE courses 
			ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
		`,
		Down: `
			ALTER TABLE courses 
			DROP COLUMN IF EXISTS account_id;
		`,
	},
	{
		Version: 9,
		Name:    "clean_flashcards_completely",
		Up: `
			-- Completely clean all flashcard related data
			DELETE FROM account_score;
			DELETE FROM course_flashcards;
			DELETE FROM flashcards;
			
			-- Insert 5 vocabulary questions and 5 grammar questions
			INSERT INTO flashcards (question, answer, time) VALUES
			-- Vocabulary Questions
			('What does "perspicacious" mean?', 'Having keen insight or discernment; perceptive', 35),
			('Define "ubiquitous"', 'Present everywhere at the same time', 30),
			('What is a "sycophant"?', 'A person who seeks favor by flattering influential people', 35),
			('Explain "ephemeral"', 'Lasting for a very short time', 30),
			('What does "fastidious" mean?', 'Very attentive to accuracy and detail; meticulous', 35),
			-- Grammar Questions
			('Which is correct: "Between you and I" or "Between you and me"?', 'Between you and me', 25),
			('What is the past participle of "lie" (to recline)?', 'lain', 30),
			('When do you use "who" vs "whom"?', 'Use "who" for subjects, "whom" for objects', 40),
			('Is it "I could care less" or "I couldn''t care less"?', 'I couldn''t care less', 25),
			('What''s wrong with: "Me and John went to the store"?', 'Should be "John and I went to the store"', 35);
		`,
		Down: `
			-- Remove all flashcards
			DELETE FROM account_score;
			DELETE FROM course_flashcards;
			DELETE FROM flashcards;
		`,
	},
	{
		Version: 10,
		Name:    "create_user_files_table",
		Up: `
			CREATE TABLE IF NOT EXISTS user_files (
				id SERIAL PRIMARY KEY,
				account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
				filename VARCHAR(255) NOT NULL,
				content TEXT NOT NULL,
				file_type VARCHAR(20) DEFAULT 'python',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(account_id, filename)
			);
		`,
		Down: `DROP TABLE IF EXISTS user_files;`,
	},
}

func CreateMigrationsTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS migrations (
			version INTEGER PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`
	_, err := DB.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %v", err)
	}
	return nil
}

func GetAppliedMigrations() (map[int]bool, error) {
	applied := make(map[int]bool)

	rows, err := DB.Query("SELECT version FROM migrations")
	if err != nil {
		return applied, err
	}
	defer rows.Close()

	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return applied, err
		}
		applied[version] = true
	}

	return applied, nil
}

func RunMigrations() error {
	if err := CreateMigrationsTable(); err != nil {
		return err
	}

	applied, err := GetAppliedMigrations()
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %v", err)
	}

	for _, migration := range migrations {
		if applied[migration.Version] {
			log.Printf("Migration %d (%s) already applied, skipping", migration.Version, migration.Name)
			continue
		}

		log.Printf("Running migration %d: %s", migration.Version, migration.Name)

		if _, err := DB.Exec(migration.Up); err != nil {
			return fmt.Errorf("failed to run migration %d: %v", migration.Version, err)
		}

		if _, err := DB.Exec("INSERT INTO migrations (version, name) VALUES ($1, $2)", migration.Version, migration.Name); err != nil {
			return fmt.Errorf("failed to record migration %d: %v", migration.Version, err)
		}

		log.Printf("Successfully applied migration %d: %s", migration.Version, migration.Name)
	}

	return nil
}