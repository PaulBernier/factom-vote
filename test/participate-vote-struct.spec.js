const assert = require('chai').assert,
    { Entry } = require('factom/src/entry'),
    hash = require('hash.js'),
    sign = require('tweetnacl/nacl-fast').sign,
    participateVote = require('../src/participate-vote-struct');

const EC_PRIVATE_ADDRESS = 'Es32PjobTxPTd73dohEFRegMFRLv3X5WZ4FXEwNN8kE2pMDfeMym';

describe('Participate in vote structures', function () {

    it('should generate vote commit entry', function () {
        const voteChainId = 'c71a06c108fccb7bf4d4737dfa5c51371c5845c9598a06e1203f465c247d51a6';
        const vote = {
            vote: ['Yes', 'Maybe'],
            secret: '21729ebb63483b1a8c15d8f6d57e7093a272f9e6def99f6a386b68fc0cc4ea20',
            hmacAlgo: 'sha512'
        };
        const voter = { id: '5f02d6d7088c401f53789b577165f2596ff040715765f2af0494f5918e22e138', secretKey: 'd1011e7b33b3bb18c184730530a6b1977ce3ed3c3b66677a276bf326116a885b' };
        const entry = participateVote.generateVoteCommitEntry(voteChainId, vote, voter, EC_PRIVATE_ADDRESS);

        assert.instanceOf(entry, Entry);
        assert.lengthOf(entry.extIds, 4);
        assert.equal(entry.chainIdHex, 'c71a06c108fccb7bf4d4737dfa5c51371c5845c9598a06e1203f465c247d51a6');

        assert.equal(entry.extIds[0].toString('utf8'), 'factom-vote-commit');
        assert.equal(entry.extIds[1].toString('hex'), voter.id);

        const publicKey = sign.keyPair.fromSeed(Buffer.from(voter.secretKey, 'hex')).publicKey;
        assert.deepEqual(entry.extIds[2], publicKey);
        const hmac = hash.hmac(hash.sha512, Buffer.from(vote.secret, 'hex')).update(Buffer.from('YesMaybe')).digest('hex');

        const dataSigned = Buffer.concat([Buffer.from('c71a06c108fccb7bf4d4737dfa5c51371c5845c9598a06e1203f465c247d51a6', 'hex'), entry.content]);
        assert.isTrue(sign.detached.verify(dataSigned, entry.extIds[3], publicKey));
        assert.equal(JSON.parse(entry.content.toString()).commitment, hmac);
    });

    it('should generate vote reveal entry', function () {
        const voteChainId = 'c71a06c108fccb7bf4d4737dfa5c51371c5845c9598a06e1203f465c247d51a6';

        const vote = {
            vote: ['Yes', 'Maybe'],
            secret: '21729ebb63483b1a8c15d8f6d57e7093a272f9e6def99f6a386b68fc0cc4ea20',
            hmacAlgo: 'sha512'
        };
        const voterId = '5f02d6d7088c401f53789b577165f2596ff040715765f2af0494f5918e22e138';
        const entry = participateVote.generateVoteRevealEntry(voteChainId, vote, voterId, EC_PRIVATE_ADDRESS);

        assert.instanceOf(entry, Entry);
        assert.lengthOf(entry.extIds, 2);
        assert.equal(entry.chainIdHex, 'c71a06c108fccb7bf4d4737dfa5c51371c5845c9598a06e1203f465c247d51a6');

        assert.equal(entry.extIds[0].toString('utf8'), 'factom-vote-reveal');
        assert.equal(entry.extIds[1].toString('hex'), voterId);

        const reveal = JSON.parse(entry.content.toString());
        assert.deepEqual(reveal.vote, vote.vote);
        assert.equal(reveal.secret, vote.secret);
        assert.equal(reveal.hmacAlgo, vote.hmacAlgo);
    });

    it('should compose vote commit entry', function () {
        const voteChainId = 'c71a06c108fccb7bf4d4737dfa5c51371c5845c9598a06e1203f465c247d51a6';

        const vote = {
            vote: ['Yes'],
            secret: '21729ebb63483b1a8c15d8f6d57e7093a272f9e6def99f6a386b68fc0cc4ea20',
            hmacAlgo: 'sha512'
        };
        const voter = { id: '5f02d6d7088c401f53789b577165f2596ff040715765f2af0494f5918e22e138', secretKey: 'd1011e7b33b3bb18c184730530a6b1977ce3ed3c3b66677a276bf326116a885b' };
        const composed = participateVote.composeVoteCommitEntry(voteChainId, vote, voter, EC_PRIVATE_ADDRESS);

        assert.typeOf(composed, 'object');
        assert.match(composed.commit, /^[0-9a-f]+$/);
        assert.match(composed.reveal, /^[0-9a-f]+$/);
    });

    it('should compose vote reveal entry', function () {
        const voteChainId = 'c71a06c108fccb7bf4d4737dfa5c51371c5845c9598a06e1203f465c247d51a6';

        const vote = {
            vote: ['Yes'],
            secret: '21729ebb63483b1a8c15d8f6d57e7093a272f9e6def99f6a386b68fc0cc4ea20',
            hmacAlgo: 'sha512'
        };
        const voterId = '5f02d6d7088c401f53789b577165f2596ff040715765f2af0494f5918e22e138';
        const composed = participateVote.composeVoteRevealEntry(voteChainId, vote, voterId, EC_PRIVATE_ADDRESS);

        assert.typeOf(composed, 'object');
        assert.match(composed.commit, /^[0-9a-f]+$/);
        assert.match(composed.reveal, /^[0-9a-f]+$/);
    });

});