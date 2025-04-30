"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { NextPage } from "next";
import { zeroAddress } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { AddressInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Define the NFT type
type Nft = {
  id: string;
  selected: boolean;
};

const Home: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [nfts, setNfts] = useState<Nft[]>([]);
  const [addressInput, setAddressInput] = useState("");
  const [isAddressValid, setIsAddressValid] = useState(false);

  // Use ref to track loading timeouts to prevent stale closures
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine base URL for NFT images based on environment
  const baseImageUrl =
    process.env.NODE_ENV === "development" ? "/nft_images" : "https://vlaymen-nft-demo.vercel.app/nft_images";

  // Helper function to get image ID using modulo
  const getImageId = (tokenId: string): number => {
    const numericId = parseInt(tokenId, 10);
    return numericId % 25; // Returns 0-24
  };

  const { address: connectedAddress } = useAccount();

  // Get Deployed contract info for Vlaymen
  const { data: deployedContractData } = useDeployedContractInfo("Vlaymen");

  // Read balance of connected address
  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useScaffoldReadContract({
    contractName: "Vlaymen",
    functionName: "balanceOf",
    args: [connectedAddress ?? zeroAddress],
    query: {
      enabled: !!connectedAddress && !!deployedContractData,
    },
  });

  const { writeContractAsync: mintNft, isPending: isMintPending } = useScaffoldWriteContract<"Vlaymen">({
    contractName: "Vlaymen",
  });
  const { writeContractAsync: transferNft, isPending: isTransferPending } = useScaffoldWriteContract<"Vlaymen">({
    contractName: "Vlaymen",
  });

  const selectNft = (selectedId: string) => {
    setNfts(
      nfts.map(nft => ({
        ...nft,
        selected: nft.id === selectedId ? true : false,
      })),
    );
  };

  const validateAddress = (address: string) => {
    return (
      (address.length === 42 && address.startsWith("0x")) ||
      (address.trim() !== "" && !address.includes(" ") && address.endsWith(".eth"))
    );
  };

  const openTransferModal = (e: React.MouseEvent, nftId: string) => {
    e.stopPropagation(); // Prevent NFT selection when clicking on transfer icon
    selectNft(nftId);
    const modal = document.getElementById("transfer_modal") as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  // Prepare arguments for tokenOfOwnerByIndex calls
  const tokenOfOwnerByIndexArgs = useMemo(() => {
    // Ensure balance is a valid number (convert BigInt) and contract data exists
    const numBalance = balance !== undefined ? Number(balance) : 0;
    if (numBalance === 0 || !connectedAddress || !deployedContractData?.abi || !deployedContractData?.address) {
      return [];
    }
    return Array.from({ length: numBalance }, (_, index) => ({
      abi: deployedContractData.abi,
      address: deployedContractData.address,
      functionName: "tokenOfOwnerByIndex",
      args: [connectedAddress, BigInt(index)],
    }));
  }, [balance, connectedAddress, deployedContractData]);

  // Fetch all token IDs owned by the user
  const {
    data: ownedTokenIdsData,
    isLoading: isTokenIdsLoading,
    refetch: refetchTokenIds,
  } = useReadContracts({
    contracts: tokenOfOwnerByIndexArgs,
    query: {
      enabled: !!connectedAddress && !!deployedContractData && tokenOfOwnerByIndexArgs.length > 0,
    },
  });

  // Process fetched token IDs into the Nft state format
  useEffect(() => {
    if (ownedTokenIdsData) {
      const tokenIds = ownedTokenIdsData
        .map(item => {
          if (item.status === "success") {
            // Use unknown intermediate cast as suggested by linter
            const resultAsBigInt = item.result as unknown as bigint;
            // Double-check type just in case assertion fails at runtime
            if (typeof resultAsBigInt === "bigint") {
              return { id: `#${resultAsBigInt.toString()}`, selected: false };
            }
          }
          return null;
        })
        .filter((item): item is Nft => item !== null)
        .reverse();
      setNfts(tokenIds);
    } else if (!isTokenIdsLoading && balance === 0n) {
      setNfts([]);
    }
  }, [ownedTokenIdsData, isTokenIdsLoading, balance]);

  // Clear any existing loading timeouts
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Set a new loading timeout
  const setLoadingTimeout = useCallback(() => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(() => {
      console.log("Forcing loading state to finish after timeout");
      setIsLoading(false);
    }, 5000);
  }, [clearLoadingTimeout]);

  // Keep useEffect for address validation
  useEffect(() => {
    setIsAddressValid(validateAddress(addressInput));
  }, [addressInput]);

  // Need to adjust loading logic based on isBalanceLoading and isTokenIdsLoading
  useEffect(() => {
    // Determine overall loading state
    const loading =
      !connectedAddress || isBalanceLoading || (balance !== undefined && balance > 0n && isTokenIdsLoading);
    setIsLoading(loading);

    // Handle timeout logic as before, but maybe based on the combined loading state
    if (loading) {
      setLoadingTimeout();
    } else {
      clearLoadingTimeout();
    }

    // Cleanup timeout
    return clearLoadingTimeout;
  }, [connectedAddress, isBalanceLoading, isTokenIdsLoading, balance, setLoadingTimeout, clearLoadingTimeout]);

  const handleTransfer = async () => {
    const selectedNft = nfts.find(nft => nft.selected);
    // Ensure we have the selected NFT and a connected wallet
    if (!selectedNft || !connectedAddress) {
      notification.error(
        `Transfer check failed: NFT Selected=${!!selectedNft}, Wallet Connected=${!!connectedAddress}`,
      );
      return;
    }

    const tokenId = BigInt(selectedNft.id.replace("#", ""));
    const modal = document.getElementById("transfer_modal") as HTMLDialogElement;

    // Show pending notification immediately
    const pendingNotification = notification.loading("Processing Transfer...");

    try {
      await transferNft(
        {
          functionName: "safeTransferFrom",
          args: [connectedAddress, addressInput, tokenId],
        },
        {
          onSuccess: async () => {
            notification.remove(pendingNotification);
            setNfts(prevNfts => prevNfts.filter(nft => nft.id !== selectedNft.id));
            // Refetch balance and token IDs
            await refetchBalance();
            await refetchTokenIds();
            if (modal) modal.close();
            setAddressInput("");
            setIsAddressValid(false);
          },
          onError: error => {
            notification.remove(pendingNotification);
            console.error("Error transferring NFT:", error);
            notification.error(`Transfer failed: ${error.message}`);
          },
        },
      );
    } catch (error: any) {
      notification.remove(pendingNotification);
      console.error("Error initiating transfer:", error);
      notification.error(`Transfer initiation failed: ${error.message}`);
    }
  };

  const handleMint = async () => {
    if (!connectedAddress) return;
    try {
      await mintNft(
        {
          functionName: "safeMint",
          args: [connectedAddress],
        },
        {
          onSuccess: async () => {
            // Refetch balance and token IDs
            await refetchBalance();
            await refetchTokenIds();
          },
        },
      );
    } catch (error) {
      console.error("Error minting NFT:", error);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-5">
        <div className="w-full max-w-[1200px] px-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4 md:mb-0">
              <span className="bg-gradient-to-r from-[#915BF8] to-[#3D1EFE] bg-clip-text text-transparent">
                vlaymen
              </span>{" "}
              Collection
            </h1>
            {connectedAddress && (
              <button
                className="bg-primary text-white font-semibold rounded-lg px-6 py-2.5"
                onClick={handleMint}
                disabled={isMintPending}
              >
                {isMintPending ? "Minting..." : "Mint a vlaymen"}
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[70vh]">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
            </div>
          ) : !connectedAddress ? (
            <div className="flex justify-center items-center min-h-[70vh]">
              <div className="border border-primary rounded-xl p-8 bg-[#DDCEFF] dark:bg-[#121330] flex flex-col items-center max-w-[66%] w-full">
                <h2 className="text-4xl font-bold text-[#915BF8] mb-6">No Wallet Connected</h2>
                <p className="text-center text-xl mb-10 max-w-[600px] text-[#121645] dark:text-[#F9FBFF]">
                  Connect your wallet to view and mint vlaymen NFTs.
                </p>
              </div>
            </div>
          ) : nfts.length === 0 ? (
            <div className="flex justify-center items-center min-h-[70vh]">
              <div className="border border-primary rounded-xl p-8 bg-[#DDCEFF] dark:bg-[#121330] flex flex-col items-center max-w-[66%] w-full">
                <h2 className="text-4xl font-bold text-[#915BF8] mb-6">No NFTs Found</h2>
                <p className="text-center text-xl mb-10 max-w-[600px] text-[#121645] dark:text-[#F9FBFF]">
                  You haven&apos;t minted any vlaymen NFTs yet. Click the &quot;Mint a vlaymen&quot; button above to get
                  started with your collection.
                </p>
                <button
                  className="bg-primary text-white font-semibold rounded-lg px-8 py-3 text-lg"
                  onClick={handleMint}
                  disabled={isMintPending}
                >
                  {isMintPending ? "Minting..." : "Mint your first vlaymen"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {nfts.map(nft => (
                <div
                  key={nft.id}
                  onClick={() => selectNft(nft.id)}
                  className={`group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-2 hover:border-[#9D91EE] ${
                    nft.selected ? "scale-[1.02] border-2 border-[#9D91EE]" : "border border-transparent"
                  }`}
                >
                  <figure className="relative bg-[#f1f1f1] aspect-square flex items-center justify-center overflow-hidden">
                    {/* Display the NFT SVG image using modulo for image ID */}
                    <Image
                      src={`${baseImageUrl}/${getImageId(nft.id.replace("#", ""))}.svg`}
                      alt={`vlaymen ${nft.id}`}
                      fill
                      className="object-cover"
                      priority
                    />

                    {/* Paper airplane icon in purple circle - visible on hover */}
                    <div
                      className={`absolute top-3 right-3 w-[60px] h-[60px] rounded-full bg-[#9D91EE] hover:bg-[#7B66DC] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transition-colors duration-200 z-10`}
                      onClick={e => openTransferModal(e, nft.id)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="30"
                        height="30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 2L11 13"></path>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                      </svg>
                    </div>
                  </figure>
                  <div className="p-4 bg-secondary rounded-b-lg">
                    <h2 className="text-lg font-bold text-white">vlaymen {nft.id}</h2>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      <dialog id="transfer_modal" className="modal">
        <div className="modal-box bg-[#121330] border border-[#9D91EE]">
          <h3 className="font-bold text-2xl mb-4">
            <span className="bg-gradient-to-r from-[#915BF8] to-[#3D1EFE] bg-clip-text text-transparent">
              Transfer vlaymen {nfts.find(nft => nft.selected)?.id || ""}
            </span>
          </h3>

          {/* Display Selected NFT Image */}
          {nfts.find(nft => nft.selected) && (
            <div className="mb-4 flex justify-center">
              <Image
                src={`${baseImageUrl}/${getImageId(nfts.find(nft => nft.selected)!.id.replace("#", ""))}.svg`}
                alt={`vlaymen ${nfts.find(nft => nft.selected)!.id}`}
                width={300}
                height={300}
                className="rounded-lg object-cover"
              />
            </div>
          )}

          <p className="mb-6">Send this vlaymen NFT to another wallet address</p>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-white">Recipient Address</span>
            </label>
            <AddressInput
              placeholder="Enter a wallet address or ENS name"
              value={addressInput}
              onChange={setAddressInput}
            />
            <div className="h-6 flex items-center justify-end">
              <span
                className={`text-xs ${addressInput && !isAddressValid ? "text-error" : isAddressValid ? "text-success" : "opacity-0"}`}
              >
                {addressInput && !isAddressValid
                  ? "Invalid address"
                  : isAddressValid
                    ? "Valid address"
                    : "Address validation"}
              </span>
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-outline mr-2">Cancel</button>
            </form>
            <button
              className="btn bg-[#9D91EE] hover:bg-[#7B66DC] text-white opacity-100 hover:opacity-90 disabled:opacity-50 disabled:bg-[#9D91EE]"
              disabled={!isAddressValid || isTransferPending}
              onClick={handleTransfer}
            >
              {isTransferPending ? <span className="loading loading-spinner loading-sm"></span> : "Transfer"}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
};

export default Home;
