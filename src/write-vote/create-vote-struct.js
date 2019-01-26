const { Chain } = require('factom/src/chain'),
    { validateVoteDefinition, validateEligibleVoters, validateCreateVoteData } = require('../validation/json-validation'),
    { Entry } = require('factom/src/entry'),
    { getSignature } = require('../factom-identity'),
    nacl = require('tweetnacl/nacl-fast'),
    { sha512 } = require('../crypto');

const NONCE_SIZE = 32;

async function generateVoteChain(vote, initiator) {
    if (!validateVoteDefinition(vote)) {
        throw new Error('Vote definition validation error:\n' + JSON.stringify(validateVoteDefinition.errors));
    }

    const content = Buffer.from(JSON.stringify(vote), 'utf8');
    const dataToSign = sha512(content);
    const signature = await getSignature(initiator, dataToSign);

    return new Chain(Entry.builder()
        .extId('factom-vote', 'utf8')
        .extId('00') // protocol version
        .extId(initiator.id)
        .extId(initiator.publicKey)
        .extId(signature)
        .content(content)
        .build());
}

async function generateEligibleVotersChain(eligibleVoters, initiator) {
    // TODO: handle long list of voters (split the JSON)
    if (!validateEligibleVoters(eligibleVoters)) {
        throw new Error('Eligible voters validation error:\n' + JSON.stringify(validateEligibleVoters.errors));
    }

    const nonce = Buffer.from(nacl.randomBytes(NONCE_SIZE));

    const content = Buffer.from(JSON.stringify(eligibleVoters), 'utf8');
    const dataToSign = sha512(Buffer.concat([nonce, content]));
    const signature = await getSignature(initiator, dataToSign);

    return new Chain(Entry.builder()
        .extId('factom-vote-eligible-voters', 'utf8')
        .extId(initiator.id)
        .extId(nonce)
        .extId(initiator.publicKey)
        .extId(signature)
        .content(content, 'utf8')
        .build());
}

async function generateAppendEligibleVotersEntry(eligibleVoters, eligibleVotersChainId, initiator) {
    // TODO: handle long list of voters (split the JSON)
    if (!validateEligibleVoters(eligibleVoters)) {
        throw new Error('Eligible voters validation error:\n' + JSON.stringify(validateEligibleVoters.errors));
    }


    const nonce = Buffer.from(nacl.randomBytes(NONCE_SIZE));
    const content = Buffer.from(JSON.stringify(eligibleVoters), 'utf8');
    const dataToSign = sha512(Buffer.concat([Buffer.from(eligibleVotersChainId, 'hex'), nonce, content]));
    const signature = await getSignature(initiator, dataToSign);

    return Entry.builder()
        .chainId(eligibleVotersChainId)
        .extId('factom-vote-eligible-voters', 'utf8')
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

async function computeVoteCreationCost(voteData) {
    if (!validateCreateVoteData(voteData)) {
        throw new Error('Create vote data validation error:\n' + JSON.stringify(validateCreateVoteData.errors));
    }
    const { definition, registrationChainId, eligibleVoters, identity } = voteData;

    // Dummy secretKey for the cost computation
    const initiator = { id: identity.chainId, secretKey: '58b49c372d807b05d80ad2fc43e468bf5bd5012305b6261036a74778f049f240' };
    const defCopy = JSON.parse(JSON.stringify(definition));
    const chainsToCreate = [];

    if (!defCopy.vote.eligibleVotersChainId) {
        const eligibleVotersChain = await generateEligibleVotersChain(eligibleVoters || [], initiator);
        defCopy.vote.eligibleVotersChainId = eligibleVotersChain.idHex;
        chainsToCreate.push(eligibleVotersChain);
    }

    const voteChain = await generateVoteChain(defCopy, initiator);
    chainsToCreate.push(voteChain);
    const registrationEntry = generateVoteRegistrationEntry(registrationChainId, voteChain.id);

    return registrationEntry.ecCost() + chainsToCreate.map(c => c.ecCost()).reduce((acc, cur) => acc + cur, 0);
}


module.exports = {
    generateVoteRegistrationEntry,
    generateVoteChain,
    generateEligibleVotersChain,
    generateAppendEligibleVotersEntry,
    computeVoteCreationCost
};