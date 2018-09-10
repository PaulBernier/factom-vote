const { Chain, composeChain } = require('factom/src/chain'),
    { validateVoteDefinition, validateParticipants } = require('./validation/json-validation'),
    { Entry, composeEntry } = require('factom/src/entry'),
    nacl = require('tweetnacl/nacl-fast'),
    sign = nacl.sign,
    { getKeyPair } = require('./crypto');

const NONCE_SIZE = 32;

function generateVoteChain(vote, administrator) {
    if (!validateVoteDefinition(vote)) {
        throw new Error('Vote definition validation error:\n' + JSON.stringify(validateVoteDefinition.errors));
    }

    const keyPair = getKeyPair(administrator.secretKey);
    const content = Buffer.from(JSON.stringify(vote), 'utf8');

    const signature = sign.detached(content, keyPair.secretKey);

    return new Chain(Entry.builder()
        .extId('factom-vote', 'utf8')
        .extId('00') // protocol version
        .extId(administrator.id)
        .extId(keyPair.publicKey)
        .extId(signature)
        .content(content)
        .build());
}

function generateVoteParticipantsChain(participants, administrator) {
    // TODO: handle long list of voters (split the JSON)
    if (!validateParticipants(participants)) {
        throw new Error('Vote participants validation error:\n' + JSON.stringify(validateParticipants.errors));
    }

    const keyPair = getKeyPair(administrator.secretKey);
    const nonce = nacl.randomBytes(NONCE_SIZE);

    const content = Buffer.from(JSON.stringify(participants), 'utf8');
    const signature = sign.detached(Buffer.concat([nonce, content]), keyPair.secretKey);

    return new Chain(Entry.builder()
        .extId('factom-vote-participants', 'utf8')
        .extId(administrator.id)
        .extId(nonce)
        .extId(keyPair.publicKey)
        .extId(signature)
        .content(content, 'utf8')
        .build());
}

function generateAppendParticipantsEntry(participants, participantsChainId, administratorSecretKey) {
    // TODO: handle long list of voters (split the JSON)
    if (!validateParticipants(participants)) {
        throw new Error('Vote participants validation error:\n' + JSON.stringify(validateParticipants.errors));
    }
    
    const keyPair = getKeyPair(administratorSecretKey);

    const nonce = Buffer.from(nacl.randomBytes(NONCE_SIZE));
    const content = Buffer.from(JSON.stringify(participants), 'utf8');
    const signature = sign.detached(Buffer.concat([Buffer.from(participantsChainId, 'hex'), nonce, content]), keyPair.secretKey);

    return Entry.builder()
        .chainId(participantsChainId)
        .extId(nonce)
        .extId(signature)
        .content(content, 'utf8')
        .build();
}

function generateVoteRegistrationEntry(registrationChainId, voteChainId) {

    return Entry.builder()
        .chainId(registrationChainId)
        .extId(Buffer.from('Register Factom Vote', 'utf8'))
        .extId(Buffer.from(voteChainId, 'hex'))
        .build();
}

////////////////////////////

function composeVoteChain(vote, administrator, ecPrivateAddress) {
    return composeHex(composeChain(generateVoteChain(vote, administrator), ecPrivateAddress));
}

function composeVoteRegistrationEntry(registrationChainId, voteChainId, ecPrivateAddress) {
    return composeHex(composeEntry(generateVoteRegistrationEntry(registrationChainId, voteChainId), ecPrivateAddress));
}

function composeVoteParticipantsChain(participants, administrator, ecPrivateAddress) {
    return composeHex(composeChain(generateVoteParticipantsChain(participants, administrator), ecPrivateAddress));
}

function composeAppendParticipantsEntry(participants, participantsChainId, administratorSecretKey, ecPrivateAddress) {
    return composeHex(composeEntry(generateAppendParticipantsEntry(participants, participantsChainId, administratorSecretKey), ecPrivateAddress));
}

function composeHex(compose) {
    return {
        commit: compose.commit.toString('hex'),
        reveal: compose.reveal.toString('hex')
    };
}

module.exports = {
    generateVoteRegistrationEntry,
    generateVoteChain,
    generateVoteParticipantsChain,
    generateAppendParticipantsEntry,
    composeVoteRegistrationEntry,
    composeVoteChain,
    composeVoteParticipantsChain,
    composeAppendParticipantsEntry
};