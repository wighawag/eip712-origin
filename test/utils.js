const Web3 = require('web3');
const web3 = new Web3();

let providerSet = false;

function getArtifact(contractName) {
  const Artifact = artifacts.require(contractName);
  if (!providerSet) {
    web3.setProvider(Artifact.web3.currentProvider);
    providerSet = true;
  }
  return Artifact;
}

module.exports = {

  web3,

  getContract: (contractName) => {
    const Artifact = getArtifact(contractName);
    const ContractInfo = Artifact._json;
    return new web3.eth.Contract(ContractInfo.abi, {data: ContractInfo.bytecode});
  },

  getMigratedContract: (contractName) => {
    return new Promise((resolve, reject) => {
      const Artifact = getArtifact(contractName);
      const ContractInfo = Artifact._json;
      web3.eth.net.getId()
        .then((networkId) => resolve(new web3.eth.Contract(ContractInfo.abi, Artifact.networks[networkId].address)))
        .catch((error) => reject(error));
    });
  },


  // Took this from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/expectThrow.js
  // Doesn't seem to work any more :(
  // Changing to use the invalid opcode error instead works
  expectThrow: async (promise) => {
    try {
      await promise;
    } catch (error) {
      // TODO: Check jump destination to destinguish between a throw
      //       and an actual invalid jump.
      const invalidOpcode = error.message.search('invalid opcode') >= 0;
      // TODO: When we contract A calls contract B, and B throws, instead
      //       of an 'invalid jump', we get an 'out of gas' error. How do
      //       we distinguish this from an actual out of gas event? (The
      //       ganache log actually show an 'invalid jump' event.)
      const outOfGas = error.message.search('out of gas') >= 0;
      const revert = error.message.search('revert') >= 0;
      assert(
        invalidOpcode || outOfGas || revert,
        'Expected throw, got \'' + error + '\' instead',
      );
      return;
    }
    assert.fail('Expected throw not received');
  }
};
