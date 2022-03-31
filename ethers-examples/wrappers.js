const { ethers } = require('ethers')

//load env file
require('dotenv').config()

const DEDICATED_NODE_RPC = process.env.DEDICATED_NODE_RPC
const BACKUP_NODE_RPC = process.env.BACKUP_NODE_RPC
const BAD_RPC = 'https://bad-rpc-endpoint/12345'

const allRPCs = [BAD_RPC, DEDICATED_NODE_RPC, BACKUP_NODE_RPC]

/**
 * @param {*} promise An RPC request promise to be resolved
 * @param {*} origin URL of the node
 * @returns resolved promise
 */
async function wrapRPCPromise(promise, origin) {
  try {
    const data = await promise
    return { result: data, origin }
  } catch (error) {
    console.error('Error running method')

    return new Error('Ops, there was an issue')
  }
}

/**
 * @param {*} promise An RPC request promise to be resolved
 * @param {*} origin URL of the node
 * @returns resolved promise
 */
async function wrapRPCPromiseWithReject(promise, origin) {
  try {
    const data = await promise
    return { result: data, origin }
  } catch (error) {
    console.error('Error running method')

    return Promise.reject(error)
  }
}

/**
 * @param promise An RPC request promise to be resolved
 * @retriesLeft Number of tries before rejecting
 * @returns resolved promise
 */
async function retryRPCPromise(promise, retriesLeft) {
  try {
    // try to resolve the promise
    const data = await promise
    // if resolved simply return the result
    return data
  } catch (error) {
    // if no retries left, return error
    if (retriesLeft === 0) {
      return Promise.reject(error)
    }

    console.log(`RPC request failed. ${retriesLeft} retries left`)
    // if there are retries left, reduce counter and
    // call same function recursively
    return retryRPCPromise(promise, retriesLeft - 1)
  }
}

/**
 * @param ms miliseconds to wait
 * @returns empty promise after delay
 */
function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

/**
 * @param promise An RPC method promise to be resolved
 * @retriesLeft Number of tries before rejecting
 * @returns resolved promise
 */
async function retryRPCPromiseWithDelay(promise, retriesLeft, delay) {
  try {
    // try to resolve the promise
    const data = await promise
    // if resolved simply return the result
    return data
  } catch (error) {
    // if no retries left, return error
    if (retriesLeft === 0) {
      return Promise.reject(error)
    }

    // if there are retries left, reduce counter and
    // call same function recursively
    console.log(`RPC request failed. ${retriesLeft} retries left`)
    // wait for delay
    await wait(delay)
    // following retries after 1000ms
    return retryRPCPromiseWithDelay(promise, retriesLeft - 1, 1000)
  }
}
/**
 *
 * @param {*} contractAddress blockchain address of the smart contract
 * @param {*} abi smart contract JSON ABI
 * @param {*} rpc RPC endpoint
 * @returns a contract instance to execute methods
 */
function initContractRef(contractAddress, abi, rpc) {
  // init provider
  const provider = new ethers.providers.JsonRpcProvider(rpc)
  // init contract
  const contract = new ethers.Contract(contractAddress, abi, provider)
  return contract
}

/**
 *
 * @param {*} contractAddress blockchain address of the smart contract
 * @param {*} abi smart contract JSON ABI
 * @param {*} methodName name of the smart contract method to run
 * @param {*} params parameters required for the smart contract method
 * @param {*} tryNumber default to 0. Each retry adds one, which uses a different RPC endpoint
 * @returns
 */
async function wrapContratMethodWithRetries(
  contractAddress,
  abi,
  methodName,
  params,
  tryNumber = 0
) {
  try {
    let contract, data

    console.log(`Running contract method via ${allRPCs[tryNumber]}`)
    contract = initContractRef(contractAddress, abi, allRPCs[tryNumber])

    data = await contract[methodName](...params)
    console.log('data', data)
    return data
  } catch (error) {
    if (tryNumber > allRPCs.length - 1) {
      return Promise.reject(error)
    }
    console.error('Error in contract method, retrying with different RPC')
    return wrapContratMethodWithRetries(
      contractAddress,
      abi,
      methodName,
      params,
      tryNumber + 1
    )
  }
}

module.exports = {
  wrapRPCPromise,
  wrapRPCPromiseWithReject,
  retryRPCPromise,
  retryRPCPromiseWithDelay,
  wrapContratMethodWithRetries,
}
