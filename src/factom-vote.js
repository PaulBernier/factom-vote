const { FactomVoteManager } = require('./factom-vote-manager');

module.exports = Object.assign(
    {
        FactomVoteManager
    },
    require('./factom-vote-struct')
);