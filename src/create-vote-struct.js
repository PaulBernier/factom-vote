const // TODO: replace by factom-struct
    { Entry, Chain } = require('factom'),
    nacl = require('tweetnacl/nacl-fast'),
    sign = nacl.sign,
    { getKeyPair } = require('./crypto');

function generateVoteChain(vote, administrator) {
    // TODO
    //validateVoteDefinition(vote);

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
    // TODO: validate voters
    const keyPair = getKeyPair(administrator.secretKey);
    const nonce = nacl.randomBytes(32);

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
    // TODO: same validation for voters
    const keyPair = getKeyPair(administratorSecretKey);

    const nonce = Buffer.from(nacl.randomBytes(32));
    const content = Buffer.from(JSON.stringify(participants), 'utf8');
    const signature = sign.detached(Buffer.concat([Buffer.from(participantsChainId, 'hex'), nonce, content]), keyPair.secretKey);

    return Entry.builder()
        .chainId(participantsChainId)
        .extId(nonce)
        .extId(signature)
        .content(content, 'utf8')
        .build();
}

function generateVoteRegistrationEntry(registrationChainId, voteChainId, administrator) {
    const keyPair = getKeyPair(administrator.secretKey);

    const extIds = [
        Buffer.from('Register Factom Vote', 'utf8'),
        Buffer.from(voteChainId, 'hex'),
        Buffer.from(keyPair.publicKey)
    ];

    const signature = sign.detached(Buffer.concat(extIds), keyPair.secretKey);
    extIds.push(signature);

    return Entry.builder()
        .chainId(registrationChainId)
        .extIds(extIds)
        .build();
}

module.exports = {
    generateVoteRegistrationEntry,
    generateVoteChain,
    generateVoteParticipantsChain,
    generateAppendParticipantsEntry
};