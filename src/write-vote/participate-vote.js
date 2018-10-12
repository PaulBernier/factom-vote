const { getPublicAddress } = require('factom'),
    { getVoteIdentity } = require('../factom-identity'),
    { getVoteDefinition } = require('../read-vote/read-vote'),
    { generateVoteCommitEntry, generateVoteRevealEntry } = require('./participate-vote-struct');

async function commitVote(cli, voteChainId, vote, identity, ecAddress) {
    // TODO: possible online validation (commitVoteSafe?):
    // config (possible options, min,max...)
    // voter is an eliglbe voter
    const definition = await getVoteDefinition(cli, voteChainId);
    const { commitStart, commitEnd } = definition.data.vote.phasesBlockHeights;
    await validateBlockHeightInterval(cli, 'commit', commitStart, commitEnd);

    const voter = await getVoteIdentity(cli, identity);
    const entry = generateVoteCommitEntry(voteChainId, vote, voter);
    validateFunds(cli, entry.ecCost(), ecAddress, 'Cannot commit vote');

    return cli.add(entry, ecAddress);
}

async function revealVote(cli, voteChainId, vote, voterId, ecAddress) {
    // TODO: possible online validation (revealVoteSafe?):
    // reveal match the commit

    const definition = await getVoteDefinition(cli, voteChainId);
    const { revealStart, revealEnd } = definition.data.vote.phasesBlockHeights;
    await validateBlockHeightInterval(cli, 'commit', revealStart, revealEnd);

    const entry = generateVoteRevealEntry(voteChainId, vote, voterId);
    validateFunds(cli, entry.ecCost(), ecAddress, 'Cannot reveal vote');

    return cli.add(entry, ecAddress);
}

async function validateFunds(cli, ecCost, ecAddress, message) {
    const balance = await cli.getBalance(ecAddress);

    if (ecCost > balance) {
        throw new Error(`${message}. Not enough EC on ${getPublicAddress(ecAddress)}. Required: ${ecCost}EC. Available: ${balance}EC`);
    }
}

async function validateBlockHeightInterval(cli, action, start, end) {
    const currentHeight = await cli.getHeights().then(h => h.leaderHeight);

    if (currentHeight < start || currentHeight > end) {
        throw new Error(`Current block height ${currentHeight} is not within the block height range of the vote ${action}:  [${start}, ${end}]`);
    }
}


module.exports = {
    generateVoteCommitEntry,
    generateVoteRevealEntry,
    commitVote,
    revealVote
};