const assert = require('chai').assert,
    sinon = require('sinon'),
    crypto = require('crypto'),
    { FactomCli, Entry } = require('factom'),
    { getVote } = require('../src/read-vote/read-vote'),
    { keyToSecretIdentityKey, getPublicIdentityKey, walletdIdentityPublicKeysResolver } = require('../src/factom-identity'),
    { generateVoteChain, generateEligibleVotersChain } = require('../src/write-vote/create-vote-struct'),
    { generateVoteCommitEntry, generateVoteRevealEntry } = require('../src/write-vote/participate-vote-struct');

describe('Read vote', function () {


    it('Should parse vote', async function () {

        const initiator = {
            id: crypto.randomBytes(32),
            publicKey: '310df171d50ad46f0f5c115520b0fcde4522801de4732589df14b42d5f980818',
            secretKey: 'd1011e7b33b3bb18c184730530a6b1977ce3ed3c3b66677a276bf326116a885b'
        };
        const initiatorPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(initiator.secretKey));

        const initialVoters = [{ voterId: 'ab', weight: 22 }, { voterId: 'cd' }];
        const votersChain = await generateEligibleVotersChain(initialVoters, initiator);
        const initialVotersEntry = Entry.builder(votersChain.firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        const voteDef = require('./data/vote-definition');

        const voteChain = await generateVoteChain(voteDef, initiator);
        const voteChainFirstEntry = Entry.builder(voteChain.firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        // Vote 1
        const voter1 = {
            id: 'ab',
            publicKey: 'bea0ba0061046926a18a0811ad7a90c356a9ec4a96ed087abb364dba12dd5525',
            secretKey: '8514257f1c373550199aa981ff07abd3ecd29a091ed1930eccebd161d54e9642'
        };
        const voter1PublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(voter1.secretKey));

        const vote1 = {
            vote: ['yes', 'maybe'],
            secret: crypto.randomBytes(32).toString('hex'),
            hmacAlgo: 'sha512'
        }; const commitEntry1 = Entry.builder(await generateVoteCommitEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote1, voter1))
            .blockContext({ directoryBlockHeight: 1111 })
            .build();
        const revealEntry1 = Entry.builder(generateVoteRevealEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote1, voter1.id))
            .blockContext({ directoryBlockHeight: 2222 })
            .build();

        // Vote 2
        const voter2 = {
            id: 'cd',
            publicKey: '88f820018f99800ca67206cc29d5da38860bbb0bcf5d18b9e1cf14a8209a1d49',
            secretKey: '1b8f7a86d7e7bcb25839da496ce8c5ade5c08a830f63c85a1cc4ad75ab82cbd2'
        };
        const voter2PublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(voter2.secretKey));

        const vote2 = {
            vote: ['no'],
            secret: crypto.randomBytes(32).toString('hex'),
            hmacAlgo: 'sha512'
        };
        const commitEntry2 = Entry.builder(await generateVoteCommitEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote2, voter2))
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
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        const { vote, result } = await getVote(cli, publicKeysResolver, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679');
        mock.verify();

        assert.isObject(vote);
        assert.isObject(result);

    });

    function expectIdentityKeysAtHeightCall(mock, identity, height, key, exactly) {
        mock.expects('walletdApi')
            .exactly(exactly || 1)
            .withArgs('active-identity-keys', {
                chainid: identity.id.toString('hex'),
                height: height
            })
            .returns(Promise.resolve({ keys: [key] }));
    }
});