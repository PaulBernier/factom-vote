const { Entry, composeEntry } = require('factom/src/entry'),
    hash = require('hash.js'),
    sign = require('tweetnacl/nacl-fast').sign,
    { validateVote } = require('./validation/json-validation'),
    { getKeyPair } = require('./crypto');

function generateVoteCommitEntry(voteChainId, vote, voter) {
    if (!validateVote(vote)) {
        throw new Error('Vote validation error:\n' + JSON.stringify(validateVote.errors));
    }

    const voted = Buffer.concat(vote.vote.map(choice => Buffer.from(choice, 'utf8')));
    const commitment = hash.hmac(hash[vote.hmacAlgo], Buffer.from(vote.secret, 'hex')).update(voted).digest('hex');
    const content = Buffer.from(JSON.stringify({ commitment }));

    const keyPair = getKeyPair(voter.secretKey);
    const signature = sign.detached(Buffer.concat([Buffer.from(voteChainId, 'hex'), content]), keyPair.secretKey);

    return Entry.builder()
        .chainId(voteChainId, 'hex')
        .extId('factom-vote-commit', 'utf8')
        .extId(voter.id)
        .extId(keyPair.publicKey)
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

///////////////////

function composeVoteCommitEntry(voteChainId, vote, voter, ecPrivateAddress) {
    return composeHex(composeEntry(generateVoteCommitEntry(voteChainId, vote, voter), ecPrivateAddress));
}

function composeVoteRevealEntry(voteChainId, vote, voterId, ecPrivateAddress) {
    return composeHex(composeEntry(generateVoteRevealEntry(voteChainId, vote, voterId), ecPrivateAddress));
}

function composeHex(compose) {
    return {
        commit: compose.commit.toString('hex'),
        reveal: compose.reveal.toString('hex')
    };
}


module.exports = {
    generateVoteCommitEntry,
    generateVoteRevealEntry,
    composeVoteCommitEntry,
    composeVoteRevealEntry
};