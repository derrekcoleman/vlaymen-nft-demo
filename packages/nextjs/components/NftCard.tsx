import Image from "next/image";

type Nft = {
  id: string;
  selected: boolean;
};

type NftCardProps = {
  nft: Nft;
  baseImageUrl: string;
  getImageId: (tokenId: string) => number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTransferClick: (e: React.MouseEvent, id: string) => void;
};

export const NftCard: React.FC<NftCardProps> = ({
  nft,
  baseImageUrl,
  getImageId,
  isSelected,
  onSelect,
  onTransferClick,
}) => {
  return (
    <div
      key={nft.id} // key is actually used by React in the parent map, but good to keep consistent if needed elsewhere
      onClick={() => onSelect(nft.id)}
      className={`group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-2 hover:border-[#9D91EE] ${
        isSelected ? "scale-[1.02] border-2 border-[#9D91EE]" : "border border-transparent"
      }`}
    >
      <figure className="relative bg-[#f1f1f1] aspect-square flex items-center justify-center overflow-hidden">
        {/* Display the NFT SVG image using modulo for image ID */}
        <Image
          src={`${baseImageUrl}/${getImageId(nft.id.replace("#", ""))}.svg`}
          alt={`vlaymen ${nft.id}`}
          fill
          className="object-cover"
          priority // Consider removing priority if many cards load, might impact LCP
        />

        {/* Paper airplane icon in purple circle - visible on hover */}
        <div
          className={`absolute top-3 right-3 w-[60px] h-[60px] rounded-full bg-[#9D91EE] hover:bg-[#7B66DC] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transition-colors duration-200 z-10`}
          onClick={e => onTransferClick(e, nft.id)}
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
  );
};
