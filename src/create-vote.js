const // TODO: replace by factom-struct
    { Entry, Chain, getPublicAddress } = require('factom'),
    nacl = require('tweetnacl/nacl-fast'),
    sign = nacl.sign;

function generateVoteChainFirstEntry(vote, administrator) {
    // TODO
    //validateVoteDefinition(vote);

    const keyPair = getKeyPair(administrator.secretKey);
    const content = Buffer.from(JSON.stringify(vote), 'utf8');

    const signature = sign.detached(content, keyPair.secretKey);

    return Entry.builder()
        .extId('factom-vote', 'utf8')
        .extId('00') // protocol version
        .extId(administrator.id)
        .extId(keyPair.publicKey)
        .extId(signature)
        .content(content)
        .build();
}

function generateVoteParticipantsChainFirstEntry(participants, administrator) {
    // TODO: validate voters
    const keyPair = getKeyPair(administrator.secretKey);
    const nonce = nacl.randomBytes(32);

    const content = Buffer.from(JSON.stringify(participants), 'utf8');
    const signature = sign.detached(Buffer.concat([nonce, content]), keyPair.secretKey);

    return Entry.builder()
        .extId('factom-vote-participants', 'utf8')
        .extId(administrator.id)
        .extId(nonce)
        .extId(keyPair.publicKey)
        .extId(signature)
        .content(content, 'utf8')
        .build();
}

function generateAppendParticipantsEntry(participants, participantsChainId, administratorSecretKey) {
    // TODO: handle long list of voters (split the JSON)
    // TODO: same validation for voters
    const keyPair = getKeyPair(administratorSecretKey);

    const content = Buffer.from(JSON.stringify(participants), 'utf8');
    const signature = sign.detached(Buffer.concat([Buffer.from(participantsChainId, 'hex'), content]), keyPair.secretKey);

    return Entry.builder()
        .chainId(participantsChainId)
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

// TODO: refactor duplicate
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

/////////////////////////////

async function createVote(cli, voteData, ecPrivateKey) {
    const { definition, registrationChainId, participants, administrator } = voteData;

    const participantsChain = new Chain(generateVoteParticipantsChainFirstEntry(participants, administrator));
    definition.vote.participantsChainId = participantsChain.idHex;
    const voteChain = new Chain(generateVoteChainFirstEntry(definition, administrator));
    const registrationEntry = generateVoteRegistrationEntry(registrationChainId, voteChain.id, administrator);

    const ecCost = participantsChain.ecCost() + voteChain.ecCost() + registrationEntry.ecCost();
    await validateFunds(cli, ecCost, ecPrivateKey, 'Cannot create vote');

    const [voteParticipants, vote] = await cli.add([participantsChain, voteChain], ecPrivateKey);
    const registration = await cli.add(registrationEntry, ecPrivateKey);

    return {
        participants: voteParticipants,
        vote,
        registration
    };
}

async function appendParticipants(cli, appendParticipantsData, ecPrivateKey) {
    const { participants, participantsChainId, administratorSecretKey } = appendParticipantsData;

    const canAppend = await canAppendParticipants(cli, participantsChainId, administratorSecretKey);
    if (!canAppend) {
        throw new Error(`The administrator secret key is not authorized to add participants to [${participantsChainId}].`);
    }

    const entry = generateAppendParticipantsEntry(participants, participantsChainId, administratorSecretKey);
    await validateFunds(cli, entry.ecCost(), ecPrivateKey, 'Cannot append vote participants');

    return cli.add(entry, ecPrivateKey);
}

async function validateFunds(cli, ecCost, ecAddress, message) {
    const balance = await cli.getBalance(ecAddress);

    if (ecCost > balance) {
        throw new Error(`${message}. Not enough EC on ${getPublicAddress(ecAddress)}. Required: ${ecCost}EC. Available: ${balance}EC`);
    }

}

async function canAppendParticipants(cli, participantsChainId, administratorSecretKey) {
    const firstEntry = await cli.getFirstEntry(participantsChainId);
    const publicKey = Buffer.from(getKeyPair(administratorSecretKey).publicKey);
    return publicKey.equals(firstEntry.extIds[3]);
}

module.exports = {
    generateVoteRegistrationEntry,
    generateVoteChainFirstEntry,
    generateVoteParticipantsChainFirstEntry,
    generateAppendParticipantsEntry,
    createVote,
    appendParticipants
};