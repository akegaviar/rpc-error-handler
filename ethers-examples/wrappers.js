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

    console.log(`${retriesLeft} retries left`)
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
    console.log(`${retriesLeft} retries left`)
    // wait for delay
    await wait(delay)
    // following retries after 1000ms
    return retryRPCPromiseWithDelay(promise, retriesLeft - 1, 1000)
  }
}

async function initProvider(provider) {
  // reset
  isAlive = false
  retries = 0

  console.log('Initialising Ethers provider', retries)

  while (!isAlive) {
    if (retries > endpoints.length) {
      console.log('All nodes are down!')
      break
    }
    try {
      console.log(`${retries} try, now with enpoint ${endpoints[retries]}`)
      // for WSS
      // ethersProvider = new ethers.providers.WebSocketProvider(endpoints[retries])

      // For HTTP providers
      ethersProvider = new ethers.providers.JsonRpcProvider(endpoints[retries])

      // ethersProvider.ready() does not work 😕
      isAlive = await ethersProvider.getBlockNumber()
      console.log('isAlive :>> ', isAlive)
    } catch (error) {
      console.error('Error initialising provider')
      retries++
    }
  }
}

module.exports = {
  wrapRPCPromise,
  wrapRPCPromiseWithReject,
  retryRPCPromise,
  retryRPCPromiseWithDelay,
}
