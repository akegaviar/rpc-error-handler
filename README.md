# RPC error handling examples

This repo contains multiple examples to handle RPC errors when sending requests to blockchain nodes.

## Handle errors with Promises

Use can wrap the RPC requests in a method and use Promise.all, Promise.race or Promise.any.

- [Promise.all example](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseAll.js).
- [Promise.race example](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseRace.js).
- [Promise.any example](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/promiseAny.js).

## Retry same request

We can wrap the RPC request in a method that catches any error and use recursion to make the retries.

- [Retry example](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/retryRequest.js).

## Retry same request with delay

A modification of the previous one, just adding a delay between each retry

- [Retry with delay example](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/retryRequest.js).

## Retry with a backup provider

The retries are done using a different provider that users a different RPC endpoint.

- [Retry with backup provider](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/retryBackupProvider.js).

## Retry with backup provider for smart contract methods

Another wrapper function used to invoke smart contract methods, catch any errors and retry using a different provider and RPC endpoint.

- [Retry with backup provider for smart contracts](https://github.com/uF4No/rpc-error-handler/blob/main/ethers-examples/retryBackupProvider.js).
