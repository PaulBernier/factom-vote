const { processParsedVote } = require('./process-vote'),
    { parseVote } = require('./parse-vote'),
    { computeResult } = require('./compute-vote-result');

async function getVote(cli, chainId) {
    const parsedVote = await parseVote(cli, chainId);
    const vote = processParsedVote(parsedVote);
    const result = computeResult(vote);

    return {
        vote, result
    };
}

module.exports = {
    getVote
};