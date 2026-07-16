// Mock Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
  },
};

// Mock document and window
global.document = {
  title: 'Test Title',
  documentElement: {
    outerHTML: '<html><body>Test content</body></html>'
  },
  body: {
    innerText: 'Test content',
  },
};

global.window = {
  location: {
    href: 'https://example.com',
  },
};

// Mock DOMParser for Node.js environment
class MockDOMParser {
  parseFromString(html, _mimeType) { // eslint-disable-line no-unused-vars
    return {
      querySelector: () => null,
      body: {
        textContent: html.replace(/<[^>]*>/g, ' ').trim()
      }
    };
  }
}

global.DOMParser = MockDOMParser;

// Import the content script
require('../content');

describe('Content script', () => {
  test('registers message listener', () => {
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  test('extractPageContent returns correct structure', () => {
    // Capture the listener function passed to addListener
    const listenerCallback = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    // Create mock request, sender, and sendResponse
    const mockRequest = { action: 'extractContent' };
    const mockSender = {};
    const mockSendResponse = jest.fn();
    
    // Call the listener
    listenerCallback(mockRequest, mockSender, mockSendResponse);
    
    // Verify sendResponse was called with correct structure
    expect(mockSendResponse).toHaveBeenCalledWith({
      content: {
        title: 'Test Title',
        url: 'https://example.com',
        jobDescription: expect.any(String),
        skills: expect.any(Array),
        experience: expect.any(String),
        fullText: 'Test content'
      }
    });
  });
});
