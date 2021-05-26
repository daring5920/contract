/* global describe it beforeEach overwriteArtifact ethers */
const { expect } = require('chai');
const hre = require('hardhat');
const poseidonGenContract = require('circomlib/src/poseidon_gencontract');
const { MerkleTree, Note, utils } = require('railgun-privacy.js');

const privateKey = utils.genRandomPrivateKey();
const publicKey = utils.genPublicKey(privateKey);
const railgunAccount = {
  privateKey: utils.bigInt2Buffer(privateKey),
  publicKey: utils.packPoint(publicKey),
};

let commitments;

describe('Logic/Commitments', () => {
  beforeEach(async () => {
    // Deploy Poseidon library
    await overwriteArtifact(
      'PoseidonT3',
      poseidonGenContract.createCode(2),
    );

    await overwriteArtifact(
      'PoseidonT6',
      poseidonGenContract.createCode(5),
    );

    const PoseidonT3 = await ethers.getContractFactory('PoseidonT3');
    const poseidonT3 = await PoseidonT3.deploy();
    const PoseidonT6 = await ethers.getContractFactory('PoseidonT6');
    const poseidonT6 = await PoseidonT6.deploy();

    // Deploy commitments contract
    const Commitments = await ethers.getContractFactory('CommitmentsStub', {
      libraries: {
        PoseidonT3: poseidonT3.address,
        PoseidonT6: poseidonT6.address,
      },
    });

    commitments = await Commitments.deploy();

    await commitments.initializeCommitmentsStub({
      gasLimit: 4000000,
    });
  });

  it('Should initialize the tree correctly', async () => {
    const merkleTree = new MerkleTree();

    expect(
      (await commitments.merkleRoot()),
    ).to.deep.equal(
      merkleTree.root,
    );
  });

  it('Should update the tree correctly', async () => {
    const merkleTree = new MerkleTree();

    expect(
      (await commitments.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    await commitments.addCommitmentsStub([{
      hash: 1,
      ciphertext: [1, 1, 1, 1, 1, 1],
      senderPubKey: [1, 1],
    }]);

    merkleTree.insertLeaves([1]);

    expect(
      (await commitments.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    await commitments.addCommitmentsStub([
      {
        hash: 2,
        ciphertext: [2, 2, 2, 2, 2, 2],
        senderPubKey: [2, 2],
      },
      {
        hash: 3,
        ciphertext: [3, 3, 3, 3, 3, 3],
        senderPubKey: [3, 3],
      },
      {
        hash: 4,
        ciphertext: [4, 4, 4, 4, 4, 4],
        senderPubKey: [4, 4],
      },
    ]);

    merkleTree.insertLeaves([2, 3, 4]);

    expect(
      (await commitments.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );
  });

  it('Should should generate commitment correctly', async () => {
    const merkleTree = new MerkleTree();

    expect(
      (await commitments.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );

    const note = Note.generateNote(railgunAccount.publicKey, 100n, 1n);

    await commitments.addGeneratedCommitmentStub(
      utils.unpackPoint(railgunAccount.publicKey),
      note.serial,
      note.amount,
      utils.bigInt2ETHAddress(note.token),
    );

    merkleTree.insertLeaves([note.hash]);

    expect(
      (await commitments.merkleRoot()),
    ).to.equal(
      merkleTree.root,
    );
  });
});