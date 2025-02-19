const { encodeSqrtRatioX96, nearestUsableTick, NonfungiblePositionManager, Position, Pool } = require("@uniswap/v3-sdk");
const { ethers } = require("ethers");
const { ethers: hreEthers } = require("hardhat");
const { UNISWAP_FACTOR_ABI, UNISWAP_V3_POOL_ABI, USDT_ABI } = require("./ABI.js");
const { Percent, Token } = require("@uniswap/sdk-core");
const ERC20_ABI = require("../artifacts/contracts/ERC20.sol/FixedERC20.json").abi;
require('dotenv').config();


// FST/fakeUSD
async function main() {
    var token0Address = "0x754aA2868F824F4Ee5DB9BbfbC26a6914aF7639B"; // FST
    var token1Address = "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06"; // USDT
    // (0.05, 0.3, 1, 0.01)
    var fee = (0.3) * 10000;
    var token0Decimals = 10;
    var token1Decimals = 6;
    // $2000 $1
    var price = encodePriceSqrt(1, 30);
    // non fungibale PositionManager contract address
    // add liquidity to uniswap pool
    var npmca = '0x1238536071E1c677A632429e3655c799b22cDA52';
    var uniswapFactoryAddress = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c';
    var amount0 = ethers.parseUnits('3000', 10);
    var amount1 = ethers.parseUnits('3000', 6);
    // var amount0 = 3000 * 10000000000;
    // var amount1 = 30000 * 1000000;
    console.log({amount0, amount1})
    var chainID = 11155111;

    console.log("Started");
    const uniswapFactoryContract = await getContract(uniswapFactoryAddress, UNISWAP_FACTOR_ABI);
    const token0 = await getContract(token0Address, ERC20_ABI);
    const token1 = await getContract(token1Address, USDT_ABI);
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
    const wallet = new ethers.Wallet(provider, JSON.stringify(process.env.PRIVATE_KEY_0X))

    await Approve(amount0, amount1, token0Address, token1Address, npmca, wallet);

    var poolAddress = await uniswapFactoryContract.getPool(token0Address, token1Address, fee);

    if (poolAddress === '0x0000000000000000000000000000000000000000') {
        console.log("Creating pool.....");
        poolAddress = await createPool(uniswapFactoryContract, token0Address, token1Address, fee);

        await initializePool(poolAddress, price, wallet);
    }
    await addLiquidityToPool(poolAddress, deployer, chainID, token0Decimals, token1Decimals, token0, token1, amount0, amount1, fee, npmca);
    console.log("Added liquidity");

    console.log("Creating pool done");
}


function encodePriceSqrt(token1Price, token0Price) {
    return encodeSqrtRatioX96(token1Price, token0Price);
}

async function getContract(address, abi) {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
    const wallet  = new ethers.Wallet(process.env.PRIVATE_KEY_0X, provider)
    const contract = new ethers.Contract(address, abi, wallet);
    return contract;
}


async function Approve(amount0, amount1, token0Address, token1Address, npmca, wallet) {
    // console.log('------ ', process.env.PRIVATE_KEY_0X_0X, '------')
    // const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)

    // const wallet  = new ethers.Wallet(process.env.PRIVATE_KEY_0X, provider)
    // console.log({wallet})
    var token0 = new ethers.Contract(token0Address, ERC20_ABI, wallet);
    // const name = await token0.name()
    // console.log({name})
    const balance = await contract.balanceOf(wallet.address);
    console.log('--------------baka', {balance})
    // var token1 = new ethers.Contract(token1Address, USDT_ABI, wallet);
    console.log('approval to npmca from token0.....')
    await token0.approve(npmca, amount0);


    // console.log('approval to npmca from token1.....')
    // await token1.approve(npmca, amount1);
}

async function createPool(uniswapFactory_contract, token1Address, token2Address, fee) {
    var txs;
    txs = await uniswapFactory_contract.createPool(
        token1Address.toLowerCase(),
        token2Address.toLowerCase(),
        fee,
        {
            gasLimit: 10000000,
        }
    );
    await txs.wait();

    const poolAdd = await uniswapFactory_contract.getPool(token1Address, token2Address, fee, {
        gasLimit: 3000000,
    });
    console.log('Pool address', poolAdd);
    return poolAdd;
}

async function initializePool(poolAdd, price, signer) {
    const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, signer);

    var txs = await poolContract.initialize(price.toString(), {
        gasLimit: 3000000,
    });
    await txs.wait();
    console.log('Pool Initialized');
}

async function addLiquidityToPool(
    poolAdd,
    deployer,
    chainId,
    Token0_decimals,
    Token1_decimals,
    token_contract0,
    token_contract1,
    amount0, amount1,
    fee,
    npmca
) {
    const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, deployer);
    var state = await getPoolState(poolContract);


    const Token1 = new Token(chainId, token_contract0.address, Token0_decimals);
    const Token2 = new Token(chainId, token_contract1.address, Token1_decimals);

    const configuredPool = new Pool(
        Token1,
        Token2,
        fee,
        state.sqrtPriceX96.toString(),
        state.liquidity.toString(),
        state.tick
    );

    const position = Position.fromAmounts({
        pool: configuredPool,
        tickLower:
            nearestUsableTick(configuredPool.tickCurrent, configuredPool.tickSpacing) -
            configuredPool.tickSpacing * 2,
        tickUpper:
            nearestUsableTick(configuredPool.tickCurrent, configuredPool.tickSpacing) +
            configuredPool.tickSpacing * 2,
        amount0: amount0.toString(),
        amount1: amount1.toString(),
        useFullPrecision: false,
    });

    const mintOptions = {
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        slippageTolerance: new Percent(50, 10_000),
    };

    const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, mintOptions);

    const transaction = {
        data: calldata,
        to: npmca,
        value: value,
        from: deployer.address,
        gasLimit: 10000000
    };
    console.log('Transacting');
    const txRes = await deployer.sendTransaction(transaction);
    await txRes.wait();
    console.log('Added liquidity');
}


main().catch(console.log);

