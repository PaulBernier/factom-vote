const assert = require('chai').assert,
    crypto = require('crypto'),
    hash = require('hash.js'),
    { processParsedVote } = require('../src/read-vote/process-vote');

describe('Process parsed vote', function () {

    it('Should process vote', function () {
        const config = {
            options: [
                'OPT_1',
                'OPT_2'
            ],
            minOptions: 1,
            maxOptions: 1,
            allowAbstention: true
        };
        const definition = buildDefinition(5, 10, 11, 20, config);
        const eligibleVotersRegitrations = [{
            data: [{ voterId: 'ID_1', weight: 4 }, { voterId: 'ID_2', weight: 999999 }, { voterId: 'ID_3' }],
            blockContext: {
                directoryBlockHeight: 2
            }
        }, {
            data: [{ voterId: 'ID_2', weight: 0 }],
            blockContext: {
                directoryBlockHeight: 3
            }
        }, {
            data: [{ voterId: 'ID_4', weight: 10 }],
            blockContext: {
                directoryBlockHeight: 5
            }
        }];

        const secret1 = crypto.randomBytes(32);
        const commits = [{
            identity: 'ID_1',
            data: hash.hmac(hash['sha256'], secret1).update(Buffer.from('OPT_1')).digest('hex'),
            blockContext: { directoryBlockHeight: 6 }
        }];
        const reveals = [{
            identity: 'ID_1', data: {
                vote: ['OPT_1'],
                secret: secret1.toString('hex'),
                hmacAlgo: 'sha256'
            }, blockContext: { directoryBlockHeight: 11 }
        }];

        const parsedVote = {
            definition,
            eligibleVotersRegitrations,
            commits,
            reveals
        };

        const vote = processParsedVote(parsedVote);

        assert.deepEqual(vote.definition, definition.data.vote);
        assert.deepEqual(vote.eligibleVoters, { ID_1: 4, ID_3: 1 });
        assert.deepEqual(vote.validVotes, { ID_1: ['OPT_1'] });
    });

    function buildDefinition(commitStart, commitEnd, revealStart, revealEnd, config) {
        return {
            data: {
                vote: {
                    type: 0,
                    phasesBlockHeights: {
                        commitStart, commitEnd, revealStart, revealEnd
                    },
                    config
                }
            }
        };
    }

});