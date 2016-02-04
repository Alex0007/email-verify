import test from 'tape'
import tapSpec from 'tap-spec'
import verifier from '../.build/index'

test.createStream().pipe(tapSpec()).pipe(process.stdout)

test('existing email: should respond with an object where success is true', t => {
  verifier.verify('rob@below.io', function (err, info) {
    t.false(err, 'No error returned')
    t.true(info.success, 'Success true')
    t.end()
  })
})

test('existing email check promise: should respond with an object where success is true', async t => {
  let info = {}
  try { info = await verifier.verify('rob@below.io') } catch (e) {
    console.log('e', e)
    t.false(e, 'Not throwing an error')
  }
  t.true(info.success, 'Success true')
  t.end()
})

test('non-existing email: should respond with an object where success is false', t => {
  verifier.verify('antirob@below.io', function (err, info) {
    t.false(err, 'No error returned')
    t.false(info.success, 'Success false')
    t.end()
  })
})

test('badly formed email: should respond with an object where success is false', t => {
  verifier.verify('badlyformed##email@email@.com', function (err, info) {
    t.false(err, 'No error returned')
    t.false(info.success, 'Success false')
    t.end()
  })
})

test('short timeout: should respond with an object where success is false', t => {
  verifier.verify('rob@below.io', { timeout: 1, port: 25 }, function (err, info) {
    t.false(err, 'No error returned')
    t.false(info.success, 'Success false')
    t.end()
  })
})

test('long timeout: should respond with an object where success is true', t => {
  verifier.verify('rob@below.io', { timeout: 5000, port: 25 }, function (err, info) {
    t.false(err, 'No error returned')
    t.true(info.success, 'Success true')
    t.end()
  })
})

test('bad smtp port: should respond with an object where success is false', t => {
  verifier.verify('rob@below.io', { timeout: 5000, port: 587 }, function (err, info) {
    t.false(err, 'No error returned')
    t.false(info.success, 'Success false')
    t.end()
  })
})
