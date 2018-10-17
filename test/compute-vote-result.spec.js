const assert = require('chai').assert,
    { computeResult } = require('../src/read-vote/compute-vote-result');

describe('Compute vote result', function () {

    it('Should compute binary voting result', function () {
        const definition = {
            type: 0,
            config: {
                options: ['A', 'B'],
                computeResultsAgainst: 'ALL_ELIGIBLE_VOTERS',
                allowAbstention: false,
                winnerCriteria: {
                    minSupport: {
                        'A': {
                            weighted: 0.55
                        }
                    }
                }
            }
        };
        const eligibleVoters = {
            ID_1: 6,
            ID_2: 7,
            ID_3: 1,
            ID_4: 10,
            ID_5: 6
        };
        const validVotes = {
            ID_1: ['A'],
            ID_2: ['B'],
            ID_3: ['B'],
            ID_4: ['A']
        };

        const vote = { definition, eligibleVoters, validVotes };

        const result = computeResult(vote);

        assert.deepEqual(result.options.A, { count: 2, weight: 16, support: 2 / 5, weightedSupport: 16 / 30 });
        assert.deepEqual(result.options.B, { count: 2, weight: 8, support: 2 / 5, weightedSupport: 8 / 30 });
        assert.equal(result.votersCount.nbEligibleVoters, 5);
        assert.equal(result.votersCount.nbEffectiveVoters, 4);
        assert.equal(result.votersCount.weightOfEligibleVoters, 30);
        assert.equal(result.votersCount.weightOfEffectiveVoters, 24);
        assert.equal(result.abstention.count, 0);
        assert.equal(result.abstention.weight, 0);
        assert.equal(result.turnout.unweighted, 4 / 5);
        assert.equal(result.turnout.weighted, 24 / 30);
        assert.isTrue(result.valid);
        assert.equal(result.winner, 'B');
    });

    it('Should compute approval voting result', function () {
        const definition = {
            type: 1,
            config: {
                options: ['A', 'B', 'Z'],
                computeResultsAgainst: 'PARTICIPANTS_ONLY',
                allowAbstention: true
            }
        };
        const eligibleVoters = {
            ID_1: 6,
            ID_2: 7,
            ID_3: 1,
            ID_4: 10,
            ID_5: 3
        };
        const validVotes = {
            ID_1: ['A', 'B'],
            ID_2: ['B'],
            ID_3: ['Z', 'B'],
            ID_4: []
        };

        const vote = { definition, eligibleVoters, validVotes };

        const result = computeResult(vote);

        assert.deepEqual(result.options.A, { count: 1, weight: 6, support: 1 / 4, weightedSupport: 6 / 24 });
        assert.deepEqual(result.options.B, { count: 3, weight: 14, support: 3 / 4, weightedSupport: 14 / 24 });
        assert.deepEqual(result.options.Z, { count: 1, weight: 1, support: 1 / 4, weightedSupport: 1 / 24 });
        assert.equal(result.votersCount.nbEligibleVoters, 5);
        assert.equal(result.votersCount.nbEffectiveVoters, 4);
        assert.equal(result.votersCount.weightOfEligibleVoters, 27);
        assert.equal(result.votersCount.weightOfEffectiveVoters, 24);
        assert.equal(result.abstention.count, 1);
        assert.equal(result.abstention.weight, 10);
        assert.equal(result.turnout.unweighted, 4 / 5);
        assert.equal(result.turnout.weighted, 24 / 27);
        assert.isTrue(result.valid);
        assert.equal(result.winner, 'B');
    });

    it('Should compute instand run-off voting result', function () {
        const definition = {
            type: 2,
            config: {
                options: ['Bob', 'Sue', 'Bill']
            }
        };
        const eligibleVoters = {};
        const validVotes = {
            ID_1: ['Bob', 'Bill', 'Sue'],
            ID_2: ['Sue', 'Bob', 'Bill'],
            ID_3: ['Bill', 'Sue', 'Bob'],
            ID_4: ['Bob', 'Bill', 'Sue'],
            ID_5: ['Sue', 'Bob', 'Bill']
        };

        const vote = { definition, eligibleVoters, validVotes };

        const result = computeResult(vote);

        assert.equal(result.winner, 'Sue');
        assert.lengthOf(result.roundsResults, 2);
        assert.deepEqual(result.roundsResults[0], { 'Bob': 2, 'Sue': 2, 'Bill': 1 });
        assert.deepEqual(result.roundsResults[1], { 'Bob': 2, 'Sue': 3 });
    });

    it('Should compute IRV tie', function () {
        const definition = {
            type: 2,
            config: {
                options: ['Bob', 'Sue', 'Bill']
            }
        };
        const validVotes = {
            ID_1: ['Bob', 'Bill', 'Sue'],
            ID_2: ['Sue', 'Bob', 'Bill'],
            ID_3: ['Bill'],
            ID_4: ['Bob', 'Bill', 'Sue'],
            ID_5: ['Sue', 'Bob', 'Bill']
        };

        const vote = { definition, validVotes };

        const result = computeResult(vote);

        assert.isUndefined(result.winner);
        assert.lengthOf(result.roundsResults, 2);
        assert.deepEqual(result.roundsResults[0], { 'Bob': 2, 'Sue': 2, 'Bill': 1 });
        assert.deepEqual(result.roundsResults[1], { 'Bob': 2, 'Sue': 2 });
    });

    it('Should compute IRV edge case no vote for Bill at 1st round', function () {
        const definition = {
            type: 2,
            config: {
                options: ['Bob', 'Sue', 'Bill', 'Paul']
            }
        };
        const validVotes = {
            ID_1: ['Bob', 'Bill', 'Sue'],
            ID_2: ['Sue', 'Bill', 'Bob'],
            ID_3: ['Paul', 'Bill', 'Sue'],
            ID_4: ['Bob', 'Bill', 'Sue'],
            ID_5: ['Sue', 'Bob', 'Bill'],
            ID_6: ['Sue', 'Bill', 'Bob']
        };

        const vote = { definition, validVotes };

        const result = computeResult(vote);

        assert.equal(result.winner, 'Sue');
        assert.lengthOf(result.roundsResults, 3);
        assert.deepEqual(result.roundsResults[0], { 'Bob': 2, 'Sue': 3, 'Bill': 0, 'Paul': 1 });
        assert.deepEqual(result.roundsResults[1], { 'Bob': 2, 'Sue': 3, 'Paul': 1 });
        assert.deepEqual(result.roundsResults[2], { 'Bob': 2, 'Sue': 4 });
    });
});