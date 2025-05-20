// Import required modules
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const { ethers } = require("ethers");
const fs = require("fs");
const snarkjs = require("snarkjs");
const{ JsonRpcProvider } =require("ethers");


// Import custom modules and routes
const authRoute = require("./routes/auth");
const sellOrderRoutes = require("./routes/sellOrder");
const userInfo = require("./routes/userInfo");
const otpRoutes = require("./routes/otp");
const fetchUserData = require("./Models/fetchUserData");
const removeSellOrder = require("./Models/removeSellOrder");
const removeBatchOrder = require("./Models/removeBatchOrder");
const passportStrategy = require("./passport"); // Ensure passport is configured properly here
const session = require("express-session");

// Initialize Express app
const app = express();

// Middleware configuration
app.use(bodyParser.json()); // Parse JSON body
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded body

// Cookie session configuration

app.set("trust proxy", 1); // REQUIRED for Render (behind a proxy)

// app.use(
//     session({
//         secret: "doodle", // Replace with a strong random value
//         resave: false,
//         saveUninitialized: false, // Ensure sessions are stored only after login
//         cookie: {
//             secure: true, // Only send cookies over HTTPS
//             httpOnly: true, // Prevent JavaScript access
//             sameSite: "None", // REQUIRED for cross-origin authentication
//         }
//     })
// );

app.use(
    session({
        secret: "doodle", // Replace with a strong random value
        resave: false,
        saveUninitialized: true, // Ensure sessions are stored only after login
        cookie: {
            secure: false, // Only send cookies over HTTPS
        }
    })
);


app.use(passport.initialize());
app.use(passport.session());

// Enable CORS


const corsOptions = {
    origin: ['https://blockchaindevelopment.onrender.com', 'http://localhost:5173', 'http://localhost:5178'],
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Allow credentials (cookies, sessions)
};

app.use(cors(corsOptions));
// app.use(
//     cors({
//         origin: "https://kriti-blockchain-1.onrender.com", // Adjust this to match your frontend URL
//         methods: "GET,POST,PUT,DELETE",
//         credentials: true,
//     })
// );

const contractArtifact = JSON.parse(fs.readFileSync("./CCtoken.json","utf8"));
const verifierArtifact = JSON.parse(fs.readFileSync("./Groth16Verifier.json","utf8"));

const contractABI = contractArtifact.abi;
const verifierABI = verifierArtifact.abi;


const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const VERIFIER_CONTRACT_ADDRESS = process.env.VERIFIER_CONTRACT_ADDRESS;
const OWNER_PVT_KEY = process.env.OWNER_PVT_KEY;
const INFURA_NODE_RPC_URL = process.env.INFURA_NODE_RPC_URL;
const DEVICE_PVT_KEY = process.env.DEVICE_PVT_KEY;
const GENERAL_ACCOUNT_PVT_KEY = process.env.GENERAL_ACCOUNT_PVT_KEY;


const provider = new JsonRpcProvider(INFURA_NODE_RPC_URL);
const OwnerWallet = new ethers.Wallet(OWNER_PVT_KEY, provider);
const OwnerContractInstance = new ethers.Contract(CONTRACT_ADDRESS, contractABI, OwnerWallet);

const deviceWallet = new ethers.Wallet(DEVICE_PVT_KEY, provider);
const DeviceContractInstance = new ethers.Contract(CONTRACT_ADDRESS, contractABI, deviceWallet);

const GeneralWallet = new ethers.Wallet(GENERAL_ACCOUNT_PVT_KEY,provider);

const VerifierContractInstance = new ethers.Contract(VERIFIER_CONTRACT_ADDRESS,verifierABI,GeneralWallet);

const circuitArtifacts = {
  wasmPath: "./ZZnewCircuit.wasm",
  zkeyPath: "./circuit_final.zkey",
};

// Store user data globally (use a more robust solution like Redis in production)
let storedUserData = null;
let userWalletAddress=null;
// Routes
app.post("/fetchUserData", async (req, res) => {
    try {
        const result = await fetchUserData(req.body);
        if (result.success) {
            storedUserData = result.data; // Store fetched user data
            res.status(200).json(result.data);
        } else {
            res.status(404).json(result);
        }
    } catch (err) {
        console.error("Error fetching user data:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.get("/walletAddress", async (req, res) => {
    try {
        userWalletAddress = req.query.userWalletAddress;
        if (!userWalletAddress) {
            return res.status(400).json({ success: false, message: "Wallet address is required" });
        }
        res.status(200).json({ success: true, message: "Wallet address received", walletAddress: userWalletAddress });

    } catch (err) {
        console.error("Error fetching user data:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.post('/registerDevice', async (req, res) => {
    try {
        const { deviceAddress } = req.body;
        if (!ethers.isAddress(deviceAddress)) {
            return res.status(400).json({ error: "Invalid device address" });
        }

        // Send transaction
        const tx = await OwnerContractInstance.registerDevice(deviceAddress);
        await tx.wait(); // Wait for transaction to be mined

        res.json({ success: true, txHash: tx.hash, message: "Device registered successfully" });
    } catch (error) {
        console.error("Error registering device:", error);
        res.status(500).json({ error: "Failed to register device", details: error.message });
    }
});
app.post('/removeSellOrder', async (req, res) => {
    try {
        const result = await removeSellOrder(req.body.orderId);
        if (result.success) {
            storedUserData = result.data; // Store fetched user data
            res.status(200).json(result.data);
        } else {
            res.status(404).json(result);
        }
    } catch (err) {
        console.error("Error deleteing data:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});
app.post('/removeBatchOrder', async (req, res) => {
    try {
        const result = await removeBatchOrder(req.body);
        if (result.success) {
            storedUserData = result.data; // Store fetched user data
            res.status(200).json(result.data);
        } else {
            res.status(404).json(result);
        }
    } catch (err) {
        console.error("Error deleteing data:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.post("/logSmartMeterData", async (req, res) => {
    const { userWalletAddress, energyProduced, timestamp } = req.body;
  
    // Debugging logs
    console.log("Received input:");
    console.log("userWalletAddress:", userWalletAddress);
    console.log("energyProduced:", energyProduced);
    console.log("timestamp:", timestamp);
  
    // Ensure the address is a string
    if (typeof userWalletAddress !== "string") {
      userWalletAddress = userWalletAddress.toString();
    }
  
    if (!ethers.isAddress(userWalletAddress)) {
      return res.status(400).send({ error: "Invalid Ethereum address" });
    }
  
    if (!userWalletAddress || !energyProduced || !timestamp) {
      return res.status(400).send({ error: "Missing required parameters" });
    }
  
    try {
      // Call the logSmartMeterData function
      const tx = await DeviceContractInstance.logSmartMeterData(
        userWalletAddress,
        timestamp,
        energyProduced
      );
  
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait(); // Wait for confirmation
      console.log(`Transaction confirmed: ${tx.hash}`);
  
      return res.status(200).send({ success: true, transactionHash: tx.hash });
    } catch (error) {
      console.error("Error logging smart meter data:", error);
      return res.status(500).send({ error: "Failed to log smart meter data" });
    }
  });
  
app.post("/handleGenerateAndVerifyProof", async (req, res) => {
    try {
      console.log(`amountToSell:- ${req.body.amountToSell}`);
      console.log(`totalBalance :- ${req.body.totalBalance}`);
  
      const { amountToSell, totalBalance } = req.body;
  
      if (!amountToSell || !totalBalance) {
        return res.status(400).json({ success: false, message: "Missing parameters." });
      }
  
      // Step 1: Generate witness
      const input = {
        amountToSell: amountToSell,
        totalBalance: totalBalance,
      };
  
      const { proof, publicSignals } = await generateProof(input);
  
      console.log("Proof: ");
      console.log(JSON.stringify(proof, null, 1));
  
      console.log("PublicSignal: ");
      console.log(JSON.stringify(publicSignals, null, 1));
  
      const vKey = JSON.parse(fs.readFileSync("./verification_key.json"));
      const isVerified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  
      res.json({ success: isVerified, Output: publicSignals[0] });
  
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  
  // Helper function to generate proof
  async function generateProof(input) {
    const wasm = circuitArtifacts.wasmPath;
    const zkey = circuitArtifacts.zkeyPath;
  
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input , wasm , zkey);
  
    return { proof, publicSignals };
  }

app.get("/getWalletAddress", (req, res) => {
    res.json({ walletAddress: userWalletAddress }); // Respond with the stored user data
});
app.get("/userData", (req, res) => {
    res.json(storedUserData); // Respond with the stored user data
});

app.use("/auth", authRoute);
app.use("/user_info", userInfo);
app.use("/otp", otpRoutes);
app.use("/sellOrder", sellOrderRoutes);

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server is listening on port ${port}...`));
