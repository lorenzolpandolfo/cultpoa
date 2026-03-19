import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

import museum from "../assets/museum.svg";
import monument from "../assets/monument.svg";
import pin from "../assets/pin.svg";
import default_location from "../assets/default_location.svg";
import artwork from "../assets/artwork.svg";
import user from "../assets/user.svg";

const defaultPosition = [-30.0560132, -51.2313612];

const icons = {
  museum: new L.Icon({
    iconUrl: museum,
    iconSize: [48, 48],
  }),
  attraction: new L.Icon({
    iconUrl: pin,
    iconSize: [48, 48],
  }),
  monument: new L.Icon({
    iconUrl: monument,
    iconSize: [48, 48],
  }),
  artwork: new L.Icon({
    iconUrl: artwork,
    iconSize: [48, 48],
  }),
  default: new L.Icon({
    iconUrl: default_location,
    iconSize: [48, 48],
  }),
};

const userIcon = new L.Icon({
  iconUrl: user,
  iconSize: [48, 48],
});

const createClusterCustomIcon = (cluster) => {
  const count = cluster.getChildCount();

  let size = "small";
  if (count > 10) size = "medium";
  if (count > 50) size = "large";

  return L.divIcon({
    html: `<div class="cluster ${size}">${count}</div>`,
    className: "custom-cluster",
    iconSize: L.point(40, 40),
  });
};

function getIcon(type) {
  if (type === "museum") return icons.museum;
  if (type === "attraction") return icons.attraction;
  if (type === "monument") return icons.monument;
  if (type === "artwork") return icons.artwork;
  return icons.default;
}

function ChangeView({ center, follow }) {
  const map = useMap();

  useEffect(() => {
    if (follow && center) {
      map.setView(center);
    }
  }, [center, follow]);

  return null;
}

function MapEvents({ disableFollow }) {
  useMapEvents({
    dragstart: disableFollow,
    zoomstart: disableFollow,
  });
  return null;
}

function distance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

async function fetchWikipediaData(title) {
  try {
    const res = await fetch(
      `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );

    if (!res.ok) return null;

    const data = await res.json();

    return {
      extract: data.extract,
      image: data.thumbnail?.source || null,
    };
  } catch {
    return null;
  }
}

export default function Map() {
  const [position, setPosition] = useState(null);
  const [followUser, setFollowUser] = useState(true);
  const [nearPlace, setNearPlace] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [wikiCache, setWikiCache] = useState({});

  useEffect(() => {
    let watchId;

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = [pos.coords.latitude, pos.coords.longitude];

        setPosition((prev) => {
          if (!prev || distance(prev, next) > 0.0001) {
            return next;
          }
          return prev;
        });
      },
      (err) => console.error(err),
      {
        enableHighAccuracy: false,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    async function fetchPlaces() {
      setLoadingPlaces(true);

      const query = `
      [out:json][timeout:25];
      area["name"="Porto Alegre"]->.searchArea;
      (
        node["tourism"="attraction"](area.searchArea);
        node["historic"="monument"](area.searchArea);
      );
      out body;
      `;

      try {
        // const res = await fetch("https://overpass-api.de/api/interpreter", {
        const res = await fetch("http://localhost:8000/api/places", {
          method: "GET",
          headers: {
            "Content-Type": "text/plain",
          },
          // body: query,
        });

        const text = await res.text();
        const data = JSON.parse(text);

        console.log(data);

        const formatted = data.map((el) => ({
          id: el.id,
          name: el.name || "Sem nome",
          position: [el.lat, el.lon],
          type: el.type,
          description: el.description,
          image:
            el.image ||
            (el.wikipedia
              ? `https://commons.wikimedia.org/wiki/Special:FilePath/${el.wikipedia}`
              : null),
          wikipedia: el.wikipedia || null,
        }));

        setPlaces(formatted);
      } catch (err) {
        console.error("Erro ao buscar OSM:", err);
      } finally {
        setLoadingPlaces(false);
      }
    }

    fetchPlaces();
  }, []);

  useEffect(() => {
    if (!position || places.length === 0) return;

    for (const place of places) {
      if (distance(position, place.position) < 0.001) {
        setNearPlace(place);
        return;
      }
    }

    setNearPlace(null);
  }, [position, places]);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <MapContainer
        center={defaultPosition}
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapEvents disableFollow={() => setFollowUser(false)} />

        {position && (
          <>
            <ChangeView center={position} follow={followUser} />
            <Marker position={position} icon={userIcon}>
              <Popup>Você está aqui</Popup>
            </Marker>
          </>
        )}

        <MarkerClusterGroup
          disableClusteringAtZoom={17}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          iconCreateFunction={createClusterCustomIcon}
        >
          {places.map((place) => (
            <Marker
              key={place.id}
              position={place.position}
              icon={getIcon(place.type)}
              eventHandlers={{
                click: async () => {
                  if (!place.wikipedia) return;

                  const title = place.wikipedia.split(":")[1];

                  if (wikiCache[title]) return;

                  const data = await fetchWikipediaData(title);

                  if (data) {
                    setWikiCache((prev) => ({
                      ...prev,
                      [title]: data,
                    }));
                  }
                },
              }}
            >
              <Popup>
                <div style={{ maxWidth: "220px" }}>
                  <h3>{place.name}</h3>

                  {(() => {
                    const title = place.wikipedia?.split(":")[1];
                    const wiki = title ? wikiCache[title] : null;

                    const image = place.image || wiki?.image;
                    const description = place.description || wiki?.extract;

                    return (
                      <>
                        {image && (
                          <img
                            src={image}
                            style={{ width: "100%", borderRadius: "6px" }}
                          />
                        )}

                        {description && <p>{description}</p>}

                        {place.wikipedia && (
                          <a
                            href={`https://pt.wikipedia.org/wiki/${title}`}
                            target="_blank"
                          >
                            Ver mais
                          </a>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <button
        onClick={() => setFollowUser(true)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 99999,
          padding: "12px 16px",
          borderRadius: "10px",
          border: "none",
          background: "#007bff",
          color: "#fff",
          fontSize: "16px",
        }}
      >
        📍 Centralizar em mim
      </button>

      {loadingPlaces && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: 20,
            zIndex: 99999,
            background: "white",
            padding: "8px 12px",
            borderRadius: "6px",
          }}
        >
          Carregando pontos...
        </div>
      )}

      {nearPlace && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 99999,
          }}
        >
          Você está perto de: {nearPlace.name}
        </div>
      )}
    </div>
  );
}
