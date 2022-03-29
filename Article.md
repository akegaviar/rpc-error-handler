## How to load balance RPC requests

A very common scenario that our users asked us, is how to handle errors when sending RPC requests to their nodes.

In Chainstack, we offer tailored load balancing in the enterprise plan but not all users and project can opt for that so we've decided to share some practises you can apply at the application level.

## The problem

When using a dedicated or shared nodes, it's possible that some requests might fail or timeout. Although this is a rare scenario, this can have a big impact in some applications like artitrage bots. In our enterprise plan, all requests go through a load balancer and are sent to to a live node. However, other plans do not have load balancing enabled so handling this scenarios must be done at application level.

## Using Promises

One of the ways to handle this is to send the same RPC request multiple times to different endpoints and handle the response. There are three different Javascript Promise methods we can use for this.

### Promise.race

One of the solutions we've seen some of our clients use (shoutout to Novel team), is via Promise.race().
By initialising two different ethers providers, one with their own dedicated node RPC endpoint and another one (the backup) with one of our shared nodes endpoints (which are free up until 3 million request).
Then when sending any RPC requests they use `Promise.race()` to catch the one that finish first.

Here is an example:

```js

```

The problem with this approach is that `Promise.race()` fulfills as soon as one of the promises fulfills or rejects. That means that if one requests fails before the other one succeeds, the result we'll get will be the error returned.

### Promise.all

This approach is very similar although `Promise.all()` will wait until all requests have completed and their correspondent promises fullfilled or rejected.

The problem with this approach is that we'd have to manually check which one of the promises returned a valid response. In addition

### Promise.any

Finally,with `Promise.any()` we get the best solution. It'll return a single promise that resolves as soon as any of the promises fulfills, ignoring the errors. This means that we can

The catch? Promise.any was added in Node v15 so you have to make sure you're running one of the latest versions.

## Retrying with a function wrapper

Another option is to simply retry the same RPC request whenever it fails, using the same endpoint and provider. To do this, we need to create a wrapper function that receives the RPC request promise and a number of retries. If the promise is fulfilled, it'll simply return the response but if it fails, it'll reduce the counter of retries left and call the same method recursively.

Here is an example:

```js
const { ethers } = require('ethers')

const DEDICATED_NODE_RPC =
  'https://nd-281-758-737.int.chainstack.com/d9bbf196e5f842b185b3eedba4d7cc53'

const mainProvider = new ethers.providers.JsonRpcProvider(DEDICATED_NODE_RPC)

/**
 * @param promise An RPC method promise to be resolved
 * @retriesLeft Number of tries before rejecting
 * @desc Retries a promise n no. of times before rejecting.
 * @returns resolved promise
 */
async function retryPromise(promise, retriesLeft) {
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

const main = async () => {
  try {
    // simple RPC request to test
    const res = await retryPromise(mainProvider.getBlockNumber(), 3)

    console.log('res', res)
  } catch (err) {
    console.error(err)
  }
}

main()
```

Inspired [in this article](https://tusharsharma.dev/posts/retry-design-pattern-with-js-promises)

## Retry wrapper with delay

A variation of the previous solution is to add a delay between each retry. We can do this by adding a `wait()` method that leverages the `setTimeout()` function and call it before each retry. Here is an example:

```js
const { ethers } = require('ethers')

const DEDICATED_NODE_RPC =
  'https://nd-281-758-737.int.chainstack.com/d9bbf196e5f842b185b3eedba4d7cc53'

const mainProvider = new ethers.providers.JsonRpcProvider(BAD_NODE_RPC)

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

const main = async () => {
  try {
    // first retry after 500ms
    const res = await retryPromiseWithDelay(
      mainProvider.getBlockNumber(),
      3,
      500
    )

    console.log('res', res)
  } catch (err) {
    console.error(err)
  }
}

main()
```

## Retrying with a fallback provider

Although the solutions detailed above are a good way to handle this, they have their drawbacks: the Promise methods target multiple endpoints to make increase the chances of one of them being up, but they send the same request multiple times, which is not ideal. With retries, we're sending single requests but we're tageting the same endpoint so, if the node is down, all retries will fail.

The ideal solution will be a to send single requests and, if it fails, send the retries to a different endpoint.

We can do something like this:

```js

```

With this approach we have a method to initialise a provider that uses multiple endpoints. Whenever there is an error, we can catch it and re-initialise the provider with a different endpoint.
