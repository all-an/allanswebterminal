const { JSDOM } = require('jsdom');

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

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