"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import type { OrderConfig } from "@/types";

export interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (address: NonNullable<OrderConfig["deliveryAddress"]>) => void;
}

type GoongPrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
};

type GoongPlaceResult = {
  formatted_address?: string;
  name?: string;
  place_id?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
};

type GoongMap = {
  on: (event: string, callback: (event: GoongMapEvent) => void) => void;
  flyTo: (options: { center: [number, number]; zoom?: number }) => void;
  remove: () => void;
  resize: () => void;
};

type GoongMapEvent = {
  lngLat?: { lng: number; lat: number };
  error?: Error;
};

type GoongStyleLayer = {
  id?: string;
  source?: string;
  "source-layer"?: string;
};

type GoongStyle = {
  layers?: GoongStyleLayer[];
  [key: string]: unknown;
};

type GoongMarker = {
  setLngLat: (lngLat: [number, number]) => GoongMarker;
  addTo: (map: GoongMap) => GoongMarker;
  on: (event: string, callback: () => void) => void;
  getLngLat: () => { lng: number; lat: number };
  remove: () => void;
};

const DEFAULT_CENTER = { lat: 14.03886, lng: 108.25011 };
const GOONG_SCRIPT_ID = "goong-js-sdk";
const GOONG_CSS_ID = "goong-js-css";
const GOONG_STYLE_URL = "https://tiles.goong.io/assets/goong_light_v2.json";
const UNSUPPORTED_GOONG_SOURCE_LAYERS = new Set(["trees"]);

declare global {
  interface Window {
    goongjs?: {
      accessToken: string;
      Map: new (options: {
        container: HTMLElement;
        style: string | GoongStyle;
        center: [number, number];
        zoom: number;
      }) => GoongMap;
      Marker: new (options?: {
        draggable?: boolean;
        color?: string;
      }) => GoongMarker;
      NavigationControl: new () => unknown;
    };
  }
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { config, setDeliveryAddress } = useOrderConfigStore();
  const [street, setStreet] = useState(config.deliveryAddress?.street || "");
  const [district, setDistrict] = useState(
    config.deliveryAddress?.district || "",
  );
  const [city, setCity] = useState(config.deliveryAddress?.city || "Hà Nội");
  const [formattedAddress, setFormattedAddress] = useState(
    config.deliveryAddress?.formattedAddress || "",
  );
  const [placeId, setPlaceId] = useState(config.deliveryAddress?.placeId || "");
  const [coords, setCoords] = useState(
    config.deliveryAddress?.lat && config.deliveryAddress?.lng
      ? { lat: config.deliveryAddress.lat, lng: config.deliveryAddress.lng }
      : DEFAULT_CENTER,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [predictions, setPredictions] = useState<GoongPrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoongMap | null>(null);
  const markerRef = useRef<GoongMarker | null>(null);
  const sessionToken = useMemo(() => crypto.randomUUID(), [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const currentAddress = config.deliveryAddress;
    setStreet(currentAddress?.street || "");
    setDistrict(currentAddress?.district || "");
    setCity(currentAddress?.city || "Hà Nội");
    setFormattedAddress(currentAddress?.formattedAddress || "");
    setPlaceId(currentAddress?.placeId || "");
    setSearchTerm(currentAddress?.formattedAddress || "");
    setPredictions([]);
    setMapError(null);

    if (currentAddress?.lat && currentAddress?.lng) {
      setCoords({ lat: currentAddress.lat, lng: currentAddress.lng });
    } else {
      setCoords(DEFAULT_CENTER);
    }
  }, [config.deliveryAddress, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (searchTerm.trim().length < 2) {
      setPredictions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await fetch(
          `/api/goong/autocomplete?input=${encodeURIComponent(
            searchTerm,
          )}&location=${coords.lat},${coords.lng}&sessionToken=${sessionToken}`,
        );
        const data = (await response.json()) as {
          predictions?: GoongPrediction[];
          error?: string;
        };

        if (!response.ok)
          throw new Error(data.error || "Không thể tìm địa chỉ.");
        setPredictions(data.predictions ?? []);
      } catch (error) {
        console.error("Address autocomplete failed:", error);
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, [coords.lat, coords.lng, isOpen, searchTerm, sessionToken]);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    let isMounted = true;
    Promise.all([loadGoongSdk(), loadGoongStyle()])
      .then(([, style]) => {
        if (!isMounted || !window.goongjs || !mapContainerRef.current) return;

        const maptilesKey = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;
        if (!maptilesKey) {
          setMapError("Chưa cấu hình khóa bản đồ.");
          return;
        }

        window.goongjs.accessToken = maptilesKey;
        const map = new window.goongjs.Map({
          container: mapContainerRef.current,
          style,
          center: [coords.lng, coords.lat],
          zoom: 15,
        });
        map.on("error", (event) => {
          // Suppress all Goong map errors since they are usually non-critical warnings
          console.debug("Goong map event (suppressed):", event);
        });
        map.on("load", () => {
          console.debug("Goong map loaded successfully");
        });
        const marker = new window.goongjs.Marker({
          draggable: true,
          color: "#d94a34",
        })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map);

        marker.on("dragend", () => {
          const next = marker.getLngLat();
          handleCoordinateChange(next.lat, next.lng, true);
        });
        map.on("click", (event) => {
          if (!event.lngLat) return;
          handleCoordinateChange(event.lngLat.lat, event.lngLat.lng, true);
        });

        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch((error) => {
        console.error("Failed to load Goong map:", error);
        setMapError(
          "Không thể tải bản đồ. Bạn vẫn có thể nhập địa chỉ thủ công.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [coords.lat, coords.lng, isOpen]);

  // Call map.resize() when modal is fully opened to ensure proper rendering
  useEffect(() => {
    if (isOpen && mapRef.current) {
      // Wait a bit for the modal to render completely
      const timer = setTimeout(() => {
        mapRef.current?.resize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    markerRef.current?.setLngLat([coords.lng, coords.lat]);
    mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 16 });
  }, [coords.lat, coords.lng]);

  useEffect(() => {
    if (!isOpen) {
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    }
  }, [isOpen]);

  async function selectPrediction(prediction: GoongPrediction) {
    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/goong/place?placeId=${encodeURIComponent(
          prediction.place_id,
        )}&sessionToken=${sessionToken}`,
      );
      const data = (await response.json()) as {
        result?: GoongPlaceResult | null;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "Không thể lấy địa chỉ.");
      }

      applyGoongResult(
        data.result,
        prediction.description,
        prediction.place_id,
      );
      setPredictions([]);
    } catch (error) {
      console.error("Place detail failed:", error);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCoordinateChange(
    lat: number,
    lng: number,
    shouldReverse = false,
  ) {
    setCoords({ lat, lng });

    if (!shouldReverse) return;

    try {
      const response = await fetch(`/api/goong/reverse?lat=${lat}&lng=${lng}`);
      const data = (await response.json()) as {
        result?: GoongPlaceResult | null;
        error?: string;
      };

      if (!response.ok || !data.result) return;
      applyGoongResult(data.result, data.result.formatted_address);
    } catch (error) {
      console.error("Reverse geocode failed:", error);
    }
  }

  function applyGoongResult(
    result: GoongPlaceResult,
    fallbackAddress?: string,
    placeId?: string,
  ) {
    const location = result.geometry?.location;
    const nextAddress = result.formatted_address || fallbackAddress || "";
    const parsed = parseAddress(nextAddress, result.compound);

    setFormattedAddress(nextAddress);
    setSearchTerm(nextAddress);
    setStreet(result.name || parsed.street);
    setDistrict(parsed.district);
    setCity(parsed.city);
    setPlaceId(placeId || result.place_id || "");

    if (location?.lat && location?.lng) {
      setCoords({ lat: location.lat, lng: location.lng });
    }

    if (placeId || result.place_id) {
      // Store through the final confirm action.
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMapError("Trình duyệt chưa hỗ trợ lấy vị trí hiện tại.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleCoordinateChange(latitude, longitude, true).finally(() =>
          setIsLocating(false),
        );
      },
      (error) => {
        console.warn("Cannot get current position:", error);
        setMapError(
          "Không thể lấy vị trí hiện tại. Vui lòng cho phép định vị.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  function handleConfirm() {
    if (!street.trim() || !district.trim() || !city.trim()) return;

    const nextAddress = {
      street: street.trim(),
      district: district.trim(),
      city: city.trim(),
      lat: coords.lat,
      lng: coords.lng,
      formattedAddress: formattedAddress.trim() || undefined,
      placeId: placeId.trim() || undefined,
    };

    setDeliveryAddress(nextAddress);
    void fetch("/api/profile/address", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextAddress),
    }).catch(() => undefined);
    onConfirm?.(nextAddress);
    onClose();
  }

  function handleCancel() {
    onClose();
  }

  const isFormValid = street.trim() && district.trim() && city.trim();

  const searchHeader = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        id="address-search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Nhập số nhà, tên đường, quận..."
        className="h-12 w-full rounded-xl border border-sand bg-bg-card pl-10 pr-3 text-sm font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
      />
    </div>
  );

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleCancel}
        className="h-12 flex-1 rounded-xl border border-sand bg-bg-card text-sm font-black text-navy"
      >
        Hủy
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!isFormValid}
        className="h-12 flex-1 rounded-xl bg-brand-500 text-sm font-black text-white shadow-[0_8px_18px_rgba(217,74,52,0.20)] disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        Lưu địa chỉ
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Tìm và ghim địa chỉ của bạn"
      headerContent={searchHeader}
      footer={footer}
      className="flex h-[85dvh] max-h-[85dvh] flex-col lg:h-[85vh] lg:max-h-[85vh] lg:max-w-xl"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {predictions.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-sand bg-bg-card shadow-sm">
              {predictions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  type="button"
                  onClick={() => selectPrediction(prediction)}
                  className="flex w-full gap-3 border-b border-sand/50 px-3 py-3 text-left last:border-b-0 hover:bg-cream"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-navy">
                      {prediction.structured_formatting?.main_text ||
                        prediction.description}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-text-muted">
                      {prediction.structured_formatting?.secondary_text ||
                        prediction.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {isSearching && (
            <p className="text-xs font-bold text-text-muted">
              Đang tìm địa chỉ...
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-sand bg-cream">
          <div ref={mapContainerRef} className="h-56 w-full" />
          {mapError && (
            <div className="border-t border-sand px-3 py-2 text-xs font-bold text-amber-800">
              {mapError}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-sand bg-bg-card px-3 py-2">
            <p className="text-xs font-bold text-text-muted">
              Kéo pin hoặc chạm bản đồ để chỉnh vị trí.
            </p>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isLocating}
              className="inline-flex min-h-9 shrink-0 animate-pulse items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-[11px] font-black leading-tight text-white shadow-[0_0_0_4px_rgba(217,74,52,0.10)] disabled:opacity-60"
            >
              <LocateFixed className="h-4 w-4" />
              {isLocating ? "Đang tìm..." : "Nhấn nút để tìm vị trí ngay"}
            </button>
          </div>
        </div>

        {formattedAddress && (
          <div className="rounded-xl bg-cream px-3 py-2 text-xs font-bold leading-5 text-navy ring-1 ring-sand">
            <span className="mb-0.5 block text-[9px] uppercase tracking-[0.12em] text-text-muted">
              Vị trí đã ghim của bạn
            </span>
            {formattedAddress}
          </div>
        )}
      </div>
    </Modal>
  );
};

function parseAddress(
  formattedAddress: string,
  compound?: GoongPlaceResult["compound"],
) {
  const parts = formattedAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    street: parts[0] || formattedAddress || "",
    district: compound?.district || parts[Math.max(0, parts.length - 2)] || "",
    city:
      compound?.province || parts[Math.max(0, parts.length - 1)] || "Hà Nội",
  };
}

function loadGoongSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("NO_WINDOW"));
    if (window.goongjs) return resolve();

    if (!document.getElementById(GOONG_CSS_ID)) {
      const link = document.createElement("link");
      link.id = GOONG_CSS_ID;
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.11/dist/goong-js.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(
      GOONG_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOONG_SCRIPT_ID;
    script.src =
      "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.11/dist/goong-js.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GOONG_SCRIPT_LOAD_FAILED"));
    document.head.appendChild(script);
  });
}

async function loadGoongStyle(): Promise<string | GoongStyle> {
  try {
    const response = await fetch(GOONG_STYLE_URL);
    if (!response.ok) return GOONG_STYLE_URL;

    const style = (await response.json()) as GoongStyle;
    if (!Array.isArray(style.layers)) return style;

    return {
      ...style,
      layers: style.layers.filter(
        (layer) =>
          !(
            layer.source === "composite" &&
            layer["source-layer"] &&
            UNSUPPORTED_GOONG_SOURCE_LAYERS.has(layer["source-layer"])
          ),
      ),
    };
  } catch (error) {
    console.warn("Failed to sanitize Goong style:", error);
    return GOONG_STYLE_URL;
  }
}
