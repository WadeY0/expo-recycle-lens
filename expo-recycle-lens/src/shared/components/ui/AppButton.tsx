import { ActivityIndicator, Pressable, Text, View } from "react-native";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "google";
  disabled?: boolean;
  icon?: React.ReactNode;
};

const buttonVariants = {
  primary: "bg-primary-main active:bg-primary-dark",
  secondary:
    "bg-grey-200 active:bg-grey-300 dark:bg-grey-800 dark:active:bg-grey-700",
  danger: "bg-secondary-main active:bg-secondary-dark",
  google: "bg-grey-100 active:bg-grey-200",
};

const textVariants = {
  primary: "text-white",
  secondary: "text-grey-900 dark:text-grey-100",
  danger: "text-white",
  google: "text-grey-500 font-medium",
};

export function AppButton({
  label,
  onPress,
  loading = false,
  variant = "primary",
  disabled = false,
  icon,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      className={`min-h-14 flex-row items-center justify-center rounded-2xl px-4 ${
        buttonVariants[variant]
      } ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "white" : "#919EAB"}
        />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`text-base font-semibold ${textVariants[variant]}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
