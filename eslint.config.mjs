import antfu from '@antfu/eslint-config';
import eslintConfigPrettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import unusedImports from 'eslint-plugin-unused-imports';

export default antfu(
    {
        react: false,
        typescript: true,
        stylistic: false,
        markdown: false,
        toml: false,
        ignores: ['dist', 'node_modules', '.history', 'pnpm-lock.yaml', 'package-lock.json'],
    },
    {
        files: ['**/*.{ts,js}'],
        languageOptions: {
            ecmaVersion: 'latest',
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'ts/no-use-before-define': 'off',
            'ts/strict-boolean-expressions': 'off',
            'ts/no-unsafe-member-access': 'off',
            'ts/no-unsafe-call': 'off',
            'ts/no-unsafe-assignment': 'off',
            'ts/no-unsafe-return': 'off',
            'ts/no-unsafe-argument': 'off',
            'ts/no-misused-promises': 'off',
            'ts/no-floating-promises': 'off',
            'node/prefer-global/process': 'off',
            'node/prefer-global/buffer': 'off',
            'import/no-named-default': 'off',
            'jsdoc/check-param-names': 'off',
        },
    },
    {
        name: 'perfectionist',
        rules: {
            'import/order': 'off',
            'sort-imports': 'off',
            'perfectionist/sort-imports':
                perfectionist.configs['recommended-natural'].rules['perfectionist/sort-imports'],
            'perfectionist/sort-exports':
                perfectionist.configs['recommended-natural'].rules['perfectionist/sort-exports'],
            'perfectionist/sort-named-imports':
                perfectionist.configs['recommended-natural'].rules['perfectionist/sort-named-imports'],
            'perfectionist/sort-named-exports':
                perfectionist.configs['recommended-natural'].rules['perfectionist/sort-named-exports'],
        },
    },
    {
        plugins: {
            'unused-imports': unusedImports,
        },
        rules: {
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],
        },
    },
    eslintConfigPrettier,
    eslintPluginPrettierRecommended,
);
