const { JSDOM } = require('jsdom');

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    pretendToBeVisual: true,
    resources: "usable"
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Add createElement method that returns proper DOM elements
const originalCreateElement = global.document.createElement.bind(global.document);
global.document.createElement = function(tagName) {
    const element = originalCreateElement(tagName);
    
    // Ensure all necessary properties exist
    if (!element.style) element.style = {};
    if (!element.classList) element.classList = { add: function() {}, remove: function() {} };
    if (!element.appendChild) element.appendChild = function() {};
    if (!element.insertBefore) element.insertBefore = function() {};
    if (!element.querySelector) element.querySelector = function() { return null; };
    if (!element.querySelectorAll) element.querySelectorAll = function() { return []; };
    if (!element.addEventListener) element.addEventListener = function() {};
    
    return element;
};

// Add missing DOM methods for JSDOM
global.HTMLElement = dom.window.HTMLElement;

// Mock getComputedStyle
global.window.getComputedStyle = function() {
    return {
        fontSize: '14px',
        fontFamily: 'monospace',
        lineHeight: '20px',
        paddingLeft: '0px',
        paddingTop: '0px'
    };
};

// Mock canvas context for text measurement
if (global.window.HTMLCanvasElement && global.window.HTMLCanvasElement.prototype) {
    global.window.HTMLCanvasElement.prototype.getContext = function(type) {
        if (type === '2d') {
            return {
                font: '',
                measureText: function(text) {
                    return { width: text.length * 8 }; // Mock character width
                }
            };
        }
        return null;
    };
}

// Mock element.remove method
if (global.window.Element && global.window.Element.prototype) {
    global.window.Element.prototype.remove = function() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    };
}

// Mock fetch for testing
global.fetch = function() {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
    });
};

// Mock alert
global.alert = function(message) {
    console.log('ALERT:', message);
};

// Mock global functions used in app.js
global.addOutput = function() {};
global.updatePrompt = function() {};
global.refreshCurrentLine = function() {};
global.scrollToBottom = function() {};