const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure we pick up all necessary extensions
config.resolver.sourceExts.push('mjs', 'js', 'jsx', 'json', 'ts', 'tsx');

module.exports = config;
