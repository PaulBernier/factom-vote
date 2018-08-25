const // TODO: replace by factom-struct
    { Entry, getPublicAddress } = require('factom'),
    hash = require('hash.js'),
    sign = require('tweetnacl/nacl-fast').sign;

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

// TODO: refactor
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

//////////////////////////////

async function commitVote(cli, vote, voter, ecPrivateAddress) {
    // TODO: possible online validation (commitVoteSafe?):
    // config (possible options, min,max...)
    // voter is a authorized participant

    const entry = generateVoteCommitEntry(vote, voter);
    validateFunds(cli, entry.ecCost(), ecPrivateAddress, 'Cannot commit vote');

    return cli.add(entry, ecPrivateAddress);
}

async function revealVote(cli, vote, voter, ecPrivateAddress) {
    // TODO: possible online validation (revealVoteSafe?):
    // reveal match the commit

    const entry = generateVoteRevealEntry(vote, voter);
    validateFunds(cli, entry.ecCost(), ecPrivateAddress, 'Cannot reveal vote');

    return cli.add(entry, ecPrivateAddress);
}

async function validateFunds(cli, ecCost, ecAddress, message) {
    const balance = await cli.getBalance(ecAddress);

    if (ecCost > balance) {
        throw new Error(`${message}. Not enough EC on ${getPublicAddress(ecAddress)}. Required: ${ecCost}EC. Available: ${balance}EC`);
    }
}


module.exports = {
    generateVoteCommitEntry,
    generateVoteRevealEntry,
    commitVote,
    revealVote
};