import { useEffect, useState } from "react";
import { Image } from "expo-image";
import Svg, { Circle } from "react-native-svg";
import { Text, View } from "react-native";
import { User as UserIcon } from "iconsax-react-nativejs";

import { getImageUrl } from "@/shared/utils/image-utils";

interface EcoAvatarProgressProps {
  avatar?: string | null;
  level?: number | null;
  progressPercent?: number | null;
  size?: number;
}

export function EcoAvatarProgress({
  avatar,
  level = null,
  progressPercent = null,
  size = 112,
}: EcoAvatarProgressProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const source = getImageUrl(avatar);

  useEffect(() => {
    setImageFailed(false);
  }, [source]);

  const strokeWidth = 7;
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const avatarSize = size - 20;

  const hasProgress =
    typeof progressPercent === "number" && Number.isFinite(progressPercent);

  const progress = hasProgress
    ? Math.min(100, Math.max(0, progressPercent))
    : 0;

  const filledLength = (progress / 100) * circumference;

  const showImage = !!source && !imageFailed;

  const progressLabel = hasProgress
    ? `${Math.round(progress)}%`
    : "chưa có dữ liệu";

  return (
    <View
      style={{
        width: size,
        height: size + 11,
        alignItems: "center",
      }}
      accessible
      accessibilityLabel={
        level !== null
          ? `Avatar cấp ${level}, tiến độ lên cấp ${progressLabel}`
          : "Avatar người dùng, chưa tải cấp độ"
      }
    >
      {/* Avatar */}
      <View
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          overflow: "hidden",
          backgroundColor: "#E8F3EF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showImage ? (
          <Image
            source={{ uri: source }}
            style={{
              width: avatarSize,
              height: avatarSize,
            }}
            contentFit="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <UserIcon size={avatarSize * 0.4} color="#637381" variant="Linear" />
        )}
      </View>

      {/* XP Ring */}
      <Svg
        width={size}
        height={size}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#D9E8DF"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {hasProgress && progress > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#159947"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${circumference}`}
            transform={`rotate(-90 ${center} ${center})`}
            fill="none"
          />
        )}
      </Svg>

      {/* Level Badge */}
      {level !== null && (
        <View
          style={{
            position: "absolute",
            top: size - 22,
            alignSelf: "center",
            minWidth: 56,
            height: 26,
            paddingHorizontal: 10,
            borderRadius: 13,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            backgroundColor: "#159947",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            Lv. {level}
          </Text>
        </View>
      )}
    </View>
  );
}
