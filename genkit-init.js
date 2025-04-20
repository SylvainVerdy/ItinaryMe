// Désactiver la télémétrie GenKit
process.env.GENKIT_TELEMETRY_DISABLED = "true";
console.log("GenKit telemetry disabled");

// Définir un mock pour async_hooks
process.env.OPENTELEMETRY_NO_ASYNC_HOOKS = "true";

// Remplacer async_hooks par un mock si nécessaire
try {
  const asyncHooks = require('async_hooks');
  if (!asyncHooks) {
    console.log("async_hooks unavailable, mocking it");
    module.exports = {
      createHook: () => ({ enable: () => {}, disable: () => {} }),
      executionAsyncId: () => 1,
      triggerAsyncId: () => 0,
      AsyncResource: class AsyncResource {
        constructor(type) {
          this.type = type;
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
      }
    };
  }
} catch (e) {
  console.log("async_hooks unavailable, mocking it");
}
