const { getPublicAddress } = require('factom'),
    { generateEligibleVotersChain,
        generateVoteChain,
        generateVoteRegistrationEntry,
        generateAppendEligibleVotersEntry } = require('./create-vote-struct'),
    { getKeyPair } = require('./crypto');


async function createVote(cli, voteData, ecPrivateKey) {
    const { definition, registrationChainId, eligibleVoters, administrator } = voteData;

    const eligibleVotersChain = generateEligibleVotersChain(eligibleVoters || [], administrator);
    definition.vote.eligibleVotersChainId = eligibleVotersChain.idHex;
    const voteChain = generateVoteChain(definition, administrator);
    const registrationEntry = generateVoteRegistrationEntry(registrationChainId, voteChain.id);

    const ecCost = eligibleVotersChain.ecCost() + voteChain.ecCost() + registrationEntry.ecCost();
    await validateFunds(cli, ecCost, ecPrivateKey, 'Cannot create vote');

    const [eligibleVotersChainAdded, voteChainAdded] = await cli.add([eligibleVotersChain, voteChain], ecPrivateKey);
    const registration = await cli.add(registrationEntry, ecPrivateKey);

    return {
        eligibleVoters: eligibleVotersChainAdded,
        vote: voteChainAdded,
        registration
    };
}

async function appendEligibleVoters(cli, appendEligibleVotersData, ecPrivateKey) {
    const { eligibleVoters, eligibleVotersChainId, administratorSecretKey } = appendEligibleVotersData;

    const canAppend = await canAppendEligibleVoters(cli, eligibleVotersChainId, administratorSecretKey);
    if (!canAppend) {
        throw new Error(`The administrator secret key is not authorized to add eligible voters to [${eligibleVotersChainId}].`);
    }

    const entry = generateAppendEligibleVotersEntry(eligibleVoters, eligibleVotersChainId, administratorSecretKey);
    await validateFunds(cli, entry.ecCost(), ecPrivateKey, 'Cannot append eligible voters');

    return cli.add(entry, ecPrivateKey);
}

async function validateFunds(cli, ecCost, ecAddress, message) {
    const balance = await cli.getBalance(ecAddress);

    if (ecCost > balance) {
        throw new Error(`${message}. Not enough EC on ${getPublicAddress(ecAddress)}. Required: ${ecCost}EC. Available: ${balance}EC`);
    }

}

async function canAppendEligibleVoters(cli, eligibleVotersChainId, administratorSecretKey) {
    const firstEntry = await cli.getFirstEntry(eligibleVotersChainId);
    const publicKey = Buffer.from(getKeyPair(administratorSecretKey).publicKey);
    return publicKey.equals(firstEntry.extIds[3]);
}

module.exports = {
    createVote,
    appendEligibleVoters
};