import { Tabs, useRouter } from "expo-router";
import {
  BookSquare,
  DocumentText,
  Home2,
  Profile,
  Scan,
} from "iconsax-react-nativejs";
import React from "react";
import { View } from "react-native";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#159947", // primary.main
        tabBarInactiveTintColor: "#919EAB", // grey.500
        tabBarStyle: {
          height: 90, // Standard height for tab bar
          borderTopWidth: 0,
          backgroundColor: "#FFFFFF",
          paddingBottom: 8,
          paddingTop: 14,
          elevation: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500", // Medium
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <Home2
              size={24}
              color={color}
              variant={focused ? "Bold" : "Linear"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarLabel: "Thư viện",
          tabBarIcon: ({ color, focused }) => (
            <BookSquare
              size={24}
              color={color}
              variant={focused ? "Bold" : "Linear"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/scanner");
          },
        }}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => (
            <View
              className="h-16 w-16 items-center justify-center rounded-full bg-primary-main -mt-10"
              style={{
                shadowColor: "#159947",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: 10,
              }}
            >
              <Scan size={24} color="white" variant="Linear" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="articles"
        options={{
          tabBarLabel: "Bài viết",
          tabBarIcon: ({ color, focused }) => (
            <DocumentText
              size={24}
              color={color}
              variant={focused ? "Bold" : "Linear"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Cá nhân",
          tabBarIcon: ({ color, focused }) => (
            <Profile
              size={24}
              color={color}
              variant={focused ? "Bold" : "Linear"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
