const assert = require('chai').assert,
    { FactomCli } = require('factom'),
    sinon = require('sinon'),
    nacl = require('tweetnacl'),
    { sign } = nacl,
    { walletdIdentityPublicKeysResolver,
        walletdIdentityPrivateKeyResolver,
        getVoteIdentity,
        getPublicIdentityKey,
        getSecretIdentityKey,
        isValidIdentityKey,
        isValidPublicIdentityKey,
        verifyIdentityKeyAssociation,
        getSignature,
        isValidSecretIdentityKey } = require('../src/factom-identity');

describe('Factom digital identities', function () {

    it('Should validate identity key', function () {
        assert.isTrue(isValidIdentityKey('idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w'));
        assert.isTrue(isValidIdentityKey('idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS'));
        assert.isFalse(isValidIdentityKey('idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbK'));
    });

    it('Should validate public identity key', function () {
        assert.isTrue(isValidPublicIdentityKey('idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w'));
        assert.isTrue(isValidPublicIdentityKey('idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz'));
        assert.isFalse(isValidPublicIdentityKey('idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS'));
    });

    it('Should validate secret identity key', function () {
        assert.isTrue(isValidSecretIdentityKey('idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS'));
        assert.isTrue(isValidSecretIdentityKey('idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4'));
        assert.isFalse(isValidSecretIdentityKey('idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w'));
    });

    it('Should get public identity key', function () {
        assert.equal(getPublicIdentityKey('idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4'), 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz');
        assert.equal(getPublicIdentityKey('idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS'), 'idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w');
        assert.equal(getPublicIdentityKey('idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w'), 'idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w');
    });

    it('Should get secret identity key', async function () {
        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('walletdApi')
            .once()
            .withArgs('identity-key', { public: 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz' })
            .returns(Promise.resolve({ secret: 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4' }));
        mock.expects('walletdApi')
            .once()
            .withArgs('identity-key', { public: 'idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w' })
            .returns(Promise.resolve({ secret: 'idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS' }));

        const privateKeyResolver = walletdIdentityPrivateKeyResolver.bind(null, cli);
        assert.equal(await getSecretIdentityKey(privateKeyResolver, 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz'), 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4');
        assert.equal(await getSecretIdentityKey(privateKeyResolver, 'idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w'), 'idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS');
        assert.equal(await getSecretIdentityKey(privateKeyResolver, 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4'), 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4');

        mock.verify();
    });

    it('Should get vote identity with secret key', async function () {
        const CHAIN_ID = '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635',
            PUB_KEY = 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz',
            SEC_KEY = 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4';

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('walletdApi')
            .once()
            .withArgs('identity-key', { public: PUB_KEY })
            .returns(Promise.resolve({ secret: SEC_KEY }));
        mock.expects('walletdApi')
            .once()
            .withArgs('active-identity-keys', { chainid: CHAIN_ID, height: undefined })
            .returns(Promise.resolve({ keys: [PUB_KEY] }));

        const resolvers = {
            publicKeysResolver: walletdIdentityPublicKeysResolver.bind(null, cli),
            privateKeyResolver: walletdIdentityPrivateKeyResolver.bind(null, cli)
        };

        const voteIdentity = await getVoteIdentity(resolvers, { chainId: CHAIN_ID, key: PUB_KEY });

        mock.verify();
        assert.equal(voteIdentity.id, CHAIN_ID);
        assert.deepEqual(voteIdentity.publicKey, Buffer.from('c103756200d0c1223c0ee9911196bf06de6ee570b0f45897e2ef39f9abf39d24', 'hex'));
        assert.deepEqual(voteIdentity.secretKey, Buffer.from('67fe571d8cbad2c0d0d10b295301eaf631d43ff82f21c7f161448f220ad22c66', 'hex'));
    });


    it('Should get vote identity with custom signer', async function () {
        const CHAIN_ID = '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635',
            PUB_KEY = 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz';

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('walletdApi')
            .once()
            .withArgs('active-identity-keys', { chainid: CHAIN_ID, height: undefined })
            .returns(Promise.resolve({ keys: [PUB_KEY] }));

        const resolvers = {
            publicKeysResolver: walletdIdentityPublicKeysResolver.bind(null, cli),
        };

        const voteIdentity = await getVoteIdentity(resolvers, { chainId: CHAIN_ID, key: PUB_KEY, sign() { } });

        mock.verify();
        assert.equal(voteIdentity.id, CHAIN_ID);
        assert.deepEqual(voteIdentity.publicKey, Buffer.from('c103756200d0c1223c0ee9911196bf06de6ee570b0f45897e2ef39f9abf39d24', 'hex'));
        assert.isFunction(voteIdentity.sign);
    });

    it('Should accept identity key association at current height', async function () {
        const cli = new FactomCli();
        const mock = sinon.mock(cli);

        expectIdentityKeysAtHeightCall(mock, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', undefined, 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz');

        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        await verifyIdentityKeyAssociation(publicKeysResolver, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz');

        mock.verify();
    });

    it('Should accept identity key association at given height', async function () {
        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('getHeights').never();
        expectIdentityKeysAtHeightCall(mock, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 7, 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz');

        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        await verifyIdentityKeyAssociation(publicKeysResolver, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz', 7);

        mock.verify();
    });

    it('Should reject identity key association', async function () {
        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        expectIdentityKeysAtHeightCall(mock, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 7, 'idpub3bjJcyp2CgzamFdCdpM7JBLuWoBz7kdk7iHKwDXb3i7qaap848');
        const publicKeysResolver = walletdIdentityPublicKeysResolver.bind(null, cli);

        try {
            await verifyIdentityKeyAssociation(publicKeysResolver, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz', 7);
        } catch (e) {
            assert.instanceOf(e, Error);
            mock.verify();
            return;
        }

        throw new Error('Should have throw');
    });

    it('Should sign using private key', async function () {
        const identity = sign.keyPair();
        const message = nacl.randomBytes(32);
        const sig = getSignature(identity, message);

        assert.isTrue(sign.detached.verify(message, sig, identity.publicKey));
    });

    it('Should sign using custom signer', async function () {
        const publicKey = Buffer.from('a1597a9808b2be2548d7f29c7fcd884a52916aca4bbe442118044e294c2de971', 'hex');
        const identity = {
            publicKey,
            sign: (data) => sign.detached(data, Buffer.from('11de38af16cfc79c0827d7671b501560bfe4161e1801c6db6a4128aa0013d3ffa1597a9808b2be2548d7f29c7fcd884a52916aca4bbe442118044e294c2de971', 'hex'))
        };
        const sig = getSignature(identity, Buffer.from('dummy'));

        assert.equal(sig.toString('hex'), 'ce88857fbacb8eaa8afffbc90d2ef9ee79d5b79a80d182942e098bf0feac092ca0630a5e2bfe0d4e6e7eee704fe714db6a010c99f4f1f178f3fbeb430fefc40d');
    });

    function expectIdentityKeysAtHeightCall(mock, chainId, height, key, exactly) {
        mock.expects('walletdApi')
            .exactly(exactly || 1)
            .withArgs('active-identity-keys', {
                chainid: chainId,
                height: height
            })
            .returns(Promise.resolve({ keys: [key] }));
    }
});