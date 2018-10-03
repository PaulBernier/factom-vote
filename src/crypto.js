const nacl = require('tweetnacl/nacl-fast'),
    hash = require('hash.js'),
    sign = nacl.sign;

function getKeyPair(secretKey) {
    const secret = Buffer.from(secretKey, 'hex');
    switch (secret.length) {
        case 32:
            return sign.keyPair.fromSeed(secret);
        case 64:
            return sign.keyPair.fromSecretKey(secret);
        default:
            throw new Error('Bad key length');

    }
}

function sha512(data) {
    return Buffer.from(hash.sha512().update(data).digest());
}

module.exports = { getKeyPair, sha512 };