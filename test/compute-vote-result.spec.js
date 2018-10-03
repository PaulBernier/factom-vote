const assert = require('chai').assert,
    { computeResult } = require('../src/read-vote/compute-vote-result');

describe('Compute vote result', function () {

    it('Should compute approval voting result', function () {
        const definition = {
            type: 0,
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
    });

    it('Should compute instand run-off voting result', function () {

    });
});