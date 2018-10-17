const { getPublicAddress } = require('factom'),
    { getVoteIdentity } = require('../factom-identity'),
    { getVoteDefinition } = require('../read-vote/read-vote'),
    { generateVoteCommitEntry, generateVoteRevealEntry } = require('./participate-vote-struct');

async function commitVote(cli, voteChainId, vote, identity, ecAddress) {

    const definition = await getVoteDefinition(cli, voteChainId);
    validateOptions(definition.data.vote.config, vote.vote);
    const { commitStart, commitEnd } = definition.data.vote.phasesBlockHeights;
    await validateBlockHeightInterval(cli, 'commit', commitStart, commitEnd);

    const voter = await getVoteIdentity(cli, identity);
    const entry = generateVoteCommitEntry(voteChainId, vote, voter);
    validateFunds(cli, entry.ecCost(), ecAddress, 'Cannot commit vote');

    return cli.add(entry, ecAddress);
}

function validateOptions(config, voterOptions) {
    const validNumberOfOptionsSelected = (config.allowAbstention && voterOptions.length === 0) ||
        (voterOptions.length >= config.minOptions && voterOptions.length <= config.maxOptions);

    if (!validNumberOfOptionsSelected) {
        throw new Error(`Invalid number of options selected. Min: ${config.minOptions}. Max: ${config.maxOptions}. Abstention allowed: ${config.allowAbstention}.`);
    }

    if (!voterOptions.every(o => config.options.includes(o))) {
        throw new Error('At least one of the selected options is not part of the vote available options.');
    }
}

async function revealVote(cli, voteChainId, vote, voterId, ecAddress) {
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
    const currentHeight = await cli.getHeights().then(h => h.leaderHeight + 1);

    if (currentHeight < start || currentHeight > end) {
        throw new Error(`The height of the current block being built ${currentHeight} is not within the block height range of the vote ${action}:  [${start}, ${end}]`);
    }
}


module.exports = {
    generateVoteCommitEntry,
    generateVoteRevealEntry,
    commitVote,
    revealVote
};