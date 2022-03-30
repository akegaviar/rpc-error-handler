## How to handle RPC errors without a load balancer

A very common scenario that our users asked us, is how to handle errors when sending RPC requests to their nodes.

In Chainstack, we offer tailored load balancing in the enterprise plan but not all users and projects can opt for that so we've decided to share some examples that you can apply at the application level.

## The problem

When RPC requests to a blockchain node, it's possible that some of them fail or timeout. Although this is a rare scenario, this can have a big impact in some applications like artitrage bots. In our enterprise plan, all requests go through a load balancer which makes sure that they hit a live node. However, other plans do not have load balancing enabled so handling this scenarios must be done at the application level.

Note: to test this, I created a few code snippets that send sequential RPC requests and use all the solutions provided below. You can find the code in [the following GitHub repository](https://github.com/uF4No/rpc-error-handler).

## Duplicate requests and use promises

One of the ways to handle this is to send the same request multiple times to different endpoints by using two ethers providers, each one with a different RPC endpoint. Then we can use multiple Javascript Promise methods to handle the promises.

### Promise.all

The first thing we need is a wrapper method that receives the promise and catches any errors.

```js
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
```

We can use `Promise.all()` to wait until all requests have completed and their correspondent promises fullfilled or rejected. The problem with this approach is that we'd have to manually check which one of the promises returned a valid response. In the example snippet, we're forcing an error in after the first two RPC requests.

```js
let mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)
const backupProvider = new ethers.providers.JsonRpcProvider(BACKUP_NODE_RPC)

let prom1, prom2, res1

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
```

**By catching errors in the `wrapRPCPromise` method, `Promise.all` will not fail and we can get a valid response from one of the providers.**

This is a good first approach but it has its **drawbacks: we're duplicating requests and we have to manually check which of the providers (or which of the promises) returned a valid reponse.** `Promise.all` will wait until all promises are fulfilled/rejected so we'll not get the benefit of a faster reponse from one of the nodes.

[You can find the code sample here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseAll.js)

### Promise.race

One of the solutions we've seen some of our clients use (shoutout to Novel team), is with `Promise.race`, which will continue as soon as one of the promises fulfills or gets rejected.

```js
let mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)
const backupProvider = new ethers.providers.JsonRpcProvider(BACKUP_NODE_RPC)

let prom1, prom2, res1

prom1 = wrapRPCPromise(
  mainProvider.getBlockNumber(),
  mainProvider.connection.url
)
prom2 = wrapRPCPromise(
  backupProvider.getBlockNumber(),
  backupProvider.connection.url
)
try {
  res1 = await Promise.race([prom1, prom2])
} catch (err) {
  console.error(err)
}
console.log('getBlockNumber response: ', res1)
```

This makes this solution faster but at the same time, that's its drawback. **If one requests fails before the other one succeeds, the result we'll get will be the error returned** 😕

[You can find the code sample here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseRace.js)

### Promise.any

Finally, with `Promise.any` we get the best of both. **It'll return a single promise that resolves as soon as any of the promises fulfills,** ignoring the errors. The only thing we have to change is the `wrapRPCPromise` method to actually reject when there is an issue.

```js
let mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)
const backupProvider = new ethers.providers.JsonRpcProvider(BACKUP_NODE_RPC)

let prom1, prom2, res1

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
```

The catch? `Promise.any` **was added in Node v15** so you have to make sure you're running one of the latest versions.

[You can find the code sample here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseRace.js)

## Retrying with a function wrapper

Another option is to **simply retry the same RPC request whenever it fails, using the same endpoint and provider.**

To do this, we need to create a different wrapper function that receives the RPC request promise and a number of retries. If the promise is fulfilled, it'll simply return the response but if it fails, it'll reduce the counter of retries left and call the same method recursively.

Find below the `retryRPCPromise` method:

```js
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
```

[You can check the code snippet that uses this wrapper function here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/retryRequest.js)

## Retry wrapper with delay

A variation of the previous solution is to add a delay between each retry. We can do this by adding a `wait()` method that leverages the `setTimeout()` function and call it before each retry. Here is the wait and wrapper method:

```js
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
```

## Retrying with a backup provider

Although the solutions detailed above are a good way to handle this, they all have their drawbacks: the **Promise methods** target multiple endpoints to increase the chances of one of them being up, but **they send the same request multiple times,** which is not ideal. **With retries, we're sending single requests but we're targeting the same endpoint** so, if the node is down, all retries will fail.

The ideal solution will be a to send single RPC requests and, if it fails, send the request to a different endpoint.

We could do something like this:

```js
const { ethers } = require('ethers')

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
```

With this approach we're wrapping each request in a try/catch and, if it fails, we're sending the same request again via the backup provider, which uses a different RPC endpoint.

[You can find this code sample here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/retryBackupProvider.js)

## Retry with backup provider for smart contract methods

The previous solution is valid for general blockchain methods like `getBlockNumber` or `getGassPrice` but if we want to target smart contract methods, we'd need a more generic wrapper. Check out the example below:

```js
// list of all available RPC endpoints
const allRPCs = [BAD_RPC, DEDICATED_NODE_RPC, BACKUP_NODE_RPC]

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
    // initialise smart contract reference with a new rpc endpoint
    contract = initContractRef(contractAddress, abi, allRPCs[tryNumber])
    // execute smart contract method
    data = await contract[methodName](...params)
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
```

This method that takes care of retries using a different provider for each. Let's review it step-by-step:

1. We have a list of available RPC endpoints that the `wrapContratMethodWithRetries` method will use for each try.
2. The `wrapContratMethodWithRetries` method receives the following parameters (which are very self explanatory): contract address, contract ABI, the name of the smart contract method we want to run, the parameters required and the retry number, which defaults to 0.
3. The first thing it does is to create a smart contract instance using the utility function `initContractRef`, which receives the contract address, the ABI and the RPC endpoint, which is passed using the retryNumber as the index of the array.
4. Next, it tries to execute the smart contract method. If everything works, it returns the data but if it fails...
5. On error, it checks if we've already tried all RPC endpoints, and in that case it'll just return the error. If it can still try different endpoins, it calls itself recursively with the same parameters, only increasing the retry counter.

Then here is an example to actually invoke this method:

```js
const { wrapContratMethodWithRetries } = require('./wrappers')

// USDC smart contract address
const USDC_CONTRACT_ADDR = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDC_ABI = require('./erc20.abi.json')

const main = async () => {
  try {
    const contractMethod = 'balanceOf'
    // enter a valid wallet address here
    const methodParams = ['0x1234567890123456789012345678901234567890']
    let res
    try {
      res = await wrapContratMethodWithRetries(
        USDC_CONTRACT_ADDR,
        USDC_ABI,
        contractMethod,
        methodParams
      )
    } catch (error) {
      console.error('Unable to run contract method via any RPC endpoints')
    }
    console.log('contract method response is: ', res.toNumber())
  } catch (err) {
    console.error('ERROR')
    console.error(err)
  }
}

main()
```

[You can find this code sample here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/retryBackupContractMethod.js)

## Conclusion

There is a lot of different ways to handle this and all the solutions above have some pros and cons. Now is up to you to decide which one works best for your app. Oh! and if you have a better solution, feel free to share it with us!

Credit to [tusharsharma.dev for this article](https://tusharsharma.dev/posts/retry-design-pattern-with-js-promises) about request retries.
