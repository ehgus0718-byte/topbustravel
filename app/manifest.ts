import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "topBustravel",
    short_name: "topBus",
    description: "버스 타고 떠나는 가장 쉬운 여행",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2b5ce6",
    icons: [],
  };
}
