import React, { useState, useEffect } from "react";
import "./RightSideBar.css";
import NetMeteringCard from "./NetMeteringCard";
import CarbonCreditCard from "./CarbonCreditCard";
import axios from "axios";

const RightSidebar = (props) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(localStorage.getItem("metamaskAccount") || null);
  const [balance, setBalance] = useState(null);
  const [isConnected, setIsConnected] = useState(!!account);

  useEffect(() => {
    setUser(props.userData);
  }, [props.userData]);

  useEffect(() => {
    if (account) {
      fetchBalance(account);
    } else {
      checkMetaMaskConnection();
    }
  }, []);

  const checkMetaMaskConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          props.connectedToMetamask(accounts[0]);
          localStorage.setItem("metamaskAccount", accounts[0]);
          fetchBalance(accounts[0]);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    }
  };

  const fetchBalance = async (selectedAccount) => {
    try {
      const result = await window.ethereum.request({
        method: "eth_getBalance",
        params: [selectedAccount, "latest"],
      });

      const wei = parseInt(result, 16);
      const ethBalance = wei / 10 ** 18;
      setBalance(ethBalance.toFixed(4));

      axios.get(`${import.meta.env.VITE_REACT_APP_API_URL}/walletAddress?userWalletAddress=${selectedAccount}`)
        .then(response => {
          console.log('Response:', response.data);
          setIsConnected(true);
        })
        .catch(error => {
          console.error('Error connecting wallet to backend:', error);
        });

    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const handleMetamaskLogin = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask is not installed. Please install it to use this feature.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        const selectedAccount = accounts[0];
        setAccount(selectedAccount);
        setIsConnected(true);
        props.connectedToMetamask(selectedAccount);
        localStorage.setItem("metamaskAccount", selectedAccount);
        fetchBalance(selectedAccount);
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
    }
  };

  return (
    <div className="rightsidebar">
      <div className="welcome-section">
        <p>Hello <b>{user?.username || "User"}</b></p>
        <div className="connect-btn">
          <button className={`metamask-button ${isConnected ? "connected" : ""}`} onClick={handleMetamaskLogin}>
            <img src="/MetaMask.png" alt="MetaMask Icon" style={{ width: '40px', height: 'auto' }} />
            {isConnected ? "Metamask Connected" : "Connect to MetaMask"}
          </button>
        </div>
      </div>

      <div className="card1">
        <NetMeteringCard />
      </div>

      <div className="card2">
        <CarbonCreditCard />
      </div>
    </div>
  );
};

export default RightSidebar;
