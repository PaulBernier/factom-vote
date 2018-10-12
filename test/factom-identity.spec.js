const assert = require('chai').assert,
    { FactomCli } = require('factom'),
    sinon = require('sinon'),
    { getVoteIdentity,
        getPublicIdentityKey,
        getSecretIdentityKey,
        isValidIdentityKey,
        isValidPublicIdentityKey,
        verifyIdentityKeyAssociation,
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

        assert.equal(await getSecretIdentityKey(cli, 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz'), 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4');
        assert.equal(await getSecretIdentityKey(cli, 'idpub2eubg6p18fefnHPW2Z42Wyre8LwqmRbHpkaEfEmJ213cUo8u7w'), 'idsec2Vn3VT8FdE1YpcDms8zSvXR4DGzQeMMdeLRP2RbMCSWCFoQDbS');
        assert.equal(await getSecretIdentityKey(cli, 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4'), 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4');

        mock.verify();
    });

    it('Should get vote identity', async function () {
        const CHAIN_ID = '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635',
            PUB_KEY = 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz',
            SEC_KEY = 'idsec1wnZ9FLheMDXZNnnDHXdqZcMiDrgg2hTNzdseNLwFnEot362c4';

        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('walletdApi')
            .once()
            .withArgs('identity-key', { public: PUB_KEY })
            .returns(Promise.resolve({ secret: SEC_KEY }));
        mock.expects('getHeights')
            .once()
            .returns(Promise.resolve({ leaderHeight: 1989 }));
        mock.expects('walletdApi')
            .once()
            .withArgs('identity-keys-at-height', { chainid: CHAIN_ID, height: 1988 })
            .returns(Promise.resolve({ keys: [PUB_KEY] }));

        const voteIdentity = await getVoteIdentity(cli, { chainId: CHAIN_ID, key: PUB_KEY });

        mock.verify();
        assert.equal(voteIdentity.id, CHAIN_ID);
        assert.deepEqual(voteIdentity.secretKey, Buffer.from('67fe571d8cbad2c0d0d10b295301eaf631d43ff82f21c7f161448f220ad22c66', 'hex'));
    });

    it('Should accept identity key association at current height', async function () {
        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('getHeights')
            .once()
            .returns(Promise.resolve({ leaderHeight: 1989 }));
        expectIdentityKeysAtHeightCall(mock, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 1988, 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz');

        await verifyIdentityKeyAssociation(cli, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz');

        mock.verify();
    });

    it('Should accept identity key association at given height', async function () {
        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        mock.expects('getHeights').never();
        expectIdentityKeysAtHeightCall(mock, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 7, 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz');

        await verifyIdentityKeyAssociation(cli, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz', 7);

        mock.verify();
    });

    it('Should reject identity key association', async function () {
        const cli = new FactomCli();
        const mock = sinon.mock(cli);
        expectIdentityKeysAtHeightCall(mock, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 7, 'idpub3bjJcyp2CgzamFdCdpM7JBLuWoBz7kdk7iHKwDXb3i7qaap848');

        try {
            await verifyIdentityKeyAssociation(cli, '2d98021e3cf71580102224b2fcb4c5c60595e8fdf6fd1b97c6ef63e9fb3ed635', 'idpub3Doj5fqXye8PkX8w83hzPh3PXbiLhrxTZjT6sXmtFQdDyzwymz', 7);
        } catch(e) {
            assert.instanceOf(e, Error);
            mock.verify();
            return;
        }

        throw new Error('Should have throw');
    });

    function expectIdentityKeysAtHeightCall(mock, chainId, height, key, exactly) {
        mock.expects('walletdApi')
            .exactly(exactly || 1)
            .withArgs('identity-keys-at-height', {
                chainid: chainId,
                height: height
            })
            .returns(Promise.resolve({ keys: [key] }));
    }
});