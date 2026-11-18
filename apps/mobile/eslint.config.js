// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tulum = require('../../eslint-rules/file-naming.cjs');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // File and folder names, see docs/conventions.md.
    plugins: { tulum },
    rules: {
      'tulum/file-naming': [
        'error',
        {
          routes: 'app',
          // Metro platform files, declarations, tests, configs, CSS modules.
          middleExtensions: [
            'web',
            'native',
            'ios',
            'android',
            'd',
            'test',
            'spec',
            'config',
            'module',
            'stories',
          ],
        },
      ],
    },
  },
]);
