"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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
  const { writeContractAsync: mintNft, isPending } = useScaffoldWriteContract({
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

  // Validate address: either 42 chars starting with 0x or ending with .eth
  const validateAddress = (address: string) => {
    return (
      (address.length === 42 && address.startsWith("0x")) ||
      (address.trim() !== "" && !address.includes(" ") && address.endsWith(".eth"))
    );
  };

  // Handle address input change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressInput(value);
    setIsAddressValid(validateAddress(value));
  };

  const openTransferModal = (e: React.MouseEvent, nftId: string) => {
    e.stopPropagation(); // Prevent NFT selection when clicking on transfer icon
    selectNft(nftId);
    const modal = document.getElementById("transfer_modal") as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  // Only fetch transfer events if wallet is connected
  const {
    data: transferEvents,
    refetch: refetchTransferEvents,
    isLoading: isEventsLoading,
  } = useScaffoldEventHistory({
    contractName: "Vlaymen",
    eventName: "Transfer",
    fromBlock: 0n,
    filters: { to: connectedAddress },
    enabled: !!connectedAddress,
  });

  // Function to update NFTs from transfer events wrapped in useCallback
  const updateNftsFromEvents = useCallback(() => {
    if (transferEvents) {
      // Convert token IDs to the format needed for display
      const tokenNfts = transferEvents
        .filter(event => event.args.tokenId !== undefined)
        .map(event => ({
          id: `#${event.args.tokenId!.toString()}`,
          selected: false,
        }))
        .reverse(); // Reverse the list for display order

      setNfts(tokenNfts);
    }
  }, [transferEvents]);

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

  // Update nfts when transfer events change
  useEffect(() => {
    if (transferEvents !== undefined) {
      updateNftsFromEvents();
      setIsLoading(false);
      clearLoadingTimeout();
    }
  }, [transferEvents, updateNftsFromEvents, clearLoadingTimeout]);

  // Handle wallet connection/disconnection
  useEffect(() => {
    if (!connectedAddress) {
      // Clear NFTs when wallet is disconnected
      setNfts([]);
      setIsLoading(false);
      clearLoadingTimeout();
    } else {
      // Set loading to true when wallet is initially connected
      setIsLoading(true);
      // Set a timeout to ensure loading state is eventually cleared
      setLoadingTimeout();
    }

    // Clean up timeout when component unmounts or effect reruns
    return clearLoadingTimeout;
  }, [connectedAddress, clearLoadingTimeout, setLoadingTimeout]);

  // Additional effect to ensure loading state ends once events query completes
  useEffect(() => {
    if (connectedAddress && !isEventsLoading) {
      setIsLoading(false);
      clearLoadingTimeout();
    }
  }, [connectedAddress, isEventsLoading, clearLoadingTimeout]);

  const handleTransfer = () => {
    // Logic for transferring will be implemented later
    const modal = document.getElementById("transfer_modal") as HTMLDialogElement;
    if (modal) modal.close();
    setAddressInput("");
    setIsAddressValid(false);
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
            // Refetch transfer events to update the NFT list
            await refetchTransferEvents();
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
                disabled={isPending}
              >
                {isPending ? "Minting..." : "Mint a vlaymen"}
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
                  disabled={isPending}
                >
                  {isPending ? "Minting..." : "Mint your first vlaymen"}
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
            <input
              type="text"
              placeholder="Enter a wallet address or ENS name"
              className={`input input-bordered w-full ${isAddressValid ? "input-success" : addressInput ? "input-error" : ""}`}
              value={addressInput}
              onChange={handleAddressChange}
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
              disabled={!isAddressValid}
              onClick={handleTransfer}
            >
              Transfer
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
