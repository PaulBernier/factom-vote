const { generateVoteRegistrationChain } = require('./initialization-struct');

function createVoteRegistrationChain(cli, nonce, ecPrivateAddress) {
    const chain = generateVoteRegistrationChain(nonce);
    return cli.add(chain, ecPrivateAddress);
}

module.exports = {
    createVoteRegistrationChain
};