const hash = require('hash.js');

function processParsedVote(parsedVote) {
    const { definition, eligibleVotersRegitrations, commits, reveals } = parsedVote;

    const voteDefinition = definition.data.vote;
    const { commitStart, commitEnd, revealStart, revealEnd } = voteDefinition.phasesBlockHeights;
    const eligibleVoters = getEligibleVoters(eligibleVotersRegitrations, commitStart);

    const validCommits = getValidCommits(commits, commitStart, commitEnd, eligibleVoters);
    const validReveals = getValidReveals(reveals, revealStart, revealEnd, eligibleVoters, voteDefinition.config);
    const validVotes = getValidVotes(validCommits, validReveals);

    return { definition: voteDefinition, eligibleVoters, validVotes };
}

// 1. Keep only voters registered before commitStart
// 2. Keep the last weight registered for a given identity
function getEligibleVoters(eligibleVotersRegitrations, commitStart) {
    eligibleVotersRegitrations.sort((a, b) => a.blockContext.directoryBlockHeight - b.blockContext.directoryBlockHeight);

    const eligibleVoters = {};
    for (const eligibleVotersRegistration of eligibleVotersRegitrations) {
        // Any eligible voters registration added after commitStart are ignored
        if (eligibleVotersRegistration.blockContext.directoryBlockHeight >= commitStart) {
            break;
        }

        for (const eligibleVotersRegistered of eligibleVotersRegistration.data) {
            const weight = typeof eligibleVotersRegistered.weight === 'number' ? eligibleVotersRegistered.weight : 1;

            if (weight === 0) {
                delete eligibleVoters[eligibleVotersRegistered.voterId];
            } else {
                eligibleVoters[eligibleVotersRegistered.voterId] = weight;
            }
        }
    }

    return eligibleVoters;
}

// 1. Remove non eligible voters
// 2. Remove commits outside the [start, end]
// 3. Keep only the latest commit of an identity if multiple commits were cast
function getValidCommits(allCommits, commitStart, commitEnd, eligibleVoters) {
    allCommits.sort((a, b) => a.blockContext.directoryBlockHeight - b.blockContext.directoryBlockHeight);

    const commits = {};
    for (const commit of allCommits) {
        if (!eligibleVoters[commit.identity]) {
            continue;
        }
        if (commit.blockContext.directoryBlockHeight < commitStart || commit.blockContext.directoryBlockHeight > commitEnd) {
            continue;
        }
        commits[commit.identity] = commit.data;
    }

    return commits;
}

// 1. Remove non eligible voters
// 2. Remove reveals that happened after revealEnd
// 3. Exclude all the reveals of an identity if one of its reveal was before
// 4. Keep only the first valid reveal
// 5. Validate that all the selected options are among the possible choices for the vote
function getValidReveals(allReveals, revealStart, revealEnd, eligibleVoters, voteConfig) {
    allReveals.sort((a, b) => a.blockContext.directoryBlockHeight - b.blockContext.directoryBlockHeight);
    const reveals = {};
    const excludedVoters = new Set();

    for (const reveal of allReveals) {
        const identity = reveal.identity;
        if (!eligibleVoters[identity]) {
            continue;
        }
        if (reveal.blockContext.directoryBlockHeight > revealEnd) {
            continue;
        }
        if (reveal.blockContext.directoryBlockHeight < revealStart) {
            excludedVoters.add(identity);
            continue;
        }

        const voterExcluded = excludedVoters.has(identity);
        const validVoteOptions = reveal.data.vote.every(v => voteConfig.options.includes(v));
        const nbOptionsSelected = reveal.data.vote.length;
        const validNumberOfOptionsSelected = (voteConfig.allowAbstention && nbOptionsSelected === 0) ||
            (nbOptionsSelected >= voteConfig.minOptions && nbOptionsSelected <= voteConfig.maxOptions);

        if (!voterExcluded && !reveals[identity] && validVoteOptions && validNumberOfOptionsSelected) {
            reveals[identity] = reveal.data;
        }
    }

    return reveals;
}

// 1. For a given identity match its commit with its reveal
// 2. Verify that the commitment matches what was revealed
function getValidVotes(validCommits, validReveals) {
    const validVotes = {};

    for (const identity in validCommits) {
        const vote = validReveals[identity];
        if (vote) {
            const voted = Buffer.concat(vote.vote.map(choice => Buffer.from(choice, 'utf8')));
            const hmac = hash.hmac(hash[vote.hmacAlgo], Buffer.from(vote.secret, 'hex')).update(voted).digest('hex');
            if (hmac === validCommits[identity]) {
                validVotes[identity] = vote.vote;
            }
        }
    }

    return validVotes;
}

module.exports = {
    processParsedVote,
    getEligibleVoters,
    getValidCommits,
    getValidReveals,
    getValidVotes
};
