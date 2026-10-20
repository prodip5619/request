var fs = require('fs')
var path = require('path')
var childProcess = require('child_process')
var tape = require('tape')

var shellScripts = [
  path.join(__dirname, '..', 'release.sh'),
  path.join(__dirname, 'ssl', 'gen-test.sh'),
  path.join(__dirname, 'ssl', 'ca', 'gen-all-certs.sh'),
  path.join(__dirname, 'ssl', 'ca', 'gen-server.sh'),
  path.join(__dirname, 'ssl', 'ca', 'gen-client.sh'),
  path.join(__dirname, 'ssl', 'ca', 'gen-localhost.sh')
]

tape('shell scripts use LF endings and valid bash syntax', function (t) {
  shellScripts.forEach(function (script) {
    var content = fs.readFileSync(script, 'utf8')

    t.notOk(/\r/.test(content), script + ' should use LF line endings')

    var result = childProcess.spawnSync('bash', ['-n'], {
      encoding: 'utf8',
      input: content
    })
    t.equal(result.status, 0, script + ' should parse successfully with bash -n')

    if (result.status !== 0) {
      t.comment(result.stderr)
    }
  })

  t.end()
})
