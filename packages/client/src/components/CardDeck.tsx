const DECK = ["1", "2", "3", "5", "8", "13", "21", "?"];

interface Props {
  selected: string | null;
  onSelect: (value: string) => void;
  disabled: boolean;
}

export function CardDeck({ selected, onSelect, disabled }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {DECK.map((value) => {
        const isSelected = selected === value;
        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            disabled={disabled}
            className={[
              "w-16 h-24 rounded-xl text-2xl font-bold border-2 shadow-sm transition-all duration-150",
              "flex items-center justify-center select-none",
              isSelected
                ? "bg-[#ff7427] border-[#e6631a] text-white scale-110 shadow-[#ff742740] shadow-lg"
                : "bg-white border-[#ededed] text-[#32373c] hover:border-[#ff7427] hover:scale-105",
              disabled && !isSelected ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
