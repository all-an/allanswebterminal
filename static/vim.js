/**
 * Advanced Vim Editor for Web Terminal
 * Provides a real vim-like editing experience with line numbers and cursor control
 */

class VimEditor {
    constructor() {
        this.mode = 'normal';
        this.commandBuffer = '';
        this.content = '';
        this.cursorRow = 0;
        this.cursorCol = 0;
        this.currentFilename = '';
        this.lastKey = '';
        
        // DOM elements (set when modal is created)
        this.modal = null;
        this.textarea = null;
        this.contentArea = null;
        this.cursor = null;
        this.lineNumbers = null;
        this.statusLeft = null;
        this.statusRight = null;
        this.title = null;
    }

    createModalOverlay() {
        const modal = document.createElement('div');
        modal.className = 'vim-editor-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10001;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        `;
        return modal;
    }

    createEditorContainer() {
        const editor = document.createElement('div');
        editor.className = 'vim-editor';
        editor.style.cssText = `
            width: 95%;
            height: 95%;
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            color: #d4d4d4;
        `;
        return editor;
    }

    createHeader(filename) {
        const header = document.createElement('div');
        header.style.cssText = `
            background: #2d2d30;
            padding: 8px 15px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 18px;
        `;
        
        this.title = document.createElement('span');
        this.title.textContent = filename;
        this.title.style.fontWeight = 'bold';
        
        const commands = document.createElement('span');
        commands.style.cssText = 'font-size: 16px; color: #888;';
        commands.textContent = 'ESC :w=save :q=quit :wq=save&quit i=insert h/j/k/l=navigate';
        
        header.appendChild(this.title);
        header.appendChild(commands);
        
        return header;
    }

    createEditingArea() {
        const editingArea = document.createElement('div');
        editingArea.style.cssText = `
            flex: 1;
            display: flex;
            position: relative;
            overflow: hidden;
        `;
        
        this.lineNumbers = this.createLineNumbers();
        const textContainer = this.createTextContainer();
        
        editingArea.appendChild(this.lineNumbers);
        editingArea.appendChild(textContainer);
        
        return editingArea;
    }

    createLineNumbers() {
        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'vim-line-numbers';
        lineNumbers.style.cssText = `
            background: #252526;
            border-right: 1px solid #333;
            padding: 8px 8px 8px 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 20px;
            line-height: 1.4;
            color: #858585;
            text-align: right;
            min-width: 40px;
            user-select: none;
            white-space: pre;
        `;
        return lineNumbers;
    }

    createTextContainer() {
        const textContainer = document.createElement('div');
        textContainer.style.cssText = `
            flex: 1;
            position: relative;
            overflow: auto;
        `;
        
        this.textarea = this.createHiddenTextarea();
        this.contentArea = this.createContentArea();
        this.cursor = this.createCursor();
        
        textContainer.appendChild(this.textarea);
        textContainer.appendChild(this.contentArea);
        textContainer.appendChild(this.cursor);
        
        return textContainer;
    }

    createHiddenTextarea() {
        const textarea = document.createElement('textarea');
        textarea.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            opacity: 0;
        `;
        return textarea;
    }

    createContentArea() {
        const contentArea = document.createElement('pre');
        contentArea.className = 'vim-content';
        contentArea.style.cssText = `
            margin: 0;
            padding: 8px 12px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 20px;
            line-height: 1.4;
            color: #d4d4d4;
            background: transparent;
            white-space: pre;
            overflow: visible;
            cursor: text;
            min-height: 100%;
            position: relative;
        `;
        return contentArea;
    }

    createCursor() {
        const cursor = document.createElement('span');
        cursor.className = 'vim-cursor';
        cursor.style.cssText = `
            position: absolute;
            width: 8px;
            height: 18px;
            background: #528bff;
            z-index: 100;
            pointer-events: none;
            animation: vim-cursor-blink 1s infinite;
        `;
        
        this.ensureCursorStyles();
        
        return cursor;
    }

    ensureCursorStyles() {
        if (!document.getElementById('vim-cursor-styles')) {
            const style = document.createElement('style');
            style.id = 'vim-cursor-styles';
            style.textContent = `
                @keyframes vim-cursor-blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.3; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    createStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.className = 'vim-status';
        statusBar.style.cssText = `
            background: #007acc;
            color: #fff;
            padding: 4px 15px;
            font-size: 16px;
            border-top: 1px solid #333;
            display: flex;
            justify-content: space-between;
        `;
        
        this.statusLeft = document.createElement('span');
        this.statusLeft.textContent = '-- NORMAL --';
        
        this.statusRight = document.createElement('span');
        this.statusRight.textContent = 'Line 1, Col 1';
        
        statusBar.appendChild(this.statusLeft);
        statusBar.appendChild(this.statusRight);
        
        return statusBar;
    }

    createModal(filename) {
        this.currentFilename = filename;
        
        const modal = this.createModalOverlay();
        const editor = this.createEditorContainer();
        const header = this.createHeader(filename);
        const editingArea = this.createEditingArea();
        const statusBar = this.createStatusBar();
        
        editor.appendChild(header);
        editor.appendChild(editingArea);
        editor.appendChild(statusBar);
        modal.appendChild(editor);
        
        this.modal = modal;
        this.setupEventHandlers();
        
        return modal;
    }

    setupEventHandlers() {
        // Handle keydown events on the textarea for better keyboard event capture
        this.textarea.addEventListener('keydown', async (e) => {
            e.preventDefault(); // Prevent default textarea behavior
            e.stopPropagation(); // Stop event from bubbling up
            await this.handleKeydown(e);
        });
        
        // Backup handler on modal for any missed events
        this.modal.addEventListener('keydown', async (e) => {
            // Only handle if textarea didn't already handle it
            if (e.target !== this.textarea) {
                e.preventDefault();
                e.stopPropagation();
                await this.handleKeydown(e);
            }
        });
        
        // Focus management
        this.modal.addEventListener('click', () => {
            this.focusEditor();
        });
        
        // Make modal focusable so it can receive keydown events
        this.modal.setAttribute('tabindex', '-1');
        
        // Remove focus from terminal input and focus on vim editor
        const terminalInput = document.getElementById('commandInput');
        if (terminalInput) {
            terminalInput.blur();
        }
        
        // Force focus on vim editor with multiple attempts
        this.focusEditor();
    }

    focusEditor() {
        // More aggressive focus strategy to overcome terminal interference
        this.textarea.focus();
        
        // Disable terminal focus management while vim is active
        if (window.terminalFocusEnabled !== undefined) {
            window.terminalFocusEnabled = false;
        }
        
        // Multiple focus attempts with increasing delays
        setTimeout(() => {
            this.textarea.focus();
        }, 10);
        
        setTimeout(() => {
            this.textarea.focus();
        }, 50);
        
        setTimeout(() => {
            this.textarea.focus();
        }, 100);
        
        setTimeout(() => {
            this.textarea.focus();
        }, 200);
    }

    destroy() {
        // Clean up modal and all its event listeners
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        // Modal removal automatically cleans up its event listeners
        
        // Re-enable terminal focus management
        if (window.terminalFocusEnabled !== undefined) {
            window.terminalFocusEnabled = true;
        }
        
        // Return focus to terminal
        const terminalInput = document.getElementById('commandInput');
        if (terminalInput) {
            setTimeout(() => {
                terminalInput.focus();
            }, 100);
        }
    }

    initializeContent(initialContent = '') {
        this.content = initialContent || `#!/usr/bin/env python3

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`;
        this.updateDisplay();
        this.moveCursor(0, 0);
    }

    updateDisplay() {
        const lines = this.content.split('\n');
        
        // Update line numbers
        const lineNumbersText = lines.map((_, i) => 
            String(i + 1).padStart(3, ' ')
        ).join('\n');
        this.lineNumbers.textContent = lineNumbersText;
        
        // Update content
        this.contentArea.textContent = this.content;
        
        
        // Update status
        this.updateStatus();
    }

    updateStatus() {
        const modeText = {
            'insert': '-- INSERT --',
            'normal': '-- NORMAL --',
            'visual': '-- VISUAL --',
            'command': this.commandBuffer
        };
        this.statusLeft.textContent = modeText[this.mode] || '';
        
        this.statusRight.textContent = `Line ${this.cursorRow + 1}, Col ${this.cursorCol + 1}`;
        
        // Update cursor appearance based on mode
        if (this.mode === 'insert') {
            this.cursor.style.background = '#528bff';
            this.cursor.style.width = '2px';
        } else {
            this.cursor.style.background = '#ff6b6b';
            this.cursor.style.width = '8px';
        }
    }

    moveCursor(row, col) {
        debugger;
        const lines = this.content.split('\n');
        
        
        // Clamp row
        this.cursorRow = Math.max(0, Math.min(row, lines.length - 1));
        
        // Clamp column
        const lineLength = lines[this.cursorRow] ? lines[this.cursorRow].length : 0;
        if (this.mode === 'insert') {
            // In insert mode, cursor can go up to and including the end (after last character)
            this.cursorCol = Math.max(0, Math.min(col, lineLength));
        } else {
            // In normal mode, cursor can go up to the last character (not beyond)
            this.cursorCol = Math.max(0, Math.min(col, Math.max(0, lineLength - 1)));
        }
        
        
        // Position cursor visually using actual character measurements
        this.positionCursor();
        
        this.updateStatus();
    }

    positionCursor() {
        // Get the current line content up to cursor position
        const lines = this.content.split('\n');
        const currentLine = lines[this.cursorRow] || '';
        const textBeforeCursor = currentLine.substring(0, this.cursorCol);
        
        // Use a more accurate measurement by directly measuring against the contentArea
        const computedStyle = window.getComputedStyle(this.contentArea);
        const fontSize = parseFloat(computedStyle.fontSize);
        const fontFamily = computedStyle.fontFamily;
        
        // Create a canvas for precise text measurement
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px ${fontFamily}`;
        
        // Measure the actual displayed text width
        const textWidth = context.measureText(textBeforeCursor).width;
        
        // Calculate actual line height
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const actualLineHeight = isNaN(lineHeight) ? fontSize * 1.4 : lineHeight;
        
        // Calculate position relative to the container
        const paddingLeft = parseInt(computedStyle.paddingLeft, 10) || 0;
        const paddingTop = parseInt(computedStyle.paddingTop, 10) || 0;
        
        // Position cursor relative to contentArea
        const top = this.cursorRow * actualLineHeight + paddingTop;
        const left = textWidth + paddingLeft;
        
        
        
        this.cursor.style.top = `${top}px`;
        this.cursor.style.left = `${left}px`;
        
        
        
        // Update cursor height to match line height
        this.cursor.style.height = `${actualLineHeight}px`;
        
        
        // Scroll into view if needed
        this.scrollCursorIntoView(top, left, actualLineHeight);
    }
    
    scrollCursorIntoView(top, left, lineHeight) {
        const container = this.contentArea.parentElement;
        const cursorRect = {
            top: top,
            bottom: top + lineHeight,
            left: left,
            right: left + (this.mode === 'insert' ? 2 : 8)
        };
        
        if (cursorRect.top < container.scrollTop) {
            container.scrollTop = cursorRect.top - 20;
        } else if (cursorRect.bottom > container.scrollTop + container.clientHeight) {
            container.scrollTop = cursorRect.bottom - container.clientHeight + 20;
        }
        
        if (cursorRect.left < container.scrollLeft) {
            container.scrollLeft = cursorRect.left - 20;
        } else if (cursorRect.right > container.scrollLeft + container.clientWidth) {
            container.scrollLeft = cursorRect.right - container.clientWidth + 20;
        }
    }

    insertChar(char) {
        const lines = this.content.split('\n');
        const line = lines[this.cursorRow] || '';
        
        const newLine = line.slice(0, this.cursorCol) + char + line.slice(this.cursorCol);
        lines[this.cursorRow] = newLine;
        this.content = lines.join('\n');
        
        this.cursorCol++;
        
        this.updateDisplay();
        
        // Force DOM update then reposition cursor
        requestAnimationFrame(() => {
            this.positionCursor();
        });
    }

    deleteChar() {
        const lines = this.content.split('\n');
        const line = lines[this.cursorRow] || '';
        
        if (this.cursorCol > 0) {
            // Delete character before cursor
            const newLine = line.slice(0, this.cursorCol - 1) + line.slice(this.cursorCol);
            lines[this.cursorRow] = newLine;
            this.content = lines.join('\n');
            this.cursorCol--;
        } else if (this.cursorRow > 0) {
            // Join with previous line
            const prevLine = lines[this.cursorRow - 1] || '';
            const currentLine = lines[this.cursorRow] || '';
            lines[this.cursorRow - 1] = prevLine + currentLine;
            lines.splice(this.cursorRow, 1);
            this.content = lines.join('\n');
            this.cursorRow--;
            this.cursorCol = prevLine.length;
        }
        
        this.updateDisplay();
        
        // Force DOM update then reposition cursor
        requestAnimationFrame(() => {
            this.positionCursor();
        });
    }

    insertNewLine() {
        const lines = this.content.split('\n');
        const line = lines[this.cursorRow] || '';
        const beforeCursor = line.slice(0, this.cursorCol);
        const afterCursor = line.slice(this.cursorCol);
        
        lines[this.cursorRow] = beforeCursor;
        lines.splice(this.cursorRow + 1, 0, afterCursor);
        this.content = lines.join('\n');
        
        this.cursorRow++;
        this.cursorCol = 0;
        this.updateDisplay();
        
        // Force DOM update then reposition cursor
        requestAnimationFrame(() => {
            this.positionCursor();
        });
    }

    async handleKeydown(e) {
        if (this.mode === 'insert') {
            this.handleInsertMode(e);
        } else if (this.mode === 'normal') {
            this.handleNormalMode(e);
        } else if (this.mode === 'command') {
            await this.handleCommandMode(e);
        }
    }

    handleInsertMode(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.mode = 'normal';
            this.moveCursor(this.cursorRow, Math.max(0, this.cursorCol - 1));
            this.updateStatus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.insertNewLine();
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            this.deleteChar();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.insertChar('    ');
        } else if (e.key.length === 1) {
            e.preventDefault();
            
            
            this.insertChar(e.key);
        }
    }

    handleNormalMode(e) {
        e.preventDefault();
        const lines = this.content.split('\n');
        
        
        switch (e.key) {
            case 'h': // Left
                this.moveCursor(this.cursorRow, this.cursorCol - 1);
                break;
            case 'j': // Down
                this.moveCursor(this.cursorRow + 1, this.cursorCol);
                break;
            case 'k': // Up
                this.moveCursor(this.cursorRow - 1, this.cursorCol);
                break;
            case 'l': // Right
                this.moveCursor(this.cursorRow, this.cursorCol + 1);
                break;
            case 'w': // Next word
                this.moveToNextWord();
                break;
            case 'b': // Previous word
                this.moveToPrevWord();
                break;
            case 'i': // Insert mode
                this.mode = 'insert';
                this.updateStatus();
                break;
            case 'a': // Insert after cursor
                this.mode = 'insert';
                // Move cursor one position to the right (after current character)
                this.moveCursor(this.cursorRow, this.cursorCol + 1);
                break;
            case 'A': // Insert at end of line
                const lineForA = lines[this.cursorRow] || '';
                this.mode = 'insert';
                this.moveCursor(this.cursorRow, lineForA.length);
                break;
            case 'I': // Insert at beginning of line
                this.mode = 'insert';
                this.moveCursor(this.cursorRow, 0);
                break;
            case 'o': // Open line below
                lines.splice(this.cursorRow + 1, 0, '');
                this.content = lines.join('\n');
                this.mode = 'insert';
                this.moveCursor(this.cursorRow + 1, 0);
                this.updateDisplay();
                break;
            case 'O': // Open line above
                lines.splice(this.cursorRow, 0, '');
                this.content = lines.join('\n');
                this.mode = 'insert';
                this.moveCursor(this.cursorRow, 0);
                this.updateDisplay();
                break;
            case 'x': // Delete character
                this.deleteCharAtCursor();
                break;
            case 'dd': // Delete line (handled with double key)
                this.handleDoubleKey('d');
                break;
            case '0': // Beginning of line
                this.moveCursor(this.cursorRow, 0);
                break;
            case '$': // End of line
                const lineForDollar = lines[this.cursorRow] || '';
                this.moveCursor(this.cursorRow, Math.max(0, lineForDollar.length - 1));
                break;
            case 'g':
                // Handle gg (go to top)
                if (this.lastKey === 'g') {
                    this.moveCursor(0, 0);
                    this.lastKey = '';
                } else {
                    this.lastKey = 'g';
                    setTimeout(() => { this.lastKey = ''; }, 1000);
                }
                break;
            case 'G': // Go to bottom
                this.moveCursor(lines.length - 1, 0);
                break;
            case ':':
                this.mode = 'command';
                this.commandBuffer = ':';
                this.updateStatus();
                break;
        }
    }

    async handleCommandMode(e) {
        if (e.key === 'Enter') {
            await this.executeCommand();
        } else if (e.key === 'Escape') {
            this.mode = 'normal';
            this.commandBuffer = '';
            this.updateStatus();
        } else if (e.key === 'Backspace') {
            if (this.commandBuffer.length > 1) {
                this.commandBuffer = this.commandBuffer.slice(0, -1);
            } else {
                this.mode = 'normal';
                this.commandBuffer = '';
            }
            this.updateStatus();
        } else if (e.key.length === 1) {
            this.commandBuffer += e.key;
            this.updateStatus();
        }
    }

    moveToNextWord() {
        const lines = this.content.split('\n');
        const line = lines[this.cursorRow] || '';
        let col = this.cursorCol;
        
        // Skip current word
        while (col < line.length && /\w/.test(line[col])) col++;
        // Skip whitespace
        while (col < line.length && /\s/.test(line[col])) col++;
        
        if (col >= line.length && this.cursorRow < lines.length - 1) {
            // Move to next line
            this.moveCursor(this.cursorRow + 1, 0);
        } else {
            this.moveCursor(this.cursorRow, col);
        }
    }

    moveToPrevWord() {
        const lines = this.content.split('\n');
        const line = lines[this.cursorRow] || '';
        let col = this.cursorCol - 1;
        
        // Skip whitespace
        while (col >= 0 && /\s/.test(line[col])) col--;
        // Skip word
        while (col >= 0 && /\w/.test(line[col])) col--;
        
        if (col < 0 && this.cursorRow > 0) {
            // Move to previous line
            const prevLine = lines[this.cursorRow - 1] || '';
            this.moveCursor(this.cursorRow - 1, Math.max(0, prevLine.length - 1));
        } else {
            this.moveCursor(this.cursorRow, Math.max(0, col + 1));
        }
    }

    deleteCharAtCursor() {
        const lines = this.content.split('\n');
        const line = lines[this.cursorRow] || '';
        
        if (this.cursorCol < line.length) {
            const newLine = line.slice(0, this.cursorCol) + line.slice(this.cursorCol + 1);
            lines[this.cursorRow] = newLine;
            this.content = lines.join('\n');
            this.updateDisplay();
        }
    }

    async executeCommand() {
        const cmd = this.commandBuffer.substring(1); // Remove the ':'
        
        if (cmd === 'q' || cmd === 'quit') {
            // Quit without saving
            this.destroy();
            if (window.addOutput) {
                window.addOutput('Vim editor closed.');
            }
        } else if (cmd === 'w' || cmd === 'write') {
            // Save file
            await this.saveFile(this.currentFilename);
        } else if (cmd === 'wq' || cmd === 'x') {
            // Save and quit - wait for save to complete
            const saveSuccess = await this.saveFile(this.currentFilename);
            if (saveSuccess) {
                this.destroy();
                if (window.addOutput) {
                    window.addOutput('File saved and vim editor closed.');
                }
            }
            // If save failed, stay in the editor
        } else if (cmd.startsWith('w ')) {
            // Save as
            const newFilename = cmd.substring(2).trim();
            await this.saveFile(newFilename);
            this.currentFilename = newFilename;
            this.title.textContent = newFilename;
        } else if (cmd.startsWith('o ')) {
            // Open file
            const filename = cmd.substring(2).trim();
            this.loadFile(filename);
        } else {
            // Unknown command
            this.statusLeft.textContent = `Unknown command: ${cmd}`;
            setTimeout(() => {
                this.updateStatus();
            }, 2000);
        }
        
        this.mode = 'normal';
        this.commandBuffer = '';
        this.updateStatus();
    }

    async saveFile(filename) {
        try {
            const response = await fetch('/api/files/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    filename: filename,
                    content: this.content,
                    file_type: 'python'
                })
            });
            
            if (response.ok) {
                if (window.addOutput) {
                    window.addOutput(`File saved: ${filename}`);
                }
                this.statusLeft.textContent = `"${filename}" saved`;
                setTimeout(() => {
                    this.updateStatus();
                }, 2000);
                return true; // Success
            } else {
                let errorMessage = 'Error: Failed to save file.';
                if (response.status === 401) {
                    errorMessage = 'Error: Please login first to save files.';
                }
                if (window.addOutput) {
                    window.addOutput(errorMessage);
                }
                this.statusLeft.textContent = 'Save failed';
                setTimeout(() => {
                    this.updateStatus();
                }, 2000);
                return false; // Failure
            }
        } catch (error) {
            if (window.addOutput) {
                window.addOutput('Error: Failed to save file.');
            }
            this.statusLeft.textContent = 'Save failed';
            setTimeout(() => {
                this.updateStatus();
            }, 2000);
            return false; // Failure
        }
    }

    async loadFile(filename) {
        try {
            const response = await fetch(`/api/files/load?filename=${encodeURIComponent(filename)}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const fileData = await response.json();
                this.content = fileData.content;
                this.currentFilename = filename;
                this.title.textContent = filename;
                this.updateDisplay();
                this.moveCursor(0, 0);
            } else if (response.status === 404) {
                // New file
                this.content = `#!/usr/bin/env python3

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`;
                this.currentFilename = filename;
                this.title.textContent = filename;
                this.updateDisplay();
                this.moveCursor(0, 0);
            } else {
                if (window.addOutput) {
                    window.addOutput('Error: Failed to load file.');
                }
            }
        } catch (error) {
            // New file or error - start with template
            this.content = `#!/usr/bin/env python3

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`;
            this.currentFilename = filename;
            this.title.textContent = filename;
            this.updateDisplay();
            this.moveCursor(0, 0);
        }
    }
}

// Make VimEditor available globally
if (typeof window !== 'undefined') {
    window.VimEditor = VimEditor;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VimEditor;
}