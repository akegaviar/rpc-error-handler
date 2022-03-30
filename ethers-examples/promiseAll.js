const { ethers } = require('ethers')

//load env file
require('dotenv').config()

const { wrapRPCPromise } = require('./wrappers')

const main = async () => {
  const DEDICATED_NODE_RPC = process.env.DEDICATED_NODE_RPC
  const BACKUP_NODE_RPC = process.env.BACKUP_NODE_RPC

  let mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)
  const backupProvider = new ethers.providers.JsonRpcProvider(BACKUP_NODE_RPC)

  let prom1, prom2, res1, res2, res3

  prom1 = wrapRPCPromise(
    mainProvider.getBlockNumber(),
    mainProvider.connection.url
  )
  prom2 = wrapRPCPromise(
    backupProvider.getBlockNumber(),
    backupProvider.connection.url
  )
  try {
    res1 = await Promise.all([prom1, prom2])
  } catch (err) {
    console.error(err)
  }
  console.log('getBlockNumber responses: ', res1)

  // force an error
  mainProvider = new ethers.providers.JsonRpcProvider(
    'https://bad-rpc-endpoint/12345'
  )

  prom1 = wrapRPCPromise(mainProvider.getFeeData(), mainProvider.connection.url)
  prom2 = wrapRPCPromise(
    backupProvider.getFeeData(),
    backupProvider.connection.url
  )
  try {
    res2 = await Promise.all([prom2, prom1])
  } catch (err) {
    console.error(err)
  }
  console.log('getFeeData responses:', res2)

  // fix main provider
  mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)

  prom1 = wrapRPCPromise(mainProvider.getNetwork(), mainProvider.connection.url)
  prom2 = wrapRPCPromise(
    backupProvider.getNetwork(),
    backupProvider.connection.url
  )
  try {
    res3 = await Promise.all([prom2, prom1])
  } catch (err) {
    console.error(err)
  }
  console.log('getNetwork responses: ', res3)
}

main()
