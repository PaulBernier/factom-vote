const { FactomCli, Entry } = require('factom'),
    sinon = require('sinon'),
    crypto = require('crypto'),
    { keyToPublicIdentityKey, walletdIdentityPublicKeysResolver, walletdIdentityPrivateKeyResolver } = require('../src/factom-identity'),
    participateVote = require('../src/write-vote/participate-vote'),
    { generateVoteChain } = require('../src/write-vote/create-vote-struct');

require('dotenv').config();


describe('Participate vote', function () {

    it('should commit vote', async function () {
        const voteChainId = 'c973b2db5a4959c64606f7df7903918737f226a0ffaf93911f192582878b29eb';
        const vote = {
            vote: ['yes', 'no'],
            secret: crypto.randomBytes(16).toString('hex'),
            hmacAlgo: 'sha512'
        };
        const voter = { chainId: '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', key: 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4' };

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        const definition = require('./data/vote-definition');
        const initiator = {
            id: crypto.randomBytes(32),
            publicKey: '310df171d50ad46f0f5c115520b0fcde4522801de4732589df14b42d5f980818',
            secretKey: 'd1011e7b33b3bb18c184730530a6b1977ce3ed3c3b66677a276bf326116a885b'
        };
        const initiatorPublicIdentityKey = keyToPublicIdentityKey(initiator.publicKey);

        const firstEntry = Entry.builder((await generateVoteChain(definition, initiator)).firstEntry)
            .blockContext({ directoryBlockHeight: 700 })
            .build();

        mock.expects('getFirstEntry')
            .withArgs(voteChainId)
            .returns(Promise.resolve(firstEntry));
        mock.expects('getHeights')
            .once()
            .returns(Promise.resolve({ leaderHeight: 1050 }));
        mock.expects('getBalance')
            .once()
            .withArgs(process.env.EC_PRIVATE_KEY)
            .returns(Promise.resolve(1));
        mock.expects('walletdApi')
            .once()
            .withArgs('active-identity-keys', {
                chainid: initiator.id.toString('hex'),
                height: 700
            })
            .returns(Promise.resolve({ keys: [initiatorPublicIdentityKey] }));
        mock.expects('walletdApi')
            .once()
            .withArgs('active-identity-keys', {
                chainid: voter.chainId,
                height: undefined
            })
            .returns(Promise.resolve({ keys: ['idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz'] }));
        mock.expects('add')
            .once();
        const resolvers = {
            publicKeysResolver: walletdIdentityPublicKeysResolver.bind(null, cli),
            privateKeyResolver: walletdIdentityPrivateKeyResolver.bind(null, cli)
        };

        await participateVote.commitVote(cli, resolvers, voteChainId, vote, voter, process.env.EC_PRIVATE_KEY);

        mock.verify();
    });


    it('should reveal vote', async function () {
        const voteChainId = 'c973b2db5a4959c64606f7df7903918737f226a0ffaf93911f192582878b29eb';

        const vote = {
            vote: ['yes', 'maybe'],
            secret: crypto.randomBytes(16).toString('hex'),
            hmacAlgo: 'sha512'
        };
        const voterId = crypto.randomBytes(32);

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        const definition = require('./data/vote-definition');
        const initiator = {
            id: crypto.randomBytes(32), publicKey: '310df171d50ad46f0f5c115520b0fcde4522801de4732589df14b42d5f980818',
            secretKey: 'd1011e7b33b3bb18c184730530a6b1977ce3ed3c3b66677a276bf326116a885b'
        };
        const initiatorPublicIdentityKey = keyToPublicIdentityKey(initiator.publicKey);

        const firstEntry = Entry.builder((await generateVoteChain(definition, initiator)).firstEntry)
            .blockContext({ directoryBlockHeight: 700 })
            .build();
        mock.expects('getFirstEntry')
            .withArgs(voteChainId)
            .returns(Promise.resolve(firstEntry));
        mock.expects('getHeights')
            .once()
            .returns(Promise.resolve({ leaderHeight: 2500 }));
        mock.expects('getBalance')
            .once()
            .withArgs(process.env.EC_PRIVATE_KEY)
            .returns(Promise.resolve(1));
        mock.expects('walletdApi')
            .once()
            .withArgs('active-identity-keys', {
                chainid: initiator.id.toString('hex'),
                height: 700
            })
            .returns(Promise.resolve({ keys: [initiatorPublicIdentityKey] }));

        mock.expects('add')
            .once();
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        await participateVote.revealVote(cli, publicKeysResolver, voteChainId, vote, voterId, process.env.EC_PRIVATE_KEY);

        mock.verify();
    });

});

