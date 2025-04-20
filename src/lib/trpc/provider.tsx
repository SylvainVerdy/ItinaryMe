// Désactivation de @opentelemetry pour éviter les problèmes avec async_hooks
if (typeof window !== 'undefined') {
  // Créer une implémentation vide de async_hooks si nécessaire
  // @ts-ignore
  window.asyncHooks = {};
}

// Reste du code existant
// ... existing code ... 