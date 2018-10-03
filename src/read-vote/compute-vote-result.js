function computeResult(vote) {
    const { definition, eligibleVoters, validVotes } = vote;
    switch (definition.type) {
        case 0:
            return computeApprovalVotingResult(definition.config, eligibleVoters, validVotes);
        case 1:
            return computeIRVResult(definition.config, validVotes);
        default:
            throw new Error(`Unsupported vote type [${definition.type}]`);
    }
}

function computeApprovalVotingResult(voteConfig, votersWeight, votes) {
    // Initialize result data
    const abstention = { count: 0, weight: 0 };
    const optionsResult = {};
    for (const option of voteConfig.options) {
        optionsResult[option] = { count: 0, weight: 0 };
    }

    // Tally votes
    for (const identity in votes) {
        const voterWeight = votersWeight[identity];

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

    const nbEligibleVoters = Object.keys(votersWeight).length;
    const nbEffectiveVoters = Object.keys(votes).length;

    const weightOfEligibleVoters = Object.values(votersWeight).reduce((acc, cur) => acc + cur, 0);
    const weightOfEffectiveVoters = Object.keys(votes).map(id => votersWeight[id]).reduce((acc, cur) => acc + cur, 0);

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

function computeIRVResult(voteConfig, votes) {
    // Filter abstentions
    let votersPreferences = Object.values(votes).filter(p => p.length > 0);
    const roundsResults = [], availableOptions = new Set(voteConfig.options);

    let winner;
    while (!winner && votersPreferences.length > 0) {
        // Compute round result
        const roundResult = {};
        for (const opt of availableOptions) {
            roundResult[opt] = 0;
        }

        for (const voterPreference of votersPreferences) {
            roundResult[voterPreference[0]] += 1;
        }
        roundsResults.push(roundResult);
        // Compute winner and losers
        winner = optionWithMajority(roundResult);

        if (!winner) {
            const losers = optionsWithMinority(roundResult);
            losers.forEach(loser => availableOptions.delete(loser));
            for (let i = 0; i < votersPreferences.length; ++i) {
                votersPreferences[i] = votersPreferences[i].filter(p => !losers.includes(p));
            }
            // Remove exhausted ballots
            votersPreferences = votersPreferences.filter(p => p.length > 0);
        }
    }

    return {
        winner,
        roundsResults
    };
}

function optionWithMajority(roundResult) {
    const threshold = Math.ceil(Object.values(roundResult).reduce((acc, cur) => acc + cur, 0) / 2 + 0.5);
    return Object.keys(roundResult).find(opt => roundResult[opt] >= threshold);
}

function optionsWithMinority(roundResult) {
    const minVal = Math.min(...Object.values(roundResult));
    return Object.keys(roundResult).filter(v => roundResult[v] === minVal);
}

module.exports = {
    computeResult
};