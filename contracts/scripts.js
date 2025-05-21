async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Correct contract factory variable name (must match contract name in Solidity)
  const CCtokenFactory = await ethers.getContractFactory("CCtoken");

  // Deploy the contract (add constructor arguments if needed)
  const ccToken = await CCtokenFactory.deploy();

  await ccToken.deployed();

  console.log("Contract deployed at:", ccToken.target || ccToken.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
