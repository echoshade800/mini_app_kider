const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure server settings
config.server = {
  port: 8081,
  host: '0.0.0.0',
};

// Configure resolver for better asset handling
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
module.exports = config;