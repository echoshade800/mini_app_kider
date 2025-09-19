module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Remove react-native-reanimated/plugin to fix the error
      // 'react-native-reanimated/plugin',
    ],
  };
};