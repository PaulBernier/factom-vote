const // TODO: replace by factom-struct
    { Entry } = require('factom'),
    hash = require('hash.js'),
    sign = require('tweetnacl/nacl-fast').sign,
    { getKeyPair } = require('./crypto');

function generateVoteCommitEntry(vote, voter) {
    // TODO: Validate vote ADJ

    const voted = Buffer.concat(vote.vote.sort().map(choice => Buffer.from(choice, 'utf8')));
    const commit = hash.hmac(hash[vote.hmacAlgo], Buffer.from(vote.secret, 'hex')).update(voted).digest('hex');
    const content = Buffer.from(JSON.stringify({ commit }));

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
    // TODO: Validate vote ADJ with same schema

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


module.exports = {
    generateVoteCommitEntry,
    generateVoteRevealEntry
};