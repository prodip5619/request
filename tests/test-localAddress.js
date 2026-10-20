'use strict'
var request = require('../index')
var tape = require('tape')
var http = require('http')
var os = require('os')

var localAddress
var localInterfaces = os.networkInterfaces()
Object.keys(localInterfaces).some(function (ifname) {
  return localInterfaces[ifname].some(function (iface) {
    if (iface.family === 'IPv4' && iface.internal === false) {
      localAddress = iface.address
      return true
    }
    return false
  })
})
localAddress = localAddress || '127.0.0.1'

var requests = []
var server = http.createServer(function (req, res) {
  requests.push({
    path: req.url,
    remoteAddress: req.socket.remoteAddress
  })

  if (req.url === '/redirect') {
    res.writeHead(302, { location: '/final' })
    res.end()
    return
  }

  res.end('ok')
})
var serverUrl

tape('setup local server', function (t) {
  server.listen(0, localAddress, function () {
    serverUrl = 'http://' + localAddress + ':' + server.address().port
    t.end()
  })
})

tape('bind to invalid address', function (t) {
  request.get({
    uri: serverUrl,
    localAddress: '1.2.3.4'
  }, function (err, res) {
    t.notEqual(err, null)
    t.equal(err && /bind EADDRNOTAVAIL/.test(err.message), true)
    t.equal(res, undefined)
    t.end()
  })
})

tape('bind to local address', function (t) {
  requests = []
  request.get({
    uri: serverUrl + '/local',
    localAddress: localAddress
  }, function (err, res, body) {
    t.equal(err, null)
    if (err) {
      t.end()
      return
    }
    t.equal(res.statusCode, 200)
    t.equal(body, 'ok')
    t.equal(res.request.localAddress, localAddress)
    t.equal(requests[0].remoteAddress, localAddress)
    t.end()
  })
})

tape('bind to local address on redirect', function (t) {
  requests = []
  request.get({
    uri: serverUrl + '/redirect',
    localAddress: localAddress
  }, function (err, res, body) {
    t.equal(err, null)
    if (err) {
      server.close(function () {
        t.end()
      })
      return
    }
    t.equal(res.statusCode, 200)
    t.equal(body, 'ok')
    t.equal(res.request.localAddress, localAddress)
    t.deepEqual(requests.map(function (request) {
      return request.path
    }), ['/redirect', '/final'])
    t.deepEqual(requests.map(function (request) {
      return request.remoteAddress
    }), [localAddress, localAddress])
    server.close(function () {
      t.end()
    })
  })
})
