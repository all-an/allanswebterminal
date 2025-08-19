const { expect } = require('chai');

// Load the VimEditor class
const VimEditor = require('../static/vim.js');

describe('VimEditor', function() {
    let editor;

    beforeEach(function() {
        editor = new VimEditor();
    });

    describe('createModalOverlay', function() {
        it('should return a div element with vim-editor-modal class', function() {
            const overlay = editor.createModalOverlay();
            
            expect(overlay.tagName).to.equal('DIV');
            expect(overlay.className).to.equal('vim-editor-modal');
        });

        it('should have correct positioning styles', function() {
            const overlay = editor.createModalOverlay();
            
            expect(overlay.style.position).to.equal('fixed');
            expect(overlay.style.top).to.equal('0px');
            expect(overlay.style.left).to.equal('0px');
            expect(overlay.style.width).to.equal('100%');
            expect(overlay.style.height).to.equal('100%');
        });

        it('should have correct display and z-index styles', function() {
            const overlay = editor.createModalOverlay();
            
            expect(overlay.style.display).to.equal('flex');
            expect(overlay.style.zIndex).to.equal('10001');
        });
    });

    describe('createEditorContainer', function() {
        it('should return a div element with vim-editor class', function() {
            const container = editor.createEditorContainer();
            
            expect(container.tagName).to.equal('DIV');
            expect(container.className).to.equal('vim-editor');
        });

        it('should have flex display and column direction', function() {
            const container = editor.createEditorContainer();
            
            expect(container.style.display).to.equal('flex');
            expect(container.style.flexDirection).to.equal('column');
        });

        it('should have correct dimensions', function() {
            const container = editor.createEditorContainer();
            
            expect(container.style.width).to.equal('95%');
            expect(container.style.height).to.equal('95%');
        });
    });

    describe('createHeader', function() {
        it('should return a div element with header content', function() {
            const filename = 'test.py';
            const header = editor.createHeader(filename);
            
            expect(header.tagName).to.equal('DIV');
            expect(header.children.length).to.equal(2);
        });

        it('should set the title with the provided filename', function() {
            const filename = 'test.py';
            const header = editor.createHeader(filename);
            
            expect(editor.title.textContent).to.equal(filename);
            expect(editor.title.style.fontWeight).to.equal('bold');
        });

        it('should include command hints', function() {
            const filename = 'test.py';
            const header = editor.createHeader(filename);
            const commandsSpan = header.children[1];
            
            expect(commandsSpan.textContent).to.include('ESC');
            expect(commandsSpan.textContent).to.include(':w=save');
            expect(commandsSpan.textContent).to.include(':q=quit');
        });

        it('should have correct background styling', function() {
            const header = editor.createHeader('test.py');
            
            expect(header.style.background).to.equal('rgb(45, 45, 48)');
            expect(header.style.display).to.equal('flex');
            expect(header.style.justifyContent).to.equal('space-between');
        });
    });

    describe('createLineNumbers', function() {
        it('should return a div element with vim-line-numbers class', function() {
            const lineNumbers = editor.createLineNumbers();
            
            expect(lineNumbers.tagName).to.equal('DIV');
            expect(lineNumbers.className).to.equal('vim-line-numbers');
        });

        it('should have correct styling for line numbers', function() {
            const lineNumbers = editor.createLineNumbers();
            
            expect(lineNumbers.style.textAlign).to.equal('right');
            expect(lineNumbers.style.userSelect).to.equal('none');
            expect(lineNumbers.style.whiteSpace).to.equal('pre');
        });

        it('should have monospace font styling', function() {
            const lineNumbers = editor.createLineNumbers();
            
            expect(lineNumbers.style.fontFamily).to.include('Monaco');
            expect(lineNumbers.style.fontSize).to.equal('20px');
        });
    });

    describe('createHiddenTextarea', function() {
        it('should return a textarea element', function() {
            const textarea = editor.createHiddenTextarea();
            
            expect(textarea.tagName).to.equal('TEXTAREA');
        });

        it('should be positioned off-screen', function() {
            const textarea = editor.createHiddenTextarea();
            
            expect(textarea.style.position).to.equal('absolute');
            expect(textarea.style.top).to.equal('-9999px');
            expect(textarea.style.left).to.equal('-9999px');
            expect(textarea.style.opacity).to.equal('0');
        });
    });

    describe('createContentArea', function() {
        it('should return a pre element with vim-content class', function() {
            const contentArea = editor.createContentArea();
            
            expect(contentArea.tagName).to.equal('PRE');
            expect(contentArea.className).to.equal('vim-content');
        });

        it('should have correct text styling', function() {
            const contentArea = editor.createContentArea();
            
            expect(contentArea.style.whiteSpace).to.equal('pre');
            expect(contentArea.style.fontFamily).to.include('Monaco');
            expect(contentArea.style.fontSize).to.equal('20px');
        });

        it('should have zero margin and proper padding', function() {
            const contentArea = editor.createContentArea();
            
            expect(contentArea.style.margin).to.equal('0px');
            expect(contentArea.style.padding).to.equal('8px 12px');
        });
    });

    describe('createCursor', function() {
        it('should return a span element with vim-cursor class', function() {
            const cursor = editor.createCursor();
            
            expect(cursor.tagName).to.equal('SPAN');
            expect(cursor.className).to.equal('vim-cursor');
        });

        it('should be positioned absolutely', function() {
            const cursor = editor.createCursor();
            
            expect(cursor.style.position).to.equal('absolute');
            expect(cursor.style.pointerEvents).to.equal('none');
        });

        it('should have correct initial dimensions', function() {
            const cursor = editor.createCursor();
            
            expect(cursor.style.width).to.equal('8px');
            expect(cursor.style.height).to.equal('18px');
        });

        it('should have animation applied', function() {
            const cursor = editor.createCursor();
            
            expect(cursor.style.animation).to.include('vim-cursor-blink');
        });
    });

    describe('ensureCursorStyles', function() {
        it('should add cursor styles to document head if not present', function() {
            // Clear any existing styles
            const existingStyle = document.getElementById('vim-cursor-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            editor.ensureCursorStyles();
            
            const style = document.getElementById('vim-cursor-styles');
            expect(style).to.not.be.null;
            expect(style.tagName).to.equal('STYLE');
            expect(style.textContent).to.include('@keyframes vim-cursor-blink');
        });

        it('should not duplicate styles if already present', function() {
            editor.ensureCursorStyles();
            editor.ensureCursorStyles();
            
            const styles = document.querySelectorAll('#vim-cursor-styles');
            expect(styles.length).to.equal(1);
        });
    });

    describe('createTextContainer', function() {
        it('should return a div element with proper children', function() {
            const textContainer = editor.createTextContainer();
            
            expect(textContainer.tagName).to.equal('DIV');
            expect(textContainer.children.length).to.equal(3);
        });

        it('should set instance properties for textarea, contentArea, and cursor', function() {
            editor.createTextContainer();
            
            expect(editor.textarea).to.not.be.undefined;
            expect(editor.contentArea).to.not.be.undefined;
            expect(editor.cursor).to.not.be.undefined;
        });

        it('should have flex styling', function() {
            const textContainer = editor.createTextContainer();
            
            expect(textContainer.style.flex).to.include('1');
            expect(textContainer.style.position).to.equal('relative');
            expect(textContainer.style.overflow).to.equal('auto');
        });
    });

    describe('createEditingArea', function() {
        it('should return a div element with line numbers and text container', function() {
            const editingArea = editor.createEditingArea();
            
            expect(editingArea.tagName).to.equal('DIV');
            expect(editingArea.children.length).to.equal(2);
        });

        it('should set lineNumbers instance property', function() {
            editor.createEditingArea();
            
            expect(editor.lineNumbers).to.not.be.undefined;
        });

        it('should have flex display styling', function() {
            const editingArea = editor.createEditingArea();
            
            expect(editingArea.style.flex).to.include('1');
            expect(editingArea.style.display).to.equal('flex');
            expect(editingArea.style.position).to.equal('relative');
        });
    });

    describe('createStatusBar', function() {
        it('should return a div element with vim-status class', function() {
            const statusBar = editor.createStatusBar();
            
            expect(statusBar.tagName).to.equal('DIV');
            expect(statusBar.className).to.equal('vim-status');
        });

        it('should have left and right status spans', function() {
            const statusBar = editor.createStatusBar();
            
            expect(statusBar.children.length).to.equal(2);
            expect(editor.statusLeft.textContent).to.equal('-- NORMAL --');
            expect(editor.statusRight.textContent).to.equal('Line 1, Col 1');
        });

        it('should have correct styling', function() {
            const statusBar = editor.createStatusBar();
            
            expect(statusBar.style.display).to.equal('flex');
            expect(statusBar.style.justifyContent).to.equal('space-between');
            expect(statusBar.style.background).to.equal('rgb(0, 122, 204)');
        });
    });

    describe('createModal', function() {
        it('should assemble all components into a complete modal', function() {
            const filename = 'test.py';
            const modal = editor.createModal(filename);
            
            expect(modal.className).to.equal('vim-editor-modal');
            expect(modal.children.length).to.equal(1);
            
            const editorContainer = modal.children[0];
            expect(editorContainer.className).to.equal('vim-editor');
            expect(editorContainer.children.length).to.equal(3);
        });

        it('should set currentFilename property', function() {
            const filename = 'test.py';
            editor.createModal(filename);
            
            expect(editor.currentFilename).to.equal(filename);
        });

        it('should set modal instance property', function() {
            const filename = 'test.py';
            const modal = editor.createModal(filename);
            
            expect(editor.modal).to.equal(modal);
        });

        it('should return the created modal element', function() {
            const filename = 'test.py';
            const modal = editor.createModal(filename);
            
            expect(modal).to.not.be.null;
            expect(modal.tagName).to.equal('DIV');
        });
    });
});