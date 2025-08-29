import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PROPERTY_CODES,
  PROPERTY_NAMES,
  getPropertyName,
  type PropertyCode,
} from "@/lib/property";

const hotelsByRegion: Record<string, string[]> = {
  Europe: ["Hotel Paris", "Hotel London", "Hotel Berlin", "Hotel Madrid"],
  "North America": ["Hotel New York", "Hotel Miami", "Hotel Toronto"],
  Asia: ["Hotel Tokyo", "Hotel Singapore", "Hotel Bangkok"],
};

const hotelsByBrand: Record<string, string[]> = {
  "Luxury Collection": ["Hotel Paris", "Hotel New York", "Hotel Tokyo"],
  "Premium Hotels": ["Hotel London", "Hotel Miami", "Hotel Singapore"],
  "Boutique Series": [
    "Hotel Berlin",
    "Hotel Madrid",
    "Hotel Bangkok",
    "Hotel Toronto",
  ],
};

// Get all unique hotels
const allHotels = Array.from(
  new Set(Object.values(hotelsByRegion).flat())
) as string[];

function TriangleDown({ className }: { className?: string }) {
  return (
    <svg
      width="8"
      height="6"
      viewBox="0 0 8 6"
      fill="currentColor"
      className={className}
    >
      <path d="M4 6L0 0L8 0L4 6Z" />
    </svg>
  );
}

type PropertyModeProps = {
  mode?: "property";
  selectedProperty: PropertyCode;
  setSelectedProperty: (property: PropertyCode) => void;
};

type LegacyHotelsModeProps = {
  selectedHotels: string[];
  setSelectedHotels: React.Dispatch<React.SetStateAction<string[]>>;
};

type HotelSelectorProps = PropertyModeProps | LegacyHotelsModeProps;

export function HotelSelector(props: HotelSelectorProps) {
  const isPropertyMode = (p: HotelSelectorProps): p is PropertyModeProps => {
    return (
      (p as PropertyModeProps).selectedProperty !== undefined &&
      (p as PropertyModeProps).setSelectedProperty !== undefined
    );
  };
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter selected hotels when region or brand changes (legacy mode only)
  useEffect(() => {
    if (isPropertyMode(props)) return;
    const { setSelectedHotels } = props as LegacyHotelsModeProps;
    let validHotels: string[] = [...allHotels];

    if (selectedRegion !== "All") {
      validHotels = validHotels.filter((hotel) =>
        hotelsByRegion[selectedRegion as keyof typeof hotelsByRegion]?.includes(
          hotel
        )
      );
    }

    if (selectedBrand !== "All") {
      validHotels = validHotels.filter((hotel) =>
        hotelsByBrand[selectedBrand as keyof typeof hotelsByBrand]?.includes(
          hotel
        )
      );
    }

    setSelectedHotels((prev: string[]) =>
      prev.filter((hotel: string) => validHotels.includes(hotel))
    );
  }, [selectedRegion, selectedBrand]);

  const toggleHotel = (hotel: string) => {
    if (isPropertyMode(props)) return;
    const { setSelectedHotels } = props as LegacyHotelsModeProps;
    setSelectedHotels((prev: string[]) =>
      prev.includes(hotel)
        ? prev.filter((h: string) => h !== hotel)
        : [...prev, hotel]
    );
  };

  const toggleAllHotels = () => {
    if (isPropertyMode(props)) return;
    const { setSelectedHotels } = props as LegacyHotelsModeProps;
    setSelectedHotels((prev: string[]) =>
      prev.length === filteredHotels.length ? [] : [...filteredHotels]
    );
  };

  const getFilteredHotels = () => {
    let hotels = [...allHotels];

    if (selectedRegion !== "All") {
      hotels = hotels.filter((hotel) =>
        hotelsByRegion[selectedRegion as keyof typeof hotelsByRegion]?.includes(
          hotel
        )
      );
    }

    if (selectedBrand !== "All") {
      hotels = hotels.filter((hotel) =>
        hotelsByBrand[selectedBrand as keyof typeof hotelsByBrand]?.includes(
          hotel
        )
      );
    }

    return hotels;
  };

  const filteredHotels = getFilteredHotels();

  if (isPropertyMode(props)) {
    const { selectedProperty, setSelectedProperty } =
      props as PropertyModeProps;
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 "
          >
            {getPropertyName(selectedProperty)}{" "}
            <TriangleDown className="ml-2" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Select Property
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[320px] overflow-y-auto">
            {PROPERTY_CODES.map((code) => (
              <Button
                key={code}
                variant="ghost"
                onClick={() => setSelectedProperty(code)}
                className="mb-1 w-full justify-start"
              >
                <div className="flex items-center">
                  <div
                    className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${
                      selectedProperty === code
                        ? "bg-primary border-primary"
                        : "bg-[#f2f8ff] border-input hover:bg-[#f2f8ff]"
                    }`}
                  >
                    {selectedProperty === code && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span className="font-medium">{getPropertyName(code)}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { selectedHotels } = props as LegacyHotelsModeProps;
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="lg"
          className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 "
        >
          {selectedHotels.length === 1
            ? selectedHotels[0]
            : `${selectedHotels.length} Hotels`}{" "}
          <TriangleDown className="ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Select Hotels
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center space-x-4 mb-2 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
              >
                {selectedRegion === "All" ? "All Regions" : selectedRegion}{" "}
                <TriangleDown className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedRegion("All")}>
                All Regions
              </DropdownMenuItem>
              {Object.keys(hotelsByRegion).map((region) => (
                <DropdownMenuItem
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                >
                  {region}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-[#f2f8ff] hover:bg-[#f2f8ff] text-[#342630] rounded-full px-4 font-semibold"
              >
                {selectedBrand === "All" ? "All Brands" : selectedBrand}{" "}
                <TriangleDown className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedBrand("All")}>
                All Brands
              </DropdownMenuItem>
              {Object.keys(hotelsByBrand).map((brand) => (
                <DropdownMenuItem
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                >
                  {brand}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="border-t border-gray-300 pt-0">
          <Button
            variant="ghost"
            onClick={toggleAllHotels}
            className="mb-2 w-full justify-start border-b border-gray-300"
          >
            <div className="flex items-center">
              <div
                className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${
                  selectedHotels.length === filteredHotels.length
                    ? "bg-primary border-primary"
                    : "bg-[#f2f8ff] border-input hover:bg-[#f2f8ff]"
                }`}
              >
                {selectedHotels.length === filteredHotels.length && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
              <span className="font-medium">Select All</span>
            </div>
          </Button>

          <div className="max-h-[300px] overflow-y-auto pl-4">
            {filteredHotels.map((hotel) => (
              <Button
                key={hotel}
                variant="ghost"
                onClick={() => toggleHotel(hotel)}
                className="mb-1 w-full justify-start"
              >
                <div className="flex items-center">
                  <div
                    className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${
                      selectedHotels.includes(hotel)
                        ? "bg-primary border-primary"
                        : "bg-[#f2f8ff] border-input hover:bg-[#f2f8ff]"
                    }`}
                  >
                    {selectedHotels.includes(hotel) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  {hotel}
                </div>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
