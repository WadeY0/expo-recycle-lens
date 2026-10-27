import { Redirect } from "expo-router";

export function ArticleFavoritesScreen() {
  return (
    <Redirect
      href={{
        pathname: "/(protected)/favorites",
        params: {
          tab: "posts",
        },
      }}
    />
  );
}
