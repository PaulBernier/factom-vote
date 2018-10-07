const { FactomCli } = require('factom'),
    assert = require('chai').assert,
    crypto = require('crypto'),
    participateVote = require('../src/write-vote/participate-vote');

require('dotenv').config();

const cli = new FactomCli({ host: process.env.FACTOM_HOST });

describe('Participate vote', function () {

    it('should commit vote', async function () {
        this.timeout(10000);
        const voteChainId = 'c973b2db5a4959c64606f7df7903918737f226a0ffaf93911f192582878b29eb';
        const vote = {
            vote: ['yes', 'maybe'],
            secret: crypto.randomBytes(16).toString('hex'),
            hmacAlgo: 'sha512'
        };
        const voter = { chainId: crypto.randomBytes(32), key: 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4' };

        const result = await participateVote.commitVote(cli, voteChainId, vote, voter, process.env.EC_PRIVATE_KEY);
        assert.isObject(result);
    });

    it('should reveal vote', async function () {
        this.timeout(10000);
        const voteChainId = 'c973b2db5a4959c64606f7df7903918737f226a0ffaf93911f192582878b29eb';

        const vote = {
            vote: ['yes', 'maybe'],
            secret: crypto.randomBytes(16).toString('hex'),
            hmacAlgo: 'sha512'
        };
        const voterId = crypto.randomBytes(32);

        const result = await participateVote.revealVote(cli, voteChainId, vote, voterId, process.env.EC_PRIVATE_KEY);
        assert.isObject(result);
    });

});

