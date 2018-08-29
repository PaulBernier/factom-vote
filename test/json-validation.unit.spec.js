const assert = require('chai').assert,
    { validateVoteDefinition,
        validateVote } = require('../src/validation/json-validation');


describe('Validate JSONs', function () {

    it('should validate a vote definition JSON', function () {
        const voteDef = require('./data/vote-definition.json');
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
});