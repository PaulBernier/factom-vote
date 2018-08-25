const { FactomCli } = require('factom');
const { createVote, appendParticipants } = require('./create-vote'),
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
        // TODO
        // const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return createVoteRegistrationChain(this.cli, nonce, ecAddress);
    }

    async createVote(voteData, ecAddress) {
        // TODO
        // const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return createVote(this.cli, voteData, ecAddress);
    }

    async appendParticipants(addParticipantsData, ecAddress) {
        // TODO
        // const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return appendParticipants(this.cli, addParticipantsData, ecAddress);
    }

    async removeParticipants(participantsChainId, participants) {
        // ?
    }

    async getVote(voteChainId) {

    }

    async commitVote(vote, voter, ecAddress) {
        // TODO
        // const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return commitVote(this.cli, vote, voter, ecAddress);
    }

    async revealVote(vote, voter, ecAddress) {
        // TODO
        // const ecPrivateAddress = await this.cli.getPrivateAddress(ecAddress);
        return revealVote(this.cli, vote, voter, ecAddress);
    }

}

module.exports = {
    FactomVoteManager
};
