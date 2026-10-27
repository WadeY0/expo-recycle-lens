import { ArticleType, CategoryType } from '@prisma/client';
export const CONTENT_CATEGORIES = [
  { key: 'sorting', title: 'Phân loại và tái chế', type: CategoryType.post },
  { key: 'plastic', title: 'Nhựa và bao bì', type: CategoryType.post },
  { key: 'paper', title: 'Giấy và carton', type: CategoryType.post },
  {
    key: 'glass-metal',
    title: 'Thủy tinh và kim loại',
    type: CategoryType.post,
  },
  {
    key: 'special',
    title: 'Rác cần thu gom đặc biệt',
    type: CategoryType.post,
  },
  { key: 'organic', title: 'Hữu cơ và compost', type: CategoryType.post },
  {
    key: 'lifestyle',
    title: 'Thói quen sống bền vững',
    type: CategoryType.post,
  },
  {
    key: 'collection',
    title: 'Kiểm tra hướng dẫn địa phương',
    type: CategoryType.post,
  },
  { key: 'handbook', title: 'Sổ tay môi trường', type: CategoryType.library },
  {
    key: 'checklist',
    title: 'Checklist môi trường',
    type: CategoryType.library,
  },
];
interface ContentItem {
  key: string;
  category: string;
  title: string;
  summary: string;
  intro: string;
  steps: string[];
  type?: ArticleType;
}
export const CONTENT_ITEMS: ContentItem[] = [
  {
    key: 'start-sorting',
    category: 'sorting',
    title: 'Bắt đầu phân loại từ những vật quen thuộc',
    summary:
      'Quan sát vật liệu, giữ riêng đồ nghi nguy hại và hỏi đơn vị thu gom trước khi chọn luồng xử lý.',
    intro:
      'Một vật có thể gồm nhiều lớp vật liệu. Tên gọi quen thuộc hoặc màu thùng không đủ để kết luận vật đó được nhận tái chế tại nơi bạn sống.',
    steps: [
      'Chọn một vật để kiểm tra nhãn và thành phần.',
      'Tách phần sạch, khô khi thao tác an toàn và hướng dẫn tiếp nhận yêu cầu.',
      'Giữ riêng pin, hóa chất và vật sắc nhọn; không thử xử lý bằng tay trần.',
    ],
  },
  {
    key: 'recycling-conditions',
    category: 'sorting',
    title: 'Có thể tái chế không có nghĩa là mọi nơi đều nhận',
    summary:
      'Hiểu sự khác nhau giữa vật liệu có khả năng tái chế và một chương trình thu gom thực sự tiếp nhận.',
    intro:
      'Quy trình thu gom phụ thuộc vật liệu, mức bẩn, hình dạng và khả năng xử lý của đơn vị tiếp nhận. Không dùng một quy tắc trên internet cho mọi địa phương.',
    steps: [
      'Hỏi rõ loại bao bì và tình trạng được nhận.',
      'Đọc yêu cầu về nắp, nhãn và cách chuẩn bị.',
      'Khi chưa có nơi nhận, giữ thông tin để tra cứu thay vì trộn vào luồng tái chế.',
    ],
  },
  {
    key: 'sorting-mistakes',
    category: 'sorting',
    title: 'Những lỗi dễ gặp khi gom rác để tái chế',
    summary:
      'Tránh trộn đồ bẩn, đồ sắc hoặc túi nhựa vào vật liệu sạch mà chưa hỏi nơi tiếp nhận.',
    intro:
      'Cho một vật vào nhóm tái chế chỉ vì mong nó được xử lý có thể làm khó quá trình phân loại. Kiểm tra điều kiện tiếp nhận hữu ích hơn một nhãn khẳng định chắc chắn.',
    steps: [
      'Để thức ăn thừa và giấy sạch riêng nhau.',
      'Không đưa pin hoặc vật sắc nhọn vào túi chai lọ.',
      'Không lồng nhiều vật liệu với nhau nếu nơi nhận cần phân loại riêng.',
    ],
  },
  {
    key: 'pet-labels',
    category: 'plastic',
    title: 'Chai PET: đọc nhãn trước khi chuẩn bị',
    summary:
      'Tìm ký hiệu vật liệu và kiểm tra điều kiện nhận chai tại điểm thu gom của bạn.',
    intro:
      'Hình dáng chai trong suốt không chứng minh chắc chắn vật liệu là PET. Ký hiệu trên sản phẩm cung cấp thêm thông tin nhưng cũng không bảo đảm có chương trình nhận phù hợp.',
    steps: [
      'Kiểm tra nhãn hoặc ký hiệu đáy chai khi nhìn thấy rõ.',
      'Làm rỗng chai chứa đồ uống nếu an toàn.',
      'Hỏi yêu cầu về nắp, nhãn và mức sạch; không rửa chai từng chứa hóa chất.',
    ],
  },
  {
    key: 'plastic-film',
    category: 'plastic',
    title: 'Túi và màng nhựa cần một luồng phù hợp',
    summary: 'Không mặc định túi mềm được tiếp nhận cùng chai nhựa cứng.',
    intro:
      'Túi và màng nhựa có đặc tính xử lý khác nhựa cứng. Bao bì nhiều lớp hoặc màng bẩn càng cần thông tin từ đơn vị tiếp nhận.',
    steps: [
      'Ưu tiên giảm túi dùng một lần và tái sử dụng túi còn lành.',
      'Hỏi chương trình có nhận màng mềm sạch, khô hay không.',
      'Không trộn màng vào nhóm chai cứng nếu chưa có hướng dẫn.',
    ],
  },
  {
    key: 'mixed-packaging',
    category: 'plastic',
    title: 'Bao bì nhiều lớp: vì sao nhìn bề ngoài chưa đủ',
    summary: 'Giấy, nhựa và lớp phủ có thể cùng xuất hiện trong một bao bì.',
    intro:
      'Bao bì đồ uống hoặc gói thực phẩm có thể kết hợp nhiều thành phần để bảo quản. Việc tháo hoặc tách tại nhà không tự làm chúng trở thành vật liệu được nhận.',
    steps: [
      'Tra tên bao bì và thông tin thành phần từ nhà sản xuất.',
      'Hỏi nơi thu gom có luồng chuyên biệt hay không.',
      'Không đốt hoặc dùng dung môi để tách các lớp.',
    ],
  },
  {
    key: 'dry-paper',
    category: 'paper',
    title: 'Giữ giấy sạch và khô khi chờ thu gom',
    summary: 'Độ ẩm và thức ăn bám làm thay đổi khả năng tiếp nhận của giấy.',
    intro:
      'Giấy khô và ít tạp chất thường dễ phân loại hơn giấy ướt hoặc phủ nhiều lớp. Điều kiện cụ thể vẫn phụ thuộc đơn vị tiếp nhận.',
    steps: [
      'Để giấy ở nơi khô, tránh nước và thức ăn.',
      'Phân biệt giấy thường với giấy phủ hoặc bao bì hỗn hợp.',
      'Kiểm tra yêu cầu đối với ghim, băng keo và tài liệu nhạy cảm.',
    ],
  },
  {
    key: 'greasy-paper',
    category: 'paper',
    title: 'Giấy dính dầu mỡ không giống giấy sạch',
    summary:
      'Quan sát phần bẩn trước khi gom hộp thực phẩm cùng giấy văn phòng.',
    intro:
      'Giấy thấm dầu hoặc có thức ăn bám có thể không phù hợp với luồng giấy sạch. Không dùng một hướng dẫn cho cả hộp sạch và hộp bị bẩn.',
    steps: [
      'Nếu an toàn, tách phần sạch theo hướng dẫn nơi nhận.',
      'Không trộn khăn giấy bẩn với giấy văn phòng.',
      'Chỉ cân nhắc compost khi thành phần và hệ thống ủ thực sự phù hợp.',
    ],
  },
  {
    key: 'cardboard-storage',
    category: 'paper',
    title: 'Chuẩn bị bìa carton mà không làm lẫn tạp chất',
    summary: 'Làm rỗng, giữ khô và xếp gọn theo yêu cầu thu gom.',
    intro:
      'Thùng carton dùng để vận chuyển có thể bị dính băng keo, thức ăn hoặc ẩm. Chuẩn bị gọn giúp việc lưu trữ, nhưng yêu cầu tháo băng keo hay ép phẳng cần hỏi nơi nhận.',
    steps: [
      'Lấy đồ bên trong ra nếu việc đó an toàn.',
      'Giữ hộp khô và không dùng chứa rác nguy hại.',
      'Xếp gọn phù hợp không gian, không chèn vật sắc vào giữa các lớp.',
    ],
  },
  {
    key: 'glass-differences',
    category: 'glass-metal',
    title: 'Chai lọ thủy tinh khác kính cửa và gốm',
    summary: 'Không gộp mọi vật trong suốt hoặc cứng vào cùng một nhóm.',
    intro:
      'Chai lọ, kính chịu nhiệt, kính cửa và gốm có thể cần luồng xử lý khác nhau. Một tên chung như thủy tinh chưa đủ để quyết định.',
    steps: [
      'Hỏi nơi nhận có chỉ thu chai lọ hay nhận loại kính khác.',
      'Không đập vỡ để giảm thể tích.',
      'Với mảnh sắc, tránh chạm trực tiếp và làm theo hướng dẫn chuyên trách.',
    ],
  },
  {
    key: 'food-cans',
    category: 'glass-metal',
    title: 'Lon thực phẩm: làm rỗng và chú ý cạnh sắc',
    summary:
      'Nhôm và thép cần được xác định đúng, trong khi an toàn thao tác luôn ưu tiên.',
    intro:
      'Lon đồ uống và hộp thực phẩm có thể là nhôm hoặc thép. Nắp cắt và cạnh mép có thể gây thương tích; không cần thử bằng cách phá hoặc cắt vật.',
    steps: [
      'Đọc nhãn hoặc thông tin sản phẩm để xác định vật liệu.',
      'Làm rỗng thực phẩm còn lại nếu an toàn.',
      'Hỏi cách gom nắp và lon; tránh để cạnh sắc lộ ra trong túi.',
    ],
  },
  {
    key: 'metal-contamination',
    category: 'glass-metal',
    title: 'Không gom bình hóa chất như lon thực phẩm',
    summary:
      'Vật liệu kim loại không xóa đi rủi ro từ chất từng chứa bên trong.',
    intro:
      'Một bình có thể bằng kim loại nhưng vẫn chứa chất nguy hại hoặc chịu áp lực. Không suy luồng xử lý chỉ từ vật liệu vỏ.',
    steps: [
      'Giữ nhãn để người tiếp nhận biết nội dung cũ.',
      'Không chọc thủng, ép, đốt hoặc tráng bình chứa hóa chất.',
      'Liên hệ luồng thu gom chuyên biệt khi nghi có chất nguy hại.',
    ],
  },
  {
    key: 'electronics',
    category: 'special',
    title: 'Thiết bị điện tử cũ: tìm nơi tiếp nhận phù hợp',
    summary:
      'Tách thiết bị điện tử khỏi rác sinh hoạt và bảo vệ dữ liệu cá nhân.',
    intro:
      'Điện tử có thể chứa nhiều vật liệu và pin tích hợp. Tháo dỡ không đúng cách gây rủi ro; việc tái sử dụng hoặc thu hồi cần nơi tiếp nhận phù hợp.',
    steps: [
      'Nếu thiết bị còn an toàn, cân nhắc sửa hoặc chuyển cho người có nhu cầu.',
      'Bảo vệ dữ liệu trước khi giao thiết bị theo hướng dẫn của nhà sản xuất.',
      'Không tháo pin phồng hoặc thiết bị cháy hỏng tại nhà.',
    ],
  },
  {
    key: 'batteries',
    category: 'special',
    title: 'Pin và ắc quy cần cảnh giác hơn bao bì thông thường',
    summary: 'Không bỏ pin vào nhóm tái chế chung hoặc thử mở pin.',
    intro:
      'Pin có thể gây rò rỉ hoặc cháy nếu bị hư hỏng. Hướng dẫn tiếp nhận tùy loại pin và tình trạng; không tự áp dụng quy trình cho một loại sang mọi loại khác.',
    steps: [
      'Giữ trẻ em và vật nuôi tránh xa pin nghi hỏng.',
      'Không chọc, tháo, nghiền, đốt hoặc ngâm pin.',
      'Nếu pin phồng, nóng hay rò rỉ, tránh tiếp xúc và hỏi đơn vị chuyên trách.',
    ],
  },
  {
    key: 'hazardous-sharps',
    category: 'special',
    title: 'Hóa chất và vật sắc nhọn: ưu tiên tránh tiếp xúc',
    summary: 'Dùng hướng dẫn chuyên trách thay vì một mẹo tái chế chung.',
    intro:
      'Vật chứa hóa chất, kim tiêm và mảnh sắc có rủi ro khác nhau. Bài này không thay hướng dẫn y tế hoặc quy trình tiếp nhận chất nguy hại.',
    steps: [
      'Không trộn hóa chất hoặc tráng bao bì để làm sạch.',
      'Không nhặt kim bằng tay trần hoặc cố bẻ, đậy lại kim.',
      'Giữ thông tin nhãn và hỏi cơ sở có trách nhiệm tiếp nhận phù hợp.',
    ],
  },
  {
    key: 'food-separation',
    category: 'organic',
    title: 'Tách rác thực phẩm để dễ quản lý hơn',
    summary: 'Quan sát thành phần và cách lưu trữ trước khi chọn hướng xử lý.',
    intro:
      'Rác thực phẩm có thể phát sinh mùi và thu hút côn trùng. Việc ủ hoặc thu gom hữu cơ cần hệ thống phù hợp, không chỉ một nhãn phân hủy sinh học.',
    steps: [
      'Dùng vật chứa phù hợp, hạn chế rò rỉ.',
      'Không trộn pin, nhựa hoặc hóa chất vào thực phẩm thừa.',
      'Hỏi nơi tiếp nhận hữu cơ về loại thực phẩm và cách đóng gói.',
    ],
  },
  {
    key: 'compost-basics',
    category: 'organic',
    title: 'Compost tại nhà bắt đầu từ hệ thống phù hợp',
    summary:
      'Cân nhắc không gian, loại nguyên liệu và việc chăm sóc trước khi ủ.',
    intro:
      'Không phải mọi nguyên liệu hữu cơ phù hợp với mọi hệ thống ủ tại nhà. Chọn hướng dẫn cho chính loại hệ thống bạn sử dụng và theo dõi dấu hiệu mùi, côn trùng hoặc quá ẩm.',
    steps: [
      'Chọn hệ thống và hướng dẫn an toàn rõ ràng.',
      'Chỉ thêm nguyên liệu được hướng dẫn chấp nhận.',
      'Không dùng compost chưa ổn định hoặc nguồn không rõ cho mục đích nhạy cảm.',
    ],
  },
  {
    key: 'compost-labels',
    category: 'organic',
    title: 'Nhãn compostable cần được đọc cùng điều kiện xử lý',
    summary:
      'Phân biệt khả năng phân hủy với hệ thống thực sự tiếp nhận bao bì.',
    intro:
      'Một nhãn compostable có thể gắn với điều kiện xử lý cụ thể. Nó không tự chứng minh bao bì phù hợp thùng ủ tại nhà hoặc có thể thả ra môi trường.',
    steps: [
      'Đọc chứng nhận và điều kiện ghi trên bao bì.',
      'Hỏi nơi tiếp nhận có xử lý loại bao bì đó không.',
      'Không trộn bao bì chưa rõ vào luồng hữu cơ sạch.',
    ],
  },
  {
    key: 'reduce-first',
    category: 'lifestyle',
    title: 'Giảm phát sinh trước khi nghĩ tới tái chế',
    summary: 'Bắt đầu bằng một thói quen nhỏ có thể duy trì trong sinh hoạt.',
    intro:
      'Tái chế cần hạ tầng và điều kiện tiếp nhận. Giảm đồ không cần thiết và kéo dài thời gian sử dụng là những lựa chọn có thể cân nhắc trước khi mua thêm.',
    steps: [
      'Kiểm tra đồ đang có trước khi mua.',
      'Chọn lượng phù hợp để tránh bỏ thừa.',
      'Theo dõi một thói quen thực tế thay vì so sánh bằng số liệu chưa kiểm chứng.',
    ],
  },
  {
    key: 'reuse-safely',
    category: 'lifestyle',
    title: 'Tái sử dụng cũng cần đúng mục đích và an toàn',
    summary: 'Không chuyển vật chứa hóa chất sang chứa đồ ăn hoặc nước uống.',
    intro:
      'Tái sử dụng không có nghĩa là mọi vật đều phù hợp với mọi mục đích. Chất liệu, tình trạng và nội dung từng chứa cần được xem xét.',
    steps: [
      'Chỉ tái sử dụng trong mục đích an toàn được hướng dẫn.',
      'Không dùng bao bì hóa chất để đựng thực phẩm.',
      'Khi vật hỏng hoặc không rõ nguồn, tra hướng dẫn thay vì cố sửa nguy hiểm.',
    ],
  },
  {
    key: 'shopping-plan',
    category: 'lifestyle',
    title: 'Chuẩn bị một chuyến mua sắm ít đồ thừa hơn',
    summary:
      'Danh sách và vật dụng dùng lại giúp bạn lựa chọn theo nhu cầu thật.',
    intro:
      'Một kế hoạch đơn giản có thể giúp tránh mua trùng hoặc dùng thêm bao bì không cần thiết. Không cần hứa một tỷ lệ giảm rác chung cho mọi gia đình.',
    steps: [
      'Lập danh sách theo lượng cần dùng.',
      'Mang túi hoặc vật chứa sạch nếu cửa hàng cho phép.',
      'Ưu tiên lựa chọn phù hợp khả năng bảo quản và sử dụng.',
    ],
  },
  {
    key: 'ask-collector',
    category: 'collection',
    title: 'Ba câu hỏi để xác minh một hướng dẫn thu gom',
    summary:
      'Hỏi về loại vật, tình trạng và cách giao nhận thay vì chỉ nhìn màu thùng.',
    intro:
      'Thông tin cần gắn với đơn vị tiếp nhận cụ thể và thời điểm áp dụng. Một bài học tổng quát không thay danh sách vật được nhận tại nơi bạn sống.',
    steps: [
      'Loại vật liệu hoặc sản phẩm này có được nhận không?',
      'Cần làm rỗng, giữ khô hay tách bộ phận nào?',
      'Giao nhận ở đâu và có điều kiện an toàn hoặc lịch nào cần biết?',
    ],
  },
  {
    key: 'storage-handbook',
    category: 'handbook',
    type: ArticleType.library,
    title: 'Sổ tay lưu trữ vật liệu trước khi thu gom',
    summary:
      'Checklist tổng quát giúp giữ vật liệu sạch riêng và tránh tiếp xúc đồ nghi nguy hại.',
    intro:
      'Đây là tài liệu học tập, không phải quy định thu gom. Sắp xếp không gian phù hợp gia đình và giữ hướng dẫn nhận vật liệu của đơn vị thu gom để đối chiếu.',
    steps: [
      'Giữ giấy sạch khô, tách khỏi thực phẩm và đồ ướt.',
      'Để đồ nghi nguy hại ở vị trí an toàn theo hướng dẫn chuyên trách.',
      'Không tích trữ vật nóng, phồng, rò rỉ hoặc sắc nhọn không được kiểm soát.',
    ],
  },
  {
    key: 'ai-checklist',
    category: 'checklist',
    type: ArticleType.library,
    title: 'Checklist đọc một kết quả nhận dạng AI',
    summary:
      'Kiểm tra nhãn vật liệu, trạng thái uncertain và nguồn hướng dẫn trước khi hành động.',
    intro:
      'AI chỉ quan sát ảnh và có thể sai. Một gợi ý giống tên vật không chứng minh thành phần hoặc khả năng tiếp nhận tái chế tại địa phương.',
    steps: [
      'Đọc cảnh báo unknown, uncertain và hazardous.',
      'So sánh vật thật với nhãn hoặc thông tin thành phần khi an toàn.',
      'Tra thư viện đã biên soạn và xác minh quy định địa phương; không dùng điểm model như xác suất đã hiệu chuẩn.',
    ],
  },
];
export function contentHtml(item: ContentItem) {
  return `<h2>${item.title}</h2><p>${item.intro}</p><h3>Gợi ý thực hành</h3><ul>${item.steps.map((line) => `<li>${line}</li>`).join('')}</ul><p>Hướng dẫn học tập tổng quát. Điều kiện tiếp nhận tại Việt Nam cần được xác minh với đơn vị thu gom địa phương; không phải quy định hoặc cam kết tái chế ở mọi nơi.</p>`;
}
