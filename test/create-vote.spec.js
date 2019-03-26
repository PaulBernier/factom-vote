const { FactomCli } = require('factom'),
    assert = require('chai').assert,
    createVote = require('../src/write-vote/create-vote'),
    {
        walletdIdentityPublicKeysResolver,
        walletdIdentityPrivateKeyResolver
    } = require('../src/factom-identity');

require('dotenv').config();

const cli = new FactomCli({ host: process.env.FACTOM_HOST });

describe('Create vote', function() {
    xit('should create a vote', async function() {
        this.timeout(20000);

        const registrationChainId =
            'a968e880ee3a7002f25ade15ae36a77c15f4dbc9d8c11fdd5fe86ba6af73a475';
        const definition = await getVoteDefinition();
        const eligibleVoters = require('./data/eligible-voters');
        const identity = {
            chainId: 'af76482ef7d428f181be3751a5f69e1d7d74e5ff8ff073ee527f6a5df82dfe9f',
            key: 'idsec1b4oatYvrCaaUwp8tNCBqFf7WgSfhYRofHeekeVCdDwUt5Mtxn'
        };
        const voteData = {
            definition,
            registrationChainId,
            eligibleVoters,
            identity
        };

        const resolvers = {
            publicKeysResolver: walletdIdentityPublicKeysResolver.bind(null, cli),
            privateKeyResolver: walletdIdentityPrivateKeyResolver.bind(null, cli)
        };

        const result = await createVote.createVote(
            cli,
            resolvers,
            voteData,
            process.env.EC_PRIVATE_KEY
        );
        assert.isObject(result);
        assert.isObject(result.eligibleVoters);
        assert.isObject(result.vote);
        assert.isObject(result.registration);
    });

    async function getVoteDefinition() {
        const definition = JSON.parse(JSON.stringify(require('./data/vote-definition')));
        delete definition.vote.eligibleVotersChainId;
        const currentHeight = await cli.getHeights().then(h => h.leaderHeight);

        definition.vote.phasesBlockHeights = {
            commitStart: currentHeight + 10,
            commitEnd: currentHeight + 20,
            revealEnd: currentHeight + 40
        };

        return definition;
    }

    xit('should append eligible voters', async function() {
        this.timeout(10000);
        const identityKey = 'idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS';
        const eligibleVotersChainId =
            '2e51ae1d84831b04f75c51e1d352d6e186ac8aeea47bfb412749774a5dd53907';
        const eligibleVoters = require('./data/eligible-voters');

        const appendEligibleVotersData = {
            eligibleVoters,
            eligibleVotersChainId,
            identityKey
        };

        const result = await createVote.appendEligibleVoters(
            cli,
            appendEligibleVotersData,
            process.env.EC_PRIVATE_KEY
        );
        assert.isObject(result);
    });
});
