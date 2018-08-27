const nacl = require('tweetnacl/nacl-fast'),
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

module.exports = { getKeyPair };