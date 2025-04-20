/** @type {import('next').NextConfig} */
const path = require('path');
const webpack = require('webpack');

const nextConfig = {
  webpack: (config, { isServer }) => {
    // Solution RADICALE: Ignorer COMPLÈTEMENT les modules @opentelemetry
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@opentelemetry/,
      })
    );

    // Appliquer ces modifications pour le client (navigateur)
    if (!isServer) {
      // Fallbacks pour les modules Node natifs
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'async_hooks': false,
        'fs': false,
        'net': false,
        'tls': false,
        'perf_hooks': false,
        'child_process': false,
      };
    }
    
    return config;
  },
  // Exclure OpenTelemetry des modules bundlés
  experimental: {
    serverComponentsExternalPackages: ['@opentelemetry'],
  },
};

module.exports = nextConfig; 