'use strict'
var istanbul = require('browserify-istanbul')
var path = require('path')

module.exports = function (config) {
  config.set({
    client: { requestTestUrl: process.argv[4] },
    basePath: '../..',
    frameworks: ['tap', 'browserify'],
    preprocessors: {
      'tests/browser/test.js': ['browserify'],
      '*.js,!(tests)/**/*.js': ['coverage']
    },
    files: [
      'tests/browser/test.js'
    ],
    port: 9876,

    reporters: ['dots', 'coverage'],

    colors: true,

    logLevel: config.LOG_ERROR,

    autoWatch: false,

    browsers: ['PhantomJS_with_test_CA'],

    singleRun: true,

    plugins: [
      'karma-phantomjs-launcher',
      'karma-coverage',
      'karma-browserify',
      'karma-tap'
    ],
    browserify: {
      debug: true,
      transform: [istanbul({
        ignore: ['**/node_modules/**', '**/tests/**']
      })]
    },
    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/'
    },

    // Trust the browser test CA while keeping certificate validation enabled.
    customLaunchers: {
      PhantomJS_with_test_CA: {
        base: 'PhantomJS',
        flags: [
          '--ignore-ssl-errors=false',
          '--ssl-certificates-path=' + path.join(__dirname, 'ssl', 'ca.crt')
        ]
      }
    }
  })
}
