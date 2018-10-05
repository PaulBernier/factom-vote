const { FactomCli } = require('factom'),
    assert = require('chai').assert,
    crypto = require('crypto'),
    createVote = require('../src/write-vote/create-vote');

require('dotenv').config();

const cli = new FactomCli({ host: process.env.FACTOM_HOST });

describe('Create vote', function () {

    it('should create a vote', async function () {
        this.timeout(20000);
        const definition = require('./data/vote-definition');
        const registrationChainId = 'a968e880ee3a7002f25ade15ae36a77c15f4dbc9d8c11fdd5fe86ba6af73a475';
        const eligibleVoters = require('./data/eligible-voters');
        const initiator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: crypto.randomBytes(32) };
        const voteData = {
            definition, registrationChainId, eligibleVoters, initiator
        };

        const result = await createVote.createVote(cli, voteData, process.env.EC_PRIVATE_KEY);
        assert.isObject(result);
        assert.isObject(result.eligibleVoters);
        assert.isObject(result.vote);
        assert.isObject(result.registration);
    });

    xit('should append eligible voters', async function () {
        this.timeout(10000);
        const initiatorSecretKey = '5ac48e36b6f5884a8a8ef64d11734ff5c07e428593015d387f3284453cda3739';
        const eligibleVotersChainId = '2e51ae1d84831b04f75c51e1d352d6e186ac8aeea47bfb412749774a5dd53907';
        const eligibleVoters = require('./data/eligible-voters');

        const appendEligibleVotersData = {
            eligibleVoters, eligibleVotersChainId, initiatorSecretKey
        };

        const result = await createVote.appendEligibleVoters(cli, appendEligibleVotersData, process.env.EC_PRIVATE_KEY);
        assert.isObject(result);
    });


});

