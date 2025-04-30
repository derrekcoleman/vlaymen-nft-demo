//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployYourContract } from "./DeployYourContract.s.sol";
import { DeployVlaymen } from "./DeployVlaymen.s.sol";

/**
 * @notice Main deployment script for all contracts
 * @dev Run this when you want to deploy multiple contracts at once
 *
 * Example: yarn deploy # runs this script(without`--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // Deploys all your contracts sequentially
        // Add new deployments here when needed

        DeployVlaymen deployVlaymen = new DeployVlaymen();
        deployVlaymen.run();

        // Deploy another contract
        // DeployYourContract deployYourContract = new DeployYourContract();
        // deployYourContract.run();
    }
}
