const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure for web compatibility
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    mangle: {
      keep_fnames: true,
    },
  },
};

// Configure resolver for better web support
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  alias: {
    'react-native$': 'react-native-web',
  },
};

// Configure server settings
config.server = {
  port: 8081,
  host: '0.0.0.0',
};

module.exports = config;