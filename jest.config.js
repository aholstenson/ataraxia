module.exports = {
	transform: {
		".(ts|tsx)": "ts-jest"
	},
	globals: {
		'ts-jest': {
			tsconfig: '<rootDir>/tsconfig.build.json'
		},
	},
	"testEnvironment": "node",
	"testRegex": "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
	"moduleFileExtensions": [
		"ts",
		"tsx",
		"js"
	],
	"coveragePathIgnorePatterns": [
		"/node_modules/",
		"/test/"
	],
	"collectCoverageFrom": [
		"src/**/*.{js,ts}"
	]
}
