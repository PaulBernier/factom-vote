const { getPublicAddress } = require('factom'),
    { generateVoteParticipantsChain,
        generateVoteChain,
        generateVoteRegistrationEntry,
        generateAppendParticipantsEntry } = require('./create-vote-struct'),
    { getKeyPair } = require('./crypto');


async function createVote(cli, voteData, ecPrivateKey) {
    const { definition, registrationChainId, participants, administrator } = voteData;

    const participantsChain = generateVoteParticipantsChain(participants || [], administrator);
    definition.vote.participantsChainId = participantsChain.idHex;
    const voteChain = generateVoteChain(definition, administrator);
    const registrationEntry = generateVoteRegistrationEntry(registrationChainId, voteChain.id);

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
    createVote,
    appendParticipants
};