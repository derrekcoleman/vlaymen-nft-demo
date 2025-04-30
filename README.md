# vlaymen NFT Demo

## 🎯 Project Overview

This project demonstrates a simple Web3 application built using Scaffold-ETH 2. The goal was to create a clean and functional tool allowing users to manage NFTs from a specific collection on the OP Sepolia testnet.

In addition to being outrageously cute, it can also:

1.  **Wallet Connection:** Integrates with RainbowKit and Wagmi, supporting MetaMask (and other wallets compatible with WalletConnect) for easy connection.
2.  **Display Owned NFTs:** Fetches and displays NFTs owned by the connected wallet address from the vlaymen NFT collection on a local anvil node or on the **OP Sepolia** testnet. Basic metadata (name, image) is shown for each NFT.
3.  **Select & Transfer NFT:** Users can select an NFT from their displayed list. A modal allows them to input a recipient address and initiate the transfer transaction via their connected wallet.
4.  **Transaction Status:** Provides visual feedback for pending, successful, and failed NFT transfer transactions.
5.  **Error Handling:** Includes basic validation to check for invalid recipient wallet addresses before attempting a transfer.

**BONUS**: Branded light & dark mode support to match our little mascot!

<img width="1047" alt="Screenshot 2025-04-30 at 2 30 32 AM" src="https://github.com/user-attachments/assets/b68a7201-93ed-4d02-bd2b-354f0d3c5d5a" />
<img width="1040" alt="Screenshot 2025-04-30 at 2 30 41 AM" src="https://github.com/user-attachments/assets/13370c5d-80d9-463d-8450-dc041be595b5" />

## 🚀 Live Demo

Want to jump straight into the fun?

[**Check out the live demo!**](https://vlaymen-nft-demo.vercel.app/)

_Heads up:_ The demo runs on the **OP Sepolia testnet**. To interact with it, you'll need some test ETH. Grab some from one of the official [Optimism Faucets](https://docs.optimism.io/app-developers/tools/build/faucets).

The verified contract address on OP Sepolia is [0xbaee5e20983614f8e5ca0f529896aec38e6e3ed4](https://sepolia-optimism.etherscan.io/address/0xbaee5e20983614f8e5ca0f529896aec38e6e3ed4).

## 💻 Local Development & Testing

Prefer to run things locally? Awesome! Just follow the steps outlined in the [Quickstart](#quickstart) section to get your local environment up and running.

### Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

### 💻 Local Development & Testing

1. Install dependencies

```
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Foundry. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `packages/foundry/foundry.toml`.

3. On a second terminal, deploy the NFT contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. To deploy on other networks, [follow these steps](https://docs.scaffoldeth.io/deploying/deploy-smart-contracts).

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`.

Now that your contract is deployed and your front-end is running, you can play around with them and enjoy typesafe hot-reloading as you go 🏎️

## Known Bugs and Limitations

- This implementation leans on ERC721Enumerable to solve the design problem of "how do I know which NFTs this particular address owns?" That gas-inefficient version is not often used, so a better version would reach for an RPC provider such as Alchemy to fetch that data. That would certainly result in faster loading times.
- Ideally I would upgrade SE-2's faucet component to "just work" on OP Sepolia as well, reducing the number of websites someone has to jump around to get started.
- Verifying on OP Sepolia can be confusing. If this were a more public demo, I would provision an OP API key to include by default.
