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
    outerHTML: '<html><body>Test content</body></html>',
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
  parseFromString(html, _mimeType) {
    // eslint-disable-line no-unused-vars
    return {
      querySelector: () => null,
      body: {
        textContent: html.replace(/<[^>]*>/g, ' ').trim(),
      },
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
    const listenerCallback =
      chrome.runtime.onMessage.addListener.mock.calls[0][0];

    const mockRequest = { action: 'extractContent' };
    const mockSender = {};
    const mockSendResponse = jest.fn();

    listenerCallback(mockRequest, mockSender, mockSendResponse);

    const response = mockSendResponse.mock.calls[0][0];
    expect(response).toHaveProperty('content');
    expect(response.content).toHaveProperty('title');
    expect(response.content).toHaveProperty('url');
    expect(response.content).toHaveProperty('jobDescription');
    expect(response.content).toHaveProperty('skills');
    expect(response.content).toHaveProperty('experience');
    expect(response.content).toHaveProperty('fullText');
    expect(Array.isArray(response.content.skills)).toBe(true);
    expect(typeof response.content.title).toBe('string');
    expect(typeof response.content.url).toBe('string');
  });
});
