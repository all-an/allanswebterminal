package db

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestGetAppliedMigrations(t *testing.T) {
	originalDB := DB
	defer func() {
		DB = originalDB
	}()

	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock database: %v", err)
	}
	defer mockDB.Close()

	DB = mockDB

	t.Run("empty migrations", func(t *testing.T) {
		rows := sqlmock.NewRows([]string{"version"})
		mock.ExpectQuery("SELECT version FROM migrations").WillReturnRows(rows)

		applied, err := GetAppliedMigrations()
		if err != nil {
			t.Errorf("GetAppliedMigrations failed: %v", err)
		}

		if len(applied) != 0 {
			t.Errorf("Expected empty map, got %v", applied)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("Mock expectations not met: %v", err)
		}
	})

	t.Run("with applied migrations", func(t *testing.T) {
		rows := sqlmock.NewRows([]string{"version"}).
			AddRow(1).
			AddRow(3).
			AddRow(5)

		mock.ExpectQuery("SELECT version FROM migrations").WillReturnRows(rows)

		applied, err := GetAppliedMigrations()
		if err != nil {
			t.Errorf("GetAppliedMigrations failed: %v", err)
		}

		expected := map[int]bool{1: true, 3: true, 5: true}
		if len(applied) != len(expected) {
			t.Errorf("Expected %d migrations, got %d", len(expected), len(applied))
		}

		for version := range expected {
			if !applied[version] {
				t.Errorf("Expected version %d to be applied", version)
			}
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("Mock expectations not met: %v", err)
		}
	})

	t.Run("database error", func(t *testing.T) {
		mock.ExpectQuery("SELECT version FROM migrations").WillReturnError(sqlmock.ErrCancelled)

		applied, err := GetAppliedMigrations()
		if err == nil {
			t.Error("Expected error but got none")
		}

		if len(applied) != 0 {
			t.Errorf("Expected empty map on error, got %v", applied)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("Mock expectations not met: %v", err)
		}
	})
}

func TestCreateMigrationsTable(t *testing.T) {
	originalDB := DB
	defer func() {
		DB = originalDB
	}()

	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock database: %v", err)
	}
	defer mockDB.Close()

	DB = mockDB

	t.Run("successful creation", func(t *testing.T) {
		expectedQuery := `CREATE TABLE IF NOT EXISTS migrations \(
			version INTEGER PRIMARY KEY,
			name VARCHAR\(100\) NOT NULL,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		\)`
		
		mock.ExpectExec(expectedQuery).WillReturnResult(sqlmock.NewResult(0, 0))

		err := CreateMigrationsTable()
		if err != nil {
			t.Errorf("CreateMigrationsTable failed: %v", err)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("Mock expectations not met: %v", err)
		}
	})

	t.Run("database error", func(t *testing.T) {
		expectedQuery := `CREATE TABLE IF NOT EXISTS migrations \(
			version INTEGER PRIMARY KEY,
			name VARCHAR\(100\) NOT NULL,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		\)`
		
		mock.ExpectExec(expectedQuery).WillReturnError(sqlmock.ErrCancelled)

		err := CreateMigrationsTable()
		if err == nil {
			t.Error("Expected error but got none")
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("Mock expectations not met: %v", err)
		}
	})
}