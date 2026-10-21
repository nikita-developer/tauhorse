import test from 'node:test'
import assert from 'node:assert/strict'
import {validateRegistrationBotSignals, REGISTRATION_MIN_FILL_MS} from '../server/utils/bot-protection.js'
const now=1_800_000_000_000

test('normal registration timing passes',()=>assert.equal(validateRegistrationBotSignals({website:'',form_started_at:now-5000,now}),true))
test('honeypot rejects bot',()=>assert.throws(()=>validateRegistrationBotSignals({website:'spam',form_started_at:now-5000,now})))
test('too-fast registration is rejected',()=>assert.throws(()=>validateRegistrationBotSignals({website:'',form_started_at:now-(REGISTRATION_MIN_FILL_MS-1),now})))
test('missing start timestamp is rejected',()=>assert.throws(()=>validateRegistrationBotSignals({website:'',now})))
test('stale form is rejected',()=>assert.throws(()=>validateRegistrationBotSignals({website:'',form_started_at:now-3*60*60*1000,now})))
