import { getImageUrl } from "@/shared/utils/image-utils";
import { Image, ImageContentFit } from "expo-image";
import { StyleProp, View, ImageStyle } from "react-native";

interface RemoteImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  className?: string;
}

/**
 * Remote image with Cloudinary URL normalization.
 * Uses expo-image + explicit style for reliable rendering on Android.
 */
export function RemoteImage({
  uri,
  style,
  contentFit = "cover",
  className,
}: RemoteImageProps) {
  const resolvedUri = getImageUrl(uri);

  if (!resolvedUri) {
    return <View style={style} className={`bg-grey-200 ${className ?? ""}`} />;
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={style}
      className={className}
      contentFit={contentFit}
      transition={200}
      recyclingKey={resolvedUri}
    />
  );
}
