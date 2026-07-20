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
const GOONG_JS_VERSION = "1.0.9";
const GOONG_SCRIPT_URLS = [
  `https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@${GOONG_JS_VERSION}/dist/goong-js.js`,
  `https://unpkg.com/@goongmaps/goong-js@${GOONG_JS_VERSION}/dist/goong-js.js`,
];
const GOONG_STYLE_URL = "https://tiles.goong.io/assets/goong_map_web.json";

declare global {
  interface Window {
    goongjs?: {
      accessToken: string;
      Map: new (options: {
        container: HTMLElement;
        style: string;
        center: [number, number];
        zoom: number;
      }) => GoongMap;
      Marker: new (options?: {
        draggable?: boolean;
        color?: string;
        element?: HTMLElement;
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
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoongMap | null>(null);
  const markerRef = useRef<GoongMarker | null>(null);
  const currentLocationMarkerRef = useRef<GoongMarker | null>(null);
  const initialAddressFingerprintRef = useRef("");
  const skipNextAutocompleteRef = useRef(false);
  const sessionToken = useMemo(() => crypto.randomUUID(), [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const currentAddress = config.deliveryAddress;
    const nextCoords =
      currentAddress?.lat && currentAddress?.lng
        ? { lat: currentAddress.lat, lng: currentAddress.lng }
        : DEFAULT_CENTER;
    initialAddressFingerprintRef.current = getAddressFingerprint({
      street: currentAddress?.street || "",
      district: currentAddress?.district || "",
      city: currentAddress?.city || "Hà Nội",
      formattedAddress: currentAddress?.formattedAddress || "",
      placeId: currentAddress?.placeId || "",
      ...nextCoords,
    });
    setStreet(currentAddress?.street || "");
    setDistrict(currentAddress?.district || "");
    setCity(currentAddress?.city || "Hà Nội");
    setFormattedAddress(currentAddress?.formattedAddress || "");
    setPlaceId(currentAddress?.placeId || "");
    skipNextAutocompleteRef.current = true;
    setSearchTerm(currentAddress?.formattedAddress || "");
    setPredictions([]);
    setMapError(null);
    setCurrentLocation(null);
    setCoords(nextCoords);
  }, [config.deliveryAddress, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      return;
    }
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
        const data = await readJsonResponse<{
          predictions?: GoongPrediction[];
          error?: string;
        }>(response);

        if (!response.ok || !data)
          throw new Error(data?.error || "Không thể tìm địa chỉ.");
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
    loadGoongSdk()
      .then(() => {
        if (!isMounted || !window.goongjs || !mapContainerRef.current) return;

        const maptilesKey = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;
        if (!maptilesKey) {
          setMapError("Chưa cấu hình khóa bản đồ.");
          return;
        }

        window.goongjs.accessToken = maptilesKey;
        const map = new window.goongjs.Map({
          container: mapContainerRef.current,
          style: GOONG_STYLE_URL,
          center: [coords.lng, coords.lat],
          zoom: 15,
        });
        map.on("error", (event) => {
          // Suppress all Goong map errors since they are usually non-critical warnings
          console.debug("Goong map event (suppressed):", event);
        });
        map.on("load", () => {
          console.debug("Goong map loaded successfully");
          window.setTimeout(() => map.resize(), 0);
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
    if (!currentLocation || !mapRef.current || !window.goongjs) return;

    currentLocationMarkerRef.current?.remove();
    const dot = document.createElement("div");
    dot.setAttribute("aria-label", "Vị trí hiện tại của bạn");
    dot.style.width = "18px";
    dot.style.height = "18px";
    dot.style.borderRadius = "9999px";
    dot.style.background = "#2563eb";
    dot.style.border = "3px solid white";
    dot.style.boxShadow = "0 0 0 7px rgba(37, 99, 235, 0.20)";

    currentLocationMarkerRef.current = new window.goongjs.Marker({
      element: dot,
    })
      .setLngLat([currentLocation.lng, currentLocation.lat])
      .addTo(mapRef.current);
  }, [currentLocation]);

  useEffect(() => {
    if (!isOpen) {
      markerRef.current?.remove();
      currentLocationMarkerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      currentLocationMarkerRef.current = null;
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
      const data = await readJsonResponse<{
        result?: GoongPlaceResult | null;
        error?: string;
      }>(response);

      if (!response.ok || !data?.result) {
        throw new Error(data?.error || "Không thể lấy địa chỉ.");
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
      setIsResolvingAddress(true);
      const response = await fetch(`/api/goong/reverse?lat=${lat}&lng=${lng}`);
      const data = await readJsonResponse<{
        result?: GoongPlaceResult | null;
        error?: string;
      }>(response);

      if (!response.ok || !data?.result) return;
      applyGoongResult(data.result, data.result.formatted_address);
    } catch (error) {
      console.error("Reverse geocode failed:", error);
    } finally {
      setIsResolvingAddress(false);
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
    skipNextAutocompleteRef.current = true;
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
    if (currentLocation) {
      void handleCoordinateChange(
        currentLocation.lat,
        currentLocation.lng,
        true,
      );
      return;
    }

    if (!navigator.geolocation) {
      setMapError("Trình duyệt chưa hỗ trợ lấy vị trí hiện tại.");
      return;
    }

    setIsLocating(true);
    setMapError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
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
    if (!canSave) return;

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

  const isFormValid = Boolean(street.trim() && district.trim() && city.trim());
  const currentAddressFingerprint = getAddressFingerprint({
    street,
    district,
    city,
    formattedAddress,
    placeId,
    lat: coords.lat,
    lng: coords.lng,
  });
  const hasAddressChanged =
    currentAddressFingerprint !== initialAddressFingerprintRef.current;
  const canSave =
    isFormValid && hasAddressChanged && !isLocating && !isResolvingAddress;

  const searchHeader = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        id="address-search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Nhập số nhà, tên đường, quận..."
        className="h-11 w-full rounded-xl border border-sand bg-bg-card pl-10 pr-16 text-sm font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
      />
      {isSearching && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted">
          Đang tìm...
        </span>
      )}
      {predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[42dvh] overflow-y-auto rounded-xl border border-sand bg-bg-card shadow-[0_16px_36px_rgba(61,36,23,0.16)]">
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
    </div>
  );

  const saveAction = (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={!canSave}
      className="min-h-9 rounded-xl bg-brand-500 px-4 text-sm font-black text-white shadow-[0_6px_14px_rgba(217,74,52,0.20)] transition-[background-color,color,box-shadow,transform] active:translate-y-px disabled:cursor-not-allowed disabled:bg-sand disabled:text-text-muted disabled:shadow-none"
    >
      Lưu
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Tìm và ghim địa chỉ của bạn"
      titleClassName="text-sm font-black leading-5 text-navy"
      headerAction={saveAction}
      headerContent={searchHeader}
      contentClassName="flex flex-col overflow-hidden p-3 lg:p-4"
      className="flex h-[90dvh] max-h-[760px] flex-col lg:h-[85vh] lg:max-h-[85vh] lg:max-w-xl"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sand bg-cream">
          <div className="relative min-h-[14rem] flex-1">
            <div className="absolute inset-0">
              <div ref={mapContainerRef} className="h-full w-full" />
            </div>
            <div className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-black text-navy shadow-sm backdrop-blur">
              Kéo pin đỏ để chỉnh điểm giao
            </div>
          </div>
          {mapError && (
            <div className="border-t border-sand px-3 py-2 text-xs font-bold text-amber-800">
              {mapError}
            </div>
          )}
          <div className="border-t border-sand bg-bg-card p-2.5">
            {currentLocation ? (
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 text-[11px] font-bold leading-4 text-text-muted">
                  <span className="text-blue-600">Chấm xanh: bạn</span>
                  <span aria-hidden="true"> · </span>
                  <span className="text-brand-600">Pin đỏ: điểm giao</span>
                </p>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={isResolvingAddress}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[11px] font-black text-blue-700 disabled:opacity-60"
                >
                  <LocateFixed className="h-4 w-4" />
                  Về vị trí của tôi
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={isLocating}
                className="group flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-brand-500 px-4 text-left text-white shadow-[0_8px_20px_rgba(217,74,52,0.26)] ring-4 ring-brand-500/10 transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/18">
                  <LocateFixed className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-4">
                    {isLocating
                      ? "Đang xác định vị trí..."
                      : "Xác định vị trí của tôi"}
                  </span>
                  {!isLocating && (
                    <span className="mt-0.5 block text-[10px] font-bold text-white/80">
                      Một chạm để thấy bạn đang đứng ở đâu
                    </span>
                  )}
                </span>
              </button>
            )}
          </div>
        </div>

        {formattedAddress && (
          <div className="shrink-0 rounded-xl bg-cream px-3 py-2 text-xs font-bold leading-4 text-navy ring-1 ring-sand">
            <span className="mb-0.5 block text-[9px] uppercase tracking-[0.12em] text-text-muted">
              Vị trí đã ghim của bạn
            </span>
            <span className="line-clamp-2">{formattedAddress}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

function getAddressFingerprint(address: {
  street: string;
  district: string;
  city: string;
  formattedAddress: string;
  placeId: string;
  lat: number;
  lng: number;
}) {
  return JSON.stringify([
    address.street.trim(),
    address.district.trim(),
    address.city.trim(),
    address.formattedAddress.trim(),
    address.placeId.trim(),
    address.lat.toFixed(6),
    address.lng.toFixed(6),
  ]);
}

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
      link.href = `https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@${GOONG_JS_VERSION}/dist/goong-js.css`;
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(
      GOONG_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existingScript && existingScript.dataset.loadState !== "failed") {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    existingScript?.remove();
    loadGoongScript(GOONG_SCRIPT_URLS, resolve, reject);
  });
}

function loadGoongScript(
  urls: string[],
  resolve: () => void,
  reject: (reason: Error) => void,
  index = 0,
) {
  const url = urls[index];
  if (!url) {
    reject(new Error("GOONG_SCRIPT_LOAD_FAILED"));
    return;
  }

  const script = document.createElement("script");
  script.id = GOONG_SCRIPT_ID;
  script.src = url;
  script.async = true;
  script.dataset.loadState = "loading";
  script.onload = () => {
    script.dataset.loadState = "loaded";
    resolve();
  };
  script.onerror = () => {
    script.dataset.loadState = "failed";
    script.remove();
    loadGoongScript(urls, resolve, reject, index + 1);
  };
  document.head.appendChild(script);
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
