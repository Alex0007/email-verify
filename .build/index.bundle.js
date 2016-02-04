'use strict';

var validator = require('email-validator');
validator = 'default' in validator ? validator['default'] : validator;
var dns = require('dns');
dns = 'default' in dns ? dns['default'] : dns;
var net = require('net');
net = 'default' in net ? net['default'] : net;

let verifier = {}

verifier.verify = (email, options, callback) => new Promise((resolve, reject) => {
  let calledback = false
  let cb = (err, info) => {
    if (!calledback) {
      calledback = true
      callback && callback(err, info)
      if (err) return reject(err)
      resolve(info)
    }
  }

  if (!email) {
    throw new Error('Missing parameters in email-verify.verify()')
  } else if (typeof options === 'function') {
    callback = options
  }

  // extend options default values
  options = Object.assign({}, {
    port: 25,
    sender: 'name@example.org',
    timeout: 0,
    fqdn: 'mail.example.org',
    ignore: false
  }, options)

  if (!validator.validate(email)) {
    return cb(null, { success: false, info: 'Invalid Email Structure', addr: email })
  }

  // Get the domain of the email address
  let domain = email.split(/[@]/)[1]

  if (options.dns) {
    try {
      if (Array.isArray(options.dns)) {
        dns.setServers(options.dns)
      } else {
        dns.setServers([options.dns])
      }
    } catch (e) {
      throw new Error('Invalid DNS Options')
    }
  }

  // Get the MX Records to find the SMTP server
  dns.resolveMx(domain, function (err, addresses) {
    if (err || (typeof addresses === 'undefined')) {
      cb(err, null)
    } else if (addresses && addresses.length <= 0) {
      cb(null, { success: false, info: 'No MX Records' })
    } else {
      // Find the lowest priority mail server
      let priority = 10000
      let index = 0
      for (let i = 0; i < addresses.length; i++) {
        if (addresses[i].priority < priority) {
          priority = addresses[i].priority
          index = i
        }
      }
      let smtp = addresses[index].exchange
      let stage = 0

      let socket = net.createConnection(options.port, smtp)
      let success = false
      let log = ''
      let response = ''
      let completed = false
      let ended = false

      if (options.timeout > 0) {
        socket.setTimeout(options.timeout, function () {
          cb(null, { success: false, info: 'Connection Timed Out', addr: email })
          socket.destroy()
        })
      }

      socket.on('data', function (data) {
        log += response = data.toString()
        completed = response.slice(-1) === '\n'

        if (completed) {
          switch (stage) {
            case 0:
              if (response.indexOf('220') > -1 && !ended) {
                // Connection Worked
                socket.write('EHLO ' + options.fqdn + '\r\n', function () {
                  stage++
                })
              } else {
                socket.end()
              }
              break
            case 1:
              if (response.indexOf('250') > -1 && !ended) {
                // Connection Worked
                socket.write('MAIL FROM:<' + options.sender + '>\r\n', function () {
                  stage++
                })
              } else {
                socket.end()
              }
              break
            case 2:
              if (response.indexOf('250') > -1 && !ended) {
                // MAIL Worked
                socket.write('RCPT TO:<' + email + '>\r\n', function () {
                  stage++
                })
              } else {
                socket.end()
              }
              break
            case 3:
              if (response.indexOf('250') > -1 || (options.ignore && response.indexOf(options.ignore) > -1)) {
                // RCPT Worked
                success = true
              }
              stage++

              // close the connection cleanly.
              if (!ended) socket.write('QUIT\r\n')
              break
            case 4:
              socket.end()
          }
        }
      }).on('connect', function (data) {

      }).on('error', function (err) {
        ended = true
        cb(err, { success: false, info: null, addr: email })
      }).on('end', function () {
        ended = true
        cb(null, {
          success: success,
          info: (email + ' is ' + (success ? 'a valid' : 'an invalid') + ' address'),
          addr: email,
          debug: log
        })
      })
    }
  })

  return true
})

module.exports = verifier;
