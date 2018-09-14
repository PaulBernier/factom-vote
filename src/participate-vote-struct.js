const { Entry, composeEntry } = require('factom/src/entry'),
    hash = require('hash.js'),
    sign = require('tweetnacl/nacl-fast').sign,
    { validateVote } = require('./validation/json-validation'),
    { getKeyPair } = require('./crypto');

function generateVoteCommitEntry(vote, voter) {
    if (!validateVote(vote)) {
        throw new Error('Vote validation error:\n' + JSON.stringify(validateVote.errors));
    }

    const voted = Buffer.concat(vote.vote.map(choice => Buffer.from(choice, 'utf8')));
    const commitment = hash.hmac(hash[vote.hmacAlgo], Buffer.from(vote.secret, 'hex')).update(voted).digest('hex');
    const content = Buffer.from(JSON.stringify({ commitment }));

    const keyPair = getKeyPair(voter.secretKey);
    const voteChainId = Buffer.from(vote.voteChainId, 'hex');
    const signature = sign.detached(Buffer.concat([voteChainId, content]), keyPair.secretKey);

    return Entry.builder()
        .chainId(voteChainId)
        .extId('factom-vote-commit', 'utf8')
        .extId(voter.id)
        .extId(keyPair.publicKey)
        .extId(signature)
        .content(content, 'utf8')
        .build();
}


function generateVoteRevealEntry(vote, voter) {
    if (!validateVote(vote)) {
        throw new Error('Vote validation error:\n' + JSON.stringify(validateVote.errors));
    }

    const content = Buffer.from(JSON.stringify({
        vote: vote.vote,
        secret: Buffer.from(vote.secret, 'hex').toString('hex'),
        hmacAlgo: vote.hmacAlgo
    }), 'utf8');

    const keyPair = getKeyPair(voter.secretKey);
    const voteChainId = Buffer.from(vote.voteChainId, 'hex');
    const signature = sign.detached(Buffer.concat([voteChainId, content]), keyPair.secretKey);

    return Entry.builder()
        .chainId(vote.voteChainId)
        .extId('factom-vote-reveal', 'utf8')
        .extId(voter.id)
        .extId(keyPair.publicKey)
        .extId(signature)
        .content(content, 'utf8')
        .build();
}

///////////////////

function composeVoteCommitEntry(vote, voter, ecPrivateAddress) {
    return composeHex(composeEntry(generateVoteCommitEntry(vote, voter), ecPrivateAddress));
}

function composeVoteRevealEntry(vote, voter, ecPrivateAddress) {
    return composeHex(composeEntry(generateVoteRevealEntry(vote, voter), ecPrivateAddress));
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