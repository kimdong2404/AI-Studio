import { createRemoteAssets } from "./remoteAssets";

const props = createRemoteAssets({
  type: "prop",
  table: "props",
  imageTable: "prop_images",
  fk: "prop_id",
  pathPrefix: "props/",
  columns: {},
});

export const saveProp = props.save;
export const deleteProp = props.remove;
export const useProps = props.useList;
