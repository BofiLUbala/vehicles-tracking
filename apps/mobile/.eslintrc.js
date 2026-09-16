module.exports = {
  extends: ['expo'],
  ignorePatterns: ['node_modules/', 'dist/'],
  rules: {
    'react-hooks/set-state-in-effect': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
};
