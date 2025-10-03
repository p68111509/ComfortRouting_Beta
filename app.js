// 全局變量
let map;
let startMarker = null;
let endMarker = null;
let shortestLine = null;
let lowestLine = null;
let nextPointIsStart = true;
let isPlanningMode = false;
let currentLang = 'zh';
let currentOverlay = null;
let overlayLayer = null;
let currentTileLayer = null;

// 常數
const DEFAULT_CENTER = [25.0330, 121.5654];
const DEFAULT_ZOOM = 13;
// 自動檢測 API 基礎 URL
const API_BASE = window.location.protocol + '//' + window.location.host;

// 速度常數 (km/h)
const SPEED_CONSTANTS = {
  motorcycle: 45,
  bicycle: 18,
  walk: 5
};

// 捷運線路和站點數據
const METRO_LINES = {
  'tamsui-xinyi': {
    name: '淡水信義線',
    nameEn: 'Tamsui-Xinyi Line',
    color: '#E3002C',
    code: 'R',
    stations: [
      { id: 'tamsui', name: '淡水', nameEn: 'Tamsui', code: 'R28' },
      { id: 'hongshulin', name: '紅樹林', nameEn: 'Hongshulin', code: 'R27' },
      { id: 'zhuwei', name: '竹圍', nameEn: 'Zhuwei', code: 'R26' },
      { id: 'guandu', name: '關渡', nameEn: 'Guandu', code: 'R25' },
      { id: 'zhongyi', name: '忠義', nameEn: 'Zhongyi', code: 'R24' },
      { id: 'fuxinggang', name: '復興崗', nameEn: 'Fuxinggang', code: 'R23' },
      { id: 'beitou', name: '北投', nameEn: 'Beitou', code: 'R22' },
      { id: 'qiyan', name: '奇岩', nameEn: 'Qiyan', code: 'R21' },
      { id: 'shipai', name: '石牌', nameEn: 'Shipai', code: 'R20' },
      { id: 'mingde', name: '明德', nameEn: 'Mingde', code: 'R19' },
      { id: 'zhishan', name: '芝山', nameEn: 'Zhishan', code: 'R18' },
      { id: 'shilin', name: '士林', nameEn: 'Shilin', code: 'R17' },
      { id: 'jiantan', name: '劍潭', nameEn: 'Jiantan', code: 'R16' },
      { id: 'yuanshan', name: '圓山', nameEn: 'Yuanshan', code: 'R15' },
      { id: 'minquan-w-rd', name: '民權西路', nameEn: 'Minquan West Road', code: 'R14' },
      { id: 'shuanglian', name: '雙連', nameEn: 'Shuanglian', code: 'R13' },
      { id: 'zhongshan', name: '中山', nameEn: 'Zhongshan', code: 'R12' },
      { id: 'taipei-main-station', name: '台北車站', nameEn: 'Taipei Main Station', code: 'R10' },
      { id: 'taida', name: '台大醫院', nameEn: 'National Taiwan University Hospital', code: 'R09' },
      { id: 'chks', name: '中正紀念堂', nameEn: 'Chiang Kai-shek Memorial Hall', code: 'R08' },
      { id: 'dongmen', name: '東門', nameEn: 'Dongmen', code: 'R07' },
      { id: 'daan', name: '大安', nameEn: 'Daan', code: 'R05' },
      { id: 'xinyi', name: '信義安和', nameEn: 'Xinyi Anhe', code: 'R04' },
      { id: 'taipei101', name: '台北101/世貿', nameEn: 'Taipei 101/World Trade Center', code: 'R03' },
      { id: 'xiangshan', name: '象山', nameEn: 'Xiangshan', code: 'R02' }
    ]
  },
  'bannan': {
    name: '板南線',
    nameEn: 'Bannan Line',
    color: '#0070BD',
    code: 'BL',
    stations: [
      { id: 'dingpu', name: '頂埔', nameEn: 'Dingpu', code: 'BL01' },
      { id: 'yongning', name: '永寧', nameEn: 'Yongning', code: 'BL02' },
      { id: 'tucheng', name: '土城', nameEn: 'Tucheng', code: 'BL03' },
      { id: 'haishan', name: '海山', nameEn: 'Haishan', code: 'BL04' },
      { id: 'banqiao', name: '板橋', nameEn: 'Banqiao', code: 'BL05' },
      { id: 'fuzhong', name: '府中', nameEn: 'Fuzhong', code: 'BL06' },
      { id: 'jiangzicui', name: '江子翠', nameEn: 'Jiangzicui', code: 'BL07' },
      { id: 'longshan-temple', name: '龍山寺', nameEn: 'Longshan Temple', code: 'BL10' },
      { id: 'ximen', name: '西門', nameEn: 'Ximen', code: 'BL11' },
      { id: 'taipei-main-station', name: '台北車站', nameEn: 'Taipei Main Station', code: 'BL12' },
      { id: 'shanxi', name: '善導寺', nameEn: 'Shanxi', code: 'BL14' },
      { id: 'zhongxiao-xinsheng', name: '忠孝新生', nameEn: 'Zhongxiao Xinsheng', code: 'BL15' },
      { id: 'zhongxiao-fuxing', name: '忠孝復興', nameEn: 'Zhongxiao Fuxing', code: 'BL16' },
      { id: 'zhongxiao-dunhua', name: '忠孝敦化', nameEn: 'Zhongxiao Dunhua', code: 'BL17' },
      { id: 'sun-yat-sen-memorial-hall', name: '國父紀念館', nameEn: 'Sun Yat-sen Memorial Hall', code: 'BL18' },
      { id: 'yongchun', name: '永春', nameEn: 'Yongchun', code: 'BL19' },
      { id: 'houshanpi', name: '後山埤', nameEn: 'Houshanpi', code: 'BL20' },
      { id: 'kunyang', name: '昆陽', nameEn: 'Kunyang', code: 'BL21' },
      { id: 'nangang', name: '南港', nameEn: 'Nangang', code: 'BL22' },
      { id: 'nangang-exhibition', name: '南港展覽館', nameEn: 'Nangang Exhibition Center', code: 'BL23' }
    ]
  },
  'songshan-xindian': {
    name: '松山新店線',
    nameEn: 'Songshan-Xindian Line',
    color: '#008659',
    code: 'G',
    stations: [
      { id: 'songshan', name: '松山', nameEn: 'Songshan', code: 'G19' },
      { id: 'nanjing-sanmin', name: '南京三民', nameEn: 'Nanjing Sanmin', code: 'G18' },
      { id: 'taipei-arena', name: '台北小巨蛋', nameEn: 'Taipei Arena', code: 'G17' },
      { id: 'nanjing-fuxing', name: '南京復興', nameEn: 'Nanjing Fuxing', code: 'G16' },
      { id: 'songjiang-nanjing', name: '松江南京', nameEn: 'Songjiang Nanjing', code: 'G15' },
      { id: 'zhongshan', name: '中山', nameEn: 'Zhongshan', code: 'G14' },
      { id: 'beimen', name: '北門', nameEn: 'Beimen', code: 'G13' },
      { id: 'ximen', name: '西門', nameEn: 'Ximen', code: 'G12' },
      { id: 'xiaonanmen', name: '小南門', nameEn: 'Xiaonanmen', code: 'G11' },
      { id: 'chks', name: '中正紀念堂', nameEn: 'Chiang Kai-shek Memorial Hall', code: 'G10' },
      { id: 'guting', name: '古亭', nameEn: 'Guting', code: 'G09' },
      { id: 'taipower', name: '台電大樓', nameEn: 'Taipower Building', code: 'G08' },
      { id: 'gongguan', name: '公館', nameEn: 'Gongguan', code: 'G07' },
      { id: 'wanlong', name: '萬隆', nameEn: 'Wanlong', code: 'G06' },
      { id: 'jingmei', name: '景美', nameEn: 'Jingmei', code: 'G05' },
      { id: 'dapinglin', name: '大坪林', nameEn: 'Dapinglin', code: 'G04' },
      { id: 'qizhang', name: '七張', nameEn: 'Qizhang', code: 'G03' },
      { id: 'xiaobitan', name: '小碧潭', nameEn: 'Xiaobitan', code: 'G03A' },
      { id: 'xindian', name: '新店', nameEn: 'Xindian', code: 'G01' }
    ]
  },
  'zhonghe-xinlu': {
    name: '中和新蘆線',
    nameEn: 'Zhonghe-Xinlu Line',
    color: '#FFA500',
    code: 'O',
    stations: [
      { id: 'nanshijiao', name: '南勢角', nameEn: 'Nanshijiao', code: 'O01' },
      { id: 'jingan', name: '景安', nameEn: 'Jingan', code: 'O02' },
      { id: 'yongan', name: '永安市場', nameEn: 'Yongan Market', code: 'O03' },
      { id: 'dingxi', name: '頂溪', nameEn: 'Dingxi', code: 'O04' },
      { id: 'guting', name: '古亭', nameEn: 'Guting', code: 'O05' },
      { id: 'dongmen', name: '東門', nameEn: 'Dongmen', code: 'O06' },
      { id: 'zhongxiao-xinsheng', name: '忠孝新生', nameEn: 'Zhongxiao Xinsheng', code: 'O07' },
      { id: 'songjiang-nanjing', name: '松江南京', nameEn: 'Songjiang Nanjing', code: 'O08' },
      { id: 'xingtian', name: '行天宮', nameEn: 'Xingtian Temple', code: 'O09' },
      { id: 'zhongshan-guoxiao', name: '中山國小', nameEn: 'Zhongshan Elementary School', code: 'O10' },
      { id: 'minquan-w-rd', name: '民權西路', nameEn: 'Minquan West Road', code: 'O11' },
      { id: 'daqiaotou', name: '大橋頭', nameEn: 'Daqiaotou', code: 'O12' },
      { id: 'taipei-main-station', name: '台北車站', nameEn: 'Taipei Main Station', code: 'O13' },
      { id: 'sanchong-guoxiao', name: '三重國小', nameEn: 'Sanchong Elementary School', code: 'O14' },
      { id: 'sanhe-junior', name: '三和國中', nameEn: 'Sanhe Junior High School', code: 'O15' },
      { id: 'xuzhouzai', name: '徐匯中學', nameEn: 'Xuzhou High School', code: 'O16' },
      { id: 'sanchong', name: '三重', nameEn: 'Sanchong', code: 'O17' },
      { id: 'cailiao', name: '菜寮', nameEn: 'Cailiao', code: 'O18' },
      { id: 'taiyuan', name: '台原', nameEn: 'Taiyuan', code: 'O19' },
      { id: 'xinzhuang', name: '新莊', nameEn: 'Xinzhuang', code: 'O20' },
      { id: 'fuying', name: '輔大', nameEn: 'Fu Jen Catholic University', code: 'O21' },
      { id: 'danfeng', name: '丹鳳', nameEn: 'Danfeng', code: 'O22' },
      { id: 'huilong', name: '迴龍', nameEn: 'Huilong', code: 'O50' }
    ]
  },
  'wenhu': {
    name: '文湖線',
    nameEn: 'Wenhu Line',
    color: '#C48C31',
    code: 'BR',
    stations: [
      { id: 'donghu', name: '東湖', nameEn: 'Donghu', code: 'BR07' },
      { id: 'huzhou', name: '湖州', nameEn: 'Huzhou', code: 'BR08' },
      { id: 'dahu', name: '大湖公園', nameEn: 'Dahu Park', code: 'BR09' },
      { id: 'neihu', name: '內湖', nameEn: 'Neihu', code: 'BR10' },
      { id: 'wende', name: '文德', nameEn: 'Wende', code: 'BR11' },
      { id: 'gangqian', name: '港墘', nameEn: 'Gangqian', code: 'BR12' },
      { id: 'xihu', name: '西湖', nameEn: 'Xihu', code: 'BR13' },
      { id: 'jiannan', name: '劍南路', nameEn: 'Jiannan Road', code: 'BR14' },
      { id: 'dazhi', name: '大直', nameEn: 'Dazhi', code: 'BR15' },
      { id: 'songshan-airport', name: '松山機場', nameEn: 'Songshan Airport', code: 'BR16' },
      { id: 'zhongshan-guoxiao', name: '中山國小', nameEn: 'Zhongshan Elementary School', code: 'BR17' },
      { id: 'nanjing-fuxing', name: '南京復興', nameEn: 'Nanjing Fuxing', code: 'BR18' },
      { id: 'zhongxiao-fuxing', name: '忠孝復興', nameEn: 'Zhongxiao Fuxing', code: 'BR19' },
      { id: 'daan', name: '大安', nameEn: 'Daan', code: 'BR20' },
      { id: 'keji', name: '科技大樓', nameEn: 'Technology Building', code: 'BR21' },
      { id: 'liuzhangli', name: '六張犁', nameEn: 'Liuzhangli', code: 'BR22' },
      { id: 'linguang', name: '麟光', nameEn: 'Linguang', code: 'BR23' },
      { id: 'xinhai', name: '辛亥', nameEn: 'Xinhai', code: 'BR24' },
      { id: 'wanfang-hospital', name: '萬芳醫院', nameEn: 'Wanfang Hospital', code: 'BR01' },
      { id: 'wanfang', name: '萬芳社區', nameEn: 'Wanfang Community', code: 'BR02' },
      { id: 'muzha', name: '木柵', nameEn: 'Muzha', code: 'BR03' },
      { id: 'dongshan', name: '動物園', nameEn: 'Taipei Zoo', code: 'BR04' }
    ]
  }
};

// 捷運站數據（向後兼容）
const METRO_STATIONS = {};
Object.values(METRO_LINES).forEach(line => {
  line.stations.forEach(station => {
    METRO_STATIONS[station.id] = station.name;
  });
});

// 捷運站出口數據
const STATION_EXITS = {
  'xiangshan': [
    { exit: 1, lat: 25.032996, lng: 121.569340 },
    { exit: 2, lat: 25.032372, lng: 121.569866 },
    { exit: 3, lat: 25.032966, lng: 121.570470 }
  ]
};

// 景點數據
const STATION_ATTRACTIONS = {
  'xiangshan': [
    {
      name: '豹山步道登山口',
      image: 'site/象山/豹山步道登山口.png',
      lat: 25.031361,
      lng: 121.580586
    },
    {
      name: '富邦美術館',
      image: 'site/象山/富邦美術館.png',
      lat: 25.039389,
      lng: 121.571222
    }
  ]
};

// 選擇狀態
let selectedExit = null;
let selectedAttraction = null;

// 多語言字典
const i18nDict = {
  zh: {
    title: "舒適路徑系統",
    startLabel: "🟢 起點地址",
    endLabel: "🔴 終點地址", 
    startPlaceholderWithIcon: "🟢 請輸入起點地址",
    endPlaceholderWithIcon: "🔴 請輸入終點地址",
    modeLabel: "🚗 交通方式",
    modeMotorcycle: "機車",
    modeBicycle: "單車",
    modeWalk: "步行",
    distanceLimit: "距離限制功能",
    maxDistance: "最大增加距離",
    planBtn: "🔍 規劃路徑",
    resetBtn: "🔄 重置",
    compareTitle: "📊 路徑比較",
    shortest: "最短路徑",
    lowest: "低暴露路徑",
    legendShortest: "最短路徑",
    legendLowest: "低暴露路徑",
    // Dashboard 翻譯
    distanceComparison: "📏 距離比較",
    timeComparison: "⏱️ 時間比較",
    exposureReduction: "🌱 暴露減少",
    extraDistance: "📐 額外距離",
    improvementRate: "📈 改善率",
    comparedToShortest: "相比最短路徑",
    lowExposureRoute: "低暴露路徑",
    exposureImprovement: "暴露改善",
    // 單位翻譯
    unitMeters: "公尺",
    unitKilometers: "公里",
    unitMinutes: "分鐘",
    unitExposureUnit: "μg/m³·min",
    overlayTitle: "疊加圖層",
    overlayNone: "無",
    overlayPM25: "PM₂.₅",
    overlayNO2: "NO₂",
    overlayWBGT: "氣溫",
    modeCommute: "通勤模式",
    modeMetro: "捷運模式",
    helpBtn: "使用說明",
    langEN: "EN",
    langZH: "中文",
    // 面板標題翻譯
    navigationSettings: "導航設定",
    routeComparison: "路徑比較",
    metroTitle: "🚇 台北捷運路線",
    // 捷運模式翻譯
    selectExit: "選擇出口",
    nearbyAttractions: "附近景點",
    startNavigation: "開始導航",
    // 改善率說明翻譯
    improvementRateHelpTitle: "改善率計算說明",
    improvementRateFormula: "📊 計算公式",
    improvementRateFormulaText: "改善率 = (最短路徑暴露 - 低暴露路徑暴露) ÷ 最短路徑暴露 × 100%",
    improvementRateExplanation: "🔍 說明",
    improvementRateDesc1: "改善率表示低暴露路徑相比最短路徑在空氣污染暴露方面的改善程度",
    improvementRateDesc2: "數值越高表示空氣品質改善效果越好",
    improvementRateDesc3: "暴露量 = PM₂.₅濃度 × 路徑長度",
    improvementRateDesc4: "單位：μg/m³·min（微克每立方公尺每分鐘）",
    improvementRateExample: "💡 範例",
    improvementRateExampleText: "假設最短路徑暴露為 100 μg/m³·min，低暴露路徑暴露為 80 μg/m³·min",
    improvementRateExampleCalc: "改善率 = (100 - 80) ÷ 100 × 100% = 20%",
    improvementRateExampleResult: "表示低暴露路徑比最短路徑減少了 20% 的空氣污染暴露",
    // 使用說明翻譯
    helpTitle: "使用說明",
    commuteFunctionOverview: "🎯 功能概述",
    commuteFunctionDesc: "通勤模式可以為您規劃兩條路徑：最短路徑和低暴露路徑，幫助您在時間和健康之間做出最佳選擇。",
    commuteSetPoints: "📍 設定起終點",
    commuteMethod1: "方法一：",
    commuteMethod1Desc: "在地圖上點擊設定起點和終點",
    commuteMethod2: "方法二：",
    commuteMethod2Desc: "在輸入框中輸入地址，系統會自動定位",
    commuteTransportMode: "🚗 選擇交通方式",
    commuteTransportDesc: "支援機車、腳踏車、步行三種交通方式，系統會根據不同方式計算相應的通行時間。",
    commuteDistanceLimit: "📏 距離限制功能",
    commuteDistanceLimitDesc: "開啟後可設定低暴露路徑的最大額外距離，避免繞路過遠。",
    commuteResultInterpretation: "📊 結果解讀",
    commuteShortestPath: "最短路徑：",
    commuteShortestPathDesc: "距離最短的路線（藍色實線）",
    commuteLowExposurePath: "低暴露路徑：",
    commuteLowExposurePathDesc: "空氣污染暴露最低的路線（綠色虛線）",
    commuteExposureReduction: "暴露減少：",
    commuteExposureReductionDesc: "相比最短路徑減少的污染暴露量",
    commuteImprovementRate: "改善率：",
    commuteImprovementRateDesc: "空氣品質改善的百分比",
    metroFunctionOverview: "🚇 功能概述",
    metroFunctionDesc: "捷運模式提供台北捷運路線圖，可查看各站出口資訊並規劃到附近景點的最佳路徑。",
    metroUsageSteps: "🎯 使用步驟",
    metroStep1: "步驟一：",
    metroStep1Desc: "點擊捷運地圖上的任一站點",
    metroStep2: "步驟二：",
    metroStep2Desc: "在彈出視窗中選擇出口",
    metroStep3: "步驟三：",
    metroStep3Desc: "選擇想前往的附近景點",
    metroStep4: "步驟四：",
    metroStep4Desc: "點擊「開始導航」查看路徑規劃",
    metroSupportedStations: "📍 支援站點",
    metroSupportedStationsDesc: "目前支援象山站，提供3個出口選擇和2個熱門景點（豹山步道登山口、富邦美術館）。",
    metroRoutePlanning: "🗺️ 路徑規劃",
    metroRoutePlanningDesc: "系統會計算從選定出口到景點的最短路徑和低暴露路徑，並提供詳細的距離、時間和空氣品質分析。"
  },
  en: {
    title: "Comfort Routing System",
    startLabel: "🟢 Start Address",
    endLabel: "🔴 End Address",
    startPlaceholderWithIcon: "🟢 Enter start address",
    endPlaceholderWithIcon: "🔴 Enter end address",
    modeLabel: "🚗 Transport Mode",
    modeMotorcycle: "Motorcycle",
    modeBicycle: "Bicycle", 
    modeWalk: "Walk",
    distanceLimit: "Distance Limit Feature",
    maxDistance: "Max Distance Increase",
    planBtn: "🔍 Plan Routes",
    resetBtn: "🔄 Reset",
    compareTitle: "📊 Route Comparison",
    shortest: "Shortest Route",
    lowest: "Low-Exposure Route",
    legendShortest: "Shortest Route",
    legendLowest: "Low-Exposure Route",
    // Dashboard translations
    distanceComparison: "📏 Distance Comparison",
    timeComparison: "⏱️ Time Comparison",
    exposureReduction: "🌱 Exposure Reduction",
    extraDistance: "📐 Extra Distance",
    improvementRate: "📈 Improvement Rate",
    comparedToShortest: "vs Shortest Route",
    lowExposureRoute: "Low-Exposure Route",
    exposureImprovement: "Exposure Improvement",
    // Unit translations
    unitMeters: "meters",
    unitKilometers: "km",
    unitMinutes: "min",
    unitExposureUnit: "μg/m³·min",
    overlayTitle: "Overlay Layer",
    overlayNone: "None",
    overlayPM25: "PM₂.₅",
    overlayNO2: "NO₂",
    overlayWBGT: "Temperature",
    modeCommute: "Commute Mode",
    modeMetro: "Metro Mode",
    helpBtn: "Help",
    langEN: "EN",
    langZH: "中文",
    // Panel title translations
    navigationSettings: "Navigation Settings",
    routeComparison: "Route Comparison",
    metroTitle: "🚇 Taipei Metro Routes",
    // Metro mode translations
    selectExit: "Select Exit",
    nearbyAttractions: "Nearby Attractions",
    startNavigation: "Start Navigation",
    // Improvement rate help translations
    improvementRateHelpTitle: "Improvement Rate Calculation Guide",
    improvementRateFormula: "📊 Calculation Formula",
    improvementRateFormulaText: "Improvement Rate = (Shortest Path Exposure - Low Exposure Path Exposure) ÷ Shortest Path Exposure × 100%",
    improvementRateExplanation: "🔍 Explanation",
    improvementRateDesc1: "Improvement rate indicates the degree of air pollution exposure improvement of the low exposure path compared to the shortest path",
    improvementRateDesc2: "Higher values indicate better air quality improvement effects",
    improvementRateDesc3: "Exposure = PM₂.₅ Concentration × Path Length",
    improvementRateDesc4: "Unit: μg/m³·min (micrograms per cubic meter per minute)",
    improvementRateExample: "💡 Example",
    improvementRateExampleText: "Assuming shortest path exposure is 100 μg/m³·min, low exposure path exposure is 80 μg/m³·min",
    improvementRateExampleCalc: "Improvement Rate = (100 - 80) ÷ 100 × 100% = 20%",
    improvementRateExampleResult: "This means the low exposure path reduces air pollution exposure by 20% compared to the shortest path",
    // Help content translations
    helpTitle: "Usage Instructions",
    commuteFunctionOverview: "🎯 Function Overview",
    commuteFunctionDesc: "Commute mode plans two routes for you: shortest path and low exposure path, helping you make the best choice between time and health.",
    commuteSetPoints: "📍 Set Start/End Points",
    commuteMethod1: "Method 1:",
    commuteMethod1Desc: "Click on the map to set start and end points",
    commuteMethod2: "Method 2:",
    commuteMethod2Desc: "Enter addresses in input boxes, the system will automatically locate them",
    commuteTransportMode: "🚗 Select Transport Mode",
    commuteTransportDesc: "Supports motorcycle, bicycle, and walking modes. The system calculates corresponding travel time based on the selected mode.",
    commuteDistanceLimit: "📏 Distance Limit Feature",
    commuteDistanceLimitDesc: "When enabled, you can set the maximum additional distance for the low exposure path to avoid excessive detours.",
    commuteResultInterpretation: "📊 Result Interpretation",
    commuteShortestPath: "Shortest Path:",
    commuteShortestPathDesc: "The shortest distance route (blue solid line)",
    commuteLowExposurePath: "Low Exposure Path:",
    commuteLowExposurePathDesc: "The route with lowest air pollution exposure (green dashed line)",
    commuteExposureReduction: "Exposure Reduction:",
    commuteExposureReductionDesc: "Reduced pollution exposure compared to the shortest path",
    commuteImprovementRate: "Improvement Rate:",
    commuteImprovementRateDesc: "Percentage of air quality improvement",
    metroFunctionOverview: "🚇 Function Overview",
    metroFunctionDesc: "Metro mode provides Taipei Metro route map, allowing you to view station exit information and plan optimal routes to nearby attractions.",
    metroUsageSteps: "🎯 Usage Steps",
    metroStep1: "Step 1:",
    metroStep1Desc: "Click on any station on the metro map",
    metroStep2: "Step 2:",
    metroStep2Desc: "Select an exit in the popup window",
    metroStep3: "Step 3:",
    metroStep3Desc: "Choose the nearby attraction you want to visit",
    metroStep4: "Step 4:",
    metroStep4Desc: "Click 'Start Navigation' to view route planning",
    metroSupportedStations: "📍 Supported Stations",
    metroSupportedStationsDesc: "Currently supports Xiangshan Station with 3 exit options and 2 popular attractions (Baoshan Trail Entrance, Fubon Art Museum).",
    metroRoutePlanning: "🗺️ Route Planning",
    metroRoutePlanningDesc: "The system calculates shortest path and low exposure path from the selected exit to attractions, providing detailed distance, time, and air quality analysis."
  }
};

// 底圖配置
const TILE_LAYERS = {
  'cartodb-voyager': {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  },
  'cartodb-light': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  },
  'cartodb-dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  },
  'osm': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }
};


// 初始化
document.addEventListener('DOMContentLoaded', function() {
  initMap();
  bindUI();
  loadLanguage();
  
  // 初始化面板狀態
  initPanelStates();
  
  // 確保錯誤提示框初始隱藏
  hideError();
  
});

// 初始化地圖
function initMap() {
  map = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true
  });
  
  // 載入預設底圖
  loadTileLayer('cartodb-voyager');
  
  // 地圖點擊事件
  map.on('click', onMapClick);
}

// 載入底圖
function loadTileLayer(layerKey) {
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer);
  }
  
  const config = TILE_LAYERS[layerKey];
  if (config) {
    currentTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom
    });
    currentTileLayer.addTo(map);
  }
}

// 初始化面板狀態
function initPanelStates() {
  const leftPanel = document.getElementById('leftPanel');
  const bottomPanel = document.getElementById('bottomPanel');
  const fullscreenMap = document.getElementById('map');
  
  // 左側面板初始展開
  leftPanel.classList.add('expanded');
  
  // 底部面板初始禁用
  bottomPanel.classList.add('disabled');
  
  // 設置地圖初始位置（面板展開狀態）
  if (fullscreenMap) {
    fullscreenMap.style.top = '360px'; // 80px (header) + 280px (panel)
  }
  
  // 更新底部面板提示文字
  updateBottomPanelState(false);
}

// 更新底部面板狀態
function updateBottomPanelState(hasResults) {
  const bottomPanel = document.getElementById('bottomPanel');
  
  if (hasResults) {
    bottomPanel.classList.remove('disabled');
  } else {
    bottomPanel.classList.add('disabled');
  }
}


// 綁定 UI 事件
function bindUI() {
  // 左側面板切換
  const leftPanelHandle = document.getElementById('leftPanelHandle');
  const leftPanel = document.getElementById('leftPanel');
  
  leftPanelHandle.addEventListener('click', function() {
    leftPanel.classList.toggle('expanded');
    
    // 調整地圖位置
    const fullscreenMap = document.getElementById('map');
    if (fullscreenMap) {
      if (leftPanel.classList.contains('expanded')) {
        // 面板展開時，地圖位置向下調整
        fullscreenMap.style.top = '360px'; // 80px (header) + 280px (panel)
      } else {
        // 面板收起時，地圖位置向上調整
        fullscreenMap.style.top = '120px'; // 80px (header) + 40px (handle)
      }
      
      // 重新調整地圖大小
      if (window.map) {
        setTimeout(() => {
          window.map.invalidateSize();
        }, 300);
      }
    }
  });
  
  // 底部面板切換
  const bottomPanelHandle = document.getElementById('bottomPanelHandle');
  const bottomPanel = document.getElementById('bottomPanel');
  
  bottomPanelHandle.addEventListener('click', function() {
    if (!bottomPanel.classList.contains('disabled')) {
      bottomPanel.classList.toggle('expanded');
    }
  });
  
  // 規劃路徑按鈕
  const planBtn = document.getElementById('plan-btn');
  planBtn.addEventListener('click', planRoutes);
  
  // 重製按鈕
  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', resetAll);
  
  // 交通方式選擇（Radio 按鈕）
  const transportRadios = document.querySelectorAll('input[name="transport-mode"]');
  transportRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (window.lastRouteData) {
        renderTable(window.lastRouteData);
      }
    });
  });

  // 距離限制開關
  const toggle = document.getElementById('distance-limit-toggle');
  const sliderContainer = document.getElementById('distance-slider-container');
  
  toggle.addEventListener('change', function() {
    if (this.checked) {
      sliderContainer.style.display = 'block';
    } else {
      sliderContainer.style.display = 'none';
    }
    
    // 如果在規劃模式且有起終點，自動重新規劃
    if (isPlanningMode && startMarker && endMarker) {
      planRoutes();
    }
  });
  
  // 距離限制滑桿
  const slider = document.getElementById('max-distance-slider');
  slider.addEventListener('input', function() {
    const value = this.value;
    document.getElementById('slider-value').textContent = `+${value}m`;
    
    // 如果在規劃模式，自動重新規劃
    if (isPlanningMode && startMarker && endMarker) {
      planRoutes();
    }
  });
  
  // 輸入框事件
  bindInputEvents();
  
  // 語言切換
  bindLanguageEvents();
  
  // 模式切換
  bindModeEvents();
  
  // 底圖選擇器
  bindTileSelectorEvents();
  
  // 覆蓋層選擇器
  bindOverlayEvents();
  
  // 幫助按鈕
  bindHelpEvents();
  
  // 改善率說明按鈕
  bindImprovementHelpEvents();
  
  
  // 捷運站事件
  bindMetroStationEvents();
}

// 綁定輸入框事件
function bindInputEvents() {
  const startInput = document.getElementById('input-start');
  const endInput = document.getElementById('input-end');
  
  startInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      geocodeAndSetMarker(this.value, 'start');
    }
  });
  
  startInput.addEventListener('blur', function() {
    if (this.value.trim()) {
      geocodeAndSetMarker(this.value, 'start');
    }
  });
  
  endInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      geocodeAndSetMarker(this.value, 'end');
    }
  });
  
  endInput.addEventListener('blur', function() {
    if (this.value.trim()) {
      geocodeAndSetMarker(this.value, 'end');
    }
  });
}

// 綁定語言事件
function bindLanguageEvents() {
  document.getElementById('btn-lang-zh').addEventListener('click', () => switchLanguage('zh'));
  document.getElementById('btn-lang-en').addEventListener('click', () => switchLanguage('en'));
}

// 綁定模式切換事件
function bindModeEvents() {
  document.getElementById('mode-commute').addEventListener('click', () => {
    console.log('[debug] Commute mode button clicked');
    switchMode('commute');
  });
  document.getElementById('mode-metro').addEventListener('click', () => {
    console.log('[debug] Metro mode button clicked');
    switchMode('metro');
  });
}

// 模式切換
function switchMode(mode) {
  console.log(`[debug] switchMode called with mode: ${mode}`);
  
  const commuteBtn = document.getElementById('mode-commute');
  const metroBtn = document.getElementById('mode-metro');
  const indicator = document.querySelector('.mode-indicator');
  const metroPanel = document.getElementById('metro-panel');
  const leftPanel = document.querySelector('.left-panel');
  const bottomPanel = document.querySelector('.bottom-panel');
  const fullscreenMap = document.getElementById('map');
  
  console.log('[debug] Elements found:', {
    commuteBtn: !!commuteBtn,
    metroBtn: !!metroBtn,
    indicator: !!indicator,
    metroPanel: !!metroPanel,
    leftPanel: !!leftPanel,
    bottomPanel: !!bottomPanel,
    fullscreenMap: !!fullscreenMap
  });
  
  if (mode === 'commute') {
    // 切換到通勤模式
    commuteBtn.classList.add('active');
    metroBtn.classList.remove('active');
    indicator.style.transform = 'translateX(0)';
    
    // 顯示通勤模式界面
    if (fullscreenMap) fullscreenMap.style.display = 'block';
    if (leftPanel) leftPanel.style.display = 'block';
    if (bottomPanel) bottomPanel.style.display = 'block';
    if (metroPanel) {
      metroPanel.style.display = 'none';
      metroPanel.classList.remove('active');
    }
    
    // 重新初始化地圖（如果需要）
    if (window.map) {
      setTimeout(() => {
        window.map.invalidateSize();
      }, 300);
    }
    
    console.log('[debug] Commute mode activated');
    
  } else if (mode === 'metro') {
    // 切換到捷運模式
    metroBtn.classList.add('active');
    commuteBtn.classList.remove('active');
    indicator.style.transform = 'translateX(100%)';
    
    // 隱藏通勤模式界面，顯示捷運模式
    if (fullscreenMap) fullscreenMap.style.display = 'none';
    if (leftPanel) leftPanel.style.display = 'none';
    if (bottomPanel) bottomPanel.style.display = 'none';
    if (metroPanel) {
      metroPanel.classList.add('active');
      metroPanel.style.display = 'block';
      console.log('[debug] Metro panel classes:', metroPanel.classList.toString());
      console.log('[debug] Metro panel style.display:', metroPanel.style.display);
      console.log('[debug] Metro panel computed style:', window.getComputedStyle(metroPanel).display);
    }
    
    // 清除通勤模式的數據（但不影響捷運模式）
    // resetAll();
    
    // 重新初始化捷運卡片（因為可能在面板隱藏時沒有綁定成功）
    setTimeout(() => {
      initMetroList();
    }, 100);
    
    console.log('[debug] Switched to metro mode, metro panel should be visible');
  }
  
  console.log('[debug] Mode switch completed');
}

// 綁定底圖選擇器事件
function bindTileSelectorEvents() {
  const button = document.getElementById('tileSelectorButton');
  const dropdown = document.getElementById('tileDropdown');
  const options = dropdown.querySelectorAll('.tile-option');
  
  button.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdown.classList.toggle('show');
    
    const arrow = this.querySelector('.tile-dropdown-arrow');
    arrow.textContent = dropdown.classList.contains('show') ? '▲' : '▼';
  });
  
  options.forEach(option => {
    option.addEventListener('click', function() {
      const value = this.dataset.value;
      loadTileLayer(value);
      
      // 關閉下拉選單
      dropdown.classList.remove('show');
      button.querySelector('.tile-dropdown-arrow').textContent = '▼';
      
      // 重置標籤文字
      document.getElementById('tileCurrentName').textContent = '底圖樣式';
    });
  });
  
  // 點擊外部關閉下拉選單
  document.addEventListener('click', function() {
    dropdown.classList.remove('show');
    button.querySelector('.tile-dropdown-arrow').textContent = '▼';
    document.getElementById('tileCurrentName').textContent = '底圖樣式';
  });
}

// 綁定覆蓋層事件
function bindOverlayEvents() {
  const overlayInputs = document.querySelectorAll('input[name="overlay"]');
  overlayInputs.forEach(input => {
    input.addEventListener('change', function() {
      if (this.checked) {
        updateOverlay(this.value);
      }
    });
  });
}

// 綁定幫助事件
function bindHelpEvents() {
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const closeBtn = document.getElementById('close-help');
  
  console.log('[debug] Help button elements:', { helpBtn, helpModal, closeBtn });
  
  if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => {
      console.log('[debug] Help button clicked');
      updateHelpContent();
      helpModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // 禁用模式切換按鈕
      disableModeSwitching();
    });
  }
  
  if (closeBtn && helpModal) {
    closeBtn.addEventListener('click', () => {
      console.log('[debug] Help modal closed');
      helpModal.style.display = 'none';
      document.body.style.overflow = 'auto';
      
      // 重新啟用模式切換按鈕
      enableModeSwitching();
    });
  }
  
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        console.log('[debug] Help modal closed by background click');
        helpModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // 重新啟用模式切換按鈕
        enableModeSwitching();
      }
    });
  }
}

// 綁定改善率說明事件
function bindImprovementHelpEvents() {
  const improvementHelpBtn = document.getElementById('improvementHelpBtn');
  const resultImprovementHelpBtn = document.getElementById('resultImprovementHelpBtn');
  const improvementHelpModal = document.getElementById('improvement-help-modal');
  const closeImprovementHelpBtn = document.getElementById('closeImprovementHelp');
  
  // 通勤模式改善率Help按鈕
  if (improvementHelpBtn) {
    improvementHelpBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[improvement-help] Improvement help button clicked');
      openImprovementHelpModal();
    });
  }
  
  // 捷運模式結果改善率Help按鈕
  if (resultImprovementHelpBtn) {
    resultImprovementHelpBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[improvement-help] Result improvement help button clicked');
      openImprovementHelpModal();
    });
  }
  
  // 關閉按鈕
  if (closeImprovementHelpBtn) {
    closeImprovementHelpBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[improvement-help] Close improvement help button clicked');
      closeImprovementHelpModal();
    });
  }
  
  // 點擊彈窗外部關閉
  if (improvementHelpModal) {
    improvementHelpModal.addEventListener('click', function(e) {
      if (e.target === improvementHelpModal) {
        closeImprovementHelpModal();
      }
    });
  }
}

// 打開改善率說明彈窗
function openImprovementHelpModal() {
  const modal = document.getElementById('improvement-help-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    console.log('[improvement-help] Improvement help modal opened');
  }
}

// 關閉改善率說明彈窗
function closeImprovementHelpModal() {
  const modal = document.getElementById('improvement-help-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    console.log('[improvement-help] Improvement help modal closed');
  }
}

// 更新幫助內容
function updateHelpContent() {
  const commuteContent = document.getElementById('help-content-commute');
  const metroContent = document.getElementById('help-content-metro');
  const metroPanel = document.getElementById('metro-panel');
  const helpModalTitle = document.getElementById('help-modal-title');
  
  // 檢查當前是否為捷運模式
  const isMetroMode = metroPanel && metroPanel.style.display !== 'none' && metroPanel.classList.contains('active');
  
  if (isMetroMode) {
    // 顯示捷運模式說明
    commuteContent.style.display = 'none';
    metroContent.style.display = 'block';
    if (helpModalTitle) {
      helpModalTitle.textContent = i18nDict[currentLang].helpTitle;
    }
  } else {
    // 顯示通勤模式說明
    commuteContent.style.display = 'block';
    metroContent.style.display = 'none';
    if (helpModalTitle) {
      helpModalTitle.textContent = i18nDict[currentLang].helpTitle;
    }
  }
}

// 禁用模式切換
function disableModeSwitching() {
  const commuteBtn = document.getElementById('mode-commute');
  const metroBtn = document.getElementById('mode-metro');
  
  if (commuteBtn) {
    commuteBtn.style.pointerEvents = 'none';
    commuteBtn.style.opacity = '0.5';
    commuteBtn.disabled = true;
  }
  
  if (metroBtn) {
    metroBtn.style.pointerEvents = 'none';
    metroBtn.style.opacity = '0.5';
    metroBtn.disabled = true;
  }
}

// 啟用模式切換
function enableModeSwitching() {
  const commuteBtn = document.getElementById('mode-commute');
  const metroBtn = document.getElementById('mode-metro');
  
  if (commuteBtn) {
    commuteBtn.style.pointerEvents = 'auto';
    commuteBtn.style.opacity = '1';
    commuteBtn.disabled = false;
  }
  
  if (metroBtn) {
    metroBtn.style.pointerEvents = 'auto';
    metroBtn.style.opacity = '1';
    metroBtn.disabled = false;
  }
}

// 地圖點擊事件
function onMapClick(e) {
  if (isPlanningMode) return;
  
  const { lat, lng } = e.latlng;
  
  if (nextPointIsStart) {
    setStart(lat, lng);
    reverseGeocode(lat, lng, 'start');
    nextPointIsStart = false;
  } else {
    setEnd(lat, lng);
    reverseGeocode(lat, lng, 'end');
    nextPointIsStart = true;
  }
  
  updatePlanButtonState();
}

// 設置起點
function setStart(lat, lng) {
  if (startMarker) {
    startMarker.remove();
  }
  
  const startIcon = L.divIcon({
    html: `<div style="
      width: 48px;
      height: 48px;
      background: #10b981;
      border: 6px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    "></div>`,
    className: 'custom-pin-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 48]
  });
  
  startMarker = L.marker([lat, lng], { icon: startIcon }).addTo(map);
  
  // 更新座標顯示
  document.getElementById('coords-start').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// 設置終點
function setEnd(lat, lng) {
  if (endMarker) {
    endMarker.remove();
  }
  
  const endIcon = L.divIcon({
    html: `<div style="
      width: 48px;
      height: 48px;
      background: #ef4444;
      border: 6px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    "></div>`,
    className: 'custom-pin-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 48]
  });
  
  endMarker = L.marker([lat, lng], { icon: endIcon }).addTo(map);
  
  // 更新座標顯示
  document.getElementById('coords-end').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// 更新規劃按鈕狀態
function updatePlanButtonState() {
  const planBtn = document.getElementById('plan-btn');
  const hasStart = !!startMarker || !!document.getElementById('input-start').value.trim();
  const hasEnd = !!endMarker || !!document.getElementById('input-end').value.trim();
  
  planBtn.disabled = !(hasStart && hasEnd);
}

// 地理編碼
async function geocodeAndSetMarker(address, type) {
  if (!address.trim()) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, language: 'zh-TW' })
    });
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    const { lat, lng } = data;
    
    if (type === 'start') {
      setStart(lat, lng);
    } else {
      setEnd(lat, lng);
    }
    
    updatePlanButtonState();
    
  } catch (error) {
    console.error('Geocoding error:', error);
    showError('地址解析失敗，請檢查地址是否正確');
  }
}

// 反向地理編碼
async function reverseGeocode(lat, lng, type) {
  try {
    const response = await fetch(`${API_BASE}/api/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ point: { lat, lng }, language: 'zh-TW' })
    });
    
    if (!response.ok) throw new Error('Reverse geocoding failed');
    
    const data = await response.json();
    const inputId = type === 'start' ? 'input-start' : 'input-end';
    document.getElementById(inputId).value = data.label || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // 如果反向地理編碼失敗，使用座標
    const inputId = type === 'start' ? 'input-start' : 'input-end';
    document.getElementById(inputId).value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// 規劃路徑
async function planRoutes() {
  hideError();
  
  const hasStart = !!startMarker || !!document.getElementById('input-start').value.trim();
  const hasEnd = !!endMarker || !!document.getElementById('input-end').value.trim();
  
  if (!hasStart || !hasEnd) {
    console.log('[debug] planRoutes called but no start/end points, skipping');
    return;
  }
  
  try {
    // 顯示載入狀態
    const planBtn = document.getElementById('plan-btn');
    const originalText = planBtn.textContent;
    planBtn.textContent = '計算中...';
    planBtn.disabled = true;
    
    // 準備請求數據
    let payload;
    
    if (startMarker && endMarker) {
      // 使用標記座標
      const startPos = startMarker.getLatLng();
      const endPos = endMarker.getLatLng();
      payload = {
        start: { lat: startPos.lat, lng: startPos.lng },
        end: { lat: endPos.lat, lng: endPos.lng }
      };
    } else {
      // 使用輸入框地址
      payload = {
        start_address: document.getElementById('input-start').value.trim(),
        end_address: document.getElementById('input-end').value.trim()
      };
    }
    
    // 添加其他參數
    // 獲取選中的交通方式
    const selectedTransport = document.querySelector('input[name="transport-mode"]:checked');
    payload.mode = selectedTransport ? selectedTransport.value : 'bicycle';
    
    // 距離限制
    const isDistanceLimitEnabled = document.getElementById('distance-limit-toggle').checked;
    const maxDistanceSlider = document.getElementById('max-distance-slider');
    
    if (isDistanceLimitEnabled && maxDistanceSlider.value > 0) {
      payload.max_distance_increase = parseInt(maxDistanceSlider.value);
    } else {
      payload.max_distance_increase = null;
    }
    
    console.log('[debug] planRoutes called, sending payload:', payload);
    
    // 調用 API
    const response = await fetch(`${API_BASE}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Route planning failed');
    }
    
    const data = await response.json();
    console.log('[debug] received route data:', data);
    
    // 渲染結果
    renderRoutes(data);
    renderTable(data);
    
    // 進入規劃模式
    isPlanningMode = true;
    
    // 禁用輸入框
    document.getElementById('input-start').disabled = true;
    document.getElementById('input-end').disabled = true;
    
    // 收起左側面板
    document.getElementById('leftPanel').classList.remove('expanded');
    
    // 調整地圖位置（面板收起時）
    const fullscreenMap = document.getElementById('map');
    if (fullscreenMap) {
      fullscreenMap.style.top = '120px'; // 80px (header) + 40px (handle)
      
      // 重新調整地圖大小
      if (window.map) {
        setTimeout(() => {
          window.map.invalidateSize();
        }, 300);
      }
    }
    
    // 啟用底部面板
    updateBottomPanelState(true);
    
  } catch (error) {
    console.error('Route planning error:', error);
    showError(`路徑計算失敗：${error.message}`);
  } finally {
    // 恢復按鈕狀態
    const planBtn = document.getElementById('plan-btn');
    planBtn.textContent = '🔍 規劃路徑';
    planBtn.disabled = false;
  }
}

// 渲染路徑
function renderRoutes(data) {
  console.log('[debug] renderRoutes called with data:', data);
  
  // 清除現有路徑
  clearGeometries();
  
  // 渲染最短路徑
  if (data.shortest?.geometry) {
    shortestLine = L.polyline(data.shortest.geometry, {
      color: '#3b82f6',
      weight: 8,
      opacity: 0.8
    }).addTo(map);
  }
  
  // 渲染最低暴露路徑
  if (data.lowest?.geometry) {
    lowestLine = L.polyline(data.lowest.geometry, {
      color: '#10b981',
      weight: 8,
      opacity: 0.8,
      dashArray: '20, 10'
    }).addTo(map);
  }
  
  // 調整地圖視野
  if (shortestLine && lowestLine) {
    const group = new L.featureGroup([shortestLine, lowestLine]);
    map.fitBounds(group.getBounds().pad(0.1));
  }
  
  // 儲存數據供後續使用
  window.lastRouteData = data;
}

// 清除路徑幾何
function clearGeometries() {
  if (shortestLine) { 
    shortestLine.remove(); 
    shortestLine = null; 
  }
  if (lowestLine) { 
    lowestLine.remove(); 
    lowestLine = null; 
  }
}

// 渲染表格（更新儀表板）
function renderTable(data) {
  const dict = i18nDict[currentLang];
  const imp = computeImprovementRate(data.shortest, data.lowest);
  const extra = computeExtraDistance(data.shortest, data.lowest);
  
  // 暴露減少已移除
  
  // 獲取當前交通方式
  const selectedTransport = document.querySelector('input[name="transport-mode"]:checked');
  const transportMode = selectedTransport ? selectedTransport.value : 'bicycle';
  
  // 計算通勤時間
  const shortestTime = computeTravelTime(data.shortest?.distance_km || 0, transportMode);
  const lowestTime = computeTravelTime(data.lowest?.distance_km || 0, transportMode);
  
  // 保存數據供語言切換時使用
  window.lastRouteData = {
    data: data,
    shortestTime: shortestTime,
    lowestTime: lowestTime,
    improvementRate: imp,
    extraDistance: extra,
    transportMode: transportMode
  };
  
  // 更新儀表板
  updateDashboard(data, shortestTime, lowestTime, imp, extra);
}

// 更新儀表板
function updateDashboard(data, shortestTime, lowestTime, improvementRate, extraDistance) {
  // 計算最大值用於進度條
  const maxDistance = Math.max(data.shortest?.distance_km || 0, data.lowest?.distance_km || 0);
  const maxTime = Math.max(shortestTime, lowestTime);

  // 更新距離比較
  updateDashboardBar('dashDistanceBarShortest', 'dashDistanceShortest', 
    data.shortest?.distance_km || 0, maxDistance, 'km');
  updateDashboardBar('dashDistanceBarLowest', 'dashDistanceLowest', 
    data.lowest?.distance_km || 0, maxDistance, 'km');

  // 更新時間比較
  updateDashboardBar('dashTimeBarShortest', 'dashTimeShortest', 
    shortestTime, maxTime, 'min');
  updateDashboardBar('dashTimeBarLowest', 'dashTimeLowest', 
    lowestTime, maxTime, 'min');

  // 暴露減少已移除

  // 更新額外距離
  const extraEl = document.getElementById('dashExtraDistance');
  const extraUnitEl = document.querySelector('#dashExtraDistance').parentElement.querySelector('.metric-unit');
  if (extraEl && extraUnitEl) {
    const distanceData = formatDistanceSeparated(extraDistance);
    extraEl.textContent = distanceData.value;
    extraUnitEl.textContent = distanceData.unit;
  }

  // 更新改善率大數字動畫
  updateImprovementProgress(null, 'dashImprovementRate', improvementRate);
}

// 更新儀表板進度條
function updateDashboardBar(barId, valueId, value, maxValue, unit) {
  const bar = document.getElementById(barId);
  const valueEl = document.getElementById(valueId);
  
  if (bar && valueEl) {
    const percentage = maxValue > 0 ? Math.max(5, (value / maxValue) * 100) : 0;
    
    // 動畫更新進度條
    setTimeout(() => {
      bar.style.width = `${percentage}%`;
    }, 100);
    
    // 更新數值
    valueEl.textContent = `${formatNumber(value, 1)} ${unit}`;
  }
}

// 更新改善率大數字動畫
function updateImprovementProgress(progressId, textId, percentage) {
  const textEl = document.getElementById(textId);
  
  if (textEl) {
    const validPercentage = Math.max(0, Math.min(100, percentage || 0));
    
    // 重置為0並添加初始動畫效果
    textEl.textContent = '0%';
    textEl.style.transform = 'scale(0.8)';
    textEl.style.opacity = '0.7';
    
    // 延遲後開始動畫
    setTimeout(() => {
      textEl.style.transition = 'all 0.3s ease-out';
      textEl.style.transform = 'scale(1)';
      textEl.style.opacity = '1';
      
      // 動畫從0跑到實際值
      animateNumber(textEl, 0, validPercentage, 2000, '%');
    }, 100);
  }
}

// 數字動畫函數
function animateNumber(element, start, end, duration, suffix = '') {
  const startTime = performance.now();
  const isInteger = Number.isInteger(end);
  
  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // 使用easeOutElastic緩動函數，創造更有趣的彈性效果
    const easeProgress = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    const currentValue = start + (end - start) * easeProgress;
    
    // 添加輕微的縮放效果
    const scale = 1 + Math.sin(progress * Math.PI) * 0.1;
    element.style.transform = `scale(${scale})`;
    
    if (isInteger) {
      element.textContent = Math.round(currentValue) + suffix;
    } else {
      element.textContent = formatNumber(currentValue, 1) + suffix;
    }
    
    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    } else {
      // 動畫完成，確保最終值正確並重置變換
      if (isInteger) {
        element.textContent = Math.round(end) + suffix;
      } else {
        element.textContent = formatNumber(end, 1) + suffix;
      }
      element.style.transform = 'scale(1)';
    }
  }
  
  requestAnimationFrame(updateNumber);
}

// 更新圓形進度條（保留給其他用途）
function updateCircularProgress(circleId, textId, percentage) {
  const circle = document.getElementById(circleId);
  const textEl = document.getElementById(textId);
  
  if (circle && textEl) {
    const circumference = 2 * Math.PI * 50; // r=50
    const validPercentage = Math.max(0, Math.min(100, percentage || 0));
    const offset = circumference - (validPercentage / 100) * circumference;
    
    // 動畫更新圓形進度條
    setTimeout(() => {
      circle.style.strokeDashoffset = offset;
    }, 200);
    
    // 更新文字
    textEl.textContent = validPercentage > 0 ? `${formatNumber(validPercentage, 1)}%` : '-%';
  }
}

// 重製所有設定
function resetAll() {
  // 清除輸入框
  const startInput = document.getElementById('input-start');
  const endInput = document.getElementById('input-end');
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
  
  // 清除標記
  if (startMarker) { 
    try { startMarker.remove(); } catch (_) {} 
    startMarker = null; 
  }
  if (endMarker) { 
    try { endMarker.remove(); } catch (_) {} 
    endMarker = null; 
  }
  
  // 清除路徑
  clearGeometries();
  
  // 清除座標顯示
  document.getElementById('coords-start').textContent = '-';
  document.getElementById('coords-end').textContent = '-';
  
  // 退出規劃模式
  isPlanningMode = false;
  console.log('[debug] exited planning mode, start/end points unlocked');
  
  // 啟用輸入框
  if (startInput) startInput.disabled = false;
  if (endInput) endInput.disabled = false;
  
  // 重置開關和拉桿
  const toggle = document.getElementById('distance-limit-toggle');
  const sliderContainer = document.getElementById('distance-slider-container');
  const slider = document.getElementById('max-distance-slider');
  
  if (toggle) {
    toggle.checked = false;
  }
  
  if (sliderContainer) {
    sliderContainer.style.display = 'none';
  }
  
  if (slider) {
    slider.value = 10000;
    const sliderValue = document.getElementById('slider-value');
    if (sliderValue) {
      sliderValue.textContent = '+10000m';
    }
  }
  
  // 展開左側面板
  document.getElementById('leftPanel').classList.add('expanded');
  
  // 調整地圖位置（面板展開時）
  const fullscreenMap = document.getElementById('map');
  if (fullscreenMap) {
    fullscreenMap.style.top = '360px'; // 80px (header) + 280px (panel)
    
    // 重新調整地圖大小
    if (window.map) {
      setTimeout(() => {
        window.map.invalidateSize();
      }, 300);
    }
  }
  
  // 禁用底部面板
  updateBottomPanelState(false);
  document.getElementById('bottomPanel').classList.remove('expanded');
  
  // 重置地圖視野
  nextPointIsStart = true;
  try { 
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM); 
  } catch (_) {}
  
  updatePlanButtonState();
}

// 工具函數
function formatNumber(num, decimals = 1) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return parseFloat(num).toFixed(decimals);
}

// 格式化距離（自動選擇公尺或公里）
function formatDistance(meters) {
  if (meters === null || meters === undefined || isNaN(meters)) return '-';
  
  if (meters >= 1000) {
    // 超過1公里，用公里顯示
    const kilometers = meters / 1000;
    return kilometers.toFixed(1) + 'km';
  } else {
    // 少於1公里，用公尺顯示
    return Math.round(meters) + 'm';
  }
}

// 格式化距離（分離數值和單位）
function formatDistanceSeparated(meters) {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return { value: '-', unit: '' };
  }
  
  const dict = i18nDict[currentLang];
  
  if (meters >= 1000) {
    // 超過1公里，用公里顯示
    const kilometers = meters / 1000;
    return { value: kilometers.toFixed(1), unit: dict.unitKilometers };
  } else {
    // 少於1公里，用公尺顯示
    return { value: Math.round(meters).toString(), unit: dict.unitMeters };
  }
}

function computeTravelTime(distanceKm, transportMode) {
  const speed = SPEED_CONSTANTS[transportMode] || SPEED_CONSTANTS.motorcycle;
  return (distanceKm / speed) * 60; // 轉換為分鐘
}

function computeImprovementRate(shortest, lowest) {
  if (!shortest?.exposure || !lowest?.exposure) return 0;
  return ((shortest.exposure - lowest.exposure) / shortest.exposure) * 100;
}

function computeExtraDistance(shortest, lowest) {
  if (!shortest?.distance_km || !lowest?.distance_km) return null;
  return (lowest.distance_km - shortest.distance_km) * 1000; // 轉換為公尺
}

// 語言切換
function switchLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('language', lang);
  applyLanguage();
}

function loadLanguage() {
  const savedLang = localStorage.getItem('language') || 'zh';
  currentLang = savedLang;
  applyLanguage();
}

function applyLanguage() {
  const dict = i18nDict[currentLang];
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });
  
  // 更新語言按鈕狀態
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 設置當前語言的按鈕為active
  if (currentLang === 'zh') {
    document.getElementById('btn-lang-zh').classList.add('active');
  } else {
    document.getElementById('btn-lang-en').classList.add('active');
  }
  
  // 重新更新Dashboard內容（如果有數據的話）
  if (window.lastRouteData) {
    updateDashboardFromLastData();
  }
  
  // 更新使用說明內容（如果彈窗是打開的）
  const helpModal = document.getElementById('help-modal');
  if (helpModal && helpModal.style.display !== 'none') {
    updateHelpContent();
  }
  
  // 重新渲染捷運線路和站點（如果捷運模式是激活的）
  if (currentMode === 'metro') {
    renderMetroLines();
    
    // 如果站點彈窗是打開的，重新渲染站點內容
    const stationsOverlay = document.getElementById('stations-overlay');
    if (stationsOverlay && stationsOverlay.style.display !== 'none') {
      // 獲取當前選中的線路ID
      const selectedLineId = window.currentSelectedLineId;
      if (selectedLineId && METRO_LINES[selectedLineId]) {
        showStationsModal(METRO_LINES[selectedLineId]);
      }
    }
    
    // 如果出口選擇彈窗是打開的，重新渲染出口選擇內容
    const exitModal = document.getElementById('exit-modal');
    if (exitModal && exitModal.style.display === 'flex') {
      // 檢查是否有當前選中的站點
      const stationNameEl = document.getElementById('selected-station-name');
      if (stationNameEl && window.currentSelectedStationId) {
        const stationName = METRO_STATIONS[window.currentSelectedStationId];
        if (stationName) {
          showExitModal(stationName, window.currentSelectedStationId);
        }
      }
    }
  }
}

// 從保存的數據重新更新Dashboard
function updateDashboardFromLastData() {
  if (!window.lastRouteData) return;
  
  const { data, shortestTime, lowestTime, improvementRate, extraDistance } = window.lastRouteData;
  
  // 重新計算時間（因為交通方式可能改變）
  const selectedTransport = document.querySelector('input[name="transport-mode"]:checked');
  const transportMode = selectedTransport ? selectedTransport.value : 'bicycle';
  
  const newShortestTime = computeTravelTime(data.shortest?.distance_km || 0, transportMode);
  const newLowestTime = computeTravelTime(data.lowest?.distance_km || 0, transportMode);
  
  // 更新通勤模式Dashboard
  updateDashboard(data, newShortestTime, newLowestTime, improvementRate, extraDistance);
  
  // 更新捷運模式結果Dashboard（如果存在）
  updateResultDashboard(data, newShortestTime, newLowestTime, improvementRate, extraDistance);
}

// 覆蓋層更新
function updateOverlay(overlayType) {
  // 移除現有覆蓋層
  if (overlayLayer) {
    map.removeLayer(overlayLayer);
    overlayLayer = null;
  }
  
  currentOverlay = overlayType;
  
  if (overlayType === 'none') {
    return;
  }
  
  // 疊加圖層圖片路徑
  let imagePath;
  switch (overlayType) {
    case 'PM25':
      imagePath = '/static/data/PM25_全台.png';
      break;
    case 'NO2':
      imagePath = '/static/data/NO2_全台.png';
      break;
    case 'WBGT':
      imagePath = '/static/data/WBGT_全台.png';
      break;
    default:
      return;
  }
  
  // EPSG:3826 (TWD97) 的邊界座標（台灣全島）
  const bounds = [
    [21.9, 120.1],  // 西南角
    [25.3, 122.0]   // 東北角
  ];
  
  // 創建圖片疊加層
  overlayLayer = L.imageOverlay(imagePath, bounds, {
    opacity: 0.5,
    interactive: false
  });
  
  overlayLayer.addTo(map);
  console.log(`Switching to overlay: ${overlayType}`);
}

// 錯誤處理
function showError(message) {
  const errorBox = document.getElementById('error-box');
  const errorMsg = document.getElementById('error-msg');
  
  if (errorBox && errorMsg) {
    errorMsg.textContent = message;
    errorBox.hidden = false;
    errorBox.style.display = 'flex';
    
    // 自動隱藏
    setTimeout(() => {
      hideError();
    }, 5000);
  }
}

function hideError() {
  const errorBox = document.getElementById('error-box');
  if (errorBox) {
    errorBox.hidden = true;
    errorBox.style.display = 'none';
  }
}

// 初始化捷運卡片
function initMetroList() {
  console.log('[metro] Initializing metro cards...');
  
  const container = document.getElementById('metro-list-container');
  if (!container) return;
  
  // 生成路線卡片
  generateMetroLineCards();
  
  // 綁定事件
  bindMetroCardEvents();
}

// 生成路線卡片
function generateMetroLineCards() {
  const linesGrid = document.querySelector('.metro-lines-grid');
  if (!linesGrid) return;
  
  linesGrid.innerHTML = '';
  
  Object.entries(METRO_LINES).forEach(([lineId, lineData]) => {
    const lineCard = document.createElement('div');
    lineCard.className = 'metro-line-card';
    lineCard.setAttribute('data-line', lineId);
    lineCard.style.setProperty('--line-color', lineData.color);
    
    lineCard.innerHTML = `
      <div class="line-card-content">
        <div class="line-card-code">${lineData.code}</div>
        <div class="line-card-name">${currentLang === 'en' ? lineData.nameEn : lineData.name}</div>
        <div class="line-card-stations">${lineData.stations.length} ${currentLang === 'en' ? 'stations' : '個站點'}</div>
        <div class="line-card-arrow">→</div>
      </div>
    `;
    
    linesGrid.appendChild(lineCard);
  });
}

// 綁定路線卡片事件
function bindMetroCardEvents() {
  const lineCards = document.querySelectorAll('.metro-line-card');
  console.log(`[metro] Found ${lineCards.length} line cards`);
  
  lineCards.forEach(card => {
    card.addEventListener('click', function() {
      const lineId = this.getAttribute('data-line');
      const lineData = METRO_LINES[lineId];
      if (lineData) {
        showStationsModal(lineData);
      }
    });
  });
  
  // 綁定關閉按鈕事件
  const closeBtn = document.getElementById('close-stations');
  const overlay = document.getElementById('stations-overlay');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', hideStationsModal);
  }
  
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        hideStationsModal();
      }
    });
  }
}

// 顯示站點彈出層
function showStationsModal(lineData) {
  console.log('[metro] Showing stations for line:', lineData.name);
  
  // 保存當前選中的線路ID，用於語言切換時重新渲染
  window.currentSelectedLineId = Object.keys(METRO_LINES).find(key => METRO_LINES[key] === lineData);
  
  const overlay = document.getElementById('stations-overlay');
  const lineNameEl = document.getElementById('selected-line-name');
  const stationsGrid = document.getElementById('stations-grid');
  const stationsHeader = document.querySelector('.stations-header');
  
  if (!overlay || !lineNameEl || !stationsGrid || !stationsHeader) return;
  
  // 設置標題
  lineNameEl.textContent = `${currentLang === 'en' ? lineData.nameEn : lineData.name} - ${currentLang === 'en' ? 'Select Station' : '選擇站點'}`;
  
  // 設置頭部顏色為捷運線的顏色
  stationsHeader.style.backgroundColor = lineData.color;
  console.log('[metro] Set header color to:', lineData.color);
  
  // 清空並生成站點卡片
  stationsGrid.innerHTML = '';
  
  lineData.stations.forEach(station => {
    const stationCard = document.createElement('div');
    stationCard.className = 'station-card';
    stationCard.setAttribute('data-station', station.id);
    
    // 檢查是否有出口資料
    const hasExits = STATION_EXITS[station.id];
    if (hasExits) {
      stationCard.classList.add('has-exits');
    }
    
    stationCard.innerHTML = `
      <div class="station-card-code">${station.code}</div>
      <div class="station-card-name">${currentLang === 'en' ? station.nameEn : station.name}</div>
    `;
    
    // 設置站點編號框的顏色為捷運線的顏色
    const codeElement = stationCard.querySelector('.station-card-code');
    if (codeElement) {
      codeElement.style.backgroundColor = lineData.color;
      codeElement.style.color = 'white';
      console.log('[metro] Set station code color to:', lineData.color);
    }
    
    // 添加點擊事件
    stationCard.addEventListener('click', function() {
      const stationId = this.getAttribute('data-station');
      const stationName = METRO_STATIONS[stationId];
      if (stationName && STATION_EXITS[stationId]) {
        hideStationsModal();
        showExitModal(stationName, stationId);
      }
    });
    
    stationsGrid.appendChild(stationCard);
  });
  
  // 顯示彈出層
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// 隱藏站點彈出層
function hideStationsModal() {
  const overlay = document.getElementById('stations-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    // 清除保存的線路ID
    window.currentSelectedLineId = null;
  }
}

// 舊的線路展開函數（已棄用）
function bindMetroLineEvents() {
  // 此函數已被新的卡片式設計取代
  console.log('[metro] bindMetroLineEvents is deprecated, using card-based design');
}

// 綁定捷運站事件（向後兼容）
function bindMetroStationEvents() {
  console.log('[metro] Binding station events...');
  initMetroList();
}

// 顯示出口選擇彈窗
function showExitModal(stationName, stationId) {
  // 保存當前選中的站點ID，用於語言切換時重新渲染
  window.currentSelectedStationId = stationId;
  
  const modal = document.getElementById('exit-modal');
  const stationNameEl = document.getElementById('selected-station-name');
  
  stationNameEl.textContent = stationName + (currentLang === 'en' ? ' Station' : '站');
  
  // 重置選擇狀態
  selectedExit = null;
  selectedAttraction = null;
  
  // 清除所有選擇狀態
  document.querySelectorAll('.exit-btn.selected').forEach(btn => {
    btn.classList.remove('selected');
  });
  document.querySelectorAll('.attraction-btn.selected').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // 生成景點按鈕
  generateAttractionButtons(stationId);
  
  // 更新導航按鈕狀態
  updateNavigationButton();
  
  modal.style.display = 'flex';
}

// 生成景點按鈕
function generateAttractionButtons(stationId) {
  const attractionContainer = document.getElementById('attractionButtons');
  attractionContainer.innerHTML = '';
  
  const attractions = STATION_ATTRACTIONS[stationId];
  if (!attractions || attractions.length === 0) {
    attractionContainer.innerHTML = '<p style="color: #666; font-size: 14px;">暫無景點資訊</p>';
    return;
  }
  
  attractions.forEach((attraction, index) => {
    const btn = document.createElement('button');
    btn.className = 'attraction-btn';
    btn.setAttribute('data-attraction', index);
    
    btn.innerHTML = `
      <div class="attraction-icon">🏛️</div>
      <span>${attraction.name}</span>
    `;
    
    btn.onclick = () => selectAttraction(index);
    attractionContainer.appendChild(btn);
  });
}

// 選擇出口
function selectExit(exitNumber) {
  // 清除之前的選擇
  document.querySelectorAll('.exit-btn.selected').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // 設置新選擇
  const exitBtn = document.querySelector(`[data-exit="${exitNumber}"]`);
  if (exitBtn) {
    exitBtn.classList.add('selected');
    selectedExit = exitNumber;
  }
  
  updateNavigationButton();
}

// 選擇景點
function selectAttraction(attractionIndex) {
  // 清除之前的選擇
  document.querySelectorAll('.attraction-btn.selected').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // 設置新選擇
  const attractionBtn = document.querySelector(`[data-attraction="${attractionIndex}"]`);
  if (attractionBtn) {
    attractionBtn.classList.add('selected');
    selectedAttraction = attractionIndex;
  }
  
  updateNavigationButton();
}

// 更新導航按鈕狀態
function updateNavigationButton() {
  const navBtn = document.getElementById('navigationBtn');
  if (selectedExit !== null && selectedAttraction !== null) {
    navBtn.disabled = false;
  } else {
    navBtn.disabled = true;
  }
}

// 關閉出口選擇彈窗
function closeExitModal() {
  const modal = document.getElementById('exit-modal');
  modal.style.display = 'none';
  // 清除保存的站點ID
  window.currentSelectedStationId = null;
}

// 開始導航
async function startNavigation() {
  const stationNameEl = document.getElementById('selected-station-name');
  const stationName = stationNameEl.textContent.replace('站', '');
  let currentStationId = null;
  
  // 找到對應的站點ID
  for (const [id, name] of Object.entries(METRO_STATIONS)) {
    if (name === stationName) {
      currentStationId = id;
      break;
    }
  }
  
  if (!currentStationId) {
    console.error('Cannot find station ID for:', stationName);
    return;
  }
  
  // 獲取出口和景點的經緯度
  const exitData = STATION_EXITS[currentStationId]?.find(exit => exit.exit == selectedExit);
  const attractionData = STATION_ATTRACTIONS[currentStationId]?.[selectedAttraction];
  
  if (!exitData || !attractionData) {
    console.error('Cannot find exit or attraction data');
    return;
  }
  
  // 關閉出口選擇彈窗
  closeExitModal();
  
  // 顯示載入狀態
  showLoadingForRouteCalculation();
  
  // 直接調用後端API計算路徑，如果失敗則使用模擬數據
  try {
    await calculateRouteForModal(exitData, attractionData, stationName);
  } catch (error) {
    console.log('[metro] Backend failed, falling back to mock data:', error.message);
    const mockData = generateMockRouteData(exitData, attractionData);
    showRouteResultModal(mockData, exitData, attractionData, stationName);
  }
}

// 顯示路徑計算載入狀態
function showLoadingForRouteCalculation() {
  console.log('[metro] Calculating routes...');
  
  // 顯示簡單的載入提示
  const loadingToast = document.createElement('div');
  loadingToast.id = 'loading-toast';
  loadingToast.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
    ">
      🔄 正在計算路徑...
    </div>
  `;
  document.body.appendChild(loadingToast);
  
  // 3秒後自動移除載入提示
  setTimeout(() => {
    const toast = document.getElementById('loading-toast');
    if (toast) {
      toast.remove();
    }
  }, 3000);
}

// 隱藏載入狀態
function hideLoadingForRouteCalculation() {
  const toast = document.getElementById('loading-toast');
  if (toast) {
    toast.remove();
  }
}

// 生成模擬路徑數據
function generateMockRouteData(exitData, attractionData) {
  console.log('[mock] Generating mock route data for:', exitData, attractionData);
  
  // 計算直線距離
  const distance = calculateDistance(exitData.lat, exitData.lng, attractionData.lat, attractionData.lng);
  console.log('[mock] Calculated distance:', distance);
  
  // 生成模擬路徑幾何
  const shortestGeometry = [
    [exitData.lat, exitData.lng],
    [(exitData.lat + attractionData.lat) / 2, (exitData.lng + attractionData.lng) / 2],
    [attractionData.lat, attractionData.lng]
  ];
  
  const lowestGeometry = [
    [exitData.lat, exitData.lng],
    [exitData.lat + 0.002, exitData.lng + 0.001],
    [attractionData.lat + 0.001, attractionData.lng - 0.001],
    [attractionData.lat, attractionData.lng]
  ];
  
  const mockData = {
    shortest: {
      distance_km: distance,
      geometry: shortestGeometry,
      exposure: 25.5
    },
    lowest: {
      distance_km: distance * 1.15,
      geometry: lowestGeometry,
      exposure: 18.2,
      exposure_reduction: 7.3
    }
  };
  
  console.log('[mock] Generated mock data:', mockData);
  return mockData;
}

// 計算兩點間距離
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // 地球半徑（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 為彈窗調用路徑計算API
async function calculateRouteForModal(exitData, attractionData, stationName) {
  try {
    const response = await fetch(`${API_BASE}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { lat: exitData.lat, lng: exitData.lng },
        end: { lat: attractionData.lat, lng: attractionData.lng },
        mode: 'walk'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    showRouteResultModal(data, exitData, attractionData, stationName);
    
  } catch (error) {
    console.error('[metro] API call failed:', error);
    throw error;
  }
}

// 顯示路徑解算結果彈窗
function showRouteResultModal(routeData, exitData, attractionData, stationName) {
  hideLoadingForRouteCalculation();
  
  const modal = document.getElementById('route-result-modal');
  const title = document.getElementById('routeResultTitle');
  
  title.textContent = `${stationName}站 → ${attractionData.name}`;
  
  modal.style.display = 'flex';
  
  setTimeout(() => {
    // 初始化結果地圖
    initRouteResultMap(routeData, exitData, attractionData);
    
    // 更新結果圖表
    updateRouteResultCharts(routeData);
    
    // 重新綁定改善率Help按鈕事件（因為彈窗內容是動態生成的）
    bindImprovementHelpEvents();
  }, 100);
}

// 初始化結果地圖
function initRouteResultMap(routeData, exitData, attractionData) {
  const mapContainer = document.getElementById('route-result-map');
  mapContainer.innerHTML = '';
  
  // 等待容器完全顯示後再初始化地圖
  setTimeout(() => {
    // 創建 Leaflet 地圖
    const resultMap = L.map(mapContainer, {
      center: [exitData.lat, exitData.lng],
      zoom: 15,
      zoomControl: true
    });
    
    // 添加底圖
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(resultMap);
    
    // 添加起點標記（綠色）
    const startIcon = L.divIcon({
      html: `<div style="
        width: 48px;
        height: 48px;
        background: #10b981;
        border: 6px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      "></div>`,
      className: 'custom-pin-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 48]
    });
    
    L.marker([exitData.lat, exitData.lng], { icon: startIcon }).addTo(resultMap);
    
    // 添加終點標記（紅色）
    const endIcon = L.divIcon({
      html: `<div style="
        width: 48px;
        height: 48px;
        background: #ef4444;
        border: 6px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      "></div>`,
      className: 'custom-pin-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 48]
    });
    
    L.marker([attractionData.lat, attractionData.lng], { icon: endIcon }).addTo(resultMap);
    
    // 添加路徑
    if (routeData.shortest?.geometry) {
      L.polyline(routeData.shortest.geometry, {
        color: '#3b82f6',
        weight: 8,
        opacity: 0.8
      }).addTo(resultMap);
    }
    
    if (routeData.lowest?.geometry) {
      L.polyline(routeData.lowest.geometry, {
        color: '#10b981',
        weight: 8,
        opacity: 0.8,
        dashArray: '20, 10'
      }).addTo(resultMap);
    }
    
    // 調整地圖視野
    const bounds = L.latLngBounds([
      [exitData.lat, exitData.lng],
      [attractionData.lat, attractionData.lng]
    ]);
    resultMap.fitBounds(bounds.pad(0.1));
    
    // 確保地圖正確顯示
    resultMap.invalidateSize();
    
    // 儲存地圖實例供後續使用
    window.routeResultMap = resultMap;
  }, 300); // 等待彈窗動畫完成
}

// 更新結果圖表
function updateRouteResultCharts(data) {
  const shortestTime = computeTravelTime(data.shortest?.distance_km || 0, 'walk');
  const lowestTime = computeTravelTime(data.lowest?.distance_km || 0, 'walk');
  const improvementRate = computeImprovementRate(data.shortest, data.lowest);
  // 暴露減少已移除
  const extraDistance = computeExtraDistance(data.shortest, data.lowest);
  
  // 更新結果儀表板
  updateResultDashboard(data, shortestTime, lowestTime, improvementRate, extraDistance);
}

// 更新結果儀表板（捷運模式）
function updateResultDashboard(data, shortestTime, lowestTime, improvementRate, extraDistance) {
  console.log('[result-dashboard] Updating with data:', { data, shortestTime, lowestTime, improvementRate, extraDistance });
  
  // 距離比較
  const shortestDistance = data.shortest?.distance_km || 0;
  const lowestDistance = data.lowest?.distance_km || 0;
  const maxDistance = Math.max(shortestDistance, lowestDistance);
  
  updateResultDashboardBar('resultDashDistanceBarShortest', 'resultDashDistanceShortest', shortestDistance, maxDistance, 'km');
  updateResultDashboardBar('resultDashDistanceBarLowest', 'resultDashDistanceLowest', lowestDistance, maxDistance, 'km');
  
  // 時間比較
  const maxTime = Math.max(shortestTime, lowestTime);
  updateResultDashboardBar('resultDashTimeBarShortest', 'resultDashTimeShortest', shortestTime, maxTime, 'min');
  updateResultDashboardBar('resultDashTimeBarLowest', 'resultDashTimeLowest', lowestTime, maxTime, 'min');
  
  // 暴露減少已移除
  
  // 額外距離
  const extraDistanceElement = document.getElementById('resultDashExtraDistance');
  const extraDistanceUnitElement = document.querySelector('#resultDashExtraDistance').parentElement.querySelector('.result-metric-unit');
  if (extraDistanceElement && extraDistanceUnitElement) {
    const distanceData = formatDistanceSeparated(extraDistance);
    const dict = i18nDict[currentLang];
    extraDistanceElement.textContent = extraDistance > 0 ? distanceData.value : '0';
    extraDistanceUnitElement.textContent = extraDistance > 0 ? distanceData.unit : dict.unitMeters;
  }
  
  // 改善率大數字動畫
  updateImprovementProgress(null, 'resultDashImprovementRate', improvementRate);
}

// 更新結果儀表板進度條
function updateResultDashboardBar(barId, valueId, value, maxValue, unit) {
  const bar = document.getElementById(barId);
  const valueElement = document.getElementById(valueId);
  
  if (bar && valueElement) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    bar.style.width = `${percentage}%`;
    
    if (unit === 'km') {
      valueElement.textContent = `${value.toFixed(1)} km`;
    } else if (unit === 'min') {
      valueElement.textContent = `${Math.round(value)} min`;
    } else {
      valueElement.textContent = `${value} ${unit}`;
    }
  }
}

// 更新結果圓形進度條
function updateResultCircularProgress(circleId, textId, percentage) {
  const circle = document.getElementById(circleId);
  const text = document.getElementById(textId);
  
  if (circle && text) {
    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference - (percentage / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    text.textContent = `${Math.round(percentage)}%`;
  }
}

// 關閉路徑解算結果彈窗
function closeRouteResultModal() {
  const modal = document.getElementById('route-result-modal');
  modal.style.display = 'none';
  
  // 清理地圖實例
  if (window.routeResultMap) {
    window.routeResultMap.remove();
    window.routeResultMap = null;
  }
}

// 錯誤關閉按鈕
document.addEventListener('DOMContentLoaded', function() {
  const errorClose = document.getElementById('error-close');
  if (errorClose) {
    errorClose.addEventListener('click', hideError);
  }
});
