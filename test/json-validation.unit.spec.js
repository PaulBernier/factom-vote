const { validateVoteDefinition,
    validateVote,
    validateEligibleVoters,
    validateCreateVoteData } = require('../src/validation/json-validation');


describe('Validate JSONs', function () {

    it('should validate a complete vote definition JSON with text', function () {
        const definition = require('./data/vote-definition.json');
        const createVoteData = {
            definition,
            eligibleVoters: [],
            registrationChainId: '26ebf2960ec150366a8a0d2fd855d94aa350985ccd2c3750204b4fe58296598c',
            identity: {
                chainId: '92bdd7c5cbe7c1e6112d62ab8bea87cecb63457940e500229a29f3677feb28a9',
                key: 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz',
                sign: () => 'signed'
            }
        };
        if (!validateCreateVoteData(createVoteData)) {
            throw new Error(JSON.stringify(validateCreateVoteData.errors, null, 4));
        }
    });

    it('should validate a complete vote definition JSON with text', function () {
        const voteDef = require('./data/vote-definition.json');
        if (!validateVoteDefinition(voteDef)) {
            throw new Error(JSON.stringify(validateVoteDefinition.errors, null, 4));
        }
    });

    it('should validate a complete vote definition JSON with href', function () {
        const voteDef = require('./data/vote-definition.2.json');
        if (!validateVoteDefinition(voteDef)) {
            throw new Error(JSON.stringify(validateVoteDefinition.errors, null, 4));
        }
    });

    it('should validate a minimal vote definition JSON', function () {
        const voteDef = require('./data/vote-definition-minimal.json');
        if (!validateVoteDefinition(voteDef)) {
            throw new Error(JSON.stringify(validateVoteDefinition.errors, null, 4));
        }
    });

    it('should validate a vote JSON', function () {
        const vote = require('./data/vote.json');
        if (!validateVote(vote)) {
            throw new Error(JSON.stringify(validateVote.errors, null, 4));
        }
    });

    it('should validate an abstention vote JSON', function () {
        const vote = require('./data/vote-abstention.json');
        if (!validateVote(vote)) {
            throw new Error(JSON.stringify(validateVote.errors, null, 4));
        }
    });

    it('should validate an eligible voters JSON', function () {
        const eligibleVoters = require('./data/eligible-voters.json');
        if (!validateEligibleVoters(eligibleVoters)) {
            throw new Error(JSON.stringify(validateEligibleVoters.errors, null, 4));
        }
    });
});