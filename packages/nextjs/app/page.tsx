"use client";

import { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import { zeroAddress } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { NftCard } from "~~/components/NftCard";
import { TransferNftModal } from "~~/components/TransferNftModal";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Define the NFT type
type Nft = {
  id: string;
  selected: boolean;
};

const Home: NextPage = () => {
  const [nfts, setNfts] = useState<Nft[]>([]);

  const baseImageUrl =
    process.env.NODE_ENV === "development" ? "/nft_images" : "https://vlaymen-nft-demo.vercel.app/nft_images";

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
        // Sort numerically by ID after removing '#'
        .sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));
      setNfts(tokenIds);
    } else if (!isTokenIdsLoading && balance === 0n) {
      setNfts([]);
    }
  }, [ownedTokenIdsData, isTokenIdsLoading, balance]);

  // Derive isLoading state directly from hook statuses
  const isFetchingBalance = !connectedAddress || isBalanceLoading;
  // Only consider token IDs loading if balance is greater than 0 and we are actually expecting tokens
  const isFetchingTokens = balance !== undefined && balance > 0n && isTokenIdsLoading;
  const isLoading = isFetchingBalance || isFetchingTokens;

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

  // New function to pass to the modal for confirming the transfer
  const handleConfirmTransfer = async (recipientAddress: string, tokenId: bigint) => {
    const selectedNft = nfts.find(nft => nft.selected);
    if (!selectedNft || !connectedAddress) {
      notification.error(
        `Transfer check failed: NFT Selected=${!!selectedNft}, Wallet Connected=${!!connectedAddress}`,
      );
      return;
    }

    const modal = document.getElementById("transfer_modal") as HTMLDialogElement;
    const pendingNotification = notification.loading("Processing Transfer...");

    try {
      await transferNft(
        {
          functionName: "safeTransferFrom",
          // @ts-ignore
          args: [connectedAddress, recipientAddress, tokenId],
        },
        {
          onSuccess: async () => {
            notification.remove(pendingNotification);
            setNfts(prevNfts => prevNfts.filter(nft => nft.id !== selectedNft.id));
            await refetchBalance();
            if (modal) modal.close();
          },
          onError: error => {
            notification.remove(pendingNotification);
            console.error("Error transferring NFT:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            notification.error(`Transfer failed: ${message}`);
          },
        },
      );
    } catch (error: any) {
      notification.remove(pendingNotification);
      console.error("Error initiating transfer:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      notification.error(`Transfer initiation failed: ${message}`);
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

          {!connectedAddress ? (
            <div className="flex justify-center items-center min-h-[70vh]">
              <div className="border-2 border-primary rounded-xl p-8 bg-[#DDCEFF] dark:bg-[#121330] flex flex-col items-center justify-center gap-4 max-w-[66%] w-full">
                <h2 className="text-4xl font-bold text-[#915BF8]">No Wallet Connected</h2>
                <p className="text-center text-xl max-w-[600px] text-[#121645] dark:text-[#F9FBFF]">
                  Connect your wallet to view and mint vlaymen NFTs.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center min-h-[70vh]">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
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
                <NftCard
                  key={nft.id}
                  nft={nft}
                  baseImageUrl={baseImageUrl}
                  getImageId={getImageId}
                  isSelected={nft.selected}
                  onSelect={selectNft}
                  onTransferClick={openTransferModal}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TransferNftModal
        modalId="transfer_modal"
        selectedNft={nfts.find(nft => nft.selected) || null}
        baseImageUrl={baseImageUrl}
        getImageId={getImageId}
        onConfirmTransfer={handleConfirmTransfer}
        isTransferPending={isTransferPending}
      />
    </>
  );
};

export default Home;
