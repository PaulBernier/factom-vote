const assert = require('chai').assert,
    crypto = require('crypto'),
    { Chain } = require('factom/src/chain'),
    { Entry } = require('factom/src/entry'),
    sign = require('tweetnacl/nacl-fast').sign,
    createVote = require('../src/write-vote/create-vote-struct');

const EC_PRIVATE_ADDRESS = 'Es32PjobTxPTd73dohEFRegMFRLv3X5WZ4FXEwNN8kE2pMDfeMym';

describe('Create vote structures', function () {

    it('should generate vote chain', async function () {
        const vote = require('./data/vote-definition.json');
        const initiator = {
            id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2',
            publicKey: '310df171d50ad46f0f5c115520b0fcde4522801de4732589df14b42d5f980818',
            secretKey: 'd1011e7b33b3bb18c184730530a6b1977ce3ed3c3b66677a276bf326116a885b'
        };
        const chain = await createVote.generateVoteChain(vote, initiator, EC_PRIVATE_ADDRESS);

        assert.instanceOf(chain, Chain);
        const entry = chain.firstEntry;
        assert.lengthOf(entry.extIds, 5);
        assert.equal(entry.extIds[0].toString('utf8'), 'factom-vote');
        assert.equal(entry.extIds[1].toString('hex'), '00');
        assert.equal(entry.extIds[2].toString('hex'), initiator.id);
        const publicKey = sign.keyPair.fromSeed(Buffer.from(initiator.secretKey, 'hex')).publicKey;
        assert.deepEqual(entry.extIds[3], publicKey);
        const dataSigned = crypto.createHash('sha512').update(entry.content).digest();
        assert.isTrue(sign.detached.verify(dataSigned, entry.extIds[4], entry.extIds[3]));
        assert.deepEqual(JSON.parse(entry.content.toString()), vote);
    });

    it('should generate vote registration entry', function () {
        const registrationChainId = '710cba73598b40b6c8edf2c02b4c1eb26656d1c8a2d84b1025b59c5740fe1cf4';
        const voteChainId = '0c30248965533634ad7565cab88f63bb152c3a36775d7ae6359db649c515cabc';
        const entry = createVote.generateVoteRegistrationEntry(registrationChainId, voteChainId, EC_PRIVATE_ADDRESS);

        assert.instanceOf(entry, Entry);
        assert.lengthOf(entry.extIds, 2);
        assert.equal(entry.chainIdHex, registrationChainId);
        assert.equal(entry.extIds[0].toString('utf8'), 'Register Factom Vote');
        assert.equal(entry.extIds[1].toString('hex'), voteChainId);
    });

    it('should generate eligible voters chain', async function () {
        const initiator = {
            id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2',
            publicKey: '310df171d50ad46f0f5c115520b0fcde4522801de4732589df14b42d5f980818',
            secretKey: 'd1011e7b33b3bb18c184730530a6b1977ce3ed3c3b66677a276bf326116a885b'
        };
        const eligibleVoters = require('./data/eligible-voters');
        const chain = await createVote.generateEligibleVotersChain(eligibleVoters, initiator, EC_PRIVATE_ADDRESS);

        assert.instanceOf(chain, Chain);
        const entry = chain.firstEntry;
        assert.lengthOf(entry.extIds, 5);
        assert.equal(entry.extIds[0].toString('utf8'), 'factom-vote-eligible-voters');
        assert.equal(entry.extIds[1].toString('hex'), initiator.id);
        assert.lengthOf(entry.extIds[2], 32);
        const publicKey = sign.keyPair.fromSeed(Buffer.from(initiator.secretKey, 'hex')).publicKey;
        assert.deepEqual(entry.extIds[3], publicKey);
        const dataSigned = crypto.createHash('sha512').update(Buffer.concat([entry.extIds[2], entry.content])).digest();
        assert.isTrue(sign.detached.verify(dataSigned, entry.extIds[4], entry.extIds[3]));
        assert.deepEqual(JSON.parse(entry.content.toString()), eligibleVoters);
    });

    it('should generate append eligible voters entry', async function () {
        const eligibleVoters = require('./data/eligible-voters');
        const eligibleVotersChainId = 'd47a9267e9677fc0fee629efa1859d7c771fce06e3f9f1a465768ac9634b7a93';
        const initiator = { secretKey: 'c21782dedcf78614e4558acdd59aad4a48441d0ad8d7f61fc0849bcc79400ec5' };
        const entry = await createVote.generateAppendEligibleVotersEntry(eligibleVoters, eligibleVotersChainId, initiator, EC_PRIVATE_ADDRESS);

        assert.instanceOf(entry, Entry);
        assert.lengthOf(entry.extIds, 3);
        assert.equal(entry.chainIdHex, eligibleVotersChainId);

        assert.equal(entry.extIds[0].toString('utf8'), 'factom-vote-eligible-voters');
        assert.lengthOf(entry.extIds[1], 32);

        const publicKey = sign.keyPair.fromSeed(Buffer.from(initiator.secretKey, 'hex')).publicKey;
        const dataSigned = crypto.createHash('sha512').update(Buffer.concat([Buffer.from(eligibleVotersChainId, 'hex'), entry.extIds[1], entry.content])).digest();
        assert.isTrue(sign.detached.verify(dataSigned, entry.extIds[2], publicKey));
        assert.deepEqual(JSON.parse(entry.content.toString()), eligibleVoters);
    });

    it('should compute vote creation cost', async function () {

        const registrationChainId = 'a968e880ee3a7002f25ade15ae36a77c15f4dbc9d8c11fdd5fe86ba6af73a475';
        const definition = require('./data/vote-definition');
        const identity = { chainId: '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', key: 'idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS' };
        const voteData = {
            definition, registrationChainId, identity
        };

        const result = await createVote.computeVoteCreationCost(voteData);
        assert.equal(result, 12);
    });

    it('should compute vote creation cost with new eligible voters chain', async function () {

        const registrationChainId = 'a968e880ee3a7002f25ade15ae36a77c15f4dbc9d8c11fdd5fe86ba6af73a475';
        const definition = JSON.parse(JSON.stringify(require('./data/vote-definition')));
        delete definition.vote.eligibleVotersChainId;
        const eligibleVoters = require('./data/eligible-voters');
        const identity = { chainId: '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', key: 'idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS' };
        const voteData = {
            definition, registrationChainId, eligibleVoters, identity
        };

        const result = await createVote.computeVoteCreationCost(voteData);
        assert.equal(result, 23);
    });

});