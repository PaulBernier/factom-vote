const { getPublicAddress } = require('factom'),
    { validateCreateVoteData } = require('../validation/json-validation'),
    { generateEligibleVotersChain,
        generateVoteChain,
        generateVoteRegistrationEntry,
        generateAppendEligibleVotersEntry } = require('./create-vote-struct'),
    { getVoteIdentity, extractKey, getPublicIdentityKey, getSecretIdentityKey } = require('../factom-identity');

async function createVote(cli, identityResolvers, voteData, ecAddress, skipValidation) {
    if (!validateCreateVoteData(voteData)) {
        throw new Error('Create vote data validation error:\n' + JSON.stringify(validateCreateVoteData.errors));
    }
    const { definition, registrationChainId, eligibleVoters, identity } = voteData;

    if (!await cli.chainExists(registrationChainId)) {
        throw new Error(`Registration chain ${registrationChainId} doesn't exist.`);
    }

    const initiator = await getVoteIdentity(identityResolvers, identity);
    const defCopy = JSON.parse(JSON.stringify(definition));
    const chainsToCreate = [];

    if (!defCopy.vote.eligibleVotersChainId) {

        if (!skipValidation) {
            const height = await cli.getHeights().then(heights => heights.leaderHeight);

            if (defCopy.vote.phasesBlockHeights.commitStart <= height + 1) {
                throw new Error(`The height of the current block being built (${height + 1}) is higher or equal to commitStart (${defCopy.vote.phasesBlockHeights.commitStart}) making your new eligible voters list unusable.`);
            }
        }

        const eligibleVotersChain = await generateEligibleVotersChain(eligibleVoters || [], initiator);
        defCopy.vote.eligibleVotersChainId = eligibleVotersChain.idHex;
        chainsToCreate.push(eligibleVotersChain);
    }

    const voteChain = await generateVoteChain(defCopy, initiator);
    chainsToCreate.push(voteChain);
    const registrationEntry = generateVoteRegistrationEntry(registrationChainId, voteChain.id);
    const ecCost = registrationEntry.ecCost() + chainsToCreate.map(c => c.ecCost()).reduce((acc, cur) => acc + cur, 0);

    await validateFunds(cli, ecCost, ecAddress, 'Cannot create vote');

    const [voteChainAdded, eligibleVotersChainAdded] = await cli.add(chainsToCreate.reverse(), ecAddress);
    const registration = await cli.add(registrationEntry, ecAddress);

    return {
        eligibleVoters: eligibleVotersChainAdded || { chainId: defCopy.vote.eligibleVotersChainId },
        vote: voteChainAdded,
        registration
    };
}

async function appendEligibleVoters(cli, privateKeyResolver, appendEligibleVotersData, ecAddress, skipValidation) {
    const { eligibleVoters, eligibleVotersChainId, initiator } = appendEligibleVotersData;

    if (!skipValidation && initiator.key) {
        const canAppend = await canAppendEligibleVoters(cli, eligibleVotersChainId, initiator.key);
        if (!canAppend) {
            throw new Error(`The initiator secret key is not authorized to add eligible voters to [${eligibleVotersChainId}].`);
        }
    }

    if (typeof initiator.sign !== 'function') {
        initiator.secretKey = extractKey(await getSecretIdentityKey(privateKeyResolver, initiator.key));
    }
    const entry = await generateAppendEligibleVotersEntry(eligibleVoters, eligibleVotersChainId, initiator);
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