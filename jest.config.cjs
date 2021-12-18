module.exports = {
	preset: 'ts-jest/presets/js-with-ts-esm',
	globals: {
		'ts-jest': {
			tsconfig: '<rootDir>/tsconfig.build.json',
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
