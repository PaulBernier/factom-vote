const assert = require('chai').assert,
    crypto = require('crypto'),
    hash = require('hash.js'),
    { processParsedVote,
        getEligibleVoters,
        getValidCommits,
        getValidReveals,
        getValidVotes } = require('../src/read-vote/process-vote');

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

    it('Should process eligible voters', function () {
        const eligibleVotersRegitrations = [
            getParsedData([
                { voterId: 'ID_7', weight: 7 }
            ], 10),
            getParsedData([
                { voterId: 'ID_2', weight: 0 }
            ], 8),
            getParsedData([
                { voterId: 'ID_1', weight: 1 },
                { voterId: 'ID_2', weight: 2 },
                { voterId: 'ID_3', weight: 3 }
            ], 5),
            getParsedData([
                { voterId: 'ID_1', weight: 8 },
                { voterId: 'ID_4', weight: 4 }
            ], 9)];
        const commitStart = 10;

        const eligibleVoters = getEligibleVoters(eligibleVotersRegitrations, commitStart);

        assert.deepEqual(eligibleVoters, {
            ID_1: 8,
            ID_3: 3,
            ID_4: 4
        });
    });


    it('Should get valid commits', function () {
        const commits = [
            getParsedData('C_1', 4, 'ID_1'),
            getParsedData('C_1-bis', 50, 'ID_1'),
            getParsedData('C_2', 10, 'ID_2'),
            getParsedData('C_3', 101, 'ID_3'),
            getParsedData('C_4', 9, 'ID_4'),
            getParsedData('C_5', 50, 'ID_5')];

        const eligibleVoters = { 'ID_1': 9, 'ID_2': 8, 'ID_3': 8, 'ID_4': 8 };

        const validCommits = getValidCommits(commits, 10, 100, eligibleVoters);

        assert.deepEqual(validCommits, {
            ID_1: 'C_1-bis',
            ID_2: 'C_2'
        });
    });

    it('Should get valid reveals', function () {
        const reveals = [
            getParsedData({ vote: ['OPT_1'] }, 98, 'ID_1'),
            getParsedData({ vote: ['OPT_1'] }, 150, 'ID_1'),// KO: revealed too early in a previous commit
            getParsedData({ vote: ['OPT_1'] }, 3, 'ID_2'), // KO: revealed too early
            getParsedData({ vote: ['OPT_1'] }, 300, 'ID_3'), // KO: revealed too late
            getParsedData({ vote: ['OPT_1'] }, 160, 'ID_4'), // OK
            getParsedData({ vote: ['OPT_2'] }, 161, 'ID_4'), // KO: valid reveal already exists
            getParsedData({ vote: [] }, 150, 'ID_5'), // OK abstention
            getParsedData({ vote: ['OPT_1', 'OPT_2'] }, 150, 'ID_6'), // KO: too many options
            getParsedData({ vote: ['OPT_XXX'] }, 150, 'ID_7'),// KO: invalid option
            getParsedData({ vote: ['OPT_1'] }, 150, 'ID_8')]; // KO: identity not eligible
        const eligibleVoters = { 'ID_1': 9, 'ID_2': 8, 'ID_3': 8, 'ID_4': 8, 'ID_5': 8, 'ID_6': 8, 'ID_7': 8 };
        const voteConfig1 = { options: ['OPT_1', 'OPT_2', 'OPT_3'], allowAbstention: true, minOptions: 1, maxOptions: 1 };
        const voteConfig2 = { options: ['OPT_1', 'OPT_2', 'OPT_3'], allowAbstention: false, minOptions: 1, maxOptions: 2 };

        const validReveals1 = getValidReveals(reveals, 101, 200, eligibleVoters, voteConfig1);
        const validReveals2 = getValidReveals(reveals, 101, 200, eligibleVoters, voteConfig2);

        assert.deepEqual(validReveals1, {
            ID_4: { vote: ['OPT_1'] },
            ID_5: { vote: [] }
        });
        assert.deepEqual(validReveals2, {
            ID_4: { vote: ['OPT_1'] },
            ID_6: { vote: ['OPT_1', 'OPT_2'] }
        });
    });

    it('Should get valid votes', function () {

        const sec1 = crypto.randomBytes(32);
        const sec2 = crypto.randomBytes(32);
        const commit1 = hash.hmac(hash['sha256'], sec1).update(Buffer.from('OPT_1')).digest('hex');
        const commit2 = hash.hmac(hash['sha256'], sec2).update(Buffer.from('OPT_2')).digest('hex');


        const validCommits = { ID_1: commit1, ID_2: commit2, ID_3: commit2 };
        const validReveals = {
            ID_1: {
                vote: ['OPT_1'],
                secret: sec1.toString('hex'),
                hmacAlgo: 'sha256'
            },
            ID_2: {
                vote: ['OPT_1'],
                secret: sec2.toString('hex'),
                hmacAlgo: 'sha256'
            },
            ID_4: {
                vote: ['OPT_1'],
                secret: sec2.toString('hex'),
                hmacAlgo: 'sha256'
            }
        };

        const validVotes = getValidVotes(validCommits, validReveals);
        assert.deepEqual(validVotes, {
            ID_1: ['OPT_1']
        });
    });

    function getParsedData(data, directoryBlockHeight, identity) {
        return {
            identity: identity,
            blockContext: {
                directoryBlockHeight: directoryBlockHeight
            },
            data: data
        };
    }
});