import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "iconsax-react-nativejs";
import { useRouter } from "expo-router";

const Section = ({ title, content }: { title: string; content: string }) => (
  <View className="mb-6">
    <Text className="text-lg font-bold text-grey-900 mb-2">{title}</Text>
    <Text className="text-sm text-grey-600 leading-6">{content}</Text>
  </View>
);

const BulletPoint = ({ text }: { text: string }) => (
  <View className="flex-row mb-1 ml-4">
    <Text className="text-grey-400 mr-2">•</Text>
    <Text className="text-sm text-grey-600 flex-1 leading-6">{text}</Text>
  </View>
);

export function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 relative">
        <Pressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-2xl bg-grey-100 z-10"
        >
          <ArrowLeft size={24} color="#161C24" variant="Linear" />
        </Pressable>
        <View className="absolute inset-x-0 bottom-0 top-0 items-center justify-center -z-0">
          <Text className="text-xl font-bold text-grey-900">
            Điều khoản & Điều kiện
          </Text>
        </View>
        <View className="w-12" />
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="py-4">
          <Text className="text-xs text-grey-400 mb-4">Cập nhật lần cuối: 01/01/2026</Text>
          <Text className="text-sm text-grey-700 leading-6 mb-6">
            Chào mừng bạn đến với GreenLens. Khi sử dụng ứng dụng này, bạn đồng ý tuân thủ các điều khoản và điều kiện dưới đây. Nếu bạn không đồng ý với các điều khoản này, vui lòng không sử dụng ứng dụng.
          </Text>

          <View className="mb-6">
            <Text className="text-lg font-bold text-grey-900 mb-2">1. Giới thiệu</Text>
            <Text className="text-sm text-grey-600 leading-6">
              GreenLens là ứng dụng hỗ trợ <Text className="font-bold">nhận diện và phân loại rác thải thông qua hình ảnh và trí tuệ nhân tạo (AI)</Text>. Ứng dụng cung cấp thông tin hướng dẫn xử lý rác và kiến thức về môi trường nhằm nâng cao nhận thức cộng đồng.{"\n"}
              Thông tin trong ứng dụng chỉ mang tính <Text className="font-bold">tham khảo và giáo dục</Text>.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-bold text-grey-900 mb-2">2. Điều kiện sử dụng</Text>
            <Text className="text-sm text-grey-600 mb-2">Khi sử dụng GreenLens, người dùng đồng ý:</Text>
            <BulletPoint text="Sử dụng ứng dụng cho mục đích hợp pháp" />
            <BulletPoint text="Không sử dụng ứng dụng để gây ảnh hưởng đến hệ thống hoặc người dùng khác" />
            <BulletPoint text="Không sao chép, chỉnh sửa hoặc phân phối nội dung của ứng dụng khi chưa được phép" />
            <Text className="text-sm text-grey-600 mt-2 leading-6">
              Người dùng chịu trách nhiệm đối với các hoạt động thực hiện thông qua tài khoản của mình (nếu có).
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-bold text-grey-900 mb-2">3. Độ chính xác của nhận diện AI</Text>
            <Text className="text-sm text-grey-600 mb-2">
              GreenLens sử dụng công nghệ trí tuệ nhân tạo để nhận diện rác thải. Tuy nhiên:
            </Text>
            <BulletPoint text="Kết quả nhận diện có thể không hoàn toàn chính xác trong mọi môi trường" />
            <BulletPoint text="Người dùng nên xem xét kết quả như gợi ý tham khảo" />
            <Text className="text-sm text-grey-600 mt-2 leading-6">
              GreenLens không chịu trách nhiệm đối với các quyết định xử lý rác dựa hoàn toàn vào kết quả từ ứng dụng.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-bold text-grey-900 mb-2">4. Nội dung và thông tin</Text>
            <Text className="text-sm text-grey-600 mb-2">Ứng dụng có thể cung cấp:</Text>
            <BulletPoint text="Thông tin phân loại rác" />
            <BulletPoint text="Hướng dẫn xử lý và tái chế" />
            <BulletPoint text="Bài viết kiến thức về môi trường" />
            <Text className="text-sm text-grey-600 mt-2 leading-6">
              Chúng tôi có thể cập nhật hoặc thay đổi nội dung trong ứng dụng bất kỳ lúc nào nhằm cải thiện chất lượng thông tin.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-bold text-grey-900 mb-2">5. Quyền sở hữu trí tuệ</Text>
            <Text className="text-sm text-grey-600 mb-2">Tất cả nội dung trong ứng dụng bao gồm:</Text>
            <BulletPoint text="Thiết kế giao diện" />
            <BulletPoint text="Hình ảnh minh họa" />
            <BulletPoint text="Nội dung bài viết" />
            <BulletPoint text="Công nghệ và phần mềm" />
            <Text className="text-sm text-grey-600 mt-2 leading-6">
              đều thuộc quyền sở hữu của GreenLens hoặc các bên cấp phép.{"\n"}
              Người dùng không được sao chép hoặc sử dụng cho mục đích thương mại khi chưa có sự cho phép.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-bold text-grey-900 mb-2">6. Quyền riêng tư</Text>
            <Text className="text-sm text-grey-600 mb-2">GreenLens có thể thu thập một số dữ liệu cần thiết để vận hành ứng dụng, bao gồm:</Text>
            <BulletPoint text="Hình ảnh rác được quét" />
            <BulletPoint text="Thông tin sử dụng ứng dụng" />
            <BulletPoint text="Dữ liệu kỹ thuật cơ bản" />
            <Text className="text-sm text-grey-600 mt-2 leading-6">
              Việc sử dụng dữ liệu sẽ tuân theo Chính sách quyền riêng tư của GreenLens.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-bold text-grey-900 mb-2">7. Giới hạn trách nhiệm</Text>
            <Text className="text-sm text-grey-600 mb-2">GreenLens không chịu trách nhiệm đối với:</Text>
            <BulletPoint text="Thiệt hại phát sinh từ việc sử dụng hoặc không thể sử dụng ứng dụng" />
            <BulletPoint text="Sai sót trong kết quả nhận diện AI" />
            <BulletPoint text="Nội dung từ các nguồn bên thứ ba" />
            <Text className="text-sm text-grey-600 mt-2 leading-6">
              Ứng dụng được cung cấp trên cơ sở &quot;như hiện có&quot;.
            </Text>
          </View>

          <View className="mb-10">
            <Text className="text-lg font-bold text-grey-900 mb-2">8. Thay đổi điều khoản</Text>
            <Text className="text-sm text-grey-600 leading-6">
              GreenLens có thể cập nhật Điều khoản & Điều kiện theo thời gian. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trong ứng dụng.{"\n"}
              Việc tiếp tục sử dụng ứng dụng sau khi thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
