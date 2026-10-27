import { createHash } from 'node:crypto';
import { WasteGuidance } from '../waste.types';

export const DATASET_VERSION = '2026-10-general-v1';
export const LOCAL_CONTEXT =
  'Hướng dẫn tổng quát, không phải quy định thu gom tại Việt Nam. Xác minh với đơn vị thu gom hoặc điểm tiếp nhận địa phương; ký hiệu vật liệu không bảo đảm được nhận tái chế.';
export const MATERIALS = [
  { id: 'plastic', name: 'Nhựa' },
  { id: 'paper', name: 'Giấy' },
  { id: 'glass', name: 'Thủy tinh' },
  { id: 'aluminium', name: 'Nhôm' },
  { id: 'steel', name: 'Thép' },
  { id: 'organic', name: 'Hữu cơ' },
  { id: 'textile', name: 'Vải' },
  { id: 'battery', name: 'Pin' },
  { id: 'mixed', name: 'Vật liệu hỗn hợp' },
];
export const WASTE_CATEGORIES = [
  { key: 'plastics', name: 'Nhựa và bao bì' },
  { key: 'paper', name: 'Giấy và carton' },
  { key: 'glass', name: 'Thủy tinh' },
  { key: 'metals', name: 'Kim loại' },
  { key: 'organic', name: 'Hữu cơ' },
  { key: 'reuse', name: 'Tái sử dụng' },
  { key: 'special', name: 'Thu gom đặc biệt' },
];
export function catalogId(namespace: string, key: string): string {
  const hex = createHash('sha256')
    .update(`recyclelens:phase1:${namespace}:${key}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function normalizeTerm(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const references = {
  common: [
    'How Do I Recycle Common Recyclables',
    'https://www.epa.gov/recycle/how-do-i-recycle-common-recyclables',
  ],
  battery: [
    'Used Household Batteries',
    'https://www.epa.gov/recycle/used-household-batteries',
  ],
  hazardous: [
    'Household Hazardous Waste',
    'https://www.epa.gov/hw/household-hazardous-waste-hhw',
  ],
  electronics: [
    'Electronics Donation and Recycling',
    'https://www.epa.gov/recycle/electronics-donation-and-recycling',
  ],
  compost: [
    'Composting At Home',
    'https://www.epa.gov/recycle/composting-home',
  ],
  mercury: [
    'Cleaning Up a Broken CFL',
    'https://www.epa.gov/mercury/cleaning-broken-cfl',
  ],
  sharps: [
    'Safely Using Sharps',
    'https://www.fda.gov/medical-devices/consumer-products/safely-using-sharps-needles-and-syringes-home-work-and-travel',
  ],
} as const;
export interface CuratedWaste {
  slug: string;
  name: string;
  nameEn: string;
  category: string;
  aliases: string[];
  materials: string[];
  guidance: WasteGuidance;
}
function item(
  slug: string,
  name: string,
  nameEn: string,
  category: string,
  materials: string[],
  aliases: string[],
  emoji: string,
  recycling: WasteGuidance['recycling'],
  preparation: string[],
  disposal: string[],
  warnings: string[],
  examples: string[],
  source: keyof typeof references = 'common',
  hazardous = false,
): CuratedWaste {
  const [title, url] = references[source];
  return {
    slug,
    name,
    nameEn,
    category,
    materials,
    aliases: [...new Set([slug, name, nameEn, ...aliases])],
    guidance: {
      recycling,
      uncertainty:
        'Ảnh không xác định chắc chắn thành phần, lớp phủ hoặc chất còn sót. Chỉ áp dụng khi đã kiểm tra vật liệu và nơi tiếp nhận.',
      preparation,
      disposal,
      warnings,
      hazardous,
      keywords: aliases,
      examples,
      illustration: { emoji, alt: `Minh họa biểu tượng: ${name}` },
      provenance: [
        {
          title,
          url,
          publisher: source === 'sharps' ? 'US FDA' : 'US EPA',
          scope:
            'Tài liệu tham khảo tổng quát của Hoa Kỳ; hướng dẫn tiếng Việt được biên soạn lại, không phải trích dẫn quy định địa phương.',
          verification: 'reference_not_live_verified',
        },
      ],
      localContext: LOCAL_CONTEXT,
      version: DATASET_VERSION,
      reviewState: 'general_guidance_check_local_rules',
    },
  };
}
export const WASTE_DATASET: CuratedWaste[] = [
  item(
    'pet-bottle',
    'Chai nhựa PET',
    'PET bottle',
    'plastics',
    ['plastic'],
    [
      'chai pet',
      'pet plastic bottle',
      'plastic water bottle',
      'chai nước nhựa',
    ],
    '🧴',
    'conditional',
    [
      'Chỉ làm rỗng và tráng nhẹ chai đựng thực phẩm/đồ uống.',
      'Kiểm tra ký hiệu PET/1 và yêu cầu về nắp của nơi thu gom.',
    ],
    [
      'Đưa chai được nơi thu gom chấp nhận vào luồng nhựa tái chế.',
      'Không suy vật liệu từ hình dáng chai; chai hóa chất cần luồng riêng.',
    ],
    ['Không áp dụng cho chai chứa hóa chất hoặc vật sắc nhọn.'],
    ['Chai nước suối', 'Chai nước ngọt PET'],
  ),
  item(
    'hdpe-container',
    'Can/chai nhựa HDPE',
    'HDPE container',
    'plastics',
    ['plastic'],
    ['hdpe bottle', 'chai hdpe', 'hdpe jug'],
    '🧴',
    'conditional',
    [
      'Kiểm tra ký hiệu HDPE/2.',
      'Chỉ làm rỗng/làm sạch bao bì có thành phần an toàn đã biết.',
    ],
    [
      'Hỏi đơn vị thu gom có nhận HDPE và loại sản phẩm này không.',
      'Bao bì thuốc trừ sâu/dung môi chuyển luồng nguy hại.',
    ],
    ['Không tráng hoặc đổ dư lượng hóa chất xuống cống.'],
    ['Can sữa HDPE', 'Chai nhựa mã 2'],
  ),
  item(
    'pp-container',
    'Hộp thực phẩm PP',
    'PP food container',
    'plastics',
    ['plastic'],
    ['pp food box', 'hộp nhựa pp', 'polypropylene container'],
    '🥡',
    'conditional',
    [
      'Kiểm tra ký hiệu PP/5.',
      'Loại thức ăn thừa; làm sạch nếu nơi thu gom yêu cầu.',
    ],
    [
      'Chỉ vào luồng tái chế nếu địa phương nhận hộp PP.',
      'Tái sử dụng chỉ khi sản phẩm phù hợp và còn nguyên vẹn.',
    ],
    ['Không coi hộp bẩn hoặc hộp nhựa không rõ loại là tái chế chắc chắn.'],
    ['Hộp thực phẩm ký hiệu 5'],
  ),
  item(
    'plastic-film',
    'Túi và màng nhựa',
    'Plastic film',
    'plastics',
    ['plastic'],
    ['túi nilon', 'plastic bag', 'plastic wrap', 'túi nhựa'],
    '🛍️',
    'not_curbside',
    [
      'Giữ khô và sạch nếu điểm thu hồi màng nhựa chấp nhận.',
      'Tách khỏi giấy/kim loại nếu có thể an toàn.',
    ],
    [
      'Tìm điểm thu hồi riêng; không mặc định bỏ chung thùng tái chế.',
      'Nếu không có nơi nhận, theo hướng dẫn rác còn lại của địa phương.',
    ],
    [
      'Màng nhựa có thể gây kẹt máy phân loại.',
      'Túi nhiều lớp/bao bì bẩn thường không được nhận.',
    ],
    ['Túi mua hàng sạch', 'Màng bọc nhựa'],
  ),
  item(
    'foam-packaging',
    'Xốp EPS',
    'EPS foam packaging',
    'plastics',
    ['plastic'],
    ['styrofoam', 'polystyrene foam', 'hộp xốp', 'eps foam'],
    '📦',
    'not_curbside',
    [
      'Giữ nguyên để giảm mảnh vụn.',
      'Tách thực phẩm khỏi hộp xốp nếu xử lý an toàn.',
    ],
    [
      'Chỉ chuyển tới nơi chuyên nhận EPS.',
      'Nếu không có nơi tiếp nhận, theo luồng rác còn lại; không đốt.',
    ],
    [
      'Không coi xốp là nhựa tái chế thông thường.',
      'Xốp dính thức ăn có thể không được nhận.',
    ],
    ['Xốp đệm hàng', 'Hộp xốp EPS'],
  ),
  item(
    'paper',
    'Giấy sạch',
    'Clean paper',
    'paper',
    ['paper'],
    ['office paper', 'giấy văn phòng', 'newspaper', 'báo giấy'],
    '📄',
    'conditional',
    [
      'Giữ khô; tách lớp nhựa nếu có.',
      'Kiểm tra giấy tráng phủ, giấy nhiệt và giấy dính dầu.',
    ],
    [
      'Giấy sạch được nơi thu gom chấp nhận có thể vào luồng giấy.',
      'Giấy phủ hoặc bẩn cần hỏi địa phương trước.',
    ],
    ['Giấy vệ sinh/khăn giấy bẩn không phải giấy tái chế sạch.'],
    ['Giấy in', 'Báo giấy sạch'],
  ),
  item(
    'cardboard',
    'Bìa carton',
    'Cardboard',
    'paper',
    ['paper'],
    ['corrugated cardboard', 'hộp carton', 'bìa cứng'],
    '📦',
    'conditional',
    [
      'Gỡ đồ còn bên trong; làm phẳng nếu yêu cầu.',
      'Tách phần khô sạch khỏi phần dính dầu/thức ăn.',
    ],
    [
      'Đưa bìa sạch khô tới luồng giấy/carton được chấp nhận.',
      'Phần dính thức ăn chỉ ủ nếu chương trình địa phương nhận.',
    ],
    ['Không bỏ carton ướt/bẩn vào luồng giấy sạch theo mặc định.'],
    ['Thùng vận chuyển carton'],
  ),
  item(
    'beverage-carton',
    'Hộp đồ uống nhiều lớp',
    'Beverage carton',
    'paper',
    ['paper', 'plastic', 'mixed'],
    ['milk carton', 'tetra pak', 'hộp sữa', 'juice carton'],
    '🧃',
    'conditional',
    [
      'Làm rỗng; giữ nguyên/tách nắp theo điểm nhận.',
      'Không coi là giấy thuần vì có nhiều lớp.',
    ],
    [
      'Tìm điểm nhận hộp đồ uống nhiều lớp.',
      'Nếu không có điểm nhận, theo hướng dẫn rác còn lại địa phương.',
    ],
    ['Giấy/nhựa/nhôm ghép nhiều lớp cần quy trình riêng.'],
    ['Hộp sữa tiệt trùng', 'Hộp nước trái cây'],
  ),
  item(
    'glass-bottle',
    'Chai/lọ thủy tinh',
    'Glass bottle or jar',
    'glass',
    ['glass'],
    ['glass bottle', 'glass jar', 'chai thủy tinh', 'lọ thủy tinh'],
    '🍾',
    'conditional',
    [
      'Làm rỗng chai/lọ thực phẩm nếu còn nguyên.',
      'Tách nắp theo yêu cầu; không tự nhặt mảnh vỡ bằng tay trần.',
    ],
    [
      'Chỉ đưa loại thủy tinh bao bì được nơi thu gom nhận.',
      'Thủy tinh vỡ phải đóng gói an toàn theo hướng dẫn địa phương.',
    ],
    [
      'Gốm, kính cửa, thủy tinh chịu nhiệt không cùng luồng bao bì.',
      'Mảnh vỡ có nguy cơ cắt.',
    ],
    ['Chai nước thủy tinh', 'Lọ mứt'],
  ),
  item(
    'aluminium-can',
    'Lon nhôm',
    'Aluminium can',
    'metals',
    ['aluminium'],
    ['aluminum can', 'soda can', 'lon nước nhôm'],
    '🥫',
    'conditional',
    [
      'Làm rỗng lon đồ uống; tráng nhẹ nếu cần.',
      'Ép hay giữ nguyên theo đơn vị thu gom.',
    ],
    [
      'Đưa lon nhôm đồ uống tới luồng kim loại được chấp nhận.',
      'Bình xịt/bình áp lực không thuộc loại này.',
    ],
    ['Không cắt lon; cạnh sắc có thể gây thương tích.'],
    ['Lon nước ngọt nhôm'],
  ),
  item(
    'steel-can',
    'Lon/hộp thép thực phẩm',
    'Steel food can',
    'metals',
    ['steel'],
    ['tin can', 'food can', 'hộp thiếc', 'lon thép'],
    '🥫',
    'conditional',
    [
      'Làm rỗng hộp thực phẩm; xử lý nắp sắc cẩn thận.',
      'Xác minh loại kim loại/nơi nhận.',
    ],
    [
      'Đưa hộp thép thực phẩm được chấp nhận tới luồng kim loại.',
      'Hộp sơn/hóa chất không xử lý như hộp thực phẩm.',
    ],
    ['Nắp và mép sắc có thể cắt tay.'],
    ['Hộp đồ hộp bằng thép'],
  ),
  item(
    'food-scraps',
    'Rác thực phẩm',
    'Food scraps',
    'organic',
    ['organic'],
    ['food waste', 'vegetable scraps', 'vỏ rau củ', 'thức ăn thừa'],
    '🥬',
    'compostable',
    [
      'Tách nhựa/kim loại khỏi thức ăn.',
      'Thu gom riêng để giảm mùi; rửa tay sau tiếp xúc.',
    ],
    [
      'Ưu tiên chương trình thu gom hữu cơ hoặc ủ phù hợp.',
      'Ủ tại nhà thường ưu tiên rau quả; hỏi quy trình trước khi thêm thịt/sữa/dầu.',
    ],
    [
      'Không dùng rác nhiễm hóa chất để ủ.',
      'Không mặc định túi “compostable” phù hợp ủ tại nhà.',
    ],
    ['Vỏ rau quả', 'Bã cà phê'],
    'compost',
  ),
  item(
    'textiles',
    'Quần áo và vải',
    'Textiles',
    'reuse',
    ['textile'],
    ['clothes', 'clothing', 'quần áo', 'vải cũ'],
    '👕',
    'special_collection',
    [
      'Giữ khô/sạch; phân loại còn dùng được hay hư hỏng.',
      'Tách vải nhiễm hóa chất.',
    ],
    [
      'Ưu tiên sửa, dùng lại hoặc cho nơi tiếp nhận.',
      'Vải hư cần điểm thu hồi dệt may riêng; không bỏ chung giấy/nhựa.',
    ],
    ['Không trao tặng đồ mốc/nhiễm bẩn nguy hại.'],
    ['Áo cũ còn tốt', 'Vải thừa sạch'],
  ),
  item(
    'batteries',
    'Pin và ắc quy',
    'Household batteries',
    'special',
    ['battery', 'mixed'],
    ['battery', 'lithium battery', 'pin', 'ắc quy', 'pin lithium'],
    '🔋',
    'special_collection',
    [
      'Không tháo, đập, đốt, ngâm hoặc sạc pin thải.',
      'Với pin nguyên vẹn, tránh tiếp xúc cực với kim loại; theo chỉ dẫn điểm nhận về cách cách điện.',
    ],
    [
      'Đưa tới điểm thu hồi pin/ắc quy phù hợp loại pin.',
      'Pin phồng, nóng, rò rỉ: giữ khoảng cách, tránh tiếp xúc và liên hệ đơn vị chuyên xử lý; khi cháy gọi cứu hỏa.',
    ],
    [
      'Nguy cơ cháy/rò hóa chất.',
      'Không bỏ pin lithium vào thùng tái chế chung.',
    ],
    ['Pin AA', 'Pin thiết bị', 'Ắc quy nhỏ'],
    'battery',
    true,
  ),
  item(
    'electronics',
    'Thiết bị điện tử',
    'Electronic waste',
    'special',
    ['mixed'],
    ['e waste', 'e-waste', 'electronic device', 'điện thoại cũ', 'rác điện tử'],
    '📱',
    'special_collection',
    [
      'Xóa dữ liệu cá nhân nếu có thể thực hiện an toàn.',
      'Không tự tháo pin tích hợp hoặc mở thiết bị hỏng.',
    ],
    [
      'Ưu tiên sửa/tái sử dụng nếu còn an toàn.',
      'Đưa tới điểm nhận rác điện tử có quy trình phù hợp.',
    ],
    [
      'Có thể chứa pin và thành phần nguy hại.',
      'Không đốt hoặc tháo dỡ thủ công để lấy kim loại.',
    ],
    ['Điện thoại', 'Máy tính cũ'],
    'electronics',
    true,
  ),
  item(
    'light-bulbs',
    'Bóng đèn',
    'Light bulbs',
    'special',
    ['glass', 'mixed'],
    [
      'fluorescent bulb',
      'cfl',
      'bóng đèn huỳnh quang',
      'light bulb',
      'bóng đèn',
    ],
    '💡',
    'special_collection',
    [
      'Không làm vỡ; giữ bao gói bảo vệ nếu còn nguyên.',
      'Không xử lý bóng huỳnh quang vỡ như rác thủy tinh thường.',
    ],
    [
      'Kiểm tra loại bóng và điểm thu nhận phù hợp.',
      'Nếu bóng có thể chứa thủy ngân bị vỡ: tránh khu vực, thông khí nếu an toàn và hỏi đơn vị chuyên trách trước khi dọn.',
    ],
    [
      'Một số bóng chứa thủy ngân; ảnh không phân biệt chắc loại bóng.',
      'Không hút bụi mảnh bóng huỳnh quang theo mặc định.',
    ],
    ['Bóng CFL', 'Ống huỳnh quang', 'Bóng LED'],
    'mercury',
    true,
  ),
  item(
    'sharps',
    'Vật sắc nhọn y tế',
    'Medical sharps',
    'special',
    ['steel', 'plastic'],
    ['needle', 'syringe', 'kim tiêm', 'medical needle'],
    '⚠️',
    'special_collection',
    [
      'Không nhặt, tháo, bẻ hoặc đậy lại kim bằng tay.',
      'Giữ trẻ em/vật nuôi tránh xa.',
    ],
    [
      'Liên hệ cơ sở y tế/đơn vị quản lý vật sắc nhọn để được hướng dẫn.',
      'Không đưa kim vào luồng tái chế hoặc bỏ rời vào rác thường.',
    ],
    ['Nguy cơ đâm và lây nhiễm.', 'Không làm sạch hoặc tái sử dụng kim.'],
    ['Kim tiêm', 'Bơm tiêm đã dùng'],
    'sharps',
    true,
  ),
  item(
    'chemical-container',
    'Hóa chất và bao bì chứa hóa chất',
    'Household chemical container',
    'special',
    ['mixed'],
    [
      'paint can',
      'pesticide container',
      'chemical bottle',
      'hộp sơn',
      'chai thuốc trừ sâu',
      'dung môi',
    ],
    '☣️',
    'special_collection',
    [
      'Giữ nhãn và bao bì gốc nếu an toàn; không trộn chất.',
      'Không đổ ra cống/đất, không tráng hoặc mở chất không rõ.',
    ],
    [
      'Liên hệ điểm tiếp nhận chất thải nguy hại địa phương.',
      'Nếu rò rỉ/hơi độc, tránh tiếp xúc và gọi đơn vị chuyên trách.',
    ],
    [
      'Nguy cơ độc/cháy/phản ứng hóa học.',
      'Bao bì còn dư chất nguy hại không phải nhựa/kim loại thông thường.',
    ],
    ['Sơn thừa', 'Bao bì thuốc trừ sâu'],
    'hazardous',
    true,
  ),
];
