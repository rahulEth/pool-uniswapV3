const {ethers, run} = require('hardhat');
require('dotenv').config();


async function main(){
    const name = "FixedERC20";
    const symbol = "FST";
    const decimals = 10;
    const totalSupply = 1000000000; // 1 billion tokens

     const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
     const wallet  = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
     console.log({wallet})
     const FixedERC20 = await ethers.getContractFactory("FixedERC20", wallet);
     const fixedToken = await FixedERC20.deploy(
        name,
        symbol,
        totalSupply,
        decimals
     ) 
     
     // wait for deployment

     await fixedToken.waitForDeployment();

       // Get contract address using v6 syntax
    const contractAddress = await fixedToken.getAddress();

    console.log(`FixedERC20 deployed to: ${contractAddress}`);

    // Wait for block confirmations
    const deploymentReceipt = await fixedToken.deploymentTransaction()?.wait(1);
    // Verify the contract on Etherscan
    console.log("Verifying contract on Etherscan...");
    await verify(contractAddress, [name, symbol, totalSupply, decimals]);

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function verify(contractAddress, args) {
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: args,
      });
    } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
        console.log("Contract is already verified!");
      } else {
        console.log(e);
      }
    }
  } 
  
verify("0x754aA2868F824F4Ee5DB9BbfbC26a6914aF7639B", ['FixedERC20', 'FST', 1000000000, 10]);
