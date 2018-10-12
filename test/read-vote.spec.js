const assert = require('chai').assert,
    sinon = require('sinon'),
    crypto = require('crypto'),
    { FactomCli, Entry } = require('factom'),
    { getVote } = require('../src/read-vote/read-vote'),
    { keyToSecretIdentityKey, getPublicIdentityKey } = require('../src/factom-identity'),
    { generateVoteChain, generateEligibleVotersChain } = require('../src/write-vote/create-vote-struct'),
    { generateVoteCommitEntry, generateVoteRevealEntry } = require('../src/write-vote/participate-vote-struct');

describe('Read vote', function () {


    it('Should parse vote', async function () {

        const initiator = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const initiatorPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(initiator.secretKey));

        const initialVoters = [{ voterId: 'ab', weight: 22 }, { voterId: 'cd' }];
        const initialVotersEntry = Entry.builder(generateEligibleVotersChain(initialVoters, initiator).firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        const voteDef = require('./data/vote-definition');

        const voteChainFirstEntry = Entry.builder(generateVoteChain(voteDef, initiator).firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        // Vote 1
        const voter1 = { id: 'ab', secretKey: crypto.randomBytes(32) };
        const voter1PublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(voter1.secretKey));

        const vote1 = {
            vote: ['yes', 'maybe'],
            secret: crypto.randomBytes(32).toString('hex'),
            hmacAlgo: 'sha512'
        }; const commitEntry1 = Entry.builder(generateVoteCommitEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote1, voter1))
            .blockContext({ directoryBlockHeight: 1111 })
            .build();
        const revealEntry1 = Entry.builder(generateVoteRevealEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote1, voter1.id))
            .blockContext({ directoryBlockHeight: 2222 })
            .build();

        // Vote 2
        const voter2 = { id: 'cd', secretKey: crypto.randomBytes(32) };
        const voter2PublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(voter2.secretKey));

        const vote2 = {
            vote: ['no'],
            secret: crypto.randomBytes(32).toString('hex'),
            hmacAlgo: 'sha512'
        };
        const commitEntry2 = Entry.builder(generateVoteCommitEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote2, voter2))
            .blockContext({ directoryBlockHeight: 1119 })
            .build();
        const revealEntry2 = Entry.builder(generateVoteRevealEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote2, voter2.id))
            .blockContext({ directoryBlockHeight: 2229 })
            .build();

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('rewindChainWhile')
            .once()
            .withArgs('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679')
            .onFirstCall()
            .callsFake(async function (chainId, condition, f) {
                await f(revealEntry2);
                await f(revealEntry1);
                await f(commitEntry2);
                await f(commitEntry1);
                await f(voteChainFirstEntry);
            });
        mock.expects('getAllEntriesOfChain')
            .once()
            .returns(Promise.resolve([initialVotersEntry]));
        expectIdentityKeysAtHeightCall(mock, initiator, 1, initiatorPublicIdentityKey, 2);
        expectIdentityKeysAtHeightCall(mock, voter1, 1111, voter1PublicIdentityKey);
        expectIdentityKeysAtHeightCall(mock, voter2, 1119, voter2PublicIdentityKey);

        const { vote, result } = await getVote(cli, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679');
        mock.verify();

        assert.isObject(vote);
        assert.isObject(result);

    });

    function expectIdentityKeysAtHeightCall(mock, identity, height, key, exactly) {
        mock.expects('walletdApi')
            .exactly(exactly || 1)
            .withArgs('identity-keys-at-height', {
                chainid: identity.id.toString('hex'),
                height: height
            })
            .returns(Promise.resolve({ keys: [key] }));
    }
});