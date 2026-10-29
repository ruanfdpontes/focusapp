'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const tokens = require('../src/auth/tokens');
const config = require('../src/config');

test('sign/verify: round-trip preserva sub e role', () => {
  const token = tokens.sign({ sub: 42, role: 'dono' });
  const payload = tokens.verify(token);
  assert.strictEqual(payload.sub, 42);
  assert.strictEqual(payload.role, 'dono');
});

test('sign: NÃO carrega mustChangePassword no payload', () => {
  const token = tokens.sign({ sub: 1, role: 'instrutor' });
  const payload = tokens.verify(token);
  assert.strictEqual(payload.mustChangePassword, undefined);
  assert.strictEqual(payload.must_change_password, undefined);
});

test('verify: token expirado lança erro', () => {
  const expirado = jwt.sign({ sub: 1, role: 'aluno' }, config.JWT_SECRET, {
    expiresIn: -10,
  });
  assert.throws(() => tokens.verify(expirado), /jwt expired/);
});

test('verify: token com segredo diferente lança erro', () => {
  const outro = jwt.sign({ sub: 1, role: 'aluno' }, 'outro-segredo', { expiresIn: '12h' });
  assert.throws(() => tokens.verify(outro));
});
