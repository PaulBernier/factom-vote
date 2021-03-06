const base58 = require('base-58'),
    sign = require('tweetnacl/nacl-fast').sign,
    { getKeyPair, sha256d } = require('./crypto');

const ID_PUB_PREFIX = Buffer.from('0345ef9de0', 'hex'),
    ID_SEC_PREFIX = Buffer.from('0345f3d0d6', 'hex');
const VALID_ID_PREFIXES = new Set(['idpub', 'idsec']);

async function getVoteIdentity(identityResolvers, identity) {
    const publicIdentityKey = getPublicIdentityKey(identity.key);
    await verifyIdentityKeyAssociation(identityResolvers.publicKeysResolver, identity.chainId, publicIdentityKey);

    const publicKey = extractKey(publicIdentityKey);

    const result = {
        id: identity.chainId,
        publicKey
    };

    if (typeof identity.sign === 'function') {
        result.sign = identity.sign;
    } else {
        result.secretKey = extractKey(await getSecretIdentityKey(identityResolvers.privateKeyResolver, identity.key));
    }

    return result;
}


async function getSignature(voteIdentity, dataToSign) {
    if (typeof voteIdentity.sign === 'function') {
        const signature = Buffer.from(await voteIdentity.sign(dataToSign), 'hex');
        if (!sign.detached.verify(dataToSign, signature, voteIdentity.publicKey)) {
            throw new Error(`Identity signature does not verify for public key ${voteIdentity.publicKey.toString('hex')}`);
        }
        return signature;
    } else if (voteIdentity.secretKey) {
        const keyPair = getKeyPair(voteIdentity.secretKey);
        return sign.detached(dataToSign, keyPair.secretKey);
    } else {
        throw new Error('Unable to sign data: no resolvable secret key or sign() method');
    }
}

async function verifyIdentityKeyAssociation(identityPublicKeysResolver, identityChainId, identityKey, blockHeight) {
    const publicIdentityKey = getPublicIdentityKey(identityKey);

    const keys = await identityPublicKeysResolver.call(null, identityChainId, blockHeight);

    if (!keys.includes(publicIdentityKey)) {
        throw new Error(`Public identity key [${publicIdentityKey}] is not associated with identity [${identityChainId}] at block height ${blockHeight}.`);
    }
}

function extractKey(identityKey) {
    if (!isValidIdentityKey(identityKey)) {
        throw new Error(`Invalid identity key ${identityKey}.`);
    }
    return Buffer.from(base58.decode(identityKey).slice(5, 37));
}

function getPublicIdentityKey(key) {
    if (isValidPublicIdentityKey(key)) {
        return key;
    } else if (isValidSecretIdentityKey(key)) {
        const publicKey = getKeyPair(extractKey(key)).publicKey;
        return keyToPublicIdentityKey(publicKey);
    } else {
        throw new Error(`Invalid identity key: ${key}`);
    }
}

function getSecretIdentityKey(privateKeyResolver, key) {
    if (isValidSecretIdentityKey(key)) {
        return key;
    } else if (isValidPublicIdentityKey(key)) {
        return privateKeyResolver.call(null, key);
    } else {
        throw new Error(`Invalid identity key: ${key}`);
    }
}

function isValidIdentityKey(key) {
    try {
        if (!VALID_ID_PREFIXES.has(key.slice(0, 5))) {
            return false;
        }

        const bytes = Buffer.from(base58.decode(key));
        if (bytes.length !== 41) {
            return false;
        }

        const checksum = sha256d(bytes.slice(0, 37)).slice(0, 4);
        if (checksum.equals(bytes.slice(37, 41))) {
            return true;
        }

        return false;
    } catch (err) {
        return false;
    }
}

function isValidPublicIdentityKey(key) {
    return isValidIdentityKey(key) && key.startsWith('idpub');
}

function isValidSecretIdentityKey(key) {
    return isValidIdentityKey(key) && key.startsWith('idsec');
}

function keyToIdentityKey(key, prefix) {
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
        throw new Error(`Key ${keyBuffer} is not 32 bytes long.`);
    }

    const address = Buffer.concat([prefix, keyBuffer]);
    const checksum = sha256d(address).slice(0, 4);
    return base58.encode(Buffer.concat([address, checksum]));
}

function keyToPublicIdentityKey(key) {
    return keyToIdentityKey(key, ID_PUB_PREFIX);
}

function keyToSecretIdentityKey(key) {
    return keyToIdentityKey(key, ID_SEC_PREFIX);
}

///////////////////////////////
// Walletd identity resolvers
///////////////////////////////

async function walletdIdentityPublicKeysResolver(cli, identityChainId, blockHeight) {
    const { keys } = await cli.walletdApi('active-identity-keys', {
        chainid: identityChainId,
        height: blockHeight
    });

    return keys;
}

async function walletdIdentityPrivateKeyResolver(cli, key) {
    return cli.walletdApi('identity-key', { public: key }).then(data => data.secret);
}

module.exports = {
    extractKey,
    getVoteIdentity,
    getPublicIdentityKey,
    getSecretIdentityKey,
    isValidIdentityKey,
    isValidPublicIdentityKey,
    isValidSecretIdentityKey,
    keyToPublicIdentityKey,
    keyToSecretIdentityKey,
    verifyIdentityKeyAssociation,
    walletdIdentityPublicKeysResolver,
    walletdIdentityPrivateKeyResolver,
    getSignature
};