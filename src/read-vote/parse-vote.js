const sign = require('tweetnacl/nacl-fast').sign,
    Promise = require('bluebird'),
    { sha512 } = require('../crypto'),
    { verifyIdentityKeyAssociation, keyToPublicIdentityKey } = require('../factom-identity'),
    { validateVoteDefinition, validateEligibleVoters, validateVote } = require('../validation/json-validation');

/**
 * parse* functions guarantee:
 * 1. The Factom entry format matches the spec (ext ids)
 * 2. They are correctly signed
 * 3. The content is a valid JSON that matches the spec
 * BUT those functions don't check the validity of the data against the vote definition. This part is done at the next step (processRawVote)
 */

async function parseVote(cli, chainId) {
    const { definition, commits, reveals } = await parseVoteChain(cli, chainId);
    const eligibleVotersChainId = definition.data.vote.eligibleVotersChainId;
    const { eligibleVotersRegitrations } = await parseEligibleVotersChain(cli, eligibleVotersChainId);

    if (definition.identity !== eligibleVotersRegitrations[0].identity) {
        throw new Error(`Mismatch of identities between vote chain ${chainId} and eligible voters chain ${eligibleVotersChainId}`);
    }

    return {
        definition, commits, reveals, eligibleVotersRegitrations
    };
}

async function parseVoteChain(cli, chainId) {

    let definition, firstEntryContainsVoteDefinition = false;
    const commits = [], reveals = [], parseErrors = [];
    await cli.rewindChainWhile(chainId, () => true, async function (entry) {
        firstEntryContainsVoteDefinition = false;
        try {
            const parsed = await parseVoteChainEntry(cli, entry);
            switch (parsed.type) {
                case 'definition':
                    definition = parsed;
                    firstEntryContainsVoteDefinition = true;
                    break;
                case 'commit':
                    commits.push(parsed);
                    break;
                case 'reveal':
                    reveals.push(parsed);
                    break;
            }
        } catch (e) {
            parseErrors.push({ entryHash: entry.hashHex(), error: e.message });
        }
    });

    if (!firstEntryContainsVoteDefinition) {
        throw new Error(`Chain ${chainId} first entry is not a valid vote definition.`);
    }

    return {
        definition,
        commits,
        reveals,
        parseErrors
    };
}

async function parseEligibleVotersChain(cli, chainId) {
    const entries = await cli.getAllEntriesOfChain(chainId);

    const initialEligibleVoters = await parseInitialEligibleVotersEntry(cli, entries[0]);

    // Iterate over the append entries
    const appends = [], parseErrors = [], entryHashes = new Set();
    await Promise.each(entries.slice(1), async function (entry) {
        try {
            if (entryHashes.has(entry.hashHex())) {
                // Skip entry replayed
                parseErrors.push({ entryHash: entry.hashHex(), error: 'Replayed entry' });
            } else {
                appends.push(await parseAppendEligibleVotersEntry(cli, entry, initialEligibleVoters.identity, initialEligibleVoters.publicKey));
                entryHashes.add(entry.hashHex());
            }
        } catch (e) {
            parseErrors.push({ entryHash: entry.hashHex(), error: e });
        }
    });

    return { eligibleVotersRegitrations: [initialEligibleVoters, ...appends], parseErrors };
}


async function parseInitialEligibleVotersEntry(cli, entry) {
    if (entry.extIds.length !== 5) {
        throw new Error(`Invalid number of external ids for initial eligible voters entry ${entry.hashHex()}.`);
    }
    if (entry.extIds[0].toString() !== 'factom-vote-eligible-voters' ||
        entry.extIds[2].length !== 32) {
        throw new Error(`Invalid header for initial eligible voters entry ${entry.hashHex()}`);
    }

    await verifyIdentityKeyAssociation(cli, entry.extIds[1].toString('hex'), keyToPublicIdentityKey(entry.extIds[3]), entry.blockContext.directoryBlockHeight);

    const signedData = sha512(Buffer.concat([entry.extIds[2], entry.content]));
    if (!sign.detached.verify(signedData, entry.extIds[4], entry.extIds[3])) {
        throw new Error(`Invalid signature of initial eligible voters entry ${entry.hashHex()}`);
    }

    const content = JSON.parse(entry.content.toString());
    if (!validateEligibleVoters(content)) {
        throw new Error('Initial eligible voters validation error:\n' + JSON.stringify(validateEligibleVoters.errors));
    }

    return {
        type: 'initial-eligible-voters',
        identity: entry.extIds[1].toString('hex'),
        publicKey: entry.extIds[3],
        data: content,
        blockContext: entry.blockContext
    };
}

async function parseAppendEligibleVotersEntry(cli, entry, initiatorIdentity, publicKey) {
    if (entry.extIds.length !== 3) {
        throw new Error(`Invalid number of external ids for append eligible voters entry ${entry.hashHex()}.`);
    }
    if (entry.extIds[0].toString() !== 'factom-vote-eligible-voters' ||
        entry.extIds[1].length !== 32) {
        throw new Error(`Invalid header for initial eligible voters entry ${entry.hashHex()}`);
    }

    await verifyIdentityKeyAssociation(cli, initiatorIdentity, keyToPublicIdentityKey(publicKey), entry.blockContext.directoryBlockHeight);

    const signedData = sha512(Buffer.concat([entry.chainId, entry.extIds[1], entry.content]));
    if (!sign.detached.verify(signedData, entry.extIds[2], Buffer.from(publicKey, 'hex'))) {
        throw new Error(`Invalid signature of append eligible voters entry ${entry.hashHex()}`);
    }

    const content = JSON.parse(entry.content.toString());
    if (!validateEligibleVoters(content)) {
        throw new Error('Append eligible voters validation error:\n' + JSON.stringify(validateEligibleVoters.errors));
    }

    return {
        type: 'append-eligible-voters',
        data: content,
        blockContext: entry.blockContext
    };
}

function parseVoteChainEntry(cli, entry) {
    if (entry.extIds.length === 0) {
        throw new Error(`Entry [${entry.hashHex()}] is not a valid factom vote chain entry.`);
    }

    switch (entry.extIds[0].toString()) {
        case 'factom-vote':
            return parseVoteDefinitionEntry(cli, entry);
        case 'factom-vote-commit':
            return parseVoteCommitEntry(cli, entry);
        case 'factom-vote-reveal':
            return parseVoteRevealEntry(entry);
        default:
            throw new Error(`Entry [${entry.hashHex()}] is not a valid factom vote chain entry.`);
    }
}

async function parseVoteDefinitionEntry(cli, entry) {
    if (entry.extIds.length !== 5) {
        throw new Error(`Invalid number of external ids for vote definition entry ${entry.hashHex()}.`);
    }
    if (entry.extIds[0].toString() !== 'factom-vote' || entry.extIds[1].toString('hex') !== '00') {
        throw new Error(`Invalid header for vote definition entry ${entry.hashHex()}.`);
    }

    await verifyIdentityKeyAssociation(cli, entry.extIds[2].toString('hex'), keyToPublicIdentityKey(entry.extIds[3]), entry.blockContext.directoryBlockHeight);

    const signedData = sha512(entry.content);
    if (!sign.detached.verify(signedData, entry.extIds[4], entry.extIds[3])) {
        throw new Error(`Invalid signature of vote definition entry ${entry.hashHex()}`);
    }

    const voteDefinition = JSON.parse(entry.content.toString());
    if (!validateVoteDefinition(voteDefinition)) {
        throw new Error('Vote definition validation error:\n' + JSON.stringify(validateVoteDefinition.errors));
    }

    return {
        type: 'definition',
        identity: entry.extIds[2].toString('hex'),
        data: voteDefinition,
        blockContext: entry.blockContext
    };
}

async function parseVoteCommitEntry(cli, entry) {
    if (entry.extIds.length !== 4) {
        throw new Error(`Invalid number of external ids for vote commit entry ${entry.hashHex()}.`);
    }
    if (entry.extIds[0].toString() !== 'factom-vote-commit') {
        throw new Error(`Invalid header for vote commit entry ${entry.hashHex()}`);
    }

    await verifyIdentityKeyAssociation(cli, entry.extIds[1].toString('hex'), keyToPublicIdentityKey(entry.extIds[2]), entry.blockContext.directoryBlockHeight);

    const signedData = sha512(Buffer.concat([entry.chainId, entry.content]));
    if (!sign.detached.verify(signedData, entry.extIds[3], entry.extIds[2])) {
        throw new Error(`Invalid signature of vote commit entry ${entry.hashHex()}.`);
    }

    const content = JSON.parse(entry.content.toString());
    if (typeof content.commitment !== 'string') {
        throw new Error(`Invalid commitment value in ${entry.hashHex()}.`);
    }

    return {
        type: 'commit',
        identity: entry.extIds[1].toString('hex'),
        data: content.commitment,
        blockContext: entry.blockContext
    };
}


function parseVoteRevealEntry(entry) {
    if (entry.extIds.length !== 2) {
        throw new Error(`Invalid number of external ids for vote reveal entry ${entry.hashHex()}.`);
    }
    if (entry.extIds[0].toString() !== 'factom-vote-reveal') {
        throw new Error(`Invalid header for vote reveal entry ${entry.hashHex()}.`);
    }

    const reveal = JSON.parse(entry.content.toString());
    if (!validateVote(reveal)) {
        throw new Error('Vote reveal validation error:\n' + JSON.stringify(validateVote.errors));
    }

    return {
        type: 'reveal',
        identity: entry.extIds[1].toString('hex'),
        data: reveal,
        blockContext: entry.blockContext
    };
}

module.exports = { parseVote, parseVoteChain, parseVoteChainEntry, parseEligibleVotersChain };