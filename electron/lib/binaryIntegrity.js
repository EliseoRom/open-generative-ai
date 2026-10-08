const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const { pipeline } = require('stream/promises');

const LOCAL_AI_SHA_ENV = 'LOCAL_AI_BINARY_SHA256';

/**
 * Optional pinned downloads. Empty on purpose: unsigned GitHub “latest”
 * assets are not trusted. Fill url + sha256 of the *zip* to re-enable
 * a specific artifact. Redirects must stay on the HTTPS allowlist.
 */
const PINNED_DOWNLOADS = {
    // 'darwin-arm64': {
    //     url: 'https://github.com/owner/repo/releases/download/tag/sd-cli.zip',
    //     sha256: 'hex…',
    // },
};

const ALLOWED_DOWNLOAD_HOSTS = new Set([
    'github.com',
    'objects.githubusercontent.com',
    'release-assets.githubusercontent.com',
    'github-releases.githubusercontent.com',
]);

function platformKey(platform = process.platform, arch = process.arch) {
    return `${platform}-${arch}`;
}

function expectedBinarySha256({ platform, arch, env = process.env } = {}) {
    const fromEnv = (env[LOCAL_AI_SHA_ENV] || '').trim().toLowerCase();
    if (fromEnv) return fromEnv;
    const pin = PINNED_DOWNLOADS[platformKey(platform, arch)];
    return (pin?.binarySha256 || '').trim().toLowerCase() || null;
}

function sha256Buffer(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(filePath) {
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
}

function assertTrustedUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error(`Invalid download URL: ${rawUrl}`);
    }
    if (parsed.protocol !== 'https:') {
        throw new Error(`Refusing non-HTTPS download: ${parsed.protocol}//${parsed.hostname}`);
    }
    if (!ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
        throw new Error(`Refusing download host ${parsed.hostname} (not on integrity allowlist)`);
    }
    return parsed;
}

function pinnedDownloadFor(platform, arch) {
    return PINNED_DOWNLOADS[platformKey(platform, arch)] || null;
}

function assertFileSha256(filePath, expectedHex, label = filePath) {
    if (!expectedHex) {
        throw new Error(
            `No SHA-256 pin for ${label}. Place a known-good sd-cli in the local-ai bin dir ` +
            `and set ${LOCAL_AI_SHA_ENV} to its SHA-256, or ship a hashed bundled binary. Auto-download is disabled.`
        );
    }
    const actual = sha256File(filePath);
    if (actual.toLowerCase() !== String(expectedHex).toLowerCase()) {
        throw new Error(
            `Integrity check failed for ${label}: expected SHA-256 ${expectedHex}, got ${actual}`
        );
    }
    return actual;
}

function assertTrustedBinary(filePath, opts = {}) {
    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('sd-cli binary is missing. Auto-download from GitHub is disabled without a pinned SHA-256.');
    }
    const expected = expectedBinarySha256(opts);
    return assertFileSha256(filePath, expected, 'sd-cli');
}

function downloadHttpsFile(url, destPath, onProgress) {
    const parsed = assertTrustedUrl(url);
    const tmp = destPath + '.part';

    const attempt = (requestUrl, redirectsLeft) => new Promise((resolve, reject) => {
        const current = assertTrustedUrl(requestUrl);
        const req = https.get({
            hostname: current.hostname,
            path: current.pathname + current.search,
            headers: {
                'User-Agent': 'EliseoRom-open-generative-ai/2.0',
                Accept: '*/*',
            },
        }, (res) => {
            const { statusCode, headers } = res;
            if ([301, 302, 303, 307, 308].includes(statusCode)) {
                res.resume();
                if (redirectsLeft <= 0) {
                    reject(new Error('Too many redirects'));
                    return;
                }
                if (!headers.location) {
                    reject(new Error('Redirect with no Location'));
                    return;
                }
                const next = new URL(headers.location, current).toString();
                resolve(attempt(next, redirectsLeft - 1));
                return;
            }
            if (statusCode !== 200) {
                res.resume();
                reject(new Error(`HTTP ${statusCode} from ${current.hostname}${current.pathname}`));
                return;
            }
            const total = parseInt(headers['content-length'] || '0', 10);
            let received = 0;
            const out = fs.createWriteStream(tmp);
            res.on('data', (chunk) => {
                received += chunk.length;
                if (total && onProgress) onProgress(received / total);
            });
            pipeline(res, out)
                .then(() => {
                    fs.renameSync(tmp, destPath);
                    resolve();
                })
                .catch(reject);
        });
        req.on('error', reject);
        req.setTimeout(60000, () => req.destroy(new Error('Request timed out')));
    });

    return attempt(parsed.toString(), 5);
}

module.exports = {
    ALLOWED_DOWNLOAD_HOSTS,
    LOCAL_AI_SHA_ENV,
    PINNED_DOWNLOADS,
    assertFileSha256,
    assertTrustedBinary,
    assertTrustedUrl,
    downloadHttpsFile,
    expectedBinarySha256,
    pinnedDownloadFor,
    platformKey,
    sha256Buffer,
    sha256File,
};
