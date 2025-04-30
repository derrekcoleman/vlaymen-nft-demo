import { useEffect, useState } from "react";
import Image from "next/image";
import { AddressInput } from "~~/components/scaffold-eth";

// Define the NFT type matching the one in page.tsx
type Nft = {
  id: string;
  selected: boolean;
};

type TransferNftModalProps = {
  modalId: string;
  selectedNft: Nft | null;
  baseImageUrl: string;
  getImageId: (tokenId: string) => number;
  onConfirmTransfer: (recipientAddress: string, tokenId: bigint) => Promise<void>;
  isTransferPending: boolean;
};

// Address validation function (replicated from page.tsx for now)
const validateAddress = (address: string) => {
  return (
    (address.length === 42 && address.startsWith("0x")) ||
    (address.trim() !== "" && !address.includes(" ") && address.endsWith(".eth"))
  );
};

export const TransferNftModal: React.FC<TransferNftModalProps> = ({
  modalId,
  selectedNft,
  baseImageUrl,
  getImageId,
  onConfirmTransfer,
  isTransferPending,
}) => {
  const [addressInput, setAddressInput] = useState("");
  const [isAddressValid, setIsAddressValid] = useState(false);

  useEffect(() => {
    setIsAddressValid(validateAddress(addressInput));
  }, [addressInput]);

  // Reset address input when the selected NFT changes (e.g., modal is opened for a different NFT)
  useEffect(() => {
    setAddressInput("");
    setIsAddressValid(false);
  }, [selectedNft]);

  const handleTransferClick = () => {
    if (!selectedNft || !isAddressValid) return;
    const tokenId = BigInt(selectedNft.id.replace("#", ""));
    onConfirmTransfer(addressInput, tokenId);
    // Note: Closing the modal and resetting state is handled by onConfirmTransfer's success callback in page.tsx
  };

  if (!selectedNft) {
    // Don't render the modal content if no NFT is selected
    // Alternatively, handle this with conditional rendering or CSS
    return null;
  }

  return (
    <dialog id={modalId} className="modal">
      <div className="modal-box bg-[#121330] border border-[#9D91EE]">
        <h3 className="font-bold text-2xl mb-4">
          <span className="bg-gradient-to-r from-[#915BF8] to-[#3D1EFE] bg-clip-text text-transparent">
            Transfer vlaymen {selectedNft.id}
          </span>
        </h3>

        {/* Display Selected NFT Image */}
        <div className="mb-4 flex justify-center">
          <Image
            src={`${baseImageUrl}/${getImageId(selectedNft.id.replace("#", ""))}.svg`}
            alt={`vlaymen ${selectedNft.id}`}
            width={300}
            height={300}
            className="rounded-lg object-cover"
          />
        </div>

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
            {/* Close button needs to be inside the form to trigger dialog close */}
            <button className="btn btn-outline mr-2">Cancel</button>
          </form>
          <button
            className="btn bg-[#9D91EE] hover:bg-[#7B66DC] text-white opacity-100 hover:opacity-90 disabled:opacity-50 disabled:bg-[#9D91EE]"
            disabled={!isAddressValid || isTransferPending}
            onClick={handleTransferClick}
          >
            {isTransferPending ? <span className="loading loading-spinner loading-sm"></span> : "Transfer"}
          </button>
        </div>
      </div>
      {/* Modal backdrop allows closing by clicking outside */}
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};
