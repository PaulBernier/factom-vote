const { getPublicAddress } = require('factom'),
    { generateVoteCommitEntry, generateVoteRevealEntry } = require('./participate-vote-struct');

async function commitVote(cli, voteChainId, vote, voter, ecPrivateAddress) {
    // TODO: possible online validation (commitVoteSafe?):
    // config (possible options, min,max...)
    // voter is an eliglbe voter

    const entry = generateVoteCommitEntry(voteChainId, vote, voter);
    validateFunds(cli, entry.ecCost(), ecPrivateAddress, 'Cannot commit vote');

    return cli.add(entry, ecPrivateAddress);
}

async function revealVote(cli, voteChainId, vote, voterId, ecPrivateAddress) {
    // TODO: possible online validation (revealVoteSafe?):
    // reveal match the commit

    const entry = generateVoteRevealEntry(voteChainId, vote, voterId);
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