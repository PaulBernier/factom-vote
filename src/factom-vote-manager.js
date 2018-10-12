const { FactomCli } = require('factom');
const { createVote, appendEligibleVoters } = require('./write-vote/create-vote'),
    { createVoteRegistrationChain } = require('./write-vote/initialization'),
    { commitVote, revealVote } = require('./write-vote/participate-vote'),
    { getVote } = require('./read-vote/read-vote');

class FactomVoteManager {
    constructor(arg) {
        if (arg instanceof FactomCli) {
            this.cli = arg;
        } else {
            this.cli = new FactomCli(arg);
        }
    }

    createVoteRegistrationChain(ecAddress, nonce) {
        return createVoteRegistrationChain(this.cli, nonce, ecAddress);
    }

    createVote(voteData, ecAddress) {
        return createVote(this.cli, voteData, ecAddress);
    }

    appendEligibleVoters(appendEligibleVotersData, ecAddress) {
        return appendEligibleVoters(this.cli, appendEligibleVotersData, ecAddress);
    }

    getVote(chainId) {
        return getVote(this.cli, chainId);
    }

    commitVote(voteChainId, vote, voter, ecAddress) {
        return commitVote(this.cli, voteChainId, vote, voter, ecAddress);
    }

    revealVote(voteChainId, vote, voterId, ecAddress) {
        return revealVote(this.cli, voteChainId, vote, voterId, ecAddress);
    }

}

module.exports = {
    FactomVoteManager
};
