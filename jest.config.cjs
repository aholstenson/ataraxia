module.exports = {
	preset: 'ts-jest/presets/default-esm',
	globals: {
		'ts-jest': {
			tsconfig: '<rootDir>/tsconfig.test.json',
			useESM: true
		},
	},
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	"testEnvironment": "node",
	"testRegex": "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
	"coveragePathIgnorePatterns": [
		"/node_modules/",
		"/test/"
	],
	"collectCoverageFrom": [
		"src/**/*.{js,ts}"
	]
}
