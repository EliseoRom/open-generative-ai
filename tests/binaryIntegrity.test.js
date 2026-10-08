const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const {
    assertFileSha256,
    assertTrustedBinary,
    assertTrustedUrl,
    expectedBinarySha256,
    LOCAL_AI_SHA_ENV,
} = require('../electron/lib/binaryIntegrity');

test('assertTrustedUrl allows GitHub HTTPS and rejects HTTP / other hosts', () => {
    assert.equal(
        assertTrustedUrl('https://github.com/leejet/stable-diffusion.cpp/releases/download/x/y.zip').hostname,
        'github.com'
    );
    assert.throws(() => assertTrustedUrl('http://github.com/x'), /non-HTTPS/);
    assert.throws(() => assertTrustedUrl('https://evil.example/bin'), /allowlist/);
});

test('assertFileSha256 fail-closed on mismatch and missing pin', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-cli-'));
    const file = path.join(dir, 'sd-cli');
    fs.writeFileSync(file, 'hello');
    const digest = crypto.createHash('sha256').update('hello').digest('hex');
    assert.equal(assertFileSha256(file, digest), digest);
    assert.throws(() => assertFileSha256(file, 'aa'.repeat(32)), /Integrity check failed/);
    assert.throws(() => assertFileSha256(file, ''), /No SHA-256 pin/);
    fs.rmSync(dir, { recursive: true });
});

test('assertTrustedBinary requires env pin when catalog is empty', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-cli-'));
    const file = path.join(dir, 'sd-cli');
    fs.writeFileSync(file, 'bin');
    assert.throws(() => assertTrustedBinary(file, { env: {} }), /LOCAL_AI_BINARY_SHA256|No SHA-256/);
    const digest = crypto.createHash('sha256').update('bin').digest('hex');
    assert.equal(
        assertTrustedBinary(file, { env: { [LOCAL_AI_SHA_ENV]: digest } }),
        digest
    );
    assert.equal(expectedBinarySha256({ env: { [LOCAL_AI_SHA_ENV]: digest } }), digest);
    fs.rmSync(dir, { recursive: true });
});
