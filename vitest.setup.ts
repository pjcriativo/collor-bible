import "@testing-library/dom";

// Stub localStorage just in case (jsdom already provides one, but we reset it between tests)
beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

// JSDOM doesn't implement scrollIntoView; some components call it inside
// useEffect (e.g. ColoringCanvas auto-scrolling the active page thumbnail).
// JSDOM defines the property as a stub that throws "not implemented", so
// `!Element.prototype.scrollIntoView` is FALSE — we have to always reassign.
if (typeof window !== "undefined") {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// JSDOM doesn't provide ResizeObserver — components that observe layout
// (canvas page-list overflow, etc.) crash without it. Minimal noop stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;
