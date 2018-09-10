const Ajv = require('ajv');
const ajv = new Ajv({ $data: true, allErrors: true });

ajv.addSchema(require('./vote-definition/proposal-schema.json'))
    .addSchema(require('./vote-definition/vote-schema.json'));

const validateVoteDefinition = ajv.compile(require('./vote-definition/schema.json'));
const validateVote = ajv.compile(require('./vote/schema.json'));
const validateParticipants = ajv.compile(require('./participants/schema.json'));

module.exports = {
    validateVoteDefinition,
    validateVote,
    validateParticipants
};