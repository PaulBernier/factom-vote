const { FactomCli } = require('factom');
const { createVote, appendEligibleVoters } = require('./write-vote/create-vote'),
    { walletdIdentityPublicKeysResolver,
        walletdIdentityPrivateKeyResolver } = require('./factom-identity'),
    { createVoteRegistrationChain } = require('./write-vote/initialization'),
    { commitVote, revealVote } = require('./write-vote/participate-vote'),
    { getVote } = require('./read-vote/read-vote');

class FactomVoteManager {
    constructor(arg, identityResolvers) {
        if (arg instanceof FactomCli) {
            this.cli = arg;
        } else {
            this.cli = new FactomCli(arg);
        }
        this.identityResolvers = {};
        const resolvers = typeof identityResolvers === 'object' ? identityResolvers : {};
        this.identityResolvers.publicKeysResolver = resolvers.publicKeysResolver || walletdIdentityPublicKeysResolver.bind(null, this.cli);
        this.identityResolvers.privateKeyResolver = resolvers.privateKeyResolver || walletdIdentityPrivateKeyResolver.bind(null, this.cli);
    }

    async verifyConnections() {
        try {
            await this.cli.factomdApi('properties');
        } catch (e) {
            throw new Error(`Failed to connect to factomd: ${e.message}`);
        }
        try {
            await this.cli.walletdApi('properties');
        } catch (e) {
            throw new Error(`Failed to connect to walletd: ${e.message}`);
        }
    }

    createVoteRegistrationChain(ecAddress, nonce) {
        return createVoteRegistrationChain(this.cli, nonce, ecAddress);
    }

    createVote(voteData, ecAddress, skipValidation) {
        return createVote(this.cli, this.identityResolvers, voteData, ecAddress, skipValidation);
    }

    appendEligibleVoters(appendEligibleVotersData, ecAddress, skipValidation) {
        return appendEligibleVoters(this.cli, this.identityResolvers.privateKeyResolver, appendEligibleVotersData, ecAddress, skipValidation);
    }

    getVote(chainId) {
        return getVote(this.cli, this.identityResolvers.publicKeysResolver, chainId);
    }

    commitVote(voteChainId, vote, voter, ecAddress, skipValidation) {
        return commitVote(this.cli, this.identityResolvers, voteChainId, vote, voter, ecAddress, skipValidation);
    }

    revealVote(voteChainId, vote, voterId, ecAddress, skipValidation) {
        return revealVote(this.cli, this.identityResolvers.publicKeysResolver, voteChainId, vote, voterId, ecAddress, skipValidation);
    }

}

module.exports = {
    FactomVoteManager
};
