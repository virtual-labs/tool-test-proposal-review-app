import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default [
  {ignores:['node_modules/**','dist/**','test-results/**','playwright-report/**']},
  js.configs.recommended,
  {files:['**/*.js'],languageOptions:{ecmaVersion:2023,sourceType:'module',globals:globals.node},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}},
  {files:['client/**/*.{js,jsx}'],languageOptions:{ecmaVersion:2023,sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:globals.browser},plugins:{'react-hooks':hooks},rules:{'no-unused-vars':'off','react-hooks/rules-of-hooks':'error','react-hooks/exhaustive-deps':'error'}},
  {files:['src/domain.js'],rules:{'no-unused-vars':'off','no-useless-escape':'off','no-control-regex':'off','no-useless-assignment':'off','preserve-caught-error':'off'}},
  {files:['tests/browser/*.js'],languageOptions:{globals:globals.browser}}
];
