const { Entry } = require('factom/src/entry'),
    hash = require('hash.js'),
    { getSignature } = require('../factom-identity'),
    { validateVote } = require('../validation/json-validation'),
    { sha512 } = require('../crypto');

async function generateVoteCommitEntry(voteChainId, vote, voter) {
    if (!validateVote(vote)) {
        throw new Error('Vote validation error:\n' + JSON.stringify(validateVote.errors));
    }

    const voted = Buffer.concat(vote.vote.map(choice => Buffer.from(choice, 'utf8')));
    const commitment = hash.hmac(hash[vote.hmacAlgo], Buffer.from(vote.secret, 'hex')).update(voted).digest('hex');
    const content = Buffer.from(JSON.stringify({ commitment }));

    const dataToSign = sha512(Buffer.concat([Buffer.from(voteChainId, 'hex'), content]));
    const signature = await getSignature(voter, dataToSign);

    return Entry.builder()
        .chainId(voteChainId, 'hex')
        .extId('factom-vote-commit', 'utf8')
        .extId(voter.id)
        .extId(voter.publicKey)
        .extId(signature)
        .content(content, 'utf8')
        .build();
}


function generateVoteRevealEntry(voteChainId, vote, voterId) {
    if (!validateVote(vote)) {
        throw new Error('Vote validation error:\n' + JSON.stringify(validateVote.errors));
    }

    const content = Buffer.from(JSON.stringify({
        vote: vote.vote,
        secret: Buffer.from(vote.secret, 'hex').toString('hex'),
        hmacAlgo: vote.hmacAlgo
    }), 'utf8');

    return Entry.builder()
        .chainId(voteChainId, 'hex')
        .extId('factom-vote-reveal', 'utf8')
        .extId(voterId)
        .content(content, 'utf8')
        .build();
}


module.exports = {
    generateVoteCommitEntry,
    generateVoteRevealEntry
};