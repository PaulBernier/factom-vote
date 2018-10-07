const { FactomCli } = require('factom'),
    assert = require('chai').assert,
    createVote = require('../src/write-vote/create-vote');

require('dotenv').config();

const cli = new FactomCli({ host: process.env.FACTOM_HOST });

describe('Create vote', function () {

    it('should create a vote', async function () {
        this.timeout(20000);
        const definition = JSON.parse(JSON.stringify(require('./data/vote-definition')));
        delete definition.vote.eligibleVotersChainId;
        const registrationChainId = 'a968e880ee3a7002f25ade15ae36a77c15f4dbc9d8c11fdd5fe86ba6af73a475';
        const eligibleVoters = require('./data/eligible-voters');
        const identity = { chainId: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', key: 'idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS' };
        const voteData = {
            definition, registrationChainId, eligibleVoters, identity
        };

        const result = await createVote.createVote(cli, voteData, process.env.EC_PRIVATE_KEY);
        assert.isObject(result);
        assert.isObject(result.eligibleVoters);
        assert.isObject(result.vote);
        assert.isObject(result.registration);
    });

    xit('should append eligible voters', async function () {
        this.timeout(10000);
        const identityKey = 'idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS';
        const eligibleVotersChainId = '2e51ae1d84831b04f75c51e1d352d6e186ac8aeea47bfb412749774a5dd53907';
        const eligibleVoters = require('./data/eligible-voters');

        const appendEligibleVotersData = {
            eligibleVoters, eligibleVotersChainId, identityKey
        };

        const result = await createVote.appendEligibleVoters(cli, appendEligibleVotersData, process.env.EC_PRIVATE_KEY);
        assert.isObject(result);
    });


});

