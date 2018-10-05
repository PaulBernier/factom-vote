const assert = require('chai').assert,
    sinon = require('sinon'),
    crypto = require('crypto'),
    { FactomCli, Entry } = require('factom'),
    { getVote } = require('../src/read-vote/read-vote'),
    { generateVoteChain, generateEligibleVotersChain } = require('../src/write-vote/create-vote-struct'),
    { generateVoteCommitEntry, generateVoteRevealEntry } = require('../src/write-vote/participate-vote-struct');

describe('Read vote', function () {


    it('Should parse vote', async function () {

        const initiator = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
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
            .callsFake(function (chainId, condition, f) {
                f(revealEntry2);
                f(revealEntry1);
                f(commitEntry2);
                f(commitEntry1);
                f(voteChainFirstEntry);
            });
        mock.expects('getAllEntriesOfChain')
            .once()
            .returns(Promise.resolve([initialVotersEntry]));

        const { vote, result } = await getVote(cli, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679');
        mock.verify();

        assert.isObject(vote);
        assert.isObject(result);

    });
});