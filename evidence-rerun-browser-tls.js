'use strict'

var fs = require('fs')
var os = require('os')
var path = require('path')
var https = require('https')
var crypto = require('crypto')
var spawn = require('child_process').spawn

var root = __dirname
var relativeTest = 'tests/browser/evidence-tls-' + crypto.randomBytes(6).toString('hex') + '.js'
var absoluteTest = path.join(root, relativeTest)
var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'request-browser-tls-evidence-'))
var configFile = path.join(tempDir, 'karma.evidence.conf.js')
var sslDir = path.join(root, 'tests', 'browser', 'ssl')
var trustedCA = path.join(sslDir, 'ca.crt')
var unrelatedCA = path.join(sslDir, 'server.crt')
var certificate = new crypto.X509Certificate(fs.readFileSync(path.join(sslDir, 'server.crt')))
var caCertificate = new crypto.X509Certificate(fs.readFileSync(trustedCA))
var results = []

console.log('TIME=' + new Date().toString())
console.log('SERVER_CERT_SAN=' + certificate.subjectAltName)
console.log('SERVER_CERT_VERIFIES_WITH_TEST_CA=' + certificate.verify(caCertificate.publicKey))
console.log('SERVER_CERT_MATCHES_LOCALHOST=' + Boolean(certificate.checkHost('localhost')))
console.log('SERVER_CERT_MATCHES_127_0_0_1=' + Boolean(certificate.checkIP('127.0.0.1')))

var testContent = [
  "'use strict'",
  "var tape = require('tape')",
  "var request = require('../../index')",
  "tape('TLS rejection scenario', function (t) {",
  '  request({ uri: __karma__.config.requestTestUrl, withCredentials: false }, function (error, response) {',
  "    t.ok(error, 'TLS handshake rejected as expected')",
  "    t.notOk(response, 'no HTTP response received')",
  "    t.comment('observed request error: ' + (error ? error.message : 'none'))",
  '    t.end()',
  '  })',
  '})',
  ''
].join('\n')

var configContent = [
  "'use strict'",
  'var base = require(' + JSON.stringify(path.join(root, 'tests', 'browser', 'karma.conf.js')) + ')',
  'module.exports = function (config) {',
  '  var originalSet = config.set.bind(config)',
  '  config.set = function (settings) {',
  '    settings.basePath = ' + JSON.stringify(root),
  '    settings.files = [' + JSON.stringify(relativeTest) + ']',
  '    settings.preprocessors = {}',
  '    settings.preprocessors[' + JSON.stringify(relativeTest) + "] = ['browserify']",
  '    settings.customLaunchers = settings.customLaunchers || {}',
  '    settings.customLaunchers.PhantomJS_with_test_CA = {',
  "      base: 'PhantomJS',",
  '      flags: [',
  "        '--ignore-ssl-errors=false',",
  "        '--ssl-certificates-path=' + process.env.TLS_EVIDENCE_CA_FILE",
  '      ]',
  '    }',
  "    settings.browsers = ['PhantomJS_with_test_CA']",
  '    originalSet(settings)',
  '  }',
  '  base(config)',
  '}',
  ''
].join('\n')

fs.writeFileSync(absoluteTest, testContent, { flag: 'wx' })
fs.writeFileSync(configFile, configContent)

var scenarios = [
  { name: 'untrusted CA', host: 'localhost', ca: unrelatedCA },
  { name: 'incorrect hostname', host: '127.0.0.1', ca: trustedCA }
]

function runScenario (scenario) {
  return new Promise(function (resolve) {
    var server = https.createServer({
      key: fs.readFileSync(path.join(sslDir, 'server.key')),
      cert: fs.readFileSync(path.join(sslDir, 'server.crt'))
    }, function (req, res) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.writeHead(200)
      res.end('TLS evidence server\n')
    })

    server.listen(0, '127.0.0.1', function () {
      var url = 'https://' + scenario.host + ':' + server.address().port
      console.log('\n=== ' + scenario.name + ' ===')
      console.log('TIME=' + new Date().toString())
      console.log('URL=' + url)
      console.log('TLS_VALIDATION=enabled (--ignore-ssl-errors=false)')
      console.log('TRUST_FILE=' + scenario.ca)

      var env = Object.assign({}, process.env, { TLS_EVIDENCE_CA_FILE: scenario.ca })
      var karma = path.join(root, 'node_modules', 'karma', 'bin', 'karma')
      var child = spawn(process.execPath, [karma, 'start', configFile, url], {
        cwd: root,
        env: env,
        stdio: 'inherit'
      })

      child.on('error', function (error) {
        console.error('KARMA_START_ERROR=' + error.message)
        server.close(function () {
          resolve(1)
        })
      })

      child.on('exit', function (code, signal) {
        var result = code === 0 ? 0 : (code === null ? 1 : code)
        console.log('SCENARIO_EXIT=' + result + (signal ? ' SIGNAL=' + signal : ''))
        server.close(function () {
          resolve(result)
        })
      })
    })

    server.on('error', function (error) {
      console.error('SERVER_ERROR=' + error.message)
      resolve(1)
    })
  })
}

async function main () {
  var exitCode = 0
  try {
    for (var i = 0; i < scenarios.length; i++) {
      var scenario = scenarios[i]
      var result = await runScenario(scenario)
      results.push({ name: scenario.name, passed: result === 0 })
      if (result !== 0) exitCode = result
    }
  } finally {
    if (fs.existsSync(absoluteTest)) fs.unlinkSync(absoluteTest)
    fs.rmSync(tempDir, { recursive: true, force: true })
    console.log('\n=== SUMMARY ===')
    results.forEach(function (result) {
      console.log(result.name + ': ' + (result.passed ? 'PASS' : 'FAIL'))
    })
    console.log('TEMPORARY_TEST_AND_CONFIG_CLEANED=true')
  }
  process.exitCode = exitCode
}

main().catch(function (error) {
  console.error(error.stack || error)
  process.exitCode = 1
})
