package db

import (
	"os"
	"testing"
)

func TestConnect(t *testing.T) {
	originalDatabaseURL := os.Getenv("DATABASE_URL")

	defer func() {
		os.Setenv("DATABASE_URL", originalDatabaseURL)
	}()

	os.Setenv("DATABASE_URL", "postgres://testuser:testpass@nonexistent-host:5432/testdb?sslmode=disable")

	err := Connect()
	if err == nil {
		t.Error("Expected connection to fail with nonexistent host, but it succeeded")
	}
}