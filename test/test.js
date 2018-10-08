const {getMigratedContract, expectThrow} = require('./utils');
const {generateSignature} = require('./eip712');

contract('Example', (accounts) => {
  it('should be able to pass test', async () => {  
    const exampleContract = await getMigratedContract('Example');
    await exampleContract.methods.test().send({from: accounts[0], gas: 4000000});
    assert.equal(true, true);
  });

  it('should be able to verify signature', async () => {  
    const exampleContract = await getMigratedContract('Example');
    await exampleContract.methods.test(
        'Cow', 
        '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        'Bob',
        '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        'Hello, Bob!',
        28,
        '0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d',
        '0x07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b91562'
        ).send({from: accounts[0], gas: 4000000});
    assert.equal(true, true);
  });

  it('should throw on wrong signature', async () => {  
    const exampleContract = await getMigratedContract('Example');
    await expectThrow(exampleContract.methods.test(
        'Alice', 
        '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        'Bob',
        '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        'Hello, Bob!',
        28,
        '0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d',
        '0x07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b91562'
        ).send({from: accounts[0], gas: 4000000}));
  });

  it('generated signature should succeed verification', async () => {  
    const exampleContract = await getMigratedContract('Example');
    const message = {
        from: {
            name: 'Cow',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        },
        to: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
        contents: 'Hello, Bob!',
    }
    const signature = generateSignature(message);
    exampleContract.methods.test(
        message.from.name, 
        message.from.wallet,
        message.to.name,
        message.to.wallet,
        message.contents,
        signature.v,
        signature.r,
        signature.s)
        .send({from: accounts[0], gas: 4000000});
    assert.equal(true, true);
  });

  it('using a wortng signature should fail', async () => {  
    const exampleContract = await getMigratedContract('Example');
    const message = {
        from: {
            name: 'Alice',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        },
        to: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
        contents: 'Hello, Bob!',
    }
    const signature = {
        v: 28,
        r: '0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d',
        s: '0x07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b91562'
    }
    await expectThrow(exampleContract.methods.test(
        message.from.name, 
        message.from.wallet,
        message.to.name,
        message.to.wallet,
        message.contents,
        signature.v,
        signature.r,
        signature.s)
        .send({from: accounts[0], gas: 4000000}));
  });
        
});
