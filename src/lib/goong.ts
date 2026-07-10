const GOONG_BASE_URL = "https://rsapi.goong.io";

export type GoongPrediction = {
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

export type GoongPlaceDetail = {
  place_id?: string;
  formatted_address?: string;
  name?: string;
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

export type GoongGeocodeResult = {
  formatted_address?: string;
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

function getGoongApiKey() {
  const key = process.env.GOONG_API_KEY;
  if (!key) {
    throw new Error("GOONG_API_KEY_NOT_CONFIGURED");
  }
  return key;
}

async function fetchGoong<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) {
  const url = new URL(path, GOONG_BASE_URL);
  url.searchParams.set("api_key", getGoongApiKey());

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as T & { status?: string; error?: string };

  if (!response.ok || data.status === "INVALID_REQUEST") {
    throw new Error(data.error || "GOONG_REQUEST_FAILED");
  }

  return data;
}

export async function autocompleteGoongPlaces({
  input,
  location,
  sessionToken,
}: {
  input: string;
  location?: string;
  sessionToken?: string;
}) {
  const data = await fetchGoong<{ predictions?: GoongPrediction[] }>(
    "/Place/AutoComplete",
    {
      input,
      location,
      sessiontoken: sessionToken,
      more_compound: true,
      limit: 8,
    },
  );

  return data.predictions ?? [];
}

export async function getGoongPlaceDetail({
  placeId,
  sessionToken,
}: {
  placeId: string;
  sessionToken?: string;
}) {
  const data = await fetchGoong<{ result?: GoongPlaceDetail }>("/Place/Detail", {
    place_id: placeId,
    sessiontoken: sessionToken,
  });

  return data.result ?? null;
}

export async function reverseGeocodeGoong(lat: number, lng: number) {
  const data = await fetchGoong<{ results?: GoongGeocodeResult[] }>("/Geocode", {
    latlng: `${lat},${lng}`,
  });

  return data.results?.[0] ?? null;
}
