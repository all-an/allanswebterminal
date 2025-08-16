/**
 * Vim-style modal navigation for entire page
 * Provides familiar Vim key bindings for page navigation and text selection
 */

class VimEditor {
    constructor(inputElement) {
        this.input = inputElement;
        this.mode = 'insert'; // 'insert', 'normal', 'visual'
        this.visualStart = null;
        this.clipboard = '';
        this.lastCommand = '';
        this.commandBuffer = '';
        this.isEnabled = false;
        this.pageMode = false; // true when navigating page, false when in input
        this.pageVisualMode = false;
        this.currentElement = null;
        this.scrollSpeed = 100; // pixels per scroll
        this.lastKey = '';
        this.selectionStarted = false;
        this.selectionStart = null;
        this.enteringPageMode = false;
        
        // Text navigation properties
        this.textNodes = [];
        this.currentTextIndex = 0;
        this.currentCharIndex = 0;
        this.cursor = null;
        
        // File editing properties
        this.currentFile = null;
        this.fileContent = '';
        this.isFileMode = false;
        this.fileEditor = null;
        
        this.setupEventListeners();
        this.createModeIndicator();
        this.setupPageNavigation();
        this.createTextCursor();
        this.setupFileEditor();
    }

    createModeIndicator() {
        // Create a small mode indicator
        this.modeIndicator = document.createElement('span');
        this.modeIndicator.id = 'vim-mode-indicator';
        this.modeIndicator.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            color: #fff;
            background: rgba(0, 0, 0, 0.8);
            padding: 8px 12px;
            border-radius: 4px;
            pointer-events: none;
            z-index: 10000;
        `;
        
        // Append to body since it's fixed positioned
        document.body.appendChild(this.modeIndicator);
        
        this.updateModeIndicator();
    }

    updateModeIndicator() {
        if (!this.modeIndicator) return;
        
        if (!this.isEnabled) {
            this.modeIndicator.textContent = '';
            return;
        }

        const modeText = {
            'insert': this.isFileMode ? '-- INSERT (FILE) --' : '-- INSERT --',
            'normal': this.isFileMode ? '-- NORMAL (FILE) --' : (this.pageMode ? '-- NORMAL (PAGE) --' : '-- NORMAL --'),
            'visual': this.pageVisualMode ? '-- VISUAL (PAGE) --' : '-- VISUAL --'
        };
        
        this.modeIndicator.textContent = modeText[this.mode] || '';
        
        // Color coding
        const colors = {
            'insert': '#4a9eff',
            'normal': '#98c379', 
            'visual': '#e06c75'
        };
        this.modeIndicator.style.color = colors[this.mode] || '#888';
    }

    setupPageNavigation() {
        // Create overlay for page navigation mode
        this.pageOverlay = document.createElement('div');
        this.pageOverlay.id = 'vim-page-overlay';
        this.pageOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.05);
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(this.pageOverlay);
    }

    createTextCursor() {
        this.cursor = document.createElement('div');
        this.cursor.id = 'vim-text-cursor';
        this.cursor.style.cssText = `
            position: absolute;
            width: 8px;
            height: 20px;
            background: #ff6b6b;
            z-index: 10000;
            pointer-events: none;
            display: none;
            animation: vim-cursor-blink 1s infinite;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(255, 107, 107, 0.5);
        `;
        
        // Add cursor blink animation
        if (!document.getElementById('vim-cursor-styles')) {
            const style = document.createElement('style');
            style.id = 'vim-cursor-styles';
            style.textContent = `
                @keyframes vim-cursor-blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(this.cursor);
    }

    buildTextNodeMap() {
        this.textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip empty or whitespace-only nodes and script/style content
                    if (!node.textContent.trim() || 
                        node.parentElement.tagName === 'SCRIPT' ||
                        node.parentElement.tagName === 'STYLE' ||
                        node.parentElement.id === 'vim-mode-indicator') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            this.textNodes.push(node);
        }
        
        
        this.currentTextIndex = 0;
        this.currentCharIndex = 0;
    }

    positionCursor() {
        if (this.textNodes.length === 0 || !this.cursor) return;

        const currentNode = this.textNodes[this.currentTextIndex];
        if (!currentNode) return;

        // Create a temporary range to get character position
        const range = document.createRange();
        range.setStart(currentNode, Math.min(this.currentCharIndex, currentNode.textContent.length));
        range.setEnd(currentNode, Math.min(this.currentCharIndex, currentNode.textContent.length));

        const rect = range.getBoundingClientRect();
        console.log('RED CURSOR: rect at', rect.left, rect.top, 'for text:', JSON.stringify(currentNode.textContent.substring(0, 20)));
        console.log('RED CURSOR: parent element:', currentNode.parentElement.tagName, currentNode.parentElement.className, currentNode.parentElement.id);
        console.log('RED CURSOR: parent computed style display:', window.getComputedStyle(currentNode.parentElement).display);
        
        if (rect.width === 0 && rect.height === 0) {
            // Fallback for empty ranges
            const parentRect = currentNode.parentElement.getBoundingClientRect();
            console.log('RED CURSOR: using parent fallback at', parentRect.left, parentRect.top);
            this.cursor.style.left = parentRect.left + 'px';
            this.cursor.style.top = parentRect.top + 'px';
            this.cursor.style.height = '16px';
        } else {
            console.log('RED CURSOR: positioning at', rect.left, rect.top);
            this.cursor.style.left = rect.left + 'px';
            this.cursor.style.top = rect.top + 'px';
            this.cursor.style.height = Math.max(rect.height, 16) + 'px';
        }

        // Scroll cursor into view
        this.cursor.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    enable() {
        this.isEnabled = true;
        this.mode = 'insert';
        this.pageMode = false;
        this.updateModeIndicator();
        console.log('✅ Vim mode enabled - Press ESC for page navigation');
    }

    disable() {
        this.isEnabled = false;
        this.mode = 'insert';
        this.pageMode = false;
        this.pageVisualMode = false;
        this.pageOverlay.style.display = 'none';
        this.stopTextSelection();
        this.updateModeIndicator();
        console.log('❌ Vim mode disabled');
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    setupEventListeners() {
        // Listen on document for page-wide navigation
        document.addEventListener('keydown', (e) => this.handleKeyDown(e), true);
        this.input.addEventListener('keyup', (e) => this.handleKeyUp(e));
        this.input.addEventListener('input', (e) => this.handleInput(e));
        
        // Focus management - only exit page mode when manually focusing input
        this.input.addEventListener('focus', () => {
            if (this.isEnabled && !this.enteringPageMode) {
                this.pageMode = false;
                this.pageOverlay.style.display = 'none';
                this.updateModeIndicator();
            }
        });
    }

    handleKeyDown(event) {
        if (!this.isEnabled) return;

        const key = event.key;
        const ctrl = event.ctrlKey;
        const alt = event.altKey;
        

        // ESC key behavior depends on current state
        if (key === 'Escape') {
            event.preventDefault();
            if (this.pageVisualMode) {
                this.exitPageVisualMode();
            } else if (this.pageMode) {
                this.exitPageMode();
                this.enterInsertMode();
            } else {
                this.enterNormalMode();
            }
            return;
        }

        // Handle different modes
        switch (this.mode) {
            case 'insert':
                this.handleInsertMode(event);
                break;
            case 'normal':
                this.handleNormalMode(event);
                break;
            case 'visual':
                this.handleVisualMode(event);
                break;
        }
    }

    handleInsertMode(event) {
        // In insert mode, most keys work normally
        // Only ESC is handled specially (already handled above)
        return;
    }

    handleNormalMode(event) {
        event.preventDefault();
        const key = event.key;


        // Page navigation vs input navigation
        if (this.pageMode) {
            this.handlePageNavigation(key);
            return;
        }

        // Movement commands
        switch (key) {
            case 'h': // Left
                this.moveCursor(-1);
                break;
            case 'l': // Right
                this.moveCursor(1);
                break;
            case 'j': // Down (enter page mode)
                this.enterPageMode();
                break;
            case 'k': // Up (enter page mode)
                this.enterPageMode();
                break;
            case 'w': // Next word
                this.moveToNextWord();
                break;
            case 'b': // Previous word
                this.moveToPrevWord();
                break;
            case 'e': // End of word
                this.moveToEndOfWord();
                break;
            case '0': // Beginning of line
                this.moveCursorToStart();
                break;
            case '$': // End of line
                this.moveCursorToEnd();
                break;

            // Insert mode entries
            case 'i': // Insert before cursor
                this.enterInsertMode();
                break;
            case 'a': // Insert after cursor
                this.moveCursor(1);
                this.enterInsertMode();
                break;
            case 'I': // Insert at beginning of line
                this.moveCursorToStart();
                this.enterInsertMode();
                break;
            case 'A': // Insert at end of line
                this.moveCursorToEnd();
                this.enterInsertMode();
                break;
            case 'o': // Open new line below
                this.openLineBelow();
                break;
            case 'O': // Open new line above
                this.openLineAbove();
                break;

            // Editing commands
            case 'x': // Delete character
                this.deleteChar();
                break;
            case 'X': // Delete character before
                this.deleteCharBefore();
                break;
            case 'r': // Replace character
                this.enterReplaceMode();
                break;
            case 's': // Substitute character
                this.deleteChar();
                this.enterInsertMode();
                break;
            case 'D': // Delete to end of line
                this.deleteToEnd();
                break;
            case 'C': // Change to end of line
                this.deleteToEnd();
                this.enterInsertMode();
                break;

            // Copy/paste
            case 'y': // Yank (copy)
                this.handleYank(event);
                break;
            case 'p': // Paste after
                this.pasteAfter();
                break;
            case 'P': // Paste before
                this.pasteBefore();
                break;

            // Delete/cut
            case 'd': // Delete
                this.handleDelete(event);
                break;

            // Visual mode
            case 'v': // Enter visual mode
                this.enterVisualMode();
                break;
            case 'V': // Enter visual line mode
                this.enterVisualLineMode();
                break;

            // Undo (limited)
            case 'u':
                this.undo();
                break;

            // Repeat last command
            case '.':
                this.repeatLastCommand();
                break;
        }
    }

    handleVisualMode(event) {
        event.preventDefault();
        const key = event.key;

        if (this.pageVisualMode) {
            this.handlePageVisualMode(key);
            return;
        }

        switch (key) {
            // Movement in visual mode
            case 'h':
                this.moveCursor(-1);
                this.updateVisualSelection();
                break;
            case 'l':
                this.moveCursor(1);
                this.updateVisualSelection();
                break;
            case 'w':
                this.moveToNextWord();
                this.updateVisualSelection();
                break;
            case 'b':
                this.moveToPrevWord();
                this.updateVisualSelection();
                break;
            case '0':
                this.moveCursorToStart();
                this.updateVisualSelection();
                break;
            case '$':
                this.moveCursorToEnd();
                this.updateVisualSelection();
                break;

            // Operations on selection
            case 'y': // Yank selection
                this.yankSelection();
                this.enterNormalMode();
                break;
            case 'd': // Delete selection
            case 'x':
                this.deleteSelection();
                this.enterNormalMode();
                break;
            case 'c': // Change selection
                this.deleteSelection();
                this.enterInsertMode();
                break;
        }
    }

    handleKeyUp(event) {
        // Handle key releases if needed
    }

    handleInput(event) {
        // Track input changes for undo functionality
    }

    // Mode switching
    enterInsertMode() {
        this.mode = 'insert';
        this.updateModeIndicator();
    }

    enterNormalMode() {
        this.mode = 'normal';
        // Always enter page navigation mode in normal mode
        // This allows hjkl to navigate the entire page
        this.enterPageModeAtCursor();
        this.updateModeIndicator();
    }

    enterPageMode() {
        this.enteringPageMode = true;
        this.pageMode = true;
        this.input.blur(); // Remove focus from input
        this.pageOverlay.style.display = 'block';
        this.buildTextNodeMap();
        this.cursor.style.display = 'block';
        this.positionCursor();
        this.updateModeIndicator();
        // Reset the flag after a short delay
        setTimeout(() => { this.enteringPageMode = false; }, 50);
    }

    enterPageModeAtCursor() {
        this.enteringPageMode = true;
        this.pageMode = true;
        this.pageOverlay.style.display = 'block';
        this.buildTextNodeMap();
        this.cursor.style.display = 'block';
        
        // Position cursor near the input field instead of at document start
        this.positionCursorNearInput();
        
        this.input.blur(); // Remove focus from input after positioning cursor
        this.updateModeIndicator();
        // Reset the flag after a short delay
        setTimeout(() => { this.enteringPageMode = false; }, 50);
    }

    positionCursorNearInput() {
        if (this.textNodes.length === 0) {
            // If no text nodes, position cursor at input field location
            this.positionCursorAtInput();
            return;
        }

        // First, try to find the terminal prompt (guest@portfolio$ or similar)
        let promptMatch = this.findTerminalPrompt();
        if (promptMatch) {
            this.currentTextIndex = promptMatch.nodeIndex;
            this.currentCharIndex = promptMatch.charIndex;
            this.positionCursor();
            return;
        }

        const inputRect = this.input.getBoundingClientRect();
        let bestMatch = { nodeIndex: 0, charIndex: 0 };
        let bestDistance = Infinity;

        // Find the closest visible text node to the input field
        for (let i = 0; i < this.textNodes.length; i++) {
            const node = this.textNodes[i];
            const parentElement = node.parentElement;
            if (!parentElement) continue;
            
            const nodeRect = parentElement.getBoundingClientRect();
            
            // Skip nodes that are not visible
            if (nodeRect.width === 0 || nodeRect.height === 0) continue;
            
            // Calculate distance from input field
            const distance = Math.sqrt(
                Math.pow(nodeRect.left - inputRect.left, 2) + 
                Math.pow(nodeRect.top - inputRect.top, 2)
            );
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = { nodeIndex: i, charIndex: 0 };
            }
        }

        // If we found a reasonable match (not too far), use it
        if (bestDistance < 1000) { // Within 1000 pixels
            this.currentTextIndex = bestMatch.nodeIndex;
            this.currentCharIndex = bestMatch.charIndex;
            this.positionCursor();
        } else {
            // Otherwise, position cursor at input field location
            this.positionCursorAtInput();
        }
    }

    findTerminalPrompt() {
        // Look for the CURRENT active terminal prompt (in current-line class)
        // This ensures we position at where the user would type next, not old prompts
        
        for (let i = 0; i < this.textNodes.length; i++) {
            const node = this.textNodes[i];
            const text = node.textContent;
            const parentElement = node.parentElement;
            
            // First priority: find prompt in the current-line (active input area)
            let currentLineElement = parentElement;
            while (currentLineElement && currentLineElement !== document.body) {
                if (currentLineElement.className && currentLineElement.className.includes('current-line')) {
                    // This is in the current active line - check if it's a prompt
                    const promptPatterns = [
                        /guest@portfolio[:\~\$]*\$/,  // guest@portfolio:~$ or guest@portfolio$
                        /\w+@\w+[:\~\$]*\$/,         // any user@host:~$ pattern
                        /^[^@]*@[^@]*\$/            // generic user@host$ pattern
                    ];
                    
                    for (const pattern of promptPatterns) {
                        const promptMatch = text.match(pattern);
                        if (promptMatch) {
                            const dollarIndex = text.lastIndexOf('$');
                            if (dollarIndex !== -1) {
                                // Skip any whitespace after the $
                                let charIndex = dollarIndex + 1;
                                while (charIndex < text.length && /\s/.test(text[charIndex])) {
                                    charIndex++;
                                }
                                return {
                                    nodeIndex: i,
                                    charIndex: charIndex // Position after $ and any whitespace
                                };
                            }
                        }
                    }
                    
                    // Also check for $ at end in current line
                    if (text.trim().endsWith('$')) {
                        const dollarIndex = text.lastIndexOf('$');
                        // Skip any whitespace after the $
                        let charIndex = dollarIndex + 1;
                        while (charIndex < text.length && /\s/.test(text[charIndex])) {
                            charIndex++;
                        }
                        return {
                            nodeIndex: i,
                            charIndex: charIndex // Position after $ and any whitespace
                        };
                    }
                }
                currentLineElement = currentLineElement.parentElement;
            }
        }
        
        // Fallback: find any prompt (old behavior)
        let headerMatch = null;
        for (let i = 0; i < this.textNodes.length; i++) {
            const node = this.textNodes[i];
            const text = node.textContent;
            const parentElement = node.parentElement;
            
            const promptPatterns = [
                /guest@portfolio[:\~\$]*\$/,
                /\w+@\w+[:\~\$]*\$/,
                /^[^@]*@[^@]*\$/
            ];
            
            for (const pattern of promptPatterns) {
                const promptMatch = text.match(pattern);
                if (promptMatch) {
                    const dollarIndex = text.lastIndexOf('$');
                    if (dollarIndex !== -1) {
                        // Skip any whitespace after the $
                        let charIndex = dollarIndex + 1;
                        while (charIndex < text.length && /\s/.test(text[charIndex])) {
                            charIndex++;
                        }
                        const match = {
                            nodeIndex: i,
                            charIndex: charIndex
                        };
                        
                        if (parentElement.className.includes('prompt')) {
                            return match;
                        } else if (parentElement.className.includes('terminal-title')) {
                            headerMatch = match;
                        }
                    }
                }
            }
            
            if (text.trim().endsWith('$')) {
                const dollarIndex = text.lastIndexOf('$');
                // Skip any whitespace after the $
                let charIndex = dollarIndex + 1;
                while (charIndex < text.length && /\s/.test(text[charIndex])) {
                    charIndex++;
                }
                const match = {
                    nodeIndex: i,
                    charIndex: charIndex
                };
                
                if (parentElement.className.includes('prompt')) {
                    return match;
                } else if (parentElement.className.includes('terminal-title')) {
                    headerMatch = match;
                }
            }
        }
        
        return headerMatch;
    }

    positionCursorAtInput() {
        if (!this.cursor) return;

        const inputRect = this.input.getBoundingClientRect();
        
        // Position cursor at the current cursor position within the input
        const inputStyle = window.getComputedStyle(this.input);
        const fontSize = parseInt(inputStyle.fontSize) || 16;
        
        // Estimate character width (rough approximation)
        const charWidth = fontSize * 0.6;
        const cursorPos = this.input.selectionStart;
        
        this.cursor.style.left = (inputRect.left + (cursorPos * charWidth)) + 'px';
        this.cursor.style.top = inputRect.top + 'px';
        this.cursor.style.height = Math.max(inputRect.height, 20) + 'px';
        
        // Scroll cursor into view
        this.cursor.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    exitPageMode() {
        this.pageMode = false;
        this.pageOverlay.style.display = 'none';
        this.cursor.style.display = 'none';
        this.input.focus();
        this.updateModeIndicator();
    }

    enterVisualMode() {
        this.mode = 'visual';
        this.visualStart = this.input.selectionStart;
        this.updateModeIndicator();
    }

    enterVisualLineMode() {
        this.mode = 'visual';
        this.visualStart = 0;
        this.input.setSelectionRange(0, this.input.value.length);
        this.updateModeIndicator();
    }

    enterReplaceMode() {
        // Simple replace mode - wait for next character
        const handleReplace = (e) => {
            e.preventDefault();
            if (e.key === 'Escape') {
                this.input.removeEventListener('keydown', handleReplace);
                return;
            }
            if (e.key.length === 1) { // Single character
                this.replaceChar(e.key);
                this.input.removeEventListener('keydown', handleReplace);
            }
        };
        this.input.addEventListener('keydown', handleReplace);
    }

    // Movement functions
    moveCursor(delta) {
        const pos = this.input.selectionStart;
        const newPos = Math.max(0, Math.min(this.input.value.length, pos + delta));
        this.input.setSelectionRange(newPos, newPos);
    }

    moveCursorToStart() {
        this.input.setSelectionRange(0, 0);
    }

    moveCursorToEnd() {
        const length = this.input.value.length;
        this.input.setSelectionRange(length, length);
    }

    moveToNextWord() {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        const wordBoundary = this.findNextWordStart(text, pos);
        this.input.setSelectionRange(wordBoundary, wordBoundary);
    }

    moveToPrevWord() {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        const wordBoundary = this.findPrevWordStart(text, pos);
        this.input.setSelectionRange(wordBoundary, wordBoundary);
    }

    moveToEndOfWord() {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        const wordEnd = this.findWordEnd(text, pos);
        this.input.setSelectionRange(wordEnd, wordEnd);
    }

    // Editing functions
    deleteChar() {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        if (pos < text.length) {
            this.clipboard = text[pos]; // Store deleted char
            this.input.value = text.slice(0, pos) + text.slice(pos + 1);
            this.input.setSelectionRange(pos, pos);
        }
    }

    deleteCharBefore() {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        if (pos > 0) {
            this.clipboard = text[pos - 1];
            this.input.value = text.slice(0, pos - 1) + text.slice(pos);
            this.input.setSelectionRange(pos - 1, pos - 1);
        }
    }

    deleteToEnd() {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        this.clipboard = text.slice(pos);
        this.input.value = text.slice(0, pos);
        this.input.setSelectionRange(pos, pos);
    }

    replaceChar(newChar) {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        if (pos < text.length) {
            this.input.value = text.slice(0, pos) + newChar + text.slice(pos + 1);
            this.input.setSelectionRange(pos, pos);
        }
    }

    openLineBelow() {
        // In a single-line input, just go to end and enter insert mode
        this.moveCursorToEnd();
        this.enterInsertMode();
    }

    openLineAbove() {
        // In a single-line input, just go to beginning and enter insert mode
        this.moveCursorToStart();
        this.enterInsertMode();
    }

    // Copy/paste functions
    handleYank(event) {
        // For now, just yank the whole line
        this.clipboard = this.input.value;
    }

    handleDelete(event) {
        // For now, just delete the whole line
        this.clipboard = this.input.value;
        this.input.value = '';
        this.input.setSelectionRange(0, 0);
    }

    pasteAfter() {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        const newPos = Math.min(pos + 1, text.length);
        this.input.value = text.slice(0, newPos) + this.clipboard + text.slice(newPos);
        this.input.setSelectionRange(newPos + this.clipboard.length, newPos + this.clipboard.length);
    }

    pasteBefore() {
        const pos = this.input.selectionStart;
        const text = this.input.value;
        this.input.value = text.slice(0, pos) + this.clipboard + text.slice(pos);
        this.input.setSelectionRange(pos + this.clipboard.length, pos + this.clipboard.length);
    }

    // Visual mode functions
    updateVisualSelection() {
        const currentPos = this.input.selectionStart;
        const start = Math.min(this.visualStart, currentPos);
        const end = Math.max(this.visualStart, currentPos);
        this.input.setSelectionRange(start, end);
    }

    yankSelection() {
        this.clipboard = this.input.value.slice(this.input.selectionStart, this.input.selectionEnd);
    }

    deleteSelection() {
        const start = this.input.selectionStart;
        const end = this.input.selectionEnd;
        this.clipboard = this.input.value.slice(start, end);
        this.input.value = this.input.value.slice(0, start) + this.input.value.slice(end);
        this.input.setSelectionRange(start, start);
    }

    // Utility functions
    findNextWordStart(text, pos) {
        let i = pos;
        // Skip current word
        while (i < text.length && /\w/.test(text[i])) i++;
        // Skip non-word characters
        while (i < text.length && !/\w/.test(text[i])) i++;
        return i;
    }

    findPrevWordStart(text, pos) {
        let i = pos - 1;
        // Skip non-word characters
        while (i >= 0 && !/\w/.test(text[i])) i--;
        // Skip word characters to find start
        while (i >= 0 && /\w/.test(text[i])) i--;
        return i + 1;
    }

    findWordEnd(text, pos) {
        let i = pos;
        // If we're in the middle of a word, go to end
        while (i < text.length && /\w/.test(text[i])) i++;
        // If we're at space, find next word end
        if (i === pos) {
            while (i < text.length && !/\w/.test(text[i])) i++;
            while (i < text.length && /\w/.test(text[i])) i++;
        }
        return Math.max(0, i - 1);
    }

    // Limited undo
    undo() {
        // Simple undo - just a placeholder
        console.log('Undo not fully implemented');
    }

    repeatLastCommand() {
        // Repeat last command - placeholder
        console.log('Repeat command not fully implemented');
    }

    // Page navigation functions
    handlePageNavigation(key) {
        switch (key) {
            case 'j': // Move down
                this.moveTextCursorDown();
                break;
            case 'k': // Move up
                this.moveTextCursorUp();
                break;
            case 'h': // Move left
                this.moveTextCursorLeft();
                break;
            case 'l': // Move right
                this.moveTextCursorRight();
                break;
            case 'w': // Next word
                this.moveToNextTextWord();
                break;
            case 'b': // Previous word
                this.moveToPrevTextWord();
                break;
            case 'e': // End of word
                this.moveToEndOfTextWord();
                break;
            case '0': // Beginning of line
                this.moveToTextLineStart();
                break;
            case '$': // End of line
                this.moveToTextLineEnd();
                break;
            case 'g': // Go to top
                if (this.lastKey === 'g') {
                    this.moveToTextStart();
                    this.lastKey = '';
                } else {
                    this.lastKey = 'g';
                }
                break;
            case 'G': // Go to bottom
                this.moveToTextEnd();
                break;
            case 'd': // Page down
                this.moveTextPageDown();
                break;
            case 'u': // Page up
                this.moveTextPageUp();
                break;
            case 'f': // Page down full
                this.moveTextPageDownFull();
                break;
            case 'b': // Page up full
                this.moveTextPageUpFull();
                break;
            case 'v': // Enter visual mode for page selection
                this.enterPageVisualMode();
                break;
            case 'y': // Copy visible text
                this.copyPageContent();
                break;
            case 'i': // Return to input mode
                this.exitPageMode();
                this.enterInsertMode();
                break;
            case '/': // Search (future enhancement)
                console.log('Search not implemented yet');
                break;
        }
        
        // Clear lastKey after a delay
        if (key !== 'g') {
            setTimeout(() => this.lastKey = '', 1000);
        }
    }

    enterPageVisualMode() {
        this.mode = 'visual';
        this.pageVisualMode = true;
        this.startTextSelection();
        this.updateModeIndicator();
    }

    startTextSelection() {
        // Enable text selection on page
        document.body.style.userSelect = 'text';
        document.body.style.cursor = 'text';
        
        // Add selection listeners
        this.selectionStarted = false;
        document.addEventListener('mousedown', this.handleSelectionStart.bind(this));
        document.addEventListener('mousemove', this.handleSelectionMove.bind(this));
        document.addEventListener('mouseup', this.handleSelectionEnd.bind(this));
    }

    handleSelectionStart(e) {
        this.selectionStarted = true;
        this.selectionStart = { x: e.clientX, y: e.clientY };
    }

    handleSelectionMove(e) {
        if (!this.selectionStarted) return;
        // Visual feedback for selection could be added here
    }

    handleSelectionEnd(e) {
        this.selectionStarted = false;
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            this.clipboard = selection.toString();
            console.log('Selected text copied to vim clipboard');
        }
    }

    copyPageContent() {
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            // Copy selection
            this.clipboard = selection.toString();
            this.copyToSystemClipboard(this.clipboard);
            console.log('Selected text copied');
        } else {
            // Copy visible page content
            const visibleText = this.getVisiblePageText();
            this.clipboard = visibleText;
            this.copyToSystemClipboard(visibleText);
            console.log('Visible page content copied');
        }
    }

    getVisiblePageText() {
        // Get all visible text elements
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, pre, code');
        let visibleText = '';
        
        textElements.forEach(element => {
            if (this.isElementVisible(element)) {
                const text = element.innerText || element.textContent;
                if (text && text.trim()) {
                    visibleText += text.trim() + '\n';
                }
            }
        });
        
        return visibleText;
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }

    async copyToSystemClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.warn('Could not copy to clipboard:', err);
        }
    }

    // Text-based navigation functions
    moveTextCursorRight() {
        if (this.textNodes.length === 0) return;
        
        const currentNode = this.textNodes[this.currentTextIndex];
        if (!currentNode) return;
        
        this.currentCharIndex++;
        
        // If we're past the end of current node, move to next node
        if (this.currentCharIndex >= currentNode.textContent.length) {
            this.currentTextIndex++;
            this.currentCharIndex = 0;
            
            // If we're past the last node, stay at the end
            if (this.currentTextIndex >= this.textNodes.length) {
                this.currentTextIndex = this.textNodes.length - 1;
                this.currentCharIndex = this.textNodes[this.currentTextIndex].textContent.length - 1;
            }
        }
        
        this.positionCursor();
    }

    moveTextCursorLeft() {
        if (this.textNodes.length === 0) return;
        
        this.currentCharIndex--;
        
        // If we're before the start of current node, move to previous node
        if (this.currentCharIndex < 0) {
            this.currentTextIndex--;
            
            // If we're before the first node, stay at the beginning
            if (this.currentTextIndex < 0) {
                this.currentTextIndex = 0;
                this.currentCharIndex = 0;
            } else {
                const prevNode = this.textNodes[this.currentTextIndex];
                this.currentCharIndex = Math.max(0, prevNode.textContent.length - 1);
            }
        }
        
        this.positionCursor();
    }

    moveTextCursorDown() {
        if (this.textNodes.length === 0) return;
        
        const currentRect = this.getCurrentCharacterRect();
        if (!currentRect) return;
        
        // Find next line by looking for text nodes below current position
        const targetY = currentRect.bottom + 5; // A bit below current line
        const targetX = currentRect.left;
        
        let bestMatch = null;
        let bestDistance = Infinity;
        
        for (let i = this.currentTextIndex + 1; i < this.textNodes.length; i++) {
            const node = this.textNodes[i];
            const nodeRect = node.parentElement.getBoundingClientRect();
            
            if (nodeRect.top > currentRect.bottom) {
                // This node is below current line
                const distance = Math.abs(nodeRect.left - targetX) + Math.abs(nodeRect.top - targetY);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = { nodeIndex: i, charIndex: 0 };
                }
                break; // Take first match below
            }
        }
        
        if (bestMatch) {
            this.currentTextIndex = bestMatch.nodeIndex;
            this.currentCharIndex = bestMatch.charIndex;
            this.positionCursor();
        }
    }

    moveTextCursorUp() {
        if (this.textNodes.length === 0) return;
        
        const currentRect = this.getCurrentCharacterRect();
        if (!currentRect) return;
        
        // Find previous line by looking for text nodes above current position
        const targetY = currentRect.top - 5; // A bit above current line
        const targetX = currentRect.left;
        
        let bestMatch = null;
        let bestDistance = Infinity;
        
        for (let i = this.currentTextIndex - 1; i >= 0; i--) {
            const node = this.textNodes[i];
            const nodeRect = node.parentElement.getBoundingClientRect();
            
            if (nodeRect.bottom < currentRect.top) {
                // This node is above current line
                const distance = Math.abs(nodeRect.left - targetX) + Math.abs(nodeRect.top - targetY);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = { nodeIndex: i, charIndex: node.textContent.length - 1 };
                }
                break; // Take first match above
            }
        }
        
        if (bestMatch) {
            this.currentTextIndex = bestMatch.nodeIndex;
            this.currentCharIndex = bestMatch.charIndex;
            this.positionCursor();
        }
    }

    getCurrentCharacterRect() {
        if (this.textNodes.length === 0) return null;
        
        const currentNode = this.textNodes[this.currentTextIndex];
        if (!currentNode) return null;
        
        const range = document.createRange();
        range.setStart(currentNode, Math.min(this.currentCharIndex, currentNode.textContent.length));
        range.setEnd(currentNode, Math.min(this.currentCharIndex + 1, currentNode.textContent.length));
        
        return range.getBoundingClientRect();
    }

    moveToNextTextWord() {
        if (this.textNodes.length === 0) return;
        
        const currentNode = this.textNodes[this.currentTextIndex];
        const text = currentNode.textContent;
        let pos = this.currentCharIndex;
        
        // Skip current word
        while (pos < text.length && /\w/.test(text[pos])) pos++;
        // Skip non-word characters
        while (pos < text.length && !/\w/.test(text[pos])) pos++;
        
        if (pos >= text.length && this.currentTextIndex < this.textNodes.length - 1) {
            // Move to next node
            this.currentTextIndex++;
            this.currentCharIndex = 0;
            this.moveToNextTextWord(); // Recursively find next word
        } else {
            this.currentCharIndex = pos;
        }
        
        this.positionCursor();
    }

    moveToPrevTextWord() {
        if (this.textNodes.length === 0) return;
        
        const currentNode = this.textNodes[this.currentTextIndex];
        const text = currentNode.textContent;
        let pos = this.currentCharIndex - 1;
        
        // Skip non-word characters
        while (pos >= 0 && !/\w/.test(text[pos])) pos--;
        // Skip word characters to find start
        while (pos >= 0 && /\w/.test(text[pos])) pos--;
        
        if (pos < 0 && this.currentTextIndex > 0) {
            // Move to previous node
            this.currentTextIndex--;
            const prevNode = this.textNodes[this.currentTextIndex];
            this.currentCharIndex = prevNode.textContent.length - 1;
            this.moveToPrevTextWord(); // Recursively find prev word
        } else {
            this.currentCharIndex = Math.max(0, pos + 1);
        }
        
        this.positionCursor();
    }

    moveToEndOfTextWord() {
        if (this.textNodes.length === 0) return;
        
        const currentNode = this.textNodes[this.currentTextIndex];
        const text = currentNode.textContent;
        let pos = this.currentCharIndex;
        
        // If we're in the middle of a word, go to end
        while (pos < text.length && /\w/.test(text[pos])) pos++;
        // If we're at space, find next word end
        if (pos === this.currentCharIndex) {
            while (pos < text.length && !/\w/.test(text[pos])) pos++;
            while (pos < text.length && /\w/.test(text[pos])) pos++;
        }
        
        if (pos >= text.length && this.currentTextIndex < this.textNodes.length - 1) {
            // Move to next node
            this.currentTextIndex++;
            this.currentCharIndex = 0;
            this.moveToEndOfTextWord(); // Recursively find word end
        } else {
            this.currentCharIndex = Math.min(text.length - 1, Math.max(0, pos - 1));
        }
        
        this.positionCursor();
    }

    moveToTextLineStart() {
        if (this.textNodes.length === 0) return;
        
        const currentRect = this.getCurrentCharacterRect();
        if (!currentRect) return;
        
        // Find the leftmost character at the current line
        const currentY = currentRect.top;
        let bestMatch = { nodeIndex: this.currentTextIndex, charIndex: 0 };
        
        for (let i = 0; i <= this.currentTextIndex; i++) {
            const node = this.textNodes[i];
            const nodeRect = node.parentElement.getBoundingClientRect();
            
            if (Math.abs(nodeRect.top - currentY) < 5) {
                // This node is on the same line
                bestMatch = { nodeIndex: i, charIndex: 0 };
                break;
            }
        }
        
        this.currentTextIndex = bestMatch.nodeIndex;
        this.currentCharIndex = bestMatch.charIndex;
        this.positionCursor();
    }

    moveToTextLineEnd() {
        if (this.textNodes.length === 0) return;
        
        const currentRect = this.getCurrentCharacterRect();
        if (!currentRect) return;
        
        // Find the rightmost character at the current line
        const currentY = currentRect.top;
        let bestMatch = { nodeIndex: this.currentTextIndex, charIndex: this.currentCharIndex };
        
        for (let i = this.currentTextIndex; i < this.textNodes.length; i++) {
            const node = this.textNodes[i];
            const nodeRect = node.parentElement.getBoundingClientRect();
            
            if (Math.abs(nodeRect.top - currentY) < 5) {
                // This node is on the same line
                bestMatch = { nodeIndex: i, charIndex: node.textContent.length - 1 };
            } else if (nodeRect.top > currentY + 5) {
                // We've moved to the next line
                break;
            }
        }
        
        this.currentTextIndex = bestMatch.nodeIndex;
        this.currentCharIndex = Math.max(0, bestMatch.charIndex);
        this.positionCursor();
    }

    moveToTextStart() {
        if (this.textNodes.length === 0) return;
        
        this.currentTextIndex = 0;
        this.currentCharIndex = 0;
        this.positionCursor();
    }

    moveToTextEnd() {
        if (this.textNodes.length === 0) return;
        
        this.currentTextIndex = this.textNodes.length - 1;
        const lastNode = this.textNodes[this.currentTextIndex];
        this.currentCharIndex = Math.max(0, lastNode.textContent.length - 1);
        this.positionCursor();
    }

    moveTextPageDown() {
        const viewportHeight = window.innerHeight;
        const currentRect = this.getCurrentCharacterRect();
        if (!currentRect) return;
        
        const targetY = currentRect.top + viewportHeight / 2;
        this.moveToClosestTextAtY(targetY);
    }

    moveTextPageUp() {
        const viewportHeight = window.innerHeight;
        const currentRect = this.getCurrentCharacterRect();
        if (!currentRect) return;
        
        const targetY = currentRect.top - viewportHeight / 2;
        this.moveToClosestTextAtY(targetY);
    }

    moveTextPageDownFull() {
        const viewportHeight = window.innerHeight;
        const currentRect = this.getCurrentCharacterRect();
        if (!currentRect) return;
        
        const targetY = currentRect.top + viewportHeight;
        this.moveToClosestTextAtY(targetY);
    }

    moveTextPageUpFull() {
        const viewportHeight = window.innerHeight;
        const currentRect = this.getCurrentCharacterRect();
        if (!currentRect) return;
        
        const targetY = currentRect.top - viewportHeight;
        this.moveToClosestTextAtY(targetY);
    }

    moveToClosestTextAtY(targetY) {
        if (this.textNodes.length === 0) return;
        
        let bestMatch = null;
        let bestDistance = Infinity;
        
        for (let i = 0; i < this.textNodes.length; i++) {
            const node = this.textNodes[i];
            const nodeRect = node.parentElement.getBoundingClientRect();
            const distance = Math.abs(nodeRect.top - targetY);
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = { nodeIndex: i, charIndex: 0 };
            }
        }
        
        if (bestMatch) {
            this.currentTextIndex = bestMatch.nodeIndex;
            this.currentCharIndex = bestMatch.charIndex;
            this.positionCursor();
        }
    }


    handlePageVisualMode(key) {
        switch (key) {
            case 'j': // Move down while selecting
                this.moveTextCursorDown();
                break;
            case 'k': // Move up while selecting
                this.moveTextCursorUp();
                break;
            case 'h': // Move left while selecting
                this.moveTextCursorLeft();
                break;
            case 'l': // Move right while selecting
                this.moveTextCursorRight();
                break;
            case 'w': // Next word while selecting
                this.moveToNextTextWord();
                break;
            case 'b': // Previous word while selecting
                this.moveToPrevTextWord();
                break;
            case 'y': // Yank selected content
                this.copyPageContent();
                this.exitPageVisualMode();
                break;
            case 'c': // Copy selected content (same as yank)
                this.copyPageContent();
                this.exitPageVisualMode();
                break;
            case 'Escape': // Exit visual mode
                this.exitPageVisualMode();
                break;
        }
    }

    exitPageVisualMode() {
        this.pageVisualMode = false;
        this.mode = 'normal';
        this.stopTextSelection();
        this.updateModeIndicator();
    }

    stopTextSelection() {
        // Disable text selection
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'default';
        
        // Remove selection listeners
        document.removeEventListener('mousedown', this.handleSelectionStart);
        document.removeEventListener('mousemove', this.handleSelectionMove);
        document.removeEventListener('mouseup', this.handleSelectionEnd);
        
        // Clear any existing selection
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    // File editing functionality
    setupFileEditor() {
        this.createFileEditorModal();
        this.addFileCommands();
    }

    createFileEditorModal() {
        this.fileEditorModal = document.createElement('div');
        this.fileEditorModal.id = 'vim-file-editor';
        this.fileEditorModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10001;
            display: none;
            font-family: 'Courier New', monospace;
        `;

        const editorContainer = document.createElement('div');
        editorContainer.style.cssText = `
            position: absolute;
            top: 50px;
            left: 50px;
            right: 50px;
            bottom: 50px;
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
        `;

        const editorHeader = document.createElement('div');
        editorHeader.style.cssText = `
            background: #2d2d30;
            color: #fff;
            padding: 10px;
            border-bottom: 1px solid #333;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        this.fileNameDisplay = document.createElement('span');
        this.fileNameDisplay.textContent = 'Untitled.py';

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: #fff;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
        `;
        closeButton.onclick = () => this.closeFileEditor();

        editorHeader.appendChild(this.fileNameDisplay);
        editorHeader.appendChild(closeButton);

        this.fileTextArea = document.createElement('textarea');
        this.fileTextArea.style.cssText = `
            flex: 1;
            background: #1e1e1e;
            color: #d4d4d4;
            border: none;
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            resize: none;
            outline: none;
            tab-size: 4;
        `;

        const statusBar = document.createElement('div');
        statusBar.style.cssText = `
            background: #007acc;
            color: #fff;
            padding: 5px 20px;
            font-size: 12px;
            border-top: 1px solid #333;
        `;
        statusBar.textContent = 'Press Ctrl+S to save, Esc to close';

        editorContainer.appendChild(editorHeader);
        editorContainer.appendChild(this.fileTextArea);
        editorContainer.appendChild(statusBar);
        this.fileEditorModal.appendChild(editorContainer);
        document.body.appendChild(this.fileEditorModal);

        this.setupFileEditorEvents();
    }

    setupFileEditorEvents() {
        this.fileTextArea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCurrentFile();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeFileEditor();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.fileTextArea.selectionStart;
                const end = this.fileTextArea.selectionEnd;
                this.fileTextArea.value = this.fileTextArea.value.substring(0, start) + '    ' + this.fileTextArea.value.substring(end);
                this.fileTextArea.selectionStart = this.fileTextArea.selectionEnd = start + 4;
            }
        });
    }

    addFileCommands() {
        const originalHandleNormalMode = this.handleNormalMode.bind(this);
        this.handleNormalMode = (event) => {
            const key = event.key;
            
            if (this.commandBuffer === ':' && key === 'o') {
                event.preventDefault();
                this.commandBuffer = ':o';
                this.showCommandPrompt(':o ');
                return;
            }
            
            if (this.commandBuffer === ':' && key === 'w') {
                event.preventDefault();
                this.executeWriteCommand();
                this.commandBuffer = '';
                return;
            }
            
            if (key === ':') {
                event.preventDefault();
                this.commandBuffer = ':';
                this.showCommandPrompt(':');
                return;
            }
            
            originalHandleNormalMode(event);
        };
    }

    showCommandPrompt(prompt) {
        const commandLine = document.createElement('div');
        commandLine.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #000;
            color: #fff;
            padding: 5px 10px;
            font-family: monospace;
            z-index: 10002;
            border: 1px solid #333;
        `;
        commandLine.textContent = prompt;
        document.body.appendChild(commandLine);

        const input = document.createElement('input');
        input.style.cssText = `
            background: transparent;
            border: none;
            color: #fff;
            font-family: monospace;
            outline: none;
            margin-left: 5px;
        `;
        commandLine.appendChild(input);
        input.focus();

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const command = prompt + input.value;
                this.executeCommand(command);
                document.body.removeChild(commandLine);
            } else if (e.key === 'Escape') {
                document.body.removeChild(commandLine);
            }
        });
    }

    executeCommand(command) {
        if (command.startsWith(':o ')) {
            const filename = command.substring(3).trim();
            this.openFile(filename);
        } else if (command === ':w') {
            this.saveCurrentFile();
        } else if (command.startsWith(':w ')) {
            const filename = command.substring(3).trim();
            this.saveFileAs(filename);
        }
    }

    executeWriteCommand() {
        if (this.currentFile) {
            this.saveCurrentFile();
        } else {
            this.showCommandPrompt(':w ');
        }
    }

    async openFile(filename) {
        try {
            const response = await fetch(`/api/files/load?filename=${encodeURIComponent(filename)}`);
            if (response.ok) {
                const fileData = await response.json();
                this.currentFile = fileData.filename;
                this.fileContent = fileData.content;
                this.showFileEditor();
            } else if (response.status === 404) {
                this.currentFile = filename;
                this.fileContent = `#!/usr/bin/env python3

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`;
                this.showFileEditor();
            } else {
                console.error('Failed to load file:', response.statusText);
                alert('Failed to load file. Make sure you are logged in.');
            }
        } catch (error) {
            console.error('Error loading file:', error);
            alert('Error loading file. Check your connection.');
        }
    }

    showFileEditor() {
        this.fileNameDisplay.textContent = this.currentFile || 'Untitled.py';
        this.fileTextArea.value = this.fileContent;
        this.fileEditorModal.style.display = 'block';
        this.fileTextArea.focus();
        this.isFileMode = true;
        this.updateModeIndicator();
    }

    closeFileEditor() {
        this.fileEditorModal.style.display = 'none';
        this.isFileMode = false;
        this.updateModeIndicator();
        this.input.focus();
    }

    async saveCurrentFile() {
        if (!this.currentFile) {
            this.showCommandPrompt(':w ');
            return;
        }

        const fileData = {
            filename: this.currentFile,
            content: this.fileTextArea.value,
            file_type: 'python'
        };

        try {
            const response = await fetch('/api/files/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(fileData)
            });

            if (response.ok) {
                console.log('File saved successfully');
                this.showTemporaryMessage('File saved!');
            } else {
                console.error('Failed to save file:', response.statusText);
                alert('Failed to save file. Make sure you are logged in.');
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file. Check your connection.');
        }
    }

    async saveFileAs(filename) {
        this.currentFile = filename;
        this.fileNameDisplay.textContent = filename;
        await this.saveCurrentFile();
    }

    showTemporaryMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10003;
            font-family: monospace;
        `;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);

        setTimeout(() => {
            if (messageEl.parentNode) {
                document.body.removeChild(messageEl);
            }
        }, 2000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VimEditor;
} else if (typeof window !== 'undefined') {
    // Make VimEditor available globally in browser
    window.VimEditor = VimEditor;
}