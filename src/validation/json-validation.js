const Ajv = require('ajv');
const ajv = new Ajv({ $data: true, allErrors: true });

ajv.addSchema(require('./vote-definition/proposal-schema.json'))
    .addSchema(require('./vote-definition/vote-schema.json'));

const validateVoteDefinition = ajv.compile(require('./vote-definition/schema.json'));
const validateVote = ajv.compile(require('./vote/schema.json'));
const validateEligibleVoters = ajv.compile(require('./eligible-voters/schema.json'));
const validateCreateVoteData = ajv.compile(require('./create-vote-data-schema.json'));

module.exports = {
    validateVoteDefinition,
    validateVote,
    validateEligibleVoters,
    validateCreateVoteData
};