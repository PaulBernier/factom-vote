function computeResult(vote) {
    const { definition, eligibleVoters, validVotes } = vote;
    switch (definition.type) {
        case 0:
            return computeApprovalVotingResult(definition.config, eligibleVoters, validVotes);
        case 1:
            return computeIRVResult(definition.config, eligibleVoters, validVotes);
        default:
            throw new Error(`Unsupported vote type [${definition.type}]`);
    }
}

function computeApprovalVotingResult(voteConfig, eligibleVoters, votes) {
    // Initialize result data
    const abstention = { count: 0, weight: 0 };
    const optionsResult = {};
    for (const option of voteConfig.options) {
        optionsResult[option] = { count: 0, weight: 0 };
    }

    // Tally votes
    for (const identity in votes) {
        const voterWeight = eligibleVoters[identity];

        if (votes[identity].length === 0) {
            abstention.count += 1;
            abstention.weight += voterWeight;
        } else {
            for (const vote of votes[identity]) {
                optionsResult[vote].count += 1;
                optionsResult[vote].weight += voterWeight;
            }
        }
    }

    if (!voteConfig.allowAbstention && abstention.count > 0) {
        throw new Error('Invalid state: abstention vote while it is not allowed by the vote configuration.');
    }

    // Compute support and turnout

    const nbEligibleVoters = Object.keys(eligibleVoters).length;
    const nbEffectiveVoters = Object.keys(votes).length;

    const weightOfEligibleVoters = Object.values(eligibleVoters).reduce((acc, cur) => acc + cur, 0);
    const weightOfEffectiveVoters = Object.keys(votes).map(id => eligibleVoters[id]).reduce((acc, cur) => acc + cur, 0);

    let denominator, weightDenominator;
    switch (voteConfig.computeResultsAgainst) {
        case 'ALL_ELIGIBLE_VOTERS':
            denominator = nbEligibleVoters;
            weightDenominator = weightOfEligibleVoters;
            break;
        case 'PARTICIPANTS_ONLY':
            denominator = nbEffectiveVoters;
            weightDenominator = weightOfEffectiveVoters;
            break;
        default:
            throw new Error(`Unrecognized value for option computeResultsAgainst: ${voteConfig.computeResultsAgainst}`);
    }

    for (const option of voteConfig.options) {
        optionsResult[option].support = denominator !== 0 ? optionsResult[option].count / denominator : 0;
        optionsResult[option].weightedSupport = weightDenominator !== 0 ? optionsResult[option].weight / weightDenominator : 0;
    }

    const turnout = {};
    turnout.unweighted = nbEligibleVoters !== 0 ? nbEffectiveVoters / nbEligibleVoters : 0;
    turnout.weighted = weightOfEligibleVoters !== 0 ? weightOfEffectiveVoters / weightOfEligibleVoters : 0;

    // Verify acceptance criteria
    const acceptanceCriteria = voteConfig.acceptanceCriteria || {};
    const valid = isVoteValid(acceptanceCriteria, turnout);

    return {
        options: optionsResult,
        votersCount: {
            nbEligibleVoters,
            nbEffectiveVoters,
            weightOfEligibleVoters,
            weightOfEffectiveVoters
        },
        abstention,
        turnout,
        valid
    };
}

function isVoteValid(acceptanceCriteria, turnout) {
    // Verify turnout
    if (acceptanceCriteria.minTurnout) {
        if (acceptanceCriteria.minTurnout.weighted && turnout.weighted < acceptanceCriteria.minTurnout.weighted) {
            return false;
        }
        if (acceptanceCriteria.minTurnout.unweighted && turnout.weighted < acceptanceCriteria.minTurnout.weighted) {
            return false;
        }
    }

    // Verify min support
    // TODO

    return true;
}

function computeIRVResult(voteConfig, eligibleVoters, votes) {
    // TODO
}

module.exports = {
    computeResult
};