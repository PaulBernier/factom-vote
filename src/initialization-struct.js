const { Chain } = require('factom/src/chain'),
    { Entry } = require('factom/src/entry'),
    nacl = require('tweetnacl/nacl-fast');

function generateVoteRegistrationChain(n) {
    const nonce = n ? Buffer.from(n, 'hex') : nacl.randomBytes(32);
    const entry = Entry.builder()
        .extId('factom-vote-registration', 'utf8')
        .extId(nonce)
        .content('This is the Factom Vote Registration Chain. It holds pointers to the individual vote chains.', 'utf8')
        .build();

    return new Chain(entry);
}

module.exports = {
    generateVoteRegistrationChain
};