const { getPublicAddress } = require('factom'),
    { generateEligibleVotersChain,
        generateVoteChain,
        generateVoteRegistrationEntry,
        generateAppendEligibleVotersEntry } = require('./create-vote-struct'),
    { getVoteIdentity, extractKey, getPublicIdentityKey, getSecretIdentityKey } = require('../factom-identity');

async function createVote(cli, voteData, ecAddress) {
    const { definition, registrationChainId, eligibleVoters, identity } = voteData;

    const initiator = await getVoteIdentity(cli, identity);

    const eligibleVotersChain = generateEligibleVotersChain(eligibleVoters || [], initiator);
    const defCopy = JSON.parse(JSON.stringify(definition));
    defCopy.vote.eligibleVotersChainId = eligibleVotersChain.idHex;
    const voteChain = generateVoteChain(defCopy, initiator);
    const registrationEntry = generateVoteRegistrationEntry(registrationChainId, voteChain.id);

    const ecCost = eligibleVotersChain.ecCost() + voteChain.ecCost() + registrationEntry.ecCost();
    await validateFunds(cli, ecCost, ecAddress, 'Cannot create vote');

    const [eligibleVotersChainAdded, voteChainAdded] = await cli.add([eligibleVotersChain, voteChain], ecAddress);
    const registration = await cli.add(registrationEntry, ecAddress);

    return {
        eligibleVoters: eligibleVotersChainAdded,
        vote: voteChainAdded,
        registration
    };
}

async function appendEligibleVoters(cli, appendEligibleVotersData, ecAddress) {
    const { eligibleVoters, eligibleVotersChainId, identityKey } = appendEligibleVotersData;

    const canAppend = await canAppendEligibleVoters(cli, eligibleVotersChainId, identityKey);
    if (!canAppend) {
        throw new Error(`The initiator secret key is not authorized to add eligible voters to [${eligibleVotersChainId}].`);
    }

    const secretKey = extractKey(await getSecretIdentityKey(cli, identityKey));
    const entry = generateAppendEligibleVotersEntry(eligibleVoters, eligibleVotersChainId, secretKey);
    await validateFunds(cli, entry.ecCost(), ecAddress, 'Cannot append eligible voters');

    return cli.add(entry, ecAddress);
}

async function validateFunds(cli, ecCost, ecAddress, message) {
    const balance = await cli.getBalance(ecAddress);

    if (ecCost > balance) {
        throw new Error(`${message}. Not enough EC on ${getPublicAddress(ecAddress)}. Required: ${ecCost}EC. Available: ${balance}EC`);
    }

}

async function canAppendEligibleVoters(cli, eligibleVotersChainId, identityKey) {
    const firstEntry = await cli.getFirstEntry(eligibleVotersChainId);
    const publicKey = extractKey(getPublicIdentityKey(identityKey));
    return publicKey.equals(firstEntry.extIds[3]);
}

module.exports = {
    createVote,
    appendEligibleVoters
};