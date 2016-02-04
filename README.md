# SMTP Email Verification [![](https://travis-ci.org/Alex0007/email-verify.svg)](https://travis-ci.org/Alex0007/email-verify)
> rewrited version of [bighappyworld/email-verify](https://github.com/bighappyworld/email-verify) with promises support

## Usage
### Es5 syntax

```js
var verifier = require('email-verify')
verifier.verify( 'anemail@domain.com', function( err, info ){
  if (err) console.log(err)
  else{
    console.log('Success (T/F): ' + info.success)
    console.log('Info: ' + info.info)
  }
})
```

### Promises (with babel for now)

```js
import verifier from 'email-verify'
try {
  let info = await verifier.verify('anemail@domain.com')
  console.log('Success (T/F): ' + info.success)
  console.log('Info: ' + info.info)
} catch (err) {
  console.log(err)
}
```

## Response
The callback is a function(err, info) that has an info object:
```
{
  success: boolean
  info: string
  addr: the address being verified
}
```

## Options
The options are:

```
{
  port : integer, port to connect with defaults to 25
  sender : email, sender address, defaults to name@example.org
  timeout : integer, socket timeout defaults to 0 which is no timeout
  fdqn : domain, used as part of the HELO, defaults to mail.example.org
  dns: ip address, or array of ip addresses (as strings), used to set the servers of the dns check,
  ignore: set an ending response code integer to ignore, such as 450 for greylisted emails
}
```

## Flow
The basic flow is as follows:
 1. Validate it is a proper email address
 2. Get the domain of the email
 3. Grab the DNS MX records for that domain
 4. Create a TCP connection to the smtp server
 5. Send a EHLO message
 6. Send a MAIL FROM message
 7. Send a RCPT TO message
 8. If they all validate, return an object with success: true. If any stage fails, the callback object will have success: false.
