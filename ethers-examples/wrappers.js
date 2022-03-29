/**
 * @param {*} promise An RPC request promise to be resolved
 * @param {*} origin URL of the node
 * @returns resolved promise
 */
const wrapRPCPromise = async (promise, origin) => {
  try {
    const data = await promise
    return { result: data, origin }
  } catch (error) {
    console.error('Error running method')

    return new Error('Ops, there was an issue')
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
    return retryPromise(promise, retriesLeft - 1)
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
async function retryPromiseWithDelay(promise, retriesLeft, delay) {
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
    return retryPromiseWithDelay(promise, retriesLeft - 1, 1000)
  }
}

module.exports = { retryPromiseWithDelay, retryRPCPromise, wrapRPCPromise }
