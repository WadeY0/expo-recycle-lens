import { Image, ImageBackground } from "react-native";
import images from "@/shared/constants/images";


export function SplashScreen() {
  return (
    <ImageBackground
      source={images.splash}
      className="flex-1 items-center justify-center"
    >
      <Image source={images.logo} className="w-52 h-52" />
    </ImageBackground>
  );
}
