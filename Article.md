## How to handle RPC errors without a load balancer

A very common scenario that our users asked us, is how to handle errors when sending RPC requests to their nodes.

In Chainstack, we offer tailored load balancing in the enterprise plan but not all users and projects can opt for that so we've decided to share some examples that you can apply at the application level.

## The problem

When RPC requests to a blockchain node, it's possible that some of them fail or timeout. Although this is a rare scenario, this can have a big impact in some applications like artitrage bots. In our enterprise plan, all requests go through a load balancer which makes sure that they hit a live node. However, other plans do not have load balancing enabled so handling this scenarios must be done at the application level.

Note: to test this, I created a few code snippets that send sequential RPC requests and use all the solutions provided below. You can find the code in [the following GitHub repository](https://github.com/uF4No/rpc-error-handler).

## Duplicate requests and use promises

One of the ways to handle this is to send the same request multiple times to different endpoints
by using two ethers providers, each one with a different RPC endpoint. Then we can use multiple Javascript Promise methods to handle the promises.

### Promise.all

We can use `Promise.all()` to wait until all requests have completed and their correspondent promises fullfilled or rejected. The problem with this approach is that we'd have to manually check which one of the promises returned a valid response. In the example snippet, we're forcing an error in after the first two RPC requests. **By catching the error in the `wrapRPCPromise` method, `Promise.all` does not fail and we can get a valid response from one of the providers.**

This is a good first approach but it has its drawbacks: we're duplicating requests and we have to manually check which of the providers (or which of the promises) returned a valid reponse. `Promise.all` will wait until all promises are fulfilled/rejected so we'll not get the benefits of a faster reponse from one of the nodes.

[Download code snippet here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseAll.js)

### Promise.race

One of the solutions we've seen some of our clients use (shoutout to Novel team), is with `Promise.race`, which will continue as soon as one of the promises fulfills or gets rejected. This makes this solution faster but at the same time, that's its drawback. If one requests fails before the other one succeeds, the result we'll get will be the error returned 😕

[Download code snippet here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseRace.js)

### Promise.any

Finally, with `Promise.any` we get the best of both. It'll return a single promise that resolves as soon as any of the promises fulfills, ignoring the errors. The only thing we have to change is the `wrapRPCPromise` method to actually reject when there is an issue.

The catch? `Promise.any` **was added in Node v15** so you have to make sure you're running one of the latest versions.

[Download code snippet here](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseRace.js)

## Retrying with a function wrapper

Another option is to simply retry the same RPC request whenever it fails, using the same endpoint and provider. To do this, we need to create a different wrapper function that receives the RPC request promise and a number of retries. If the promise is fulfilled, it'll simply return the response but if it fails, it'll reduce the counter of retries left and call the same method recursively.

Find below the retryPromise method:

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

Inspired [in this article](https://tusharsharma.dev/posts/retry-design-pattern-with-js-promises)

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

## Retrying with a fallback provider

Although the solutions detailed above are a good way to handle this, they all have their drawbacks: the Promise methods target multiple endpoints to increase the chances of one of them being up, but they send the same request multiple times, which is not ideal. With retries, we're sending single requests but we're targeting the same endpoint so, if the node is down, all retries will fail.

The ideal solution will be a to send single requests and, if it fails, send the retries to a different endpoint.

We can do something like this:

```js

```

With this approach we have a method to initialise a provider that uses multiple endpoints. Whenever there is an error, we can catch it and re-initialise the provider with a different endpoint.
