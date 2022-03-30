const { wrapContratMethodWithRetries } = require('./wrappers')

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
