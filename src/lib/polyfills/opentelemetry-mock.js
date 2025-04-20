// Mock pour @opentelemetry/context-async-hooks et @opentelemetry/sdk-trace-node
// Ce fichier est utilisé pour remplacer les modules qui tentent d'utiliser async_hooks en environnement navigateur

// Mock pour AsyncHooksContextManager
class MockAsyncHooksContextManager {
  constructor() {
    this._activeContext = {};
  }
  
  active() {
    return this._activeContext;
  }
  
  with(context, fn) {
    return fn();
  }
  
  bind(target) {
    return target;
  }
  
  enable() {
    return this;
  }
  
  disable() {
    return this;
  }
}

// Export un objet qui imite l'interface du module @opentelemetry/context-async-hooks
exports.AsyncHooksContextManager = MockAsyncHooksContextManager;

// Mock pour NodeTracerProvider
class MockNodeTracerProvider {
  constructor() {}
  
  getTracer() {
    return {
      startSpan() {
        return {
          end() {},
          updateName() {},
          setAttribute() {},
          setAttributes() {},
          recordException() {},
          setStatus() {},
          isRecording() { return false; }
        };
      }
    };
  }
  
  register() {
    return this;
  }
  
  shutdown() {
    return Promise.resolve();
  }
}

// Export un objet qui imite l'interface du module @opentelemetry/sdk-trace-node
exports.NodeTracerProvider = MockNodeTracerProvider;

// Export d'autres objets couramment utilisés par OpenTelemetry
exports.detectResources = () => Promise.resolve({});
exports.envDetector = { detect: () => Promise.resolve({}) };
exports.processDetector = { detect: () => Promise.resolve({}) };
exports.osDetector = { detect: () => Promise.resolve({}) };
exports.hostDetector = { detect: () => Promise.resolve({}) };
exports.browserDetector = { detect: () => Promise.resolve({}) };
exports.awsLambdaDetector = { detect: () => Promise.resolve({}) }; 