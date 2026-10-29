'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const password = require('../src/auth/password');

test('hash/verify: round-trip confere a senha correta', () => {
  const hash = password.hash('minhaSenha123');
  assert.notStrictEqual(hash, 'minhaSenha123', 'hash não deve ser a senha em texto puro');
  assert.strictEqual(password.verify('minhaSenha123', hash), true);
});

test('verify: rejeita senha incorreta', () => {
  const hash = password.hash('minhaSenha123');
  assert.strictEqual(password.verify('senhaErrada', hash), false);
});

test('hash: duas chamadas produzem hashes diferentes (salt)', () => {
  const a = password.hash('mesmaSenha');
  const b = password.hash('mesmaSenha');
  assert.notStrictEqual(a, b);
  assert.strictEqual(password.verify('mesmaSenha', a), true);
  assert.strictEqual(password.verify('mesmaSenha', b), true);
});
