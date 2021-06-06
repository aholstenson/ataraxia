module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.eslint.json'
	},
	plugins: [
		'@typescript-eslint',
		'eslint-plugin-tsdoc',
		'eslint-plugin-jsdoc',
		'eslint-plugin-import'
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:import/typescript',
	],
	rules: {
		'no-irregular-whitespace': 'error',
		'quotes': [ 'error', 'single' ],
		'no-unused-vars': [ 'off' ],
		'eqeqeq': [ 'error' ],
		'no-throw-literal': [ 'error' ],
		'no-shadow': [ 'off' ],
		'no-console': [ 'warn' ],
		'no-debugger': [ 'error' ],
		'no-alert': [ 'error' ],

		'semi-spacing': [ 'warn', {
			before: false,
			after: true
		} ],
		'no-multi-spaces': [ 'warn' ],
		'space-unary-ops': [ 'warn', {
			words: true,
			nonwords: false,
			overrides: {
				'!': true,
				'!!': true
			}
		} ],

		'@typescript-eslint/adjacent-overload-signatures': [ 'warn' ],
		'@typescript-eslint/await-thenable': [ 'warn' ],
		'@typescript-eslint/ban-types': [
			'error',
			{
				extendDefaults: true,
				types: {
					object: false
				}
			}
		],
		'@typescript-eslint/consistent-type-assertions': [ 'error' ],
		'@typescript-eslint/consistent-type-definitions': [ 'error' ],
		'@typescript-eslint/explicit-member-accessibility': [
			'error',
			{
				'accessibility': 'explicit'
			}
		],
		'@typescript-eslint/indent': [ 'error', 'tab', {
			SwitchCase: 1,
			ignoredNodes: [
				'TSTypeLiteral',
				'TSUnionType'
			]
		} ],
		'@typescript-eslint/member-delimiter-style': [
			'error',
			{
				'multiline': {
					'delimiter': 'semi',
					'requireLast': true
				},
				'singleline': {
					'delimiter': 'semi',
					'requireLast': false
				}
			}
		],
		'@typescript-eslint/member-ordering': [ 'off' ],
		'@typescript-eslint/no-array-constructor': [ 'warn' ],
		'@typescript-eslint/no-empty-function': [ 'warn' ],
		'@typescript-eslint/no-empty-interface': [ 'warn' ],
		'@typescript-eslint/no-explicit-any': [ 'off' ],
		'@typescript-eslint/no-misused-new': [ 'error' ],
		'@typescript-eslint/no-namespace': [ 'error' ],
		'@typescript-eslint/no-non-null-assertion': [ 'error' ],
		'@typescript-eslint/no-parameter-properties': [ 'error' ],
		'@typescript-eslint/no-shadow': [ 'warn' ],
		'@typescript-eslint/no-var-requires': [ 'error' ],
		'@typescript-eslint/no-unnecessary-type-assertion': [ 'warn' ],
		'@typescript-eslint/no-unused-vars': [ 'warn', {
			'vars': 'all',
			'args': 'after-used',
			'ignoreRestSiblings': false
		} ],
		'@typescript-eslint/prefer-function-type': [ 'error' ],
		'@typescript-eslint/prefer-namespace-keyword': [ 'error' ],
		'@typescript-eslint/quotes': [
			'error',
			'single',
			{
				'avoidEscape': true
			}
		],
		'@typescript-eslint/semi': [ 'error', 'always' ],
		'@typescript-eslint/triple-slash-reference': [ 'error' ],
		'@typescript-eslint/unified-signatures': [ 'off' ],

		'prefer-const': [ 'warn' ],
		'no-var': [ 'error' ],
		'no-param-reassign': [ 'warn' ],
		'no-multi-assign': [ 'warn' ],
		'no-unneeded-ternary': [ 'warn' ],
		'no-mixed-operators': [ 'warn' ],
		'nonblock-statement-body-position': [ 'warn' ],

		'no-extra-semi': [ 'off' ],
		'@typescript-eslint/no-extra-semi': [ 'error' ],
		'brace-style': [ 'off' ],
		'@typescript-eslint/brace-style': [ 'warn', '1tbs' ],
		'comma-spacing': [ 'off' ],
		'@typescript-eslint/comma-spacing': [ 'warn', {
			before: false,
			after: true
		} ],
		'comma-style': [ 'warn', 'last' ],
		'func-call-spacing': [ 'off' ],
		'@typescript-eslint/func-call-spacing': [ 'warn' ],
		'space-before-function-paren': [ 'off' ],
		'@typescript-eslint/space-before-function-paren': [ 'warn', {
			'anonymous': 'never',
			'named': 'never',
			'asyncArrow': 'always'
		} ],
		'quote-props': [ 'warn', 'as-needed' ],
		'arrow-spacing': [ 'warn', {
			before: true,
			after: true
		} ],
		'arrow-parens': [ 'warn', 'as-needed' ],
		'generator-star-spacing': [ 'warn', {
			before: true,
			after: false
		} ],
		'dot-notation': [ 'warn' ],
		'spaced-comment': [ 'warn' ],
		'space-before-blocks': [ 'warn' ],
		'keyword-spacing': [ 'warn', {
			before: true,
			after: true,
			overrides: {
				'if': { after: false },
				'for': { after: false },
				'while': { after: false },
				'switch': { after: false },
				'catch': { after: false },
			}
		} ],
		'space-infix-ops': [ 'warn' ],
		'padded-blocks': [ 'warn', 'never' ],
		'space-in-parens': [ 'warn', 'never' ],
		'no-multiple-empty-lines': [ 'warn' ],
		'array-bracket-spacing': [ 'warn', 'always' ],
		'object-curly-spacing': [ 'warn', 'always' ],
		'block-spacing': [ 'warn', 'always' ],
		'computed-property-spacing': [ 'warn', 'never' ],
		'key-spacing': [ 'warn', {
			beforeColon: false,
			afterColon: true,
			mode: 'strict'
		} ],

		'tsdoc/syntax': [ 'warn' ],
		'jsdoc/check-alignment': [ 'warn' ],
		'jsdoc/check-examples': [ 'warn' ],
		'jsdoc/check-param-names': [ 'warn', {
			checkDestructured: false
		} ],
		'jsdoc/check-syntax': [ 'warn' ],
		'jsdoc/empty-tags': [ 'warn' ],
		'jsdoc/newline-after-description': [ 'warn' ],
		'jsdoc/no-types': [ 'warn' ],
		'jsdoc/require-description': [ 'warn', {
			contexts: [ 'any' ]
		} ],
		'jsdoc/require-jsdoc': [ 'warn' ],
		'jsdoc/require-param': [ 'warn', {
			checkDestructured: false
		} ],
		'jsdoc/require-param-description': [ 'warn' ],
		'jsdoc/require-param-name': [ 'warn' ],
		'jsdoc/require-returns': [ 'warn' ],
		'jsdoc/require-returns-check': [ 'warn' ],
		'jsdoc/require-returns-description': [ 'warn' ],
		'jsdoc/check-tag-names': [ 'error', {
			definedTags: [ 'remarks', 'typeParam' ]
		} ],

		'import/extensions': [ 'error' ],
		'import/first': [ 'warn' ],
		'import/no-self-import': [ 'error' ],

		'import/newline-after-import': [ 'warn' ],
		'import/no-dynamic-require': [ 'warn' ],
		'import/no-useless-path-segments': [ 'warn' ],
		'import/no-default-export': [ 'warn' ],
		'import/no-namespace': [ 'warn' ],
		'import/no-duplicates': [ 'warn' ],
		'import/order': [ 'warn', {
			'newlines-between': 'always',
			groups: [ 'builtin', 'external', 'internal', 'parent', 'sibling', 'index' ],
			pathGroups: [
				{
					pattern: 'ataraxia',
					group: 'internal'
				},
				{
					pattern: 'ataraxia/**',
					group: 'internal'
				},
				{
					pattern: 'ataraxia-*',
					group: 'internal'
				}
			],
			pathGroupsExcludedImportTypes: [ 'builtin' ],
			alphabetize: {
				order: 'asc',
				caseInsensitive: true
			}
		} ],
	},

	settings: {
		jsdoc: {
			mode: 'typescript'
		}
	}
}
