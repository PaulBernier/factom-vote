const assert = require('chai').assert,
    sinon = require('sinon'),
    crypto = require('crypto'),
    { FactomCli, Entry } = require('factom'),
    { keyToSecretIdentityKey, getPublicIdentityKey, walletdIdentityPublicKeysResolver } = require('../src/factom-identity'),
    { parseVote, parseVoteChain, parseVoteChainEntry, parseEligibleVotersChain } = require('../src/read-vote/parse-vote'),
    { generateVoteChain, generateEligibleVotersChain, generateAppendEligibleVotersEntry } = require('../src/write-vote/create-vote-struct'),
    { generateVoteCommitEntry, generateVoteRevealEntry } = require('../src/write-vote/participate-vote-struct');

describe('Parse vote', function () {

    it('Should parse eligible voters chain', async function () {

        const initiator = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const initiatorPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(initiator.secretKey));
        const initialVoters = [{ voterId: 'ID_1', weight: 22 }, { voterId: 'ID_2' }];
        const appendVoters = [{ voterId: 'ID_1', weight: 0 }, { voterId: 'ID_3' }];

        const firstEntry = Entry.builder(generateEligibleVotersChain(initialVoters, initiator).firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        const appendEntry = Entry.builder(generateAppendEligibleVotersEntry(appendVoters, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', initiator.secretKey))
            .blockContext({ directoryBlockHeight: 2 })
            .build();
        const invalidEntry = Entry.builder()
            .chainId('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679')
            .content('random', 'utf8')
            .build();

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('getAllEntriesOfChain')
            .once()
            .withArgs('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679')
            .returns(Promise.resolve([firstEntry, invalidEntry, appendEntry]));
        mock.expects('getHeights').never();
        expectIdentityKeysAtHeightCall(mock, initiator, 1, initiatorPublicIdentityKey);
        expectIdentityKeysAtHeightCall(mock, initiator, 2, initiatorPublicIdentityKey);
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        const { eligibleVotersRegitrations, parseErrors } = await parseEligibleVotersChain(cli, publicKeysResolver, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679');

        mock.verify();
        assert.lengthOf(eligibleVotersRegitrations, 2);
        assert.lengthOf(parseErrors, 1);
        const registration1 = eligibleVotersRegitrations[0];
        assert.equal(registration1.type, 'initial-eligible-voters');
        assert.equal(registration1.identity, initiator.id.toString('hex'));
        assert.equal(registration1.blockContext.directoryBlockHeight, 1);
        assert.deepEqual(registration1.data, initialVoters);
        const registration2 = eligibleVotersRegitrations[1];
        assert.equal(registration2.type, 'append-eligible-voters');
        assert.deepEqual(registration2.data, appendVoters);
        assert.equal(registration2.blockContext.directoryBlockHeight, 2);
    });

    it('Should skip replayed entries', async function () {

        const initiator = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const initiatorPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(initiator.secretKey));
        const initialVoters = [{ voterId: 'ID_1', weight: 22 }, { voterId: 'ID_2' }];
        const appendVoters = [{ voterId: 'ID_1', weight: 0 }, { voterId: 'ID_3' }];

        const firstEntry = Entry.builder(generateEligibleVotersChain(initialVoters, initiator).firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        const appendEntry = Entry.builder(generateAppendEligibleVotersEntry(appendVoters, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', initiator.secretKey))
            .blockContext({ directoryBlockHeight: 2 })
            .build();
        const duplicateEntry = Entry.builder(appendEntry)
            .blockContext({ directoryBlockHeight: 3 })
            .build();

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('getAllEntriesOfChain')
            .once()
            .withArgs('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679')
            .returns(Promise.resolve([firstEntry, appendEntry, duplicateEntry]));
        mock.expects('getHeights').never();
        expectIdentityKeysAtHeightCall(mock, initiator, 1, initiatorPublicIdentityKey);
        expectIdentityKeysAtHeightCall(mock, initiator, 2, initiatorPublicIdentityKey);
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        const { eligibleVotersRegitrations, parseErrors } = await parseEligibleVotersChain(cli, publicKeysResolver, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679');

        mock.verify();
        assert.lengthOf(eligibleVotersRegitrations, 2);
        assert.lengthOf(parseErrors, 1);
        assert.equal(eligibleVotersRegitrations[1].blockContext.directoryBlockHeight, 2);
        assert.equal(parseErrors[0].error, 'Replayed entry');

    });

    it('Should parse vote definition entry', async function () {
        const initiator = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const initiatorPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(initiator.secretKey));
        const vote = require('./data/vote-definition');
        const entry = Entry.builder(generateVoteChain(vote, initiator).firstEntry)
            .blockContext({ directoryBlockHeight: 11 })
            .build();

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('getHeights').never();
        expectIdentityKeysAtHeightCall(mock, initiator, 11, initiatorPublicIdentityKey);
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        const parsed = await parseVoteChainEntry(publicKeysResolver, entry);

        mock.verify();
        assert.equal(parsed.type, 'definition');
        assert.equal(parsed.identity, initiator.id.toString('hex'));
        assert.deepEqual(parsed.data, vote);
        assert.equal(parsed.blockContext.directoryBlockHeight, 11);

    });

    it('Should parse vote commit entry', async function () {

        const voter = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const voterPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(voter.secretKey));
        const vote = require('./data/vote.json');
        const entry = Entry.builder(generateVoteCommitEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote, voter))
            .blockContext({ directoryBlockHeight: 2 })
            .build();

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('getHeights').never();
        expectIdentityKeysAtHeightCall(mock, voter, 2, voterPublicIdentityKey);
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        const parsed = await parseVoteChainEntry(publicKeysResolver, entry);

        assert.equal(parsed.type, 'commit');
        assert.equal(parsed.identity, voter.id.toString('hex'));
        assert.equal(parsed.data, JSON.parse(entry.content.toString()).commitment);
        assert.equal(parsed.blockContext.directoryBlockHeight, 2);

    });

    it('Should parse vote reveal entry', async function () {
        const voterId = crypto.randomBytes(32);
        const vote = require('./data/vote.json');
        const entry = Entry.builder(generateVoteRevealEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote, voterId))
            .blockContext({ directoryBlockHeight: 7 })
            .build();

        const parsed = parseVoteChainEntry(null, entry);

        assert.equal(parsed.type, 'reveal');
        assert.equal(parsed.identity, voterId.toString('hex'));
        assert.deepEqual(parsed.data, JSON.parse(entry.content.toString()));
        assert.equal(parsed.blockContext.directoryBlockHeight, 7);
    });

    it('Should parse vote chain', async function () {
        const initiator = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const initiatorPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(initiator.secretKey));

        const voteDef = require('./data/vote-definition');
        const voteChainFirstEntry = Entry.builder(generateVoteChain(voteDef, initiator).firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        const voter = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const voterPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(voter.secretKey));

        const vote = require('./data/vote.json');
        const commitEntry = Entry.builder(generateVoteCommitEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote, voter))
            .blockContext({ directoryBlockHeight: 2 })
            .build();
        const revealEntry = Entry.builder(generateVoteRevealEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote, voter.id))
            .blockContext({ directoryBlockHeight: 7 })
            .build();
        const invalidEntry = Entry.builder()
            .chainId('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679')
            .content('Hello', 'utf8')
            .build();

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('rewindChainWhile')
            .once()
            .withArgs('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679')
            .onFirstCall()
            .callsFake(async function (chainId, condition, f) {
                await f(revealEntry);
                await f(invalidEntry);
                await f(commitEntry);
                await f(voteChainFirstEntry);
            });
        mock.expects('getHeights').never();
        expectIdentityKeysAtHeightCall(mock, voter, 2, voterPublicIdentityKey);
        expectIdentityKeysAtHeightCall(mock, initiator, 1, initiatorPublicIdentityKey);
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        const { definition,
            commits,
            reveals,
            parseErrors } = await parseVoteChain(cli, publicKeysResolver, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679');
        mock.verify();

        // Definition
        assert.equal(definition.type, 'definition');
        assert.equal(definition.identity, initiator.id.toString('hex'));
        assert.deepEqual(definition.data, voteDef);
        assert.equal(definition.blockContext.directoryBlockHeight, 1);

        // Commit
        assert.lengthOf(commits, 1);
        assert.equal(commits[0].type, 'commit');
        assert.equal(commits[0].identity, voter.id.toString('hex'));
        assert.equal(commits[0].data, JSON.parse(commitEntry.content.toString()).commitment);
        assert.equal(commits[0].blockContext.directoryBlockHeight, 2);

        // Reveal
        assert.lengthOf(reveals, 1);
        assert.equal(reveals[0].type, 'reveal');
        assert.equal(reveals[0].identity, voter.id.toString('hex'));
        assert.deepEqual(reveals[0].data, JSON.parse(revealEntry.content.toString()));
        assert.equal(reveals[0].blockContext.directoryBlockHeight, 7);

        // Parse errors
        assert.lengthOf(parseErrors, 1);

    });

    it('Should parse vote', async function () {

        const initiator = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const initiatorPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(initiator.secretKey));

        const initialVoters = [{ voterId: 'ID_1', weight: 22 }, { voterId: 'ID_2' }];
        const initialVotersEntry = Entry.builder(generateEligibleVotersChain(initialVoters, initiator).firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        const voteDef = require('./data/vote-definition');

        const voteChainFirstEntry = Entry.builder(generateVoteChain(voteDef, initiator).firstEntry)
            .blockContext({ directoryBlockHeight: 1 })
            .build();

        const voter = { id: crypto.randomBytes(32), secretKey: crypto.randomBytes(32) };
        const voterPublicIdentityKey = getPublicIdentityKey(keyToSecretIdentityKey(voter.secretKey));

        const vote = require('./data/vote.json');
        const commitEntry = Entry.builder(generateVoteCommitEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote, voter))
            .blockContext({ directoryBlockHeight: 2 })
            .build();
        const revealEntry = Entry.builder(generateVoteRevealEntry('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679', vote, voter.id))
            .blockContext({ directoryBlockHeight: 7 })
            .build();

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('rewindChainWhile')
            .once()
            .withArgs('7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679')
            .onFirstCall()
            .callsFake(async function (chainId, condition, f) {
                await f(revealEntry);
                await f(commitEntry);
                await f(voteChainFirstEntry);
            });
        mock.expects('getAllEntriesOfChain')
            .once()
            .returns(Promise.resolve([initialVotersEntry]));
        mock.expects('getHeights').never();
        expectIdentityKeysAtHeightCall(mock, voter, 2, voterPublicIdentityKey);
        expectIdentityKeysAtHeightCall(mock, initiator, 1, initiatorPublicIdentityKey, 2);
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        const { definition, commits, reveals, eligibleVotersRegitrations } = await parseVote(cli, publicKeysResolver, '7b11a72cd69d3083e4d20137bb569423923a55696017b36f46222e9f83964679');

        mock.verify();
        assert.deepEqual(definition.data, voteDef);
        assert.lengthOf(commits, 1);
        assert.lengthOf(reveals, 1);
        assert.lengthOf(eligibleVotersRegitrations, 1);

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