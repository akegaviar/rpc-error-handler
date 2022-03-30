const { ethers } = require('ethers')

//load env file
require('dotenv').config()

const DEDICATED_NODE_RPC = process.env.DEDICATED_NODE_RPC
const BACKUP_NODE_RPC = process.env.BACKUP_NODE_RPC

let mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)
const backupProvider = new ethers.providers.JsonRpcProvider(BACKUP_NODE_RPC)

const main = async () => {
  try {
    //
    let res1, res2, res3
    try {
      res1 = await mainProvider.getBlockNumber()
    } catch (error) {
      console.error('Main provider failed')
      res1 = await backupProvider.getBlockNumber()
    }

    console.log('getBlockNumber response: ', res1)
    // force an error
    mainProvider = new ethers.providers.JsonRpcProvider(
      'https://bad-rpc-endpoint/12345'
    )
    try {
      res2 = await mainProvider.getGasPrice()
    } catch (error) {
      console.error('Main provider failed')
      res2 = await backupProvider.getGasPrice()
    }
    console.log('getGasPrice response: ', res2)

    // fix  provider
    mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)
    try {
      res3 = await mainProvider.getNetwork()
    } catch (error) {
      console.error('Main provider failed')
      res3 = await backupProvider.getNetwork()
    }
    console.log('getNetwork response: ', res3)
  } catch (err) {
    console.error(err)
  }
}

main()
