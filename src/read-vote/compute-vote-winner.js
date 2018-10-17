
function computeBinaryVotingWinner(optionsStats, winnerCriteria) {
    const { winners, maxWeightedOptions } = computeWinners(optionsStats, winnerCriteria);

    switch (winners.length) {
        case 0:
            // The other option wins by default
            return Object.keys(optionsStats).find(o => !maxWeightedOptions.includes(o));
        case 1:
            return winners[0];
        case 2:
            // Perfect tie 50/50 with no minSupport criteria: no winner
            return;
        default:
            throw new Error('Invalid state');
    }
}

function computeApprovalVotingWinner(optionsStats, winnerCriteria) {
    const { winners } = computeWinners(optionsStats, winnerCriteria);
    return winners.length === 1 ? winners[0] : undefined;
}

function computeWinners(optionsStats, winnerCriteria) {
    let maxWeight = 0, maxWeightedOptions = [];
    for (const opt in optionsStats) {
        const weight = optionsStats[opt].weight;
        if (weight > maxWeight) {
            maxWeightedOptions = [opt];
            maxWeight = weight;
        } else if (weight === maxWeight) {
            maxWeightedOptions.push(opt);
        }
    }

    const minSupportCriteria = (winnerCriteria || {}).minSupport;
    const winners = maxWeightedOptions.filter(function (opt) {
        const { minSupport, weightedMinSupport } = getMinSupport(minSupportCriteria, opt);
        return optionsStats[opt].support >= minSupport && optionsStats[opt].weightedSupport >= weightedMinSupport;
    });

    return { maxWeightedOptions, winners };
}

function getMinSupport(minSupportCriteria, opt) {
    let minSupport = 0, weightedMinSupport = 0;

    if (minSupportCriteria) {
        if (minSupportCriteria[opt]) {
            minSupport = minSupportCriteria[opt].unweighted || 0;
            weightedMinSupport = minSupportCriteria[opt].weighted || 0;
        } else if (minSupportCriteria['*']) {
            minSupport = minSupportCriteria['*'].unweighted || 0;
            weightedMinSupport = minSupportCriteria['*'].weighted || 0;
        }
    }

    return { minSupport, weightedMinSupport };
}

module.exports = {
    computeBinaryVotingWinner,
    computeApprovalVotingWinner
};