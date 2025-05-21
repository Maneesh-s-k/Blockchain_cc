// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Carbon Credit Token with Zero-Knowledge Proofs
/// @notice This contract implements a carbon credit system with privacy-preserving features
/// @dev Implements ERC20 token with ZK-SNARK verification for privacy in trading


/// @title Carbon Credit Token Contract
/// @notice Manages the creation, trading, and burning of carbon credits with privacy features
/// @dev Inherits from ERC20, Ownable, and ReentrancyGuard for secure token operations
contract CCtoken is ERC20, Ownable, ReentrancyGuard {

    /// @notice Conversion rate from energy units to carbon credits (10 kWh = 1 Carbon Credit)
    uint256 public ENERGY_TO_CREDIT_CONVERSION = 100; // 100 kWh = 1 Carbon Credit

    /// @notice govt wallet address 
    address public GovtWallet = 0x0AfA610B923e7CF8DD4F0e929b5f0cd91C1A4d9e; // Random test wallet address for now 


    /// @notice Floor Price
    uint256 public FloorPricePerToken = 0.00000000001 ether;

    /// @notice Maps producer addresses to their smart meter data at different timestamps
    mapping(address => mapping(uint256 => uint256)) public smartMeterData;

    /// @notice Keeps track of the registered devices 
    mapping(address=>bool) public registeredDevices;


    /// @notice Structure defining a sell order for carbon credits
    /// @param seller Address of the seller
    /// @param amount Number of tokens being sold
    /// @param pricePerToken Price per token in wei
    /// @param fulfilled Whether the order has been fulfilled
    struct SellOrder {
        address seller;
        uint256 amount;
        uint256 pricePerToken; // Price per token in wei
        bool fulfilled;
    }

    /// @notice Array of all sell orders in the system
    SellOrder[] public sellOrders;

    /// @notice Emitted when smart meter data is logged
    event SmartMeterDataLogged(address indexed producer, uint256 timestamp, uint256 energyProduced, address indexed device);

    /// @notice Emitted when carbon credits are minted
    event CarbonCreditsMinted(address indexed producer, uint256 energyProduced, uint256 creditsMinted);

    /// @notice Emitted when a new sell order is placed
    event SellOrderPlaced(uint256 orderId, address indexed seller, uint256 amount, uint256 pricePerToken);

    /// @notice Emitted when a sell order is fulfilled
    event SellOrderFulfilled(uint256 orderId, address indexed buyer, uint256 amount, uint256 totalPaid);

    /// @notice Emitted when credits are burned
    event CreditsBurned(address indexed account, uint256 amount);

    /// @notice Emitted when credits are burned with a specific reason
    event CreditsBurnedWithReason(address indexed account, uint256 amount, string reason);

    /// @notice Emitted when a new device is registerd 
    event DeviceRegistered(address device);

    /// @notice Emitted when a device is removed 
    event DeviceDeregistered(address device);

    /// @notice Credits minted by owner in special cases or for testing purposes 
    event CCTMintedByOwner(address indexed account, uint256 amountMinted );

    /// @notice Event for the entire batch operation
    event BatchOrdersFulfilled(address indexed buyer, uint256[] orderIds, uint256 totalCost );


    constructor() 
        ERC20("Carbon Credit Token", "CCT") 
        Ownable(msg.sender) 
        ReentrancyGuard()    
    {}

    /// @notice Registers devices that can log the data to the chain 
    /// @param device Address of the device which will be unique to itself
    function registerDevice(address device) public onlyOwner {
        registeredDevices[device] = true;
        emit DeviceRegistered(device);
    }

    /// @notice De- Registers devices 
    /// @param device Address of the device which will be unique to itself
    function deregisterDevice(address device) public onlyOwner {
        registeredDevices[device] = false;
        emit DeviceDeregistered(device);

    }

    function changeEnergyToCreditRatio(uint256 newRatio) external onlyOwner {
        ENERGY_TO_CREDIT_CONVERSION = newRatio;
    }

    function changeGovtWallet(address newAddress) external onlyOwner {
        GovtWallet = newAddress;
    }

    function changeFloorPricePerToken(uint256 newPrice) external onlyOwner {
        FloorPricePerToken = newPrice;
    }
    
    /// @notice Logs smart meter data for a producer
    /// @param producer Address of the energy producer
    /// @param timestamp Time when the energy was produced
    /// @param energyProduced Amount of energy produced in kWh
    function logSmartMeterData(
        address producer,
        uint256 timestamp,
        uint256 energyProduced
    ) external returns (bool success){
        require(registeredDevices[msg.sender], "Device not registered");
        require(energyProduced > 0, "Energy produced must be greater than 0");
        require(smartMeterData[producer][timestamp] == 0, "Data already logged for this timestamp and Credits have been earned");

        smartMeterData[producer][timestamp] = energyProduced;
        
        emit SmartMeterDataLogged(producer, timestamp, energyProduced, msg.sender);
        return true;
    }

    /// @notice Allows producers to earn carbon credits based on their energy production
    /// @param energyProduced Amount of energy produced in kWh
    /// @param timestamp Time when the energy was produced
    function earnCarbonCredit(uint256 energyProduced, uint256 timestamp) external returns (uint256 creditsEarned){
        require(energyProduced > 0, "Energy produced must be greater than 0");

        uint256 recordedEnergy = smartMeterData[msg.sender][timestamp];
        require(recordedEnergy > 0, "No smart meter data for this timestamp");
        require(recordedEnergy >= energyProduced, "Claim exceeds recorded energy");

        uint256 creditsToMint = energyProduced * 1e18 / ENERGY_TO_CREDIT_CONVERSION;
        require(creditsToMint > 0, "Energy produced is insufficient for a single credit");

        smartMeterData[msg.sender][timestamp] -= energyProduced;
        _mint(msg.sender, creditsToMint);

        emit CarbonCreditsMinted(msg.sender, energyProduced, creditsToMint);
        return creditsToMint;
    }


    /// @notice Places a sell order with ZK-SNARK proof for privacy
    /// @param amountToSell Number of tokens to sell 
    /// @param pricePerToken Price per token in wei
    function placeSellOrder(
        uint256 amountToSell,
        uint256 pricePerToken
    ) external returns (uint256 orderId){
        require(pricePerToken >= FloorPricePerToken, "Price per token can't be less than the floor proce of the market");
        require(balanceOf(msg.sender) >= amountToSell, "Insufficient balance");
        // Ensure the contract is approved to spend the seller's tokens
        require(allowance(msg.sender, address(this)) >= amountToSell, "Contract not approved to spend seller's tokens");

        sellOrders.push(SellOrder({
            seller: msg.sender,
            amount: amountToSell,
            pricePerToken: pricePerToken,
            fulfilled: false
        }));

        emit SellOrderPlaced(sellOrders.length - 1, msg.sender, amountToSell, pricePerToken);
        return (sellOrders.length - 1) ;
    }

    /// @notice Fulfills an existing sell order
    /// @param orderId ID of the order to fulfill
    /// @param amountToBuy is the amount from the order that needs to be fulfilled 
    function fulfillSellOrder(uint256 orderId, uint256 amountToBuy) external payable nonReentrant returns (bool) {

        require(orderId < sellOrders.length, "Invalid order ID");
        SellOrder storage order = sellOrders[orderId];

        // Checks
        require(!order.fulfilled, "Order already fulfilled");
        require(amountToBuy > 0 && amountToBuy <= order.amount, "Invalid purchase amount");

        uint256 totalPrice = (amountToBuy * order.pricePerToken) / 1e18;

        require(msg.value == totalPrice, "Incorrect payment amount");
        require(balanceOf(order.seller) >= amountToBuy, "Not enough tokens in sellers account to fulfill the order");

        // Effects: Update the order state
        order.amount -= amountToBuy;
        if (order.amount == 0) {
            order.fulfilled = true; // Mark the order fully fulfilled if all tokens are purchased
        }

        // Interactions: Perform token transfer and payment
        _transfer(order.seller, msg.sender, amountToBuy);

        (bool success, ) = payable(order.seller).call{value: msg.value}("");
        require(success, "Payment transfer to seller failed");

        emit SellOrderFulfilled(orderId, msg.sender, amountToBuy, msg.value);
        return true;
    }

    function fulfillBatchOrders(
        uint256[] calldata orderIds,
        uint256[] calldata amountsToBuy,
        uint256[] calldata pricesPerToken
    ) external payable nonReentrant {
        require(orderIds.length > 0, "Empty order array");
        require(orderIds.length == amountsToBuy.length, "Mismatched order data");
        require(orderIds.length == pricesPerToken.length, "Mismatched price data");

        uint256 totalCost = 0;
        uint256 orderIdsLength = orderIds.length;

        // First pass: validate all orders and calculate total cost
        for (uint256 i = 0; i < orderIdsLength; i++) {
            uint256 orderId = orderIds[i];
            uint256 amountToBuy = amountsToBuy[i];
            uint256 pricePerToken = pricesPerToken[i];

            require(orderId < sellOrders.length, "Invalid order ID");
            SellOrder storage order = sellOrders[orderId];

            require(!order.fulfilled, "Order already fulfilled");
            require(amountToBuy > 0 && amountToBuy <= order.amount, "Invalid purchase amount");
            require(pricePerToken == order.pricePerToken, "Price mismatch");

            // Safe calculation of order cost
            uint256 orderCost = (amountToBuy * pricePerToken) / 1e18; 
            totalCost += orderCost;
        }

        // Verify total payment
        require(totalCost == msg.value, "Incorrect payment amount");

        // Second pass: update state
        for (uint256 i = 0; i < orderIdsLength; i++) {
            uint256 orderId = orderIds[i];
            uint256 amountToBuy = amountsToBuy[i];
            SellOrder storage order = sellOrders[orderId];

            // Update order state
            order.amount -= amountToBuy;
            if (order.amount == 0) {
                order.fulfilled = true;
            }
        }

        // Third pass: perform transfers
        for (uint256 i = 0; i < orderIdsLength; i++) {
            uint256 orderId = orderIds[i];
            uint256 amountToBuy = amountsToBuy[i];
            uint256 pricePerToken = pricesPerToken[i];
            SellOrder storage order = sellOrders[orderId];

            // Calculate cost for this order
            uint256 orderCost = (amountToBuy * pricePerToken ) / 1e18;

            // Transfer tokens
            _transfer(order.seller, msg.sender, amountToBuy);

            // Pay the seller
            (bool success, ) = payable(order.seller).call{value: orderCost}("");
            require(success, "Payment to seller failed");

            emit SellOrderFulfilled(orderId, msg.sender, amountToBuy, orderCost);
        }

        emit BatchOrdersFulfilled(msg.sender, orderIds, totalCost);
    }


    /// @notice Burns token of account by owner(owner only)
    /// @param account Address whose credits are being burned
    /// @param amount Amount of credits to burn
    /// @param reason Reason for burning the credits
    function OwnerburnCredits(address account, uint256 amount, string calldata reason) external onlyOwner {
        require(bytes(reason).length > 0, "Reason must be provided");

        _burn(account, amount);

        emit CreditsBurnedWithReason(account, amount, reason);
    }

    function UtilizeCarbonCredit(uint256 amt) external nonReentrant {
        require(amt > 0, "amount must be greater than zero");
        require(balanceOf(msg.sender) >= amt, "Not Enough CCT in account to Utilize/Claim ") ;
        _burn(msg.sender, amt);
    }

    function mintCCT (address account, uint256 amount) external onlyOwner {
        require(account != address(0), "Not a valid address");
        _mint(account,amount);
        emit CCTMintedByOwner(account,amount);
    } 

}
