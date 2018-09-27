const { FactomCli } = require('factom');
const { createVote, appendEligibleVoters } = require('./create-vote'),
    { createVoteRegistrationChain } = require('./initialization'),
    { commitVote, revealVote } = require('./participate-vote');

class FactomVoteManager {
    constructor(arg) {
        if (arg instanceof FactomCli) {
            this.cli = arg;
        } else {
            this.cli = new FactomCli(arg);
        }
    }

    async createVoteRegistrationChain(ecAddress, nonce) {
        const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return createVoteRegistrationChain(this.cli, nonce, ecPrivateAddress);
    }

    async createVote(voteData, ecAddress) {
        const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return createVote(this.cli, voteData, ecPrivateAddress);
    }

    async appendEligibleVoters(addEligibleVotersData, ecAddress) {
        const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return appendEligibleVoters(this.cli, addEligibleVotersData, ecPrivateAddress);
    }

    async getVote() {
        // TODO
    }

    async commitVote(voteChainId, vote, voter, ecAddress) {
        const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return commitVote(this.cli, voteChainId, vote, voter, ecPrivateAddress);
    }

    async revealVote(voteChainId, vote, voterId, ecAddress) {
        const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return revealVote(this.cli, voteChainId, vote, voterId, ecPrivateAddress);
    }

}

module.exports = {
    FactomVoteManager
};
