var childProcess = require('child_process')
var fs = require('fs')
var path = require('path')

var testDir = __dirname
var testFiles = fs.readdirSync(testDir)
  .filter(function (file) {
    return /^test-.*\.js$/.test(file)
  })
  .sort()
  .map(function (file) {
    return path.join(testDir, file)
  })

if (!testFiles.length) {
  throw new Error('No test files found matching tests/test-*.js')
}

var taper = path.join(__dirname, '..', 'node_modules', 'taper', 'bin', 'taper.js')
var result = childProcess.spawnSync(process.execPath, [taper].concat(testFiles), {
  stdio: 'inherit'
})

if (result.error) {
  throw result.error
}

process.exitCode = result.status === null ? 1 : result.status
