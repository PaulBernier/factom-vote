const assert = require('chai').assert,
    { validateVoteDefinition } = require('../src/validation/json-validation');


describe('Validate JSONs', function () {

    it('should validate vote definition JSON', function () {
        const vote = require('./data/vote-definition.json');
        if (!validateVoteDefinition(vote)) {
            throw new Error(JSON.stringify(validateVoteDefinition.errors, null, 4));
        }
    });

});