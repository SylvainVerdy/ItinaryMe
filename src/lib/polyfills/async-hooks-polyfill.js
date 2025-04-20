// Mock pour le module async_hooks qui n'existe pas dans l'environnement du navigateur
// Ce fichier est directement utilisé lorsque OpenTelemetry essaie de charger async_hooks

/**
 * Mock simple de asyncHooks pour les environnements sans support natif
 */
module.exports = {
  // AsyncResource API
  AsyncResource: class AsyncResource {
    constructor(type, options) {
      this.type = type;
      this.options = options;
    }
    
    runInAsyncScope(fn, thisArg, ...args) {
      return fn.apply(thisArg, args);
    }
    
    emitDestroy() {}
    
    asyncId() {
      return 1;
    }
    
    triggerAsyncId() {
      return 0;
    }
    
    static bind(fn, type) {
      return fn;
    }
    
    static executionAsyncId() {
      return 1;
    }
    
    static triggerAsyncId() {
      return 0;
    }
  },
  
  // AsyncHook API
  createHook: function(handlers) {
    return {
      enable: function() { return this; },
      disable: function() { return this; }
    };
  },
  
  // Execution context functions
  executionAsyncId: function() { 
    return 1;
  },
  
  triggerAsyncId: function() {
    return 0;
  },
  
  // AsyncLocalStorage API
  AsyncLocalStorage: class AsyncLocalStorage {
    constructor() {
      this._store = new Map();
    }
    
    run(store, callback, ...args) {
      return callback(...args);
    }
    
    exit(callback, ...args) {
      return callback(...args);
    }
    
    getStore() {
      return null;
    }
    
    enterWith(store) {}
    
    disable() {
      return this;
    }
  }
}; 