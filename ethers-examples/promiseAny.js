const { ethers } = require('ethers')

//load env file
require('dotenv').config()

const { wrapRPCPromiseWithReject } = require('./wrappers')

const main = async () => {
  const DEDICATED_NODE_RPC = process.env.DEDICATED_NODE_RPC
  const BACKUP_NODE_RPC = process.env.BACKUP_NODE_RPC

  let mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)
  const backupProvider = new ethers.providers.JsonRpcProvider(BACKUP_NODE_RPC)

  let prom1, prom2, res1, res2, res3, res4

  prom1 = wrapRPCPromiseWithReject(
    mainProvider.getBlockNumber(),
    mainProvider.connection.url
  )
  prom2 = wrapRPCPromiseWithReject(
    backupProvider.getBlockNumber(),
    backupProvider.connection.url
  )
  try {
    res1 = await Promise.any([prom1, prom2])
  } catch (err) {
    console.error(err)
  }
  console.log('getBlockNumber response: ', res1)

  prom1 = wrapRPCPromiseWithReject(
    mainProvider.getGasPrice(),
    mainProvider.connection.url
  )
  prom2 = wrapRPCPromiseWithReject(
    backupProvider.getGasPrice(),
    backupProvider.connection.url
  )
  try {
    res2 = await Promise.any([prom1, prom2])
  } catch (err) {
    console.error(err)
  }
  console.log('getGasPrice response:', res2)
  // force an error
  mainProvider = new ethers.providers.JsonRpcProvider(
    'https://bad-rpc-endpoint/12345'
  )

  prom1 = wrapRPCPromiseWithReject(
    mainProvider.getFeeData(),
    mainProvider.connection.url
  )
  prom2 = wrapRPCPromiseWithReject(
    backupProvider.getFeeData(),
    backupProvider.connection.url
  )
  try {
    res3 = await Promise.any([prom2, prom1])
  } catch (err) {
    console.error(err)
  }
  console.log('getFeeData response:', res3)

  // fix main provider
  mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)

  prom1 = wrapRPCPromiseWithReject(
    mainProvider.getNetwork(),
    mainProvider.connection.url
  )
  prom2 = wrapRPCPromiseWithReject(
    backupProvider.getNetwork(),
    backupProvider.connection.url
  )
  try {
    res4 = await Promise.any([prom2, prom1])
  } catch (err) {
    console.error(err)
  }
  console.log('getNetwork response: ', res4)
}

main()
