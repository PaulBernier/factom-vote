const { Entry, Chain } = require('factom');
const nacl = require('tweetnacl/nacl-fast');

function generateVoteRegistrationChain(n) {
    const nonce = n ? Buffer.from(n, 'hex') : nacl.randomBytes(32);
    const entry = Entry.builder()
        .extId('Factom Vote Registration Chain', 'utf8')
        .extId(nonce)
        .content('This is the Factom Vote Registration Chain. It holds pointers to the individual vote chains.', 'utf8')
        .build();

    return new Chain(entry);
}

/////////////////////////////

function createVoteRegistrationChain(cli, nonce, ecPrivateAddress) {
    const chain = generateVoteRegistrationChain(nonce);
    return cli.add(chain, ecPrivateAddress);
}

module.exports = {
    generateVoteRegistrationChain,
    createVoteRegistrationChain
};