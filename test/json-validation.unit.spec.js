const { validateVoteDefinition, validateVote, validateParticipants } = require('../src/validation/json-validation');


describe('Validate JSONs', function () {

    it('should validate a complete vote definition JSON', function () {
        const voteDef = require('./data/vote-definition.json');
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

    it('should validate a participants JSON', function () {
        const participants = require('./data/vote-participants.json');
        if (!validateParticipants(participants)) {
            throw new Error(JSON.stringify(validateParticipants.errors, null, 4));
        }
    });
});