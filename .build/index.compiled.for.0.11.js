'use strict';
require('pick-precompiled').babelPolyfill()

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var validator = require('email-validator');
validator = 'default' in validator ? validator['default'] : validator;
var dns = require('dns');
dns = 'default' in dns ? dns['default'] : dns;
var net = require('net');
net = 'default' in net ? net['default'] : net;

var verifier = {};

verifier.verify = function (email, options, callback) {
  return new _promise2.default(function (resolve, reject) {
    // Handle optional parameters
    if (!email) {
      throw new Error('Missing parameters in email-verify.verify()');
    } else if (typeof options === 'function') {
      callback = options;
    }

    // extend options default values
    options = (0, _assign2.default)({}, {
      port: 25,
      sender: 'name@example.org',
      timeout: 0,
      fqdn: 'mail.example.org',
      ignore: false
    }, options);

    if (!validator.validate(email)) {
      var response = { success: false, info: 'Invalid Email Structure', addr: email };
      callback && callback(null, response);
      return resolve(response);
    }

    // Get the domain of the email address
    var domain = email.split(/[@]/)[1];

    if (options.dns) {
      try {
        if (Array.isArray(options.dns)) {
          dns.setServers(options.dns);
        } else {
          dns.setServers([options.dns]);
        }
      } catch (e) {
        throw new Error('Invalid DNS Options');
      }
    }

    // Get the MX Records to find the SMTP server
    dns.resolveMx(domain, function (err, addresses) {
      if (err || typeof addresses === 'undefined') {
        callback && callback(err, null);
        reject(err);
      } else if (addresses && addresses.length <= 0) {
        var _response = { success: false, info: 'No MX Records' };
        callback(null, _response);
        resolve(_response);
      } else {
        // Find the lowest priority mail server
        var priority = 10000;
        var index = 0;
        for (var i = 0; i < addresses.length; i++) {
          if (addresses[i].priority < priority) {
            priority = addresses[i].priority;
            index = i;
          }
        }
        var smtp = addresses[index].exchange;
        var stage = 0;

        var socket = net.createConnection(options.port, smtp);
        var success = false;
        var response = '';
        var completed = false;
        var calledback = false;
        var ended = false;

        if (options.timeout > 0) {
          socket.setTimeout(options.timeout, function () {
            if (!calledback) {
              calledback = true;
              var _response2 = { success: false, info: 'Connection Timed Out', addr: email };
              callback && callback(null, _response2);
              resolve(_response2);
            }
            socket.destroy();
          });
        }

        socket.on('data', function (data) {
          response += data.toString();
          completed = response.slice(-1) === '\n';

          if (completed) {
            switch (stage) {
              case 0:
                if (response.indexOf('220') > -1 && !ended) {
                  // Connection Worked
                  socket.write('EHLO ' + options.fqdn + '\r\n', function () {
                    stage++;
                    response = '';
                  });
                } else {
                  socket.end();
                }
                break;
              case 1:
                if (response.indexOf('250') > -1 && !ended) {
                  // Connection Worked
                  socket.write('MAIL FROM:<' + options.sender + '>\r\n', function () {
                    stage++;
                    response = '';
                  });
                } else {
                  socket.end();
                }
                break;
              case 2:
                if (response.indexOf('250') > -1 && !ended) {
                  // MAIL Worked
                  socket.write('RCPT TO:<' + email + '>\r\n', function () {
                    stage++;
                    response = '';
                  });
                } else {
                  socket.end();
                }
                break;
              case 3:
                if (response.indexOf('250') > -1 || options.ignore && response.indexOf(options.ignore) > -1) {
                  // RCPT Worked
                  success = true;
                }
                stage++;
                response = '';
                // close the connection cleanly.
                if (!ended) socket.write('QUIT\r\n');
                break;
              case 4:
                socket.end();
            }
          }
        }).on('connect', function (data) {}).on('error', function (err) {
          ended = true;
          if (!calledback) {
            var _response3 = { success: false, info: null, addr: email };
            calledback = true;
            callback && callback(err, _response3);
            resolve(_response3);
          }
        }).on('end', function () {
          ended = true;
          if (!calledback) {
            var _response4 = {
              success: success,
              info: email + ' is ' + (success ? 'a valid' : 'an invalid') + ' address',
              addr: email
            };
            calledback = true;
            callback && callback(null, _response4);
            resolve(_response4);
          }
        });
      }
    });
    return true;
  });
};

module.exports = verifier;
