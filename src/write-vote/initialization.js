const { generateVoteRegistrationChain } = require('./initialization-struct');

async function createVoteRegistrationChain(cli, nonce, ecAddress) {
    const chain = generateVoteRegistrationChain(nonce);
    return cli.add(chain, ecAddress);
}

module.exports = {
    createVoteRegistrationChain
};