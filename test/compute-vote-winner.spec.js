const assert = require('chai').assert,
    { computeBinaryVotingWinner, computeApprovalVotingWinner } = require('../src/read-vote/compute-vote-winner');


describe('Compute vote winner', function () {

    it('Should compute binary voting winner', function () {
        const optionsStats = {
            'yes': { weight: 11, support: 0.2, weightedSupport: 0.7 },
            'no': { weight: 10, support: 0.2, weightedSupport: 0.8 }
        };

        const winner = computeBinaryVotingWinner(optionsStats);

        assert.equal(winner, 'yes');
    });

    it('Should compute binary voting winner by default because of weighted support', function () {
        const optionsStats = {
            'yes': { weight: 11, support: 0.2, weightedSupport: 0.7 },
            'no': { weight: 10, support: 0.2, weightedSupport: 0.3 }
        };
        const winnerCriteria = { minSupport: { 'yes': { weighted: 0.8 } }  };

        const winner = computeBinaryVotingWinner(optionsStats, winnerCriteria);

        assert.equal(winner, 'no');
    });

    it('Should compute binary voting winner by default because of unweighted support', function () {
        const optionsStats = {
            'yes': { weight: 11, support: 0.2, weightedSupport: 0.7 },
            'no': { weight: 10, support: 0.2, weightedSupport: 0.3 }
        };
        const winnerCriteria = { minSupport: { 'yes': { unweighted: 0.5 } }  };

        const winner = computeBinaryVotingWinner(optionsStats, winnerCriteria);

        assert.equal(winner, 'no');
    });

    it('Should return no winner in case of perfect tie', function () {
        const optionsStats = {
            'yes': { weight: 10, support: 0.5, weightedSupport: 0.5 },
            'no': { weight: 10, support: 0.5, weightedSupport: 0.5 }
        };

        const winner = computeBinaryVotingWinner(optionsStats);

        assert.isUndefined(winner);
    });

    it('Should compute approval voting winner', function () {
        const optionsStats = {
            'A': { weight: 70, support: 0.7, weightedSupport: 0.7 },
            'B': { weight: 20, support: 0.2, weightedSupport: 0.2 },
            'C': { weight: 10, support: 0.1, weightedSupport: 0.1 }
        };
        
        const winner = computeApprovalVotingWinner(optionsStats);

        assert.equal(winner, 'A');
    });

    it('Should compute approval voting winner with minSupport defined for *', function () {
        const optionsStats = {
            'A': { weight: 70, support: 0.7, weightedSupport: 0.7 },
            'B': { weight: 20, support: 0.2, weightedSupport: 0.2 },
            'C': { weight: 10, support: 0.1, weightedSupport: 0.1 }
        };
        
        const winnerCriteria = { minSupport: { '*': { unweighted: 0.8 } }  };

        const winner = computeApprovalVotingWinner(optionsStats, winnerCriteria);

        assert.isUndefined(winner);
    });

    it('Should return no winner in case of tie', function () {
        const optionsStats = {
            'A': { weight: 40, support: 0.4, weightedSupport: 0.4 },
            'B': { weight: 40, support: 0.4, weightedSupport: 0.4 },
            'C': { weight: 20, support: 0.2, weightedSupport: 0.2 }
        };
        

        const winner = computeApprovalVotingWinner(optionsStats);

        assert.isUndefined(winner);
    });
});