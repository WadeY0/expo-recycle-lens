import { AppProviders } from "@/providers/AppProviders";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import "../../global.css";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  return (
    <AppProviders>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(protected)" />
        {/* <Stack.Screen
          name="modal/example"
          options={{ presentation: "modal" }}
        /> */}
      </Stack>
    </AppProviders>
  );
}
