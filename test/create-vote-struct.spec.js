const assert = require('chai').assert,
    { Chain } = require('factom/src/chain'),
    { Entry } = require('factom/src/entry'),
    sign = require('tweetnacl/nacl-fast').sign,
    createVote = require('../src/create-vote-struct');

const EC_PRIVATE_ADDRESS = 'Es32PjobTxPTd73dohEFRegMFRLv3X5WZ4FXEwNN8kE2pMDfeMym';

describe('Create vote structures', function () {

    it('should generate vote chain', function () {
        const vote = require('./data/vote-definition.json');
        const administrator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: 'fb23ef3b1ed49871e9a7710e8e3c1dc9d1f1209ffe09236c35e7f9d992020684' };
        const chain = createVote.generateVoteChain(vote, administrator, EC_PRIVATE_ADDRESS);

        assert.instanceOf(chain, Chain);
        const entry = chain.firstEntry;
        assert.lengthOf(entry.extIds, 5);
        assert.equal(entry.extIds[0].toString('utf8'), 'factom-vote');
        assert.equal(entry.extIds[1].toString('hex'), '00');
        assert.equal(entry.extIds[2].toString('hex'), administrator.id);
        const publicKey = sign.keyPair.fromSeed(Buffer.from(administrator.secretKey, 'hex')).publicKey;
        assert.deepEqual(entry.extIds[3], publicKey);
        assert.isTrue(sign.detached.verify(entry.content, entry.extIds[4], entry.extIds[3]));
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

    it('should generate vote participants chain', function () {
        const administrator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: 'fb23ef3b1ed49871e9a7710e8e3c1dc9d1f1209ffe09236c35e7f9d992020684' };
        const participants = require('./data/vote-participants');
        const chain = createVote.generateVoteParticipantsChain(participants, administrator, EC_PRIVATE_ADDRESS);

        assert.instanceOf(chain, Chain);
        const entry = chain.firstEntry;
        assert.lengthOf(entry.extIds, 5);
        assert.equal(entry.extIds[0].toString('utf8'), 'factom-vote-participants');
        assert.equal(entry.extIds[1].toString('hex'), administrator.id);
        assert.lengthOf(entry.extIds[2], 32);
        const publicKey = sign.keyPair.fromSeed(Buffer.from(administrator.secretKey, 'hex')).publicKey;
        assert.deepEqual(entry.extIds[3], publicKey);
        assert.isTrue(sign.detached.verify(Buffer.concat([entry.extIds[2], entry.content]), entry.extIds[4], entry.extIds[3]));
        assert.deepEqual(JSON.parse(entry.content.toString()), participants);
    });

    it('should generate append participants entry', function () {
        const participants = require('./data/vote-participants');
        const participantsChainId = 'd47a9267e9677fc0fee629efa1859d7c771fce06e3f9f1a465768ac9634b7a93';
        const administratorSecretKey = 'c21782dedcf78614e4558acdd59aad4a48441d0ad8d7f61fc0849bcc79400ec5';
        const entry = createVote.generateAppendParticipantsEntry(participants, participantsChainId, administratorSecretKey, EC_PRIVATE_ADDRESS);

        assert.instanceOf(entry, Entry);
        assert.lengthOf(entry.extIds, 2);
        assert.equal(entry.chainIdHex, participantsChainId);

        assert.lengthOf(entry.extIds[0], 32);

        const publicKey = sign.keyPair.fromSeed(Buffer.from(administratorSecretKey, 'hex')).publicKey;
        const dataSigned = Buffer.concat([Buffer.from(participantsChainId, 'hex'), entry.extIds[0], entry.content]);
        assert.isTrue(sign.detached.verify(dataSigned, entry.extIds[1], publicKey));
        assert.deepEqual(JSON.parse(entry.content.toString()), participants);
    });

    it('should compose vote chain', function () {
        const vote = require('./data/vote-definition.json');
        const administrator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: 'fb23ef3b1ed49871e9a7710e8e3c1dc9d1f1209ffe09236c35e7f9d992020684' };
        const composed = createVote.composeVoteChain(vote, administrator, EC_PRIVATE_ADDRESS);

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

    it('should compose vote participants chain', function () {
        const administrator = { id: '34704bd0fe5d8a6a7816fd5db9072580610a1b89406b3bc48b68b79c5fefb9b2', secretKey: 'fb23ef3b1ed49871e9a7710e8e3c1dc9d1f1209ffe09236c35e7f9d992020684' };
        const participants = require('./data/vote-participants');
        const composed = createVote.composeVoteParticipantsChain(participants, administrator, EC_PRIVATE_ADDRESS);

        assert.typeOf(composed, 'object');
        assert.match(composed.commit, /^[0-9a-f]+$/);
        assert.match(composed.reveal, /^[0-9a-f]+$/);
    });

    it('should compose append participants entry', function () {
        const participants = require('./data/vote-participants');
        const participantsChainId = 'd47a9267e9677fc0fee629efa1859d7c771fce06e3f9f1a465768ac9634b7a93';
        const administratorSecretKey = 'c21782dedcf78614e4558acdd59aad4a48441d0ad8d7f61fc0849bcc79400ec5';
        const composed = createVote.composeAppendParticipantsEntry(participants, participantsChainId, administratorSecretKey, EC_PRIVATE_ADDRESS);

        assert.typeOf(composed, 'object');
        assert.match(composed.commit, /^[0-9a-f]+$/);
        assert.match(composed.reveal, /^[0-9a-f]+$/);
    });


});