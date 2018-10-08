const {getMigratedContract, expectThrow, web3} = require('./utils');
const {EIP712} = require('./eip712');
const ethUtil = require('ethereumjs-util');
// const Web3 = require('web3');


const privateKey = ethUtil.sha3('cow');
const privateKeyString = '0x' + privateKey.toString('hex'); // TODO use same private key to generate signature
const testAddress = '0x' + ethUtil.privateToAddress(privateKey).toString('hex');
// /const web3Account = web3.eth.accounts.privateKeyToAccount(privateKey);


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
    await web3.eth.sendTransaction({from: accounts[0], to: testAddress, gas : 4000000, value: 1000000000000000000});
    const exampleContract = await getMigratedContract('Example');
    const domain = {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    };
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
    const eip712 = new EIP712(
        {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            Person: [
                { name: 'name', type: 'string' },
                { name: 'wallet', type: 'address' }
            ],
            Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person' },
                { name: 'contents', type: 'string' }
            ],
        },
        'Mail', 'EIP712Domain');

    const signature = eip712.generateSignature(domain, message, privateKey);
    const txData = exampleContract.methods.test(
        message.from.name, 
        message.from.wallet,
        message.to.name,
        message.to.wallet,
        message.contents,
        signature.v,
        signature.r,
        signature.s).encodeABI();
    
    const tx = {
        to: exampleContract.options.address,
        from: testAddress,
        data: txData,
        gas: 400000
    }
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKeyString);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    assert.equal(true, true);
  });

  it('using a wrong signature should fail', async () => {  
    await web3.eth.sendTransaction({from: accounts[0], to: testAddress, gas : 4000000, value: 1000000000000000000})
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
        .send({from: accounts[0], gas: 4000000})
    );
  });

  it('generated signature with origin should succeed verification', async () => {  
    await web3.eth.sendTransaction({from: accounts[0], to: testAddress, gas : 4000000, value: 1000000000000000000});
    const exampleContract = await getMigratedContract('Example');
    const domain = {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        originHash: '0x00000000000000000000000000000000' //serve as a wild card
    };
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
    const eip712 = new EIP712(
        {
            EIP712DomainWithOrigin: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
                { name: 'originHash', type: 'bytes32' },
            ],
            Person: [
                { name: 'name', type: 'string' },
                { name: 'wallet', type: 'address' }
            ],
            Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person' },
                { name: 'contents', type: 'string' }
            ],
        },
        'Mail', 'EIP712DomainWithOrigin');

    const signature = eip712.generateSignature(domain, message, privateKey);

    // approve the origin manually :
    const approveTxData = exampleContract.methods.approveOrigin(domain.originHash).encodeABI();
    const signedApprovedTx = await web3.eth.accounts.signTransaction({
        to: exampleContract.options.address,
        from: testAddress,
        data: approveTxData,
        gas: 400000
    }, privateKeyString);
    await web3.eth.sendSignedTransaction(signedApprovedTx.rawTransaction);

    const txData = exampleContract.methods.test(
        message.from.name, 
        message.from.wallet,
        message.to.name,
        message.to.wallet,
        message.contents,
        domain.originHash,
        signature.v,
        signature.r,
        signature.s).encodeABI();
    
    const tx = {
        to: exampleContract.options.address,
        from: testAddress,
        data: txData,
        gas: 400000
    }
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKeyString);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    assert.equal(true, true);
  });
        
});