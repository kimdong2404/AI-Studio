import { createRemoteAssets } from "./remoteAssets";

const locations = createRemoteAssets({
  type: "location",
  table: "locations",
  imageTable: "location_images",
  fk: "location_id",
  pathPrefix: "locations/",
  columns: {
    locType: "location_type",
    traits: "recognition_features",
    lighting: "color_lighting",
    time: "time_of_day",
    style: "style",
  },
});

export const saveLocation = locations.save;
export const deleteLocation = locations.remove;
export const useLocations = locations.useList;
