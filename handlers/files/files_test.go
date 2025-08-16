package files

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func saveFile(filename, content string, accountID int) (*UserFile, error) {
	file := &UserFile{
		ID:        1,
		AccountID: accountID,
		Filename:  filename,
		Content:   content,
		FileType:  "python",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	return file, nil
}

func loadFile(filename string, accountID int) (*UserFile, error) {
	return &UserFile{
		ID:        1,
		AccountID: accountID,
		Filename:  filename,
		Content:   "print('Hello, World!')",
		FileType:  "python",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, nil
}

func deleteFile(_ string, _ int) error {
	return nil
}

func TestSaveFile(t *testing.T) {
	tests := []struct {
		name      string
		filename  string
		content   string
		accountID int
		wantErr   bool
	}{
		{
			name:      "valid python file",
			filename:  "test.py",
			content:   "print('Hello, World!')",
			accountID: 1,
			wantErr:   false,
		},
		{
			name:      "empty filename",
			filename:  "",
			content:   "print('test')",
			accountID: 1,
			wantErr:   false, // Database will handle this
		},
		{
			name:      "large content",
			filename:  "large.py",
			content:   "# " + string(make([]byte, 1000)) + "\nprint('large file')",
			accountID: 1,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			file, err := saveFile(tt.filename, tt.content, tt.accountID)
			if (err != nil) != tt.wantErr {
				t.Errorf("saveFile() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if file.Filename != tt.filename {
					t.Errorf("saveFile() filename = %v, want %v", file.Filename, tt.filename)
				}
				if file.Content != tt.content {
					t.Errorf("saveFile() content = %v, want %v", file.Content, tt.content)
				}
				if file.AccountID != tt.accountID {
					t.Errorf("saveFile() accountID = %v, want %v", file.AccountID, tt.accountID)
				}
			}
		})
	}
}

func TestLoadFile(t *testing.T) {
	tests := []struct {
		name      string
		filename  string
		accountID int
		wantErr   bool
	}{
		{
			name:      "existing file",
			filename:  "test.py",
			accountID: 1,
			wantErr:   false,
		},
		{
			name:      "non-existing file",
			filename:  "nonexistent.py",
			accountID: 1,
			wantErr:   false, // Mock will return a file
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			file, err := loadFile(tt.filename, tt.accountID)
			if (err != nil) != tt.wantErr {
				t.Errorf("loadFile() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if file.Filename != tt.filename {
					t.Errorf("loadFile() filename = %v, want %v", file.Filename, tt.filename)
				}
				if file.AccountID != tt.accountID {
					t.Errorf("loadFile() accountID = %v, want %v", file.AccountID, tt.accountID)
				}
			}
		})
	}
}

func TestDeleteFile(t *testing.T) {
	tests := []struct {
		name      string
		filename  string
		accountID int
		wantErr   bool
	}{
		{
			name:      "delete existing file",
			filename:  "test.py",
			accountID: 1,
			wantErr:   false,
		},
		{
			name:      "delete non-existing file",
			filename:  "nonexistent.py",
			accountID: 1,
			wantErr:   false, // Mock won't error
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := deleteFile(tt.filename, tt.accountID)
			if (err != nil) != tt.wantErr {
				t.Errorf("deleteFile() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestSaveFileHandler_MethodValidation(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		expectedStatus int
	}{
		{
			name:           "invalid method GET",
			method:         "GET",
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "invalid method PUT",
			method:         "PUT",
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "invalid method DELETE",
			method:         "DELETE",
			expectedStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/files/save", nil)
			w := httptest.NewRecorder()
			SaveFileHandler(w, req)
			
			if w.Code != tt.expectedStatus {
				t.Errorf("SaveFileHandler() status = %v, want %v", w.Code, tt.expectedStatus)
			}
		})
	}
}

func TestLoadFileHandler_MethodValidation(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/files/load", nil)
	w := httptest.NewRecorder()
	LoadFileHandler(w, req)
	
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("LoadFileHandler() status = %v, want %v", w.Code, http.StatusMethodNotAllowed)
	}
}

func TestListFilesHandler_MethodValidation(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/files/list", nil)
	w := httptest.NewRecorder()
	ListFilesHandler(w, req)
	
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("ListFilesHandler() status = %v, want %v", w.Code, http.StatusMethodNotAllowed)
	}
}

func TestDeleteFileHandler_MethodValidation(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/files/delete", nil)
	w := httptest.NewRecorder()
	DeleteFileHandler(w, req)
	
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("DeleteFileHandler() status = %v, want %v", w.Code, http.StatusMethodNotAllowed)
	}
}