const path = require('path');

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    util: require.resolve('util/'),
    dns: false,
    net: false,
    tls: false,
    path: require.resolve('path-browserify'),
    stream: require.resolve('stream-browserify'),
    crypto: require.resolve('crypto-browserify'),
    buffer: require.resolve('buffer/'),
  };
  
  config.resolve.modules = [
    path.resolve(__dirname, 'src'),
    ...config.resolve.modules
  ];
  
  return config;
};
