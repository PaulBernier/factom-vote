const { processParsedVote } = require('./process-vote'),
    { parseVote, parseVoteChainEntry } = require('./parse-vote'),
    { computeResult } = require('./compute-vote-result');

async function getVote(cli, publicKeysResolver, chainId) {
    const parsedVote = await parseVote(cli, publicKeysResolver, chainId);
    const vote = processParsedVote(parsedVote);
    const result = computeResult(vote);

    return {
        vote, result
    };
}

async function getVoteDefinition(cli, publicKeysResolver, chainId) {
    const firstEntry = await cli.getFirstEntry(chainId);
    const parsed = await parseVoteChainEntry(publicKeysResolver, firstEntry);

    if (parsed.type === 'definition') {
        return parsed;
    } else {
        throw new Error(`Invalid vote first entry in chain [${chainId}].`);
    }
}

module.exports = {
    getVote,
    getVoteDefinition
};