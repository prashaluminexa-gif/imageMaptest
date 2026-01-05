const WebpackObfuscator = require('webpack-obfuscator');
const TerserPlugin = require('terser-webpack-plugin');
const { DefinePlugin } = require('webpack');

module.exports = function override(config, env) {
  if (env === 'production') {
    config.mode = 'production';
    config.devtool = false;

    // Minification + removing logs
    config.optimization = {
      ...config.optimization,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.info', 'console.debug', 'console.warn'],
            },
            mangle: {
              toplevel: true,
              keep_fnames: false,
            },
            output: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 20000, // a bit larger to reduce too many chunks
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)(?=$|[\\/])/
              )[1];
              return `npm.${packageName.replace('@', '')}`;
            },
            priority: -10,
          },
        },
      },
    };

    // Obfuscation - medium level
    config.plugins = (config.plugins || []).concat([
      new WebpackObfuscator(
        {
          compact: true,
          identifierNamesGenerator: 'hexadecimal',
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.5, // 50% of strings obfuscated (lighter load)
          rotateStringArray: true,
          transformObjectKeys: true,

          // Lower complexity here
          controlFlowFlattening: false, // disable heavy flattening
          deadCodeInjection: false, // avoid random dead code

          // Anti-debugging (light)
          debugProtection: false, // disabled for stability
          disableConsoleOutput: true,
          selfDefending: true,

          seed: 654321,
          target: 'browser',
        },
        [
          'vendors*.js',
          'service-worker.js',
          'npm.*.js',
        ]
      ),
      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
    ]);

    config.output = {
      ...config.output,
      clean: true,
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
    };
  }

  return config;
};
