const assert = require('chai').assert,
    crypto = require('crypto'),
    { Chain } = require('factom/src/chain'),
    { Entry } = require('factom/src/entry'),
    sign = require('tweetnacl/nacl-fast').sign,
    createVote = require('../src/write-vote/create-vote-struct');

const EC_PRIVATE_ADDRESS = 'Es32PjobTxPTd73dohEFRegMFRLv3X5WZ4FXEwNN8kE2pMDfeMym';

describe('Create vote structures', function () {

    it('should generate vote chain', function () {
        const vote = require('./data/vote-definition.json');
        const initiator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: 'fb23ef3b1ed49871e9a7710e8e3c1dc9d1f1209ffe09236c35e7f9d992020684' };
        const chain = createVote.generateVoteChain(vote, initiator, EC_PRIVATE_ADDRESS);

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

    it('should generate eligible voters chain', function () {
        const initiator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: 'fb23ef3b1ed49871e9a7710e8e3c1dc9d1f1209ffe09236c35e7f9d992020684' };
        const eligibleVoters = require('./data/eligible-voters');
        const chain = createVote.generateEligibleVotersChain(eligibleVoters, initiator, EC_PRIVATE_ADDRESS);

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

    it('should generate append eligible voters entry', function () {
        const eligibleVoters = require('./data/eligible-voters');
        const eligibleVotersChainId = 'd47a9267e9677fc0fee629efa1859d7c771fce06e3f9f1a465768ac9634b7a93';
        const initiatorSecretKey = 'c21782dedcf78614e4558acdd59aad4a48441d0ad8d7f61fc0849bcc79400ec5';
        const entry = createVote.generateAppendEligibleVotersEntry(eligibleVoters, eligibleVotersChainId, initiatorSecretKey, EC_PRIVATE_ADDRESS);

        assert.instanceOf(entry, Entry);
        assert.lengthOf(entry.extIds, 2);
        assert.equal(entry.chainIdHex, eligibleVotersChainId);

        assert.lengthOf(entry.extIds[0], 32);

        const publicKey = sign.keyPair.fromSeed(Buffer.from(initiatorSecretKey, 'hex')).publicKey;
        const dataSigned = crypto.createHash('sha512').update(Buffer.concat([Buffer.from(eligibleVotersChainId, 'hex'), entry.extIds[0], entry.content])).digest();
        assert.isTrue(sign.detached.verify(dataSigned, entry.extIds[1], publicKey));
        assert.deepEqual(JSON.parse(entry.content.toString()), eligibleVoters);
    });

    it('should compose vote chain', function () {
        const vote = require('./data/vote-definition.json');
        const initiator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: 'fb23ef3b1ed49871e9a7710e8e3c1dc9d1f1209ffe09236c35e7f9d992020684' };
        const composed = createVote.composeVoteChain(vote, initiator, EC_PRIVATE_ADDRESS);

        assert.typeOf(composed, 'object');
        assert.match(composed.commit, /^[0-9a-f]+$/);
        assert.match(composed.reveal, /^[0-9a-f]+$/);
    });

    it('should compose vote registration entry', function () {
        const registrationChainId = '710cba73598b40b6c8edf2c02b4c1eb26656d1c8a2d84b1025b59c5740fe1cf4';
        const voteChainId = '0c30248965533634ad7565cab88f63bb152c3a36775d7ae6359db649c515cabc';
        const composed = createVote.composeVoteRegistrationEntry(registrationChainId, voteChainId, EC_PRIVATE_ADDRESS);

        assert.typeOf(composed, 'object');
        assert.match(composed.commit, /^[0-9a-f]+$/);
        assert.match(composed.reveal, /^[0-9a-f]+$/);
    });

    it('should compose eligible voters chain', function () {
        const initiator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: 'fb23ef3b1ed49871e9a7710e8e3c1dc9d1f1209ffe09236c35e7f9d992020684' };
        const eligibleVoters = require('./data/eligible-voters');
        const composed = createVote.composeEligibleVotersChain(eligibleVoters, initiator, EC_PRIVATE_ADDRESS);

        assert.typeOf(composed, 'object');
        assert.match(composed.commit, /^[0-9a-f]+$/);
        assert.match(composed.reveal, /^[0-9a-f]+$/);
    });

    it('should compose append eligible voters entry', function () {
        const eligibleVoters = require('./data/eligible-voters');
        const eligibleVotersChainId = 'd47a9267e9677fc0fee629efa1859d7c771fce06e3f9f1a465768ac9634b7a93';
        const initiatorSecretKey = 'c21782dedcf78614e4558acdd59aad4a48441d0ad8d7f61fc0849bcc79400ec5';
        const composed = createVote.composeAppendEligibleVotersEntry(eligibleVoters, eligibleVotersChainId, initiatorSecretKey, EC_PRIVATE_ADDRESS);

        assert.typeOf(composed, 'object');
        assert.match(composed.commit, /^[0-9a-f]+$/);
        assert.match(composed.reveal, /^[0-9a-f]+$/);
    });

});