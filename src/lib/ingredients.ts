import { createRemoteAssets } from "./remoteAssets";

const ingredients = createRemoteAssets({
  type: "ingredient",
  table: "ingredients",
  imageTable: "ingredient_images",
  fk: "ingredient_id",
  pathPrefix: "ingredients/",
  columns: {
    ingType: "ingredient_type",
    traits: "recognition_features",
    color: "color",
    shape: "shape",
    freshness: "freshness",
  },
});

export const saveIngredient = ingredients.save;
export const deleteIngredient = ingredients.remove;
export const useIngredients = ingredients.useList;
