const { ethers } = require('ethers')

//load env file
require('dotenv').config()

const { retryRPCPromiseWithDelay } = require('./wrappers')

const DEDICATED_NODE_RPC = process.env.DEDICATED_NODE_RPC

let mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)

const main = async () => {
  try {
    //
    let res1, res2, res3
    try {
      res1 = await retryRPCPromiseWithDelay(
        mainProvider.getBlockNumber(),
        3,
        500
      )
    } catch (error) {
      console.error('All retries failed')
    }

    console.log('getBlockNumber response: ', res1)
    // force an error
    mainProvider = new ethers.providers.JsonRpcProvider(
      'https://bad-rpc-endpoint/12345'
    )
    try {
      res2 = await retryRPCPromiseWithDelay(mainProvider.getGasPrice(), 3, 500)
    } catch (error) {
      console.error('All retries failed')
    }
    console.log('getGasPrice response: ', res2)

    // fix  provider
    mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)
    try {
      res3 = await retryRPCPromiseWithDelay(mainProvider.getNetwork(), 3, 500)
    } catch (error) {
      console.error('All retries failed')
    }
    console.log('getNetwork response: ', res3)
  } catch (err) {
    console.error(err)
  }
}

main()
