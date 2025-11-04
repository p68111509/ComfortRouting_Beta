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
const API_BASE = (window.location.protocol === 'file:' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1') 
  ? 'http://localhost:8000' 
  : window.location.protocol + '//' + window.location.host;

// 離線模式：直接使用mock數據
const OFFLINE_MODE = false;

// 調試：印出 API 基礎 URL
console.log('API_BASE:', API_BASE);
console.log('Current protocol:', window.location.protocol);
console.log('Current hostname:', window.location.hostname);

// 全域變數
let currentMode = 'navigation'; // 預設為導航模式

// 手機版 Header 高度自適應
function updateHeaderHeight() {
  if (window.innerWidth <= 768) {
    const header = document.querySelector('.app-header');
    if (header) {
      const headerHeight = header.offsetHeight;
      document.documentElement.style.setProperty('--header-height', headerHeight + 'px');
      
      // 更新左側面板位置（保持動畫）
      const leftPanel = document.querySelector('.left-panel');
      if (leftPanel) {
        leftPanel.style.top = (headerHeight + 10) + 'px';
        // 確保動畫屬性不被覆蓋
        if (!leftPanel.style.transition.includes('transform')) {
          leftPanel.style.transition += ', transform 0.3s ease';
        }
      }
      
      // 更新地圖位置
      const map = document.querySelector('.fullscreen-map');
      if (map) {
        map.style.top = (headerHeight + 10) + 'px';
      }
    }
  }
}

// 監聽視窗大小變化
window.addEventListener('resize', updateHeaderHeight);
// 初始執行
document.addEventListener('DOMContentLoaded', updateHeaderHeight);

// 速度常數 (km/h)
const SPEED_CONSTANTS = {
  motorcycle: 45,
  bicycle: 7,  // 減半：14 -> 7
  walk: 2.5
};

// 捷運線路和站點數據
const METRO_LINES = {
  'tamsui-xinyi': {
    name: '淡水信義線',
    nameEn: 'Tamsui-Xinyi Line',
    color: '#E3002C',
    code: 'R',
    stations: [
      { id: 'xiangshan', name: '象山', nameEn: 'Xiangshan', code: 'R02', enabled: true },
      { id: 'tamsui', name: '淡水', nameEn: 'Tamsui', code: 'R28', enabled: true },
      { id: 'hongshulin', name: '紅樹林', nameEn: 'Hongshulin', code: 'R27', enabled: true },
      { id: 'zhuwei', name: '竹圍', nameEn: 'Zhuwei', code: 'R26', enabled: true },
      { id: 'guandu', name: '關渡', nameEn: 'Guandu', code: 'R25', enabled: true },
      { id: 'zhongyi', name: '忠義', nameEn: 'Zhongyi', code: 'R24', enabled: true },
      { id: 'fuxinggang', name: '復興崗', nameEn: 'Fuxinggang', code: 'R23', enabled: true },
      { id: 'beitou', name: '北投', nameEn: 'Beitou', code: 'R22', enabled: true },
      { id: 'qiyan', name: '奇岩', nameEn: 'Qiyan', code: 'R21', enabled: true },
      { id: 'shipai', name: '石牌', nameEn: 'Shipai', code: 'R20', enabled: true },
      { id: 'mingde', name: '明德', nameEn: 'Mingde', code: 'R19', enabled: true },
      { id: 'zhishan', name: '芝山', nameEn: 'Zhishan', code: 'R18', enabled: true },
      { id: 'shilin', name: '士林', nameEn: 'Shilin', code: 'R17', enabled: true },
      { id: 'jiantan', name: '劍潭', nameEn: 'Jiantan', code: 'R16', enabled: true },
      { id: 'yuanshan', name: '圓山', nameEn: 'Yuanshan', code: 'R15', enabled: true },
      { id: 'minquan-w-rd', name: '民權西路', nameEn: 'Minquan West Road', code: 'R14', enabled: true },
      { id: 'shuanglian', name: '雙連', nameEn: 'Shuanglian', code: 'R13', enabled: true },
      { id: 'zhongshan', name: '中山', nameEn: 'Zhongshan', code: 'R12', enabled: true },
      { id: 'taipei-main-station', name: '台北車站', nameEn: 'Taipei Main Station', code: 'R10', enabled: true },
      { id: 'taida', name: '台大醫院', nameEn: 'National Taiwan University Hospital', code: 'R09', enabled: true },
      { id: 'chks', name: '中正紀念堂', nameEn: 'Chiang Kai-shek Memorial Hall', code: 'R08', enabled: true },
      { id: 'dongmen', name: '東門', nameEn: 'Dongmen', code: 'R07', enabled: true },
      { id: 'daan', name: '大安', nameEn: 'Daan', code: 'R05', enabled: true },
      { id: 'xinyi', name: '信義安和', nameEn: 'Xinyi Anhe', code: 'R04', enabled: true },
      { id: 'taipei101', name: '台北101/世貿', nameEn: 'Taipei 101/World Trade Center', code: 'R03', enabled: true }
    ]
  },
  'bannan': {
    name: '板南線',
    nameEn: 'Bannan Line',
    color: '#0070BD',
    code: 'BL',
    stations: [
      { id: 'dingpu', name: '頂埔', nameEn: 'Dingpu', code: 'BL01', enabled: true },
      { id: 'yongning', name: '永寧', nameEn: 'Yongning', code: 'BL02', enabled: true },
      { id: 'tucheng', name: '土城', nameEn: 'Tucheng', code: 'BL03', enabled: true },
      { id: 'haishan', name: '海山', nameEn: 'Haishan', code: 'BL04', enabled: true },
      { id: 'banqiao', name: '板橋', nameEn: 'Banqiao', code: 'BL05', enabled: true },
      { id: 'fuzhong', name: '府中', nameEn: 'Fuzhong', code: 'BL06', enabled: true },
      { id: 'jiangzicui', name: '江子翠', nameEn: 'Jiangzicui', code: 'BL07', enabled: true },
      { id: 'longshan-temple', name: '龍山寺', nameEn: 'Longshan Temple', code: 'BL10', enabled: true },
      { id: 'ximen', name: '西門', nameEn: 'Ximen', code: 'BL11', enabled: true },
      { id: 'taipei-main-station', name: '台北車站', nameEn: 'Taipei Main Station', code: 'BL12', enabled: true },
      { id: 'shanxi', name: '善導寺', nameEn: 'Shanxi', code: 'BL14', enabled: true },
      { id: 'zhongxiao-xinsheng', name: '忠孝新生', nameEn: 'Zhongxiao Xinsheng', code: 'BL15', enabled: true },
      { id: 'zhongxiao-fuxing', name: '忠孝復興', nameEn: 'Zhongxiao Fuxing', code: 'BL16', enabled: true },
      { id: 'zhongxiao-dunhua', name: '忠孝敦化', nameEn: 'Zhongxiao Dunhua', code: 'BL17', enabled: true },
      { id: 'sun-yat-sen-memorial-hall', name: '國父紀念館', nameEn: 'Sun Yat-sen Memorial Hall', code: 'BL18', enabled: true },
      { id: 'yongchun', name: '永春', nameEn: 'Yongchun', code: 'BL19', enabled: true },
      { id: 'houshanpi', name: '後山埤', nameEn: 'Houshanpi', code: 'BL20', enabled: true },
      { id: 'kunyang', name: '昆陽', nameEn: 'Kunyang', code: 'BL21', enabled: true },
      { id: 'nangang', name: '南港', nameEn: 'Nangang', code: 'BL22', enabled: true },
      { id: 'nangang-exhibition', name: '南港展覽館', nameEn: 'Nangang Exhibition Center', code: 'BL23', enabled: true }
    ]
  },
  'songshan-xindian': {
    name: '松山新店線',
    nameEn: 'Songshan-Xindian Line',
    color: '#008659',
    code: 'G',
    stations: [
      { id: 'songshan', name: '松山', nameEn: 'Songshan', code: 'G19', enabled: true },
      { id: 'nanjing-sanmin', name: '南京三民', nameEn: 'Nanjing Sanmin', code: 'G18', enabled: true },
      { id: 'taipei-arena', name: '台北小巨蛋', nameEn: 'Taipei Arena', code: 'G17', enabled: true },
      { id: 'nanjing-fuxing', name: '南京復興', nameEn: 'Nanjing Fuxing', code: 'G16', enabled: true },
      { id: 'songjiang-nanjing', name: '松江南京', nameEn: 'Songjiang Nanjing', code: 'G15', enabled: true },
      { id: 'zhongshan', name: '中山', nameEn: 'Zhongshan', code: 'G14', enabled: true },
      { id: 'beimen', name: '北門', nameEn: 'Beimen', code: 'G13', enabled: true },
      { id: 'ximen', name: '西門', nameEn: 'Ximen', code: 'G12', enabled: true },
      { id: 'xiaonanmen', name: '小南門', nameEn: 'Xiaonanmen', code: 'G11', enabled: true },
      { id: 'chks', name: '中正紀念堂', nameEn: 'Chiang Kai-shek Memorial Hall', code: 'G10', enabled: true },
      { id: 'guting', name: '古亭', nameEn: 'Guting', code: 'G09', enabled: true },
      { id: 'taipower', name: '台電大樓', nameEn: 'Taipower Building', code: 'G08', enabled: true },
      { id: 'gongguan', name: '公館', nameEn: 'Gongguan', code: 'G07', enabled: true },
      { id: 'wanlong', name: '萬隆', nameEn: 'Wanlong', code: 'G06', enabled: true },
      { id: 'jingmei', name: '景美', nameEn: 'Jingmei', code: 'G05', enabled: true },
      { id: 'dapinglin', name: '大坪林', nameEn: 'Dapinglin', code: 'G04', enabled: true },
      { id: 'qizhang', name: '七張', nameEn: 'Qizhang', code: 'G03', enabled: true },
      { id: 'xiaobitan', name: '小碧潭', nameEn: 'Xiaobitan', code: 'G03A', enabled: true },
      { id: 'xindian', name: '新店', nameEn: 'Xindian', code: 'G01', enabled: true }
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
  // 頂埔站
  'dingpu': [
    { exit: 1, lat: 24.95933, lng: 121.4183, accessible: true },
    { exit: 2, lat: 24.95895, lng: 121.4184, accessible: false },
    { exit: 3, lat: 24.9595, lng: 121.4193, accessible: true },
    { exit: 4, lat: 24.96026, lng: 121.42, accessible: true }
  ],
  // 松山機場站
  'songshan-airport': [
    { exit: 1, lat: 25.06363, lng: 121.552, accessible: true },
    { exit: 2, lat: 25.06354, lng: 121.551, accessible: true },
    { exit: 3, lat: 25.06317, lng: 121.5518, accessible: true }
  ],
  // 中山國中站
  'zhongshan-junior-high': [
    { exit: 0, lat: 25.06083, lng: 121.544, accessible: true }
  ],
  // 忠孝復興站
  'zhongxiao-fuxing': [
    { exit: 1, lat: 25.0418, lng: 121.5431, accessible: false },
    { exit: 2, lat: 25.04121, lng: 121.5435, accessible: true },
    { exit: 3, lat: 25.04147, lng: 121.5448, accessible: false },
    { exit: 4, lat: 25.04177, lng: 121.5451, accessible: false },
    { exit: 5, lat: 25.04202, lng: 121.544, accessible: false }
  ],
  // 大安站
  'daan': [
    { exit: 1, lat: 25.0336, lng: 121.542, accessible: false },
    { exit: 2, lat: 25.03365, lng: 121.5416, accessible: false },
    { exit: 3, lat: 25.03324, lng: 121.5423, accessible: true },
    { exit: 4, lat: 25.03312, lng: 121.544, accessible: true },
    { exit: 5, lat: 25.03286, lng: 121.5437, accessible: false },
    { exit: 6, lat: 25.03401, lng: 121.5437, accessible: false }
  ],
  // 科技大樓站
  'technology-building': [
    { exit: 0, lat: 25.02615, lng: 121.5436, accessible: true }
  ],
  // 六張犁站
  'liu-zhang-li': [
    { exit: 0, lat: 25.02385, lng: 121.5527, accessible: true }
  ],
  // 麟光站
  'ling-guang': [
    { exit: 0, lat: 25.01855, lng: 121.5586, accessible: true }
  ],
  // 辛亥站
  'xin-hai': [
    { exit: 0, lat: 25.00512, lng: 121.557, accessible: true }
  ],
  // 萬芳醫院站
  'wanfang-hospital': [
    { exit: 0, lat: 24.99938, lng: 121.5577, accessible: true }
  ],
  // 萬芳社區站
  'wanfang-community': [
    { exit: 0, lat: 24.99858, lng: 121.5684, accessible: true }
  ],
  // 木柵站
  'mu-zha': [
    { exit: 0, lat: 24.99817, lng: 121.5734, accessible: true }
  ],
  // 動物園站
  'taipei-zoo': [
    { exit: 1, lat: 24.9983, lng: 121.5799, accessible: true },
    { exit: 2, lat: 24.99797, lng: 121.5793, accessible: true }
  ],
  // 大直站
  'dazhi': [
    { exit: 1, lat: 25.08036, lng: 121.5469, accessible: true },
    { exit: 2, lat: 25.07958, lng: 121.5468, accessible: false },
    { exit: 3, lat: 25.07944, lng: 121.547, accessible: true }
  ],
  // 劍南路站
  'jian-nan-road': [
    { exit: 1, lat: 25.08548, lng: 121.5554, accessible: true },
    { exit: 2, lat: 25.0846, lng: 121.5552, accessible: true },
    { exit: 3, lat: 25.08432, lng: 121.5561, accessible: false }
  ],
  // 西湖站
  'xi-hu': [
    { exit: 1, lat: 25.08234, lng: 121.5666, accessible: true },
    { exit: 2, lat: 25.08202, lng: 121.5671, accessible: true }
  ],
  // 港墘站
  'gang-qian': [
    { exit: 1, lat: 25.08013, lng: 121.5758, accessible: true },
    { exit: 2, lat: 25.08007, lng: 121.5747, accessible: true }
  ],
  // 文德站
  'wende': [
    { exit: 1, lat: 25.07867, lng: 121.5856, accessible: true },
    { exit: 2, lat: 25.07835, lng: 121.5846, accessible: true }
  ],
  // 內湖站
  'neihu': [
    { exit: 1, lat: 25.08375, lng: 121.5943, accessible: true },
    { exit: 2, lat: 25.08364, lng: 121.5946, accessible: true }
  ],
  // 大湖公園站
  'da-hu-park': [
    { exit: 1, lat: 25.08389, lng: 121.6024, accessible: true },
    { exit: 2, lat: 25.08368, lng: 121.6022, accessible: true }
  ],
  // 葫洲站
  'hu-zhou': [
    { exit: 1, lat: 25.07251, lng: 121.6081, accessible: true },
    { exit: 2, lat: 25.07253, lng: 121.6072, accessible: true }
  ],
  // 東湖站
  'dong-hu': [
    { exit: 1, lat: 25.06719, lng: 121.6109, accessible: true },
    { exit: 2, lat: 25.06718, lng: 121.6113, accessible: true },
    { exit: 3, lat: 25.06706, lng: 121.612, accessible: true }
  ],
  // 南港軟體園區站
  'nangang-software-park': [
    { exit: 1, lat: 25.06039, lng: 121.6159, accessible: true },
    { exit: 2, lat: 25.06012, lng: 121.6163, accessible: true }
  ],
  // 南港展覽館站
  'nangang-exhibition-hall': [
    { exit: 1, lat: 25.05578, lng: 121.6171, accessible: true },
    { exit: 2, lat: 25.05541, lng: 121.6172, accessible: true },
    { exit: 3, lat: 25.05512, lng: 121.6182, accessible: true },
    { exit: 4, lat: 25.05536, lng: 121.6183, accessible: true },
    { exit: '2A', lat: 25.05534, lng: 121.6172, accessible: true },
    { exit: 5, lat: 25.05492, lng: 121.6169, accessible: true },
    { exit: 6, lat: 25.05476, lng: 121.6179, accessible: false },
    { exit: 7, lat: 25.05404, lng: 121.6181, accessible: false }
  ],
  // 小碧潭站
  'xiaobitan': [
    { exit: 1, lat: 24.9718, lng: 121.5299, accessible: true },
    { exit: 2, lat: 24.97319, lng: 121.53, accessible: true }
  ],
  // 新店站
  'xindian': [
    { exit: 0, lat: 24.95784, lng: 121.5376, accessible: true }
  ],
  // 新店區公所站
  'xindian-district-office': [
    { exit: 1, lat: 24.96739, lng: 121.5411, accessible: true },
    { exit: 2, lat: 24.96799, lng: 121.5417, accessible: false }
  ],
  // 七張站
  'qizhang': [
    { exit: 1, lat: 24.97503, lng: 121.5431, accessible: true },
    { exit: 2, lat: 24.97691, lng: 121.5426, accessible: false }
  ],
  // 大坪林站
  'dapinglin': [
    { exit: 1, lat: 24.98275, lng: 121.5409, accessible: false },
    { exit: 2, lat: 24.98205, lng: 121.5416, accessible: false },
    { exit: 3, lat: 24.98298, lng: 121.5416, accessible: true },
    { exit: 4, lat: 24.98354, lng: 121.5414, accessible: false },
    { exit: 5, lat: 24.98286, lng: 121.5432, accessible: true }
  ],
  // 景美站
  'jingmei': [
    { exit: 1, lat: 24.99213, lng: 121.5407, accessible: true },
    { exit: 2, lat: 24.99307, lng: 121.5415, accessible: false },
    { exit: 3, lat: 24.99274, lng: 121.5405, accessible: false }
  ],
  // 萬隆站
  'wanlong': [
    { exit: 1, lat: 25.00137, lng: 121.5389, accessible: false },
    { exit: 2, lat: 25.00151, lng: 121.5396, accessible: false },
    { exit: 3, lat: 25.00222, lng: 121.5392, accessible: false },
    { exit: 4, lat: 25.00268, lng: 121.5386, accessible: true }
  ],
  // 公館站
  'gongguan': [
    { exit: 1, lat: 25.01451, lng: 121.5344, accessible: true },
    { exit: 2, lat: 25.01472, lng: 121.5347, accessible: true },
    { exit: 3, lat: 25.01542, lng: 121.534, accessible: false },
    { exit: 4, lat: 25.01515, lng: 121.5336, accessible: false }
  ],
  // 台電大樓站
  'taipower': [
    { exit: 1, lat: 25.01962, lng: 121.5286, accessible: false },
    { exit: 2, lat: 25.02019, lng: 121.5291, accessible: false },
    { exit: 3, lat: 25.02118, lng: 121.5278, accessible: false },
    { exit: 4, lat: 25.02102, lng: 121.5273, accessible: false },
    { exit: 5, lat: 25.02076, lng: 121.5277, accessible: true }
  ],
  // 古亭站
  'guting': [
    { exit: 1, lat: 25.02598, lng: 121.523, accessible: true },
    { exit: 2, lat: 25.0255, lng: 121.5234, accessible: false },
    { exit: 3, lat: 25.02592, lng: 121.5235, accessible: false },
    { exit: 4, lat: 25.02656, lng: 121.523, accessible: false },
    { exit: 5, lat: 25.02718, lng: 121.5229, accessible: false },
    { exit: 6, lat: 25.02754, lng: 121.5223, accessible: false },
    { exit: 7, lat: 25.02773, lng: 121.5217, accessible: false },
    { exit: 8, lat: 25.02706, lng: 121.5219, accessible: false },
    { exit: 9, lat: 25.0268, lng: 121.5224, accessible: false }
  ],
  // 中正紀念堂站
  'chks': [
    { exit: 1, lat: 25.03335, lng: 121.5176, accessible: true },
    { exit: 2, lat: 25.03241, lng: 121.5183, accessible: false },
    { exit: 3, lat: 25.03228, lng: 121.519, accessible: false },
    { exit: 4, lat: 25.03353, lng: 121.518, accessible: false },
    { exit: 5, lat: 25.03522, lng: 121.5171, accessible: true },
    { exit: 6, lat: 25.03588, lng: 121.5165, accessible: false },
    { exit: 7, lat: 25.03457, lng: 121.516, accessible: false }
  ],
  // 小南門站
  'xiaonanmen': [
    { exit: 1, lat: 25.03643, lng: 121.5098, accessible: false },
    { exit: 2, lat: 25.03574, lng: 121.5099, accessible: false },
    { exit: 3, lat: 25.03531, lng: 121.511, accessible: true },
    { exit: 4, lat: 25.03523, lng: 121.5115, accessible: false }
  ],
  // 頂溪站
  'dingxi': [
    { exit: 1, lat: 25.0129, lng: 121.5154, accessible: true },
    { exit: 2, lat: 25.01422, lng: 121.5154, accessible: false }
  ],
  // 永安市場站
  'yongan': [
    { exit: 0, lat: 25.00238, lng: 121.511, accessible: true }
  ],
  // 景安站
  'jingan': [
    { exit: 0, lat: 24.99373, lng: 121.5046, accessible: true }
  ],
  // 南勢角站
  'nanshijiao': [
    { exit: 1, lat: 24.99053, lng: 121.5079, accessible: false },
    { exit: 2, lat: 24.99016, lng: 121.5087, accessible: false },
    { exit: 3, lat: 24.99006, lng: 121.5089, accessible: true },
    { exit: 4, lat: 24.98949, lng: 121.5098, accessible: false }
  ],
  // 台大醫院站
  'taida': [
    { exit: 1, lat: 25.04091, lng: 121.5157, accessible: true },
    { exit: 2, lat: 25.04122, lng: 121.5166, accessible: true },
    { exit: 3, lat: 25.04281, lng: 121.5166, accessible: true },
    { exit: 4, lat: 25.04288, lng: 121.5163, accessible: false }
  ],
  // 台北車站
  'taipei-main-station': [
    { exit: 'M5', lat: 25.04676, lng: 121.5162, accessible: false },
    { exit: 'M6', lat: 25.04623, lng: 121.5168, accessible: false },
    { exit: 'M7', lat: 25.04608, lng: 121.5186, accessible: false },
    { exit: 'M8', lat: 25.04595, lng: 121.5175, accessible: false },
    { exit: 'M1', lat: 25.04823, lng: 121.5182, accessible: false },
    { exit: 'M2', lat: 25.04816, lng: 121.5191, accessible: true },
    { exit: 'M3', lat: 25.04634, lng: 121.5179, accessible: false },
    { exit: 'M4', lat: 25.04649, lng: 121.5173, accessible: true }
  ],
  // 雙連站
  'shuanglian': [
    { exit: 1, lat: 25.0575, lng: 121.5206, accessible: false },
    { exit: 2, lat: 25.05783, lng: 121.5206, accessible: true }
  ],
  // 民權西路站
  'minquan-west-road': [
    { exit: 1, lat: 25.06264, lng: 121.5195, accessible: true },
    { exit: 4, lat: 25.06194, lng: 121.5199, accessible: false },
    { exit: 3, lat: 25.0617, lng: 121.5198, accessible: false },
    { exit: 2, lat: 25.06185, lng: 121.5196, accessible: false },
    { exit: 5, lat: 25.06324, lng: 121.5188, accessible: false },
    { exit: 6, lat: 25.06274, lng: 121.5189, accessible: false },
    { exit: 7, lat: 25.0627, lng: 121.5202, accessible: false },
    { exit: 8, lat: 25.06269, lng: 121.5206, accessible: false },
    { exit: 9, lat: 25.06295, lng: 121.5206, accessible: false },
    { exit: 10, lat: 25.06297, lng: 121.5201, accessible: true }
  ],
  // 圓山站
  'yuanshan': [
    { exit: 1, lat: 25.07079, lng: 121.52, accessible: true },
    { exit: 2, lat: 25.07178, lng: 121.5201, accessible: true }
  ],
  // 劍潭站
  'jiantan': [
    { exit: 1, lat: 25.08503, lng: 121.5252, accessible: true },
    { exit: 2, lat: 25.08327, lng: 121.5248, accessible: true },
    { exit: 3, lat: 25.08428, lng: 121.525, accessible: true }
  ],
  // 士林站
  'shilin': [
    { exit: 1, lat: 25.09411, lng: 121.526, accessible: true },
    { exit: 2, lat: 25.09286, lng: 121.5264, accessible: true }
  ],
  // 芝山站
  'zhishan': [
    { exit: 1, lat: 25.10205, lng: 121.5226, accessible: true },
    { exit: 2, lat: 25.10384, lng: 121.5223, accessible: true }
  ],
  // 明德站
  'mingde': [
    { exit: 1, lat: 25.1093, lng: 121.5192, accessible: true },
    { exit: 2, lat: 25.11001, lng: 121.5187, accessible: true },
    { exit: 3, lat: 25.10996, lng: 121.5185, accessible: true }
  ],
  // 石牌站
  'shipai': [
    { exit: 1, lat: 25.11496, lng: 121.5153, accessible: true },
    { exit: 2, lat: 25.11352, lng: 121.5163, accessible: true }
  ],
  // 唭哩岸站
  'qilian': [
    { exit: 1, lat: 25.12071, lng: 121.5069, accessible: true },
    { exit: 2, lat: 25.12085, lng: 121.5059, accessible: true }
  ],
  // 奇岩站
  'qiyan': [
    { exit: 1, lat: 25.12612, lng: 121.501, accessible: true },
    { exit: 2, lat: 25.12502, lng: 121.5011, accessible: true },
    { exit: 3, lat: 25.12514, lng: 121.5013, accessible: true }
  ],
  // 北投站
  'beitou': [
    { exit: 1, lat: 25.13233, lng: 121.4981, accessible: true },
    { exit: 2, lat: 25.13103, lng: 121.4992, accessible: true }
  ],
  // 新北投站
  'xinbeitou': [
    { exit: 1, lat: 25.13697, lng: 121.5035, accessible: true },
    { exit: 2, lat: 25.13683, lng: 121.5025, accessible: false }
  ],
  // 復興崗站
  'fuxinggang': [
    { exit: 1, lat: 25.13767, lng: 121.4854, accessible: true },
    { exit: 2, lat: 25.13733, lng: 121.4851, accessible: true }
  ],
  // 忠義站
  'zhongyi': [
    { exit: 1, lat: 25.13106, lng: 121.4732, accessible: true },
    { exit: 2, lat: 25.13099, lng: 121.4736, accessible: true }
  ],
  // 關渡站
  'guandu': [
    { exit: 1, lat: 25.12543, lng: 121.4672, accessible: true },
    { exit: 2, lat: 25.12547, lng: 121.4669, accessible: true }
  ],
  // 竹圍站
  'zhuwei': [
    { exit: 1, lat: 25.13695, lng: 121.4597, accessible: true },
    { exit: 2, lat: 25.13685, lng: 121.4594, accessible: true }
  ],
  // 紅樹林站
  'hongshulin': [
    { exit: 1, lat: 25.1545, lng: 121.459, accessible: true },
    { exit: 2, lat: 25.1546, lng: 121.4587, accessible: false }
  ],
  // 淡水站
  'tamsui': [
    { exit: 1, lat: 25.16827, lng: 121.4455, accessible: true },
    { exit: 2, lat: 25.16776, lng: 121.4458, accessible: true },
    { exit: 3, lat: 25.1676, lng: 121.4456, accessible: false }
  ],
  // 象山站
  'xiangshan': [
    { exit: 1, lat: 25.03301, lng: 121.5693, accessible: true },
    { exit: 2, lat: 25.03238, lng: 121.5699, accessible: true },
    { exit: 3, lat: 25.03297, lng: 121.5706, accessible: false }
  ],
  // 台北101/世貿站
  'taipei101': [
    { exit: 1, lat: 25.03311, lng: 121.5617, accessible: false },
    { exit: 2, lat: 25.03284, lng: 121.5619, accessible: false },
    { exit: 3, lat: 25.03274, lng: 121.5636, accessible: true },
    { exit: 4, lat: 25.03303, lng: 121.5641, accessible: true },
    { exit: 5, lat: 25.0331, lng: 121.5633, accessible: true }
  ],
  // 信義安和站
  'xinyi': [
    { exit: 1, lat: 25.03338, lng: 121.5526, accessible: false },
    { exit: 2, lat: 25.03303, lng: 121.5523, accessible: false },
    { exit: '2A', lat: 25.03285, lng: 121.5526, accessible: true },
    { exit: 3, lat: 25.03302, lng: 121.5533, accessible: false },
    { exit: 4, lat: 25.03302, lng: 121.5534, accessible: false },
    { exit: 5, lat: 25.03333, lng: 121.5535, accessible: true }
  ],
  // 大安森林公園站
  'daan-park': [
    { exit: 1, lat: 25.03369, lng: 121.5344, accessible: false },
    { exit: 2, lat: 25.03339, lng: 121.5345, accessible: false },
    { exit: 3, lat: 25.0334, lng: 121.5349, accessible: false },
    { exit: 4, lat: 25.03339, lng: 121.5353, accessible: true },
    { exit: 5, lat: 25.03337, lng: 121.536, accessible: true },
    { exit: 6, lat: 25.03365, lng: 121.536, accessible: true }
  ],
  // 永寧站
  'yongning': [
    { exit: 1, lat: 24.96664, lng: 121.4356, accessible: true },
    { exit: 2, lat: 24.96602, lng: 121.4358, accessible: true },
    { exit: 3, lat: 24.96725, lng: 121.4371, accessible: false },
    { exit: 4, lat: 24.96754, lng: 121.4369, accessible: false }
  ],
  // 土城站
  'tucheng': [
    { exit: 1, lat: 24.97325, lng: 121.4442, accessible: true },
    { exit: 2, lat: 24.97266, lng: 121.4437, accessible: false },
    { exit: 3, lat: 24.97371, lng: 121.4453, accessible: false }
  ],
  // 海山站
  'haishan': [
    { exit: 1, lat: 24.98539, lng: 121.4486, accessible: false },
    { exit: 2, lat: 24.98533, lng: 121.4489, accessible: true },
    { exit: 3, lat: 24.9863, lng: 121.4492, accessible: false }
  ],
  // 府中站
  'fuzhong': [
    { exit: 1, lat: 25.00849, lng: 121.4591, accessible: true },
    { exit: 2, lat: 25.00894, lng: 121.4595, accessible: false },
    { exit: 3, lat: 25.00916, lng: 121.459, accessible: false }
  ],
  // 板橋站
  'banqiao': [
    { exit: 1, lat: 25.01331, lng: 121.4618, accessible: false },
    { exit: 2, lat: 25.01322, lng: 121.4626, accessible: false },
    { exit: 3, lat: 25.01444, lng: 121.4627, accessible: true }
  ],
  // 江子翠站
  'jiangzicui': [
    { exit: 1, lat: 25.0303, lng: 121.4719, accessible: false },
    { exit: 2, lat: 25.02978, lng: 121.4719, accessible: false },
    { exit: 3, lat: 25.02946, lng: 121.4722, accessible: true },
    { exit: 4, lat: 25.02976, lng: 121.4727, accessible: false },
    { exit: 5, lat: 25.03099, lng: 121.4734, accessible: false },
    { exit: 6, lat: 25.03121, lng: 121.4731, accessible: false }
  ],
  // 龍山寺站
  'longshan-temple': [
    { exit: 1, lat: 25.03548, lng: 121.4995, accessible: true },
    { exit: 2, lat: 25.03511, lng: 121.4998, accessible: false },
    { exit: 3, lat: 25.03542, lng: 121.5016, accessible: false }
  ],
  // 西門站
  'ximen': [
    { exit: 1, lat: 25.04214, lng: 121.5076, accessible: false },
    { exit: 2, lat: 25.04155, lng: 121.5084, accessible: false },
    { exit: 3, lat: 25.04179, lng: 121.5089, accessible: false },
    { exit: 4, lat: 25.0422, lng: 121.509, accessible: true },
    { exit: 5, lat: 25.04294, lng: 121.5088, accessible: false },
    { exit: 6, lat: 25.04257, lng: 121.5076, accessible: true }
  ],
  // 善導寺站
  'shanxi': [
    { exit: 1, lat: 25.0451, lng: 121.523, accessible: false },
    { exit: 2, lat: 25.0448, lng: 121.5231, accessible: false },
    { exit: 3, lat: 25.04457, lng: 121.5237, accessible: true },
    { exit: 4, lat: 25.04411, lng: 121.5242, accessible: false },
    { exit: 5, lat: 25.04426, lng: 121.5248, accessible: false },
    { exit: 6, lat: 25.04463, lng: 121.5249, accessible: false }
  ],
  // 忠孝新生站
  'zhongxiao-xinsheng': [
    { exit: 1, lat: 25.04278, lng: 121.5318, accessible: false },
    { exit: 2, lat: 25.0421, lng: 121.5321, accessible: true },
    { exit: 3, lat: 25.04178, lng: 121.5337, accessible: true },
    { exit: 4, lat: 25.04246, lng: 121.5332, accessible: false },
    { exit: 5, lat: 25.04104, lng: 121.5324, accessible: false },
    { exit: 6, lat: 25.04079, lng: 121.5331, accessible: false },
    { exit: 7, lat: 25.04173, lng: 121.5331, accessible: false }
  ],
  // 忠孝敦化站
  'zhongxiao-dunhua': [
    { exit: 1, lat: 25.04164, lng: 121.5506, accessible: false },
    { exit: 2, lat: 25.04163, lng: 121.5517, accessible: true },
    { exit: 3, lat: 25.04134, lng: 121.5516, accessible: false },
    { exit: 4, lat: 25.04135, lng: 121.5506, accessible: false },
    { exit: 5, lat: 25.04124, lng: 121.5498, accessible: false },
    { exit: 6, lat: 25.04103, lng: 121.5492, accessible: false },
    { exit: 7, lat: 25.04166, lng: 121.5499, accessible: false },
    { exit: 8, lat: 25.04193, lng: 121.5492, accessible: false }
  ],
  // 國父紀念館站
  'sun-yat-sen-memorial-hall': [
    { exit: 1, lat: 25.04184, lng: 121.5567, accessible: false },
    { exit: 2, lat: 25.04103, lng: 121.5567, accessible: false },
    { exit: 3, lat: 25.0412, lng: 121.558, accessible: false },
    { exit: 4, lat: 25.04117, lng: 121.5585, accessible: true },
    { exit: 5, lat: 25.0415, lng: 121.558, accessible: true }
  ],
  // 永春站
  'yongchun': [
    { exit: 1, lat: 25.041, lng: 121.5751, accessible: false },
    { exit: 2, lat: 25.0407, lng: 121.5754, accessible: false },
    { exit: 3, lat: 25.0407, lng: 121.5762, accessible: false },
    { exit: 4, lat: 25.0407, lng: 121.5766, accessible: false },
    { exit: 5, lat: 25.04096, lng: 121.5766, accessible: true }
  ],
  // 後山埤站
  'houshanpi': [
    { exit: 1, lat: 25.04442, lng: 121.5814, accessible: false },
    { exit: 2, lat: 25.0437, lng: 121.5819, accessible: false },
    { exit: 3, lat: 25.04523, lng: 121.5833, accessible: true },
    { exit: 4, lat: 25.04565, lng: 121.5824, accessible: false }
  ],
  // 昆陽站
  'kunyang': [
    { exit: 1, lat: 25.05032, lng: 121.5927, accessible: true },
    { exit: 2, lat: 25.0504, lng: 121.5928, accessible: false },
    { exit: 3, lat: 25.0506, lng: 121.5936, accessible: false },
    { exit: 4, lat: 25.05057, lng: 121.5938, accessible: true }
  ],
  // 南港站
  'nangang': [
    { exit: 1, lat: 25.05191, lng: 121.6064, accessible: false },
    { exit: 2, lat: 25.05203, lng: 121.6074, accessible: true }
  ],
  // 南港展覽館站
  'nangang-exhibition': [
    { exit: 1, lat: 25.05578, lng: 121.6171, accessible: true },
    { exit: 2, lat: 25.05541, lng: 121.6172, accessible: true },
    { exit: 3, lat: 25.05512, lng: 121.6182, accessible: true },
    { exit: 4, lat: 25.05536, lng: 121.6183, accessible: true },
    { exit: '2A', lat: 25.05534, lng: 121.6172, accessible: true },
    { exit: 5, lat: 25.05492, lng: 121.6169, accessible: true },
    { exit: 6, lat: 25.05476, lng: 121.6179, accessible: false },
    { exit: 7, lat: 25.05404, lng: 121.6181, accessible: false }
  ],
  // 松山站
  'songshan': [
    { exit: 1, lat: 25.05017, lng: 121.577, accessible: false },
    { exit: 2, lat: 25.05017, lng: 121.5762, accessible: false },
    { exit: 3, lat: 25.04994, lng: 121.5775, accessible: true },
    { exit: 4, lat: 25.0498, lng: 121.578, accessible: false },
    { exit: 5, lat: 25.05056, lng: 121.5778, accessible: true }
  ],
  // 南京三民站
  'nanjing-sanmin': [
    { exit: 1, lat: 25.05163, lng: 121.5632, accessible: true },
    { exit: 2, lat: 25.05122, lng: 121.5631, accessible: true },
    { exit: 3, lat: 25.05133, lng: 121.5646, accessible: false },
    { exit: 4, lat: 25.05159, lng: 121.5647, accessible: false }
  ],
  // 台北小巨蛋站
  'taipei-arena': [
    { exit: 1, lat: 25.05184, lng: 121.5515, accessible: true },
    { exit: 2, lat: 25.05157, lng: 121.5507, accessible: true },
    { exit: 3, lat: 25.05152, lng: 121.5525, accessible: true },
    { exit: 4, lat: 25.05153, lng: 121.5529, accessible: false },
    { exit: 5, lat: 25.05184, lng: 121.5521, accessible: false }
  ],
  // 南京復興站
  'nanjing-fuxing': [
    { exit: 1, lat: 25.05263, lng: 121.5421, accessible: true },
    { exit: 2, lat: 25.05175, lng: 121.5419, accessible: true },
    { exit: 3, lat: 25.05178, lng: 121.5431, accessible: false },
    { exit: 4, lat: 25.05178, lng: 121.5432, accessible: false },
    { exit: 5, lat: 25.05173, lng: 121.5443, accessible: false },
    { exit: 6, lat: 25.05195, lng: 121.5449, accessible: false },
    { exit: 7, lat: 25.05249, lng: 121.5446, accessible: true },
    { exit: 8, lat: 25.05202, lng: 121.5438, accessible: false }
  ],
  // 松江南京站
  'songjiang-nanjing': [
    { exit: 1, lat: 25.05184, lng: 121.5324, accessible: true },
    { exit: 2, lat: 25.05134, lng: 121.5329, accessible: true },
    { exit: 3, lat: 25.05109, lng: 121.5329, accessible: false },
    { exit: 4, lat: 25.05162, lng: 121.5332, accessible: false },
    { exit: 5, lat: 25.05188, lng: 121.5341, accessible: false },
    { exit: 6, lat: 25.05221, lng: 121.5338, accessible: false },
    { exit: 7, lat: 25.05247, lng: 121.5332, accessible: false },
    { exit: 8, lat: 25.05257, lng: 121.5328, accessible: true }
  ],
  // 中山站
  'zhongshan': [
    { exit: 1, lat: 25.05241, lng: 121.5203, accessible: false },
    { exit: 2, lat: 25.05238, lng: 121.5211, accessible: false },
    { exit: 3, lat: 25.05261, lng: 121.5212, accessible: false },
    { exit: 4, lat: 25.05286, lng: 121.5203, accessible: true },
    { exit: 5, lat: 25.05304, lng: 121.5193, accessible: true },
    { exit: 6, lat: 25.05283, lng: 121.519, accessible: true }
  ],
  // 北門站
  'beimen': [
    { exit: 1, lat: 25.04886, lng: 121.51, accessible: false },
    { exit: 2, lat: 25.04958, lng: 121.5105, accessible: true },
    { exit: 3, lat: 25.04994, lng: 121.5102, accessible: true }
  ],
  // 東門站
  'dongmen': [
    { exit: 1, lat: 25.03416, lng: 121.528, accessible: false },
    { exit: 2, lat: 25.03422, lng: 121.5276, accessible: false },
    { exit: 3, lat: 25.03368, lng: 121.5279, accessible: false },
    { exit: 4, lat: 25.03365, lng: 121.5289, accessible: false },
    { exit: 5, lat: 25.03356, lng: 121.5295, accessible: false },
    { exit: 6, lat: 25.03392, lng: 121.53, accessible: false },
    { exit: 7, lat: 25.03396, lng: 121.5297, accessible: false },
    { exit: 8, lat: 25.03407, lng: 121.529, accessible: true }
  ],
  // 行天宮站
  'xingtian': [
    { exit: 1, lat: 25.0581, lng: 121.533, accessible: false },
    { exit: 2, lat: 25.05879, lng: 121.5333, accessible: true },
    { exit: 3, lat: 25.05987, lng: 121.5334, accessible: false },
    { exit: 4, lat: 25.06037, lng: 121.533, accessible: false }
  ],
  // 中山國小站
  'zhongshan-guoxiao': [
    { exit: 1, lat: 25.06284, lng: 121.5261, accessible: false },
    { exit: 2, lat: 25.06246, lng: 121.5261, accessible: false },
    { exit: 3, lat: 25.06248, lng: 121.5271, accessible: false },
    { exit: 4, lat: 25.06284, lng: 121.5268, accessible: true }
  ],
  // 民權西路站
  'minquan-w-rd': [
    { exit: 1, lat: 25.06264, lng: 121.5195, accessible: true },
    { exit: 2, lat: 25.06185, lng: 121.5196, accessible: false },
    { exit: 3, lat: 25.0617, lng: 121.5198, accessible: false },
    { exit: 4, lat: 25.06194, lng: 121.5199, accessible: false },
    { exit: 5, lat: 25.06324, lng: 121.5188, accessible: false },
    { exit: 6, lat: 25.06274, lng: 121.5189, accessible: false },
    { exit: 7, lat: 25.0627, lng: 121.5202, accessible: false },
    { exit: 8, lat: 25.06269, lng: 121.5206, accessible: false },
    { exit: 9, lat: 25.06295, lng: 121.5206, accessible: false },
    { exit: 10, lat: 25.06297, lng: 121.5201, accessible: true }
  ],
  // 大橋頭站
  'daqiaotou': [
    { exit: 1, lat: 25.06318, lng: 121.5123, accessible: true },
    { exit: '1A', lat: 25.06333, lng: 121.5117, accessible: false },
    { exit: 2, lat: 25.0632, lng: 121.5133, accessible: false },
    { exit: 3, lat: 25.06374, lng: 121.5134, accessible: false }
  ],
  // 三重國小站
  'sanchong-guoxiao': [
    { exit: 0, lat: 25.07065, lng: 121.4967, accessible: true }
  ],
  // 三和國中站
  'sanhe-junior': [
    { exit: 1, lat: 25.07659, lng: 121.4864, accessible: true },
    { exit: 2, lat: 25.07698, lng: 121.4865, accessible: false }
  ],
  // 徐匯中學站
  'xuzhouzai': [
    { exit: 1, lat: 25.0803, lng: 121.4799, accessible: false },
    { exit: 2, lat: 25.08033, lng: 121.4806, accessible: true }
  ],
  // 三重站
  'sanchong': [
    { exit: 1, lat: 25.05535, lng: 121.4833, accessible: true },
    { exit: 2, lat: 25.05562, lng: 121.4845, accessible: false },
    { exit: 3, lat: 25.05613, lng: 121.485, accessible: false }
  ],
  // 菜寮站
  'cailiao': [
    { exit: 1, lat: 25.05971, lng: 121.4907, accessible: false },
    { exit: 2, lat: 25.05929, lng: 121.4911, accessible: true },
    { exit: 3, lat: 25.06056, lng: 121.4921, accessible: false }
  ],
  // 台北橋站
  'taiyuan': [
    { exit: 0, lat: 25.06297, lng: 121.5003, accessible: true }
  ],
  // 新莊站
  'xinzhuang': [
    { exit: 1, lat: 25.0363, lng: 121.4524, accessible: true },
    { exit: 2, lat: 25.03601, lng: 121.4525, accessible: true }
  ],
  // 頭前庄站
  'fuying': [
    { exit: 1, lat: 25.03984, lng: 121.4603, accessible: true },
    { exit: 2, lat: 25.03907, lng: 121.4609, accessible: false },
    { exit: 3, lat: 25.03985, lng: 121.4622, accessible: false },
    { exit: 4, lat: 25.04026, lng: 121.4623, accessible: false }
  ],
  // 先嗇宮站
  'danfeng': [
    { exit: 1, lat: 25.0465, lng: 121.4713, accessible: true },
    { exit: 2, lat: 25.04608, lng: 121.4712, accessible: false },
    { exit: 3, lat: 25.0463, lng: 121.4718, accessible: false }
  ],
  // 迴龍站
  'huilong': [
    { exit: 1, lat: 25.02183, lng: 121.4112, accessible: true },
    { exit: 2, lat: 25.02118, lng: 121.4108, accessible: false },
    { exit: 3, lat: 25.02254, lng: 121.4126, accessible: false }
  ],
  // 丹鳳站
  'touqianzhuang': [
    { exit: 1, lat: 25.02899, lng: 121.4223, accessible: false },
    { exit: 2, lat: 25.02874, lng: 121.4226, accessible: true }
  ],
  // 輔大站
  'xianshegong': [
    { exit: 1, lat: 25.03293, lng: 121.4353, accessible: true },
    { exit: 2, lat: 25.03232, lng: 121.4353, accessible: true },
    { exit: 3, lat: 25.03278, lng: 121.4365, accessible: false },
    { exit: 4, lat: 25.03302, lng: 121.4365, accessible: false }
  ],
  // 蘆洲站
  'luzhou': [
    { exit: 1, lat: 25.09133, lng: 121.4647, accessible: false },
    { exit: 2, lat: 25.09171, lng: 121.4649, accessible: true },
    { exit: 3, lat: 25.09187, lng: 121.4643, accessible: false }
  ],
  // 三民高中站
  'sanmin-high-school': [
    { exit: 1, lat: 25.08569, lng: 121.4727, accessible: true },
    { exit: 2, lat: 25.08564, lng: 121.4735, accessible: false }
  ],
  // 幸福站
  'xingfu': [
    { exit: 1, lat: 25.05013, lng: 121.4601, accessible: true },
    { exit: 2, lat: 25.04976, lng: 121.4602, accessible: false }
  ],
  // 新北產業園區站
  'xinbei-industrial-park': [
    { exit: 0, lat: 25.06156, lng: 121.4598, accessible: true }
  ],
  // 十四張站
  'shisizhang': [
    { exit: 0, lat: 24.98447, lng: 121.5277, accessible: true }
  ],
  // 秀朗橋站
  'xiulang': [
    { exit: 1, lat: 24.99053, lng: 121.5254, accessible: false },
    { exit: 2, lat: 24.99054, lng: 121.5249, accessible: true }
  ],
  // 景平站
  'jingping': [
    { exit: 0, lat: 24.99193, lng: 121.5163, accessible: true }
  ],
  // 中和站
  'zhonghe': [
    { exit: 0, lat: 25.00221, lng: 121.4965, accessible: true }
  ],
  // 橋和站
  'qiaohe': [
    { exit: 0, lat: 25.0048, lng: 121.4903, accessible: true }
  ],
  // 中原站
  'zhongyuan': [
    { exit: 0, lat: 25.00841, lng: 121.4842, accessible: true }
  ],
  // 板新站
  'banxin': [
    { exit: 0, lat: 25.01449, lng: 121.4722, accessible: true }
  ],
  // 新埔民生站
  'xinpu-minsheng': [
    { exit: 0, lat: 25.02613, lng: 121.4668, accessible: true }
  ],
  // 內湖展覽館站
  'neihu-exhibition-hall': [
    { exit: 1, lat: 25.08389, lng: 121.6024, accessible: true },
    { exit: 2, lat: 25.08368, lng: 121.6022, accessible: true }
  ]
};

// 景點數據
const STATION_ATTRACTIONS = {
  // 象山站
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
  ],
  // 動物園站
  'taipei-zoo': [
    {
      name: '老泉街杏花季',
      lat: 24.96834,
      lng: 121.57546
    },
    {
      name: '政大櫻花季',
      lat: 24.98742,
      lng: 121.576504
    }
  ],
  // 石牌站
  'shipai': [
    {
      name: '十八份產業道路-櫻花登山步道',
      lat: 25.15453,
      lng: 121.52648
    }
  ],
  // 南港展覽館站
  'nangang-exhibition-hall': [
    {
      name: '康誥坑溪櫻花大道',
      lat: 25.06015,
      lng: 121.654106
    }
  ],
  // 淡水站
  'tamsui': [
    {
      name: '天元宮櫻花季',
      lat: 25.18639,
      lng: 121.484744
    }
  ],
  // 中正紀念堂站
  'chks': [
    {
      name: '原生櫻花區',
      lat: 25.03475,
      lng: 121.521534
    },
    {
      name: '梅花',
      lat: 25.03475,
      lng: 121.521534
    }
  ],
  // 新北投站
  'xinbeitou': [
    {
      name: '三層崎花海',
      lat: 25.14454,
      lng: 121.491845
    },
    {
      name: '七虎公園',
      lat: 25.13634,
      lng: 121.501382
    }
  ],
  // 公館站
  'gongguan': [
    {
      name: '杜鵑花',
      lat: 25.01698,
      lng: 121.5337
    },
    {
      name: '流蘇花(四月雪)',
      lat: 25.01698,
      lng: 121.5337
    },
    {
      name: '銀杏',
      lat: 25.01698,
      lng: 121.5337
    }
  ],
  // 台大醫院站
  'taida': [
    {
      name: '杜鵑花',
      lat: 25.04028,
      lng: 121.515587
    },
    {
      name: '流蘇花(四月雪)',
      lat: 25.04028,
      lng: 121.515587
    },
    {
      name: '櫻花',
      lat: 25.04028,
      lng: 121.515587
    },
    {
      name: '二二八和平公園',
      lat: 25.04028,
      lng: 121.515587
    }
  ],
  // 大安森林公園站
  'daan-park': [
    {
      name: '杜鵑花、繡球花',
      lat: 25.03015,
      lng: 121.535351
    },
    {
      name: '流蘇花(四月雪)',
      lat: 25.03015,
      lng: 121.535351
    },
    {
      name: '楓葉',
      lat: 25.03015,
      lng: 121.535351
    },
    {
      name: '美人樹',
      lat: 25.03015,
      lng: 121.535351
    },
    {
      name: '落羽松',
      lat: 25.03015,
      lng: 121.535351
    },
    {
      name: '梅花',
      lat: 25.03015,
      lng: 121.535351
    },
    {
      name: '櫻花',
      lat: 25.03015,
      lng: 121.535351
    },
    {
      name: '大安森林公園',
      lat: 25.03332,
      lng: 121.536285
    }
  ],
  // 圓山站
  'yuanshan': [
    {
      name: '炮仗花瀑廊道',
      lat: 25.07036,
      lng: 121.520497
    },
    {
      name: '臺北典藏植物園銀杏',
      lat: 25.0712,
      lng: 121.531913
    }
  ],
  // 劍潭站
  'jiantan': [
    {
      name: '陽明山花季',
      lat: 25.15958,
      lng: 121.539778
    },
    {
      name: '君子蘭展',
      lat: 25.13503,
      lng: 121.544066
    },
    {
      name: '孤挺花展',
      lat: 25.13503,
      lng: 121.544066
    },
    {
      name: '紫藤',
      lat: 25.15171,
      lng: 121.545696
    },
    {
      name: '楓葉',
      lat: 25.14231,
      lng: 121.570672
    },
    {
      name: '銀杏',
      lat: 25.13503,
      lng: 121.544066
    },
    {
      name: '落羽松',
      lat: 25.1656,
      lng: 121.563927
    },
    {
      name: '梅花',
      lat: 25.13503,
      lng: 121.544066
    },
    {
      name: '台北茶花展',
      lat: 25.13503,
      lng: 121.544066
    }
  ],
  // 士林站
  'shilin': [
    {
      name: '鬱金香展',
      lat: 25.09459,
      lng: 121.530248
    },
    {
      name: '玫瑰花',
      lat: 25.09459,
      lng: 121.530248
    },
    {
      name: '士林官邸菊展',
      lat: 25.09459,
      lng: 121.530248
    },
    {
      name: '梅花',
      lat: 25.10037,
      lng: 121.549499
    },
    {
      name: '櫻花',
      lat: 25.10037,
      lng: 121.549499
    }
  ],
  // 中山國小站
  'zhongshan-guoxiao': [
    {
      name: '臺北玫瑰展',
      lat: 25.07023,
      lng: 121.528778
    },
    {
      name: '晴光公園',
      lat: 25.0644,
      lng: 121.52424
    }
  ],
  // 文德站
  'wende': [
    {
      name: '流蘇花(四月雪)',
      lat: 25.08117,
      lng: 121.585794
    },
    {
      name: '落羽松',
      lat: 25.08117,
      lng: 121.585794
    }
  ],
  // 松山站
  'songshan': [
    {
      name: '流蘇花(四月雪)',
      lat: 25.05705,
      lng: 121.58223
    },
    {
      name: '成美右岸河濱公園',
      lat: 25.05476,
      lng: 121.582173
    }
  ],
  // 永寧站
  'yongning': [
    {
      name: '桐花(五月雪)',
      lat: 24.9442,
      lng: 121.449614
    },
    {
      name: '美人樹',
      lat: 24.94513,
      lng: 121.373159
    },
    {
      name: '台灣欒樹',
      lat: 24.94513,
      lng: 121.373159
    }
  ],
  // 台電大樓站
  'taipower': [
    {
      name: '台電加羅林魚木',
      lat: 25.01921,
      lng: 121.531774
    }
  ],
  // 大直站
  'dazhi': [
    {
      name: '大佳河濱公園花海(向日葵)',
      lat: 25.07175,
      lng: 121.530364
    },
    {
      name: '永直公園',
      lat: 25.08178,
      lng: 121.550561
    }
  ],
  // 東湖站
  'dong-hu': [
    {
      name: '拱北殿楓葉',
      lat: 25.09437,
      lng: 121.64189
    }
  ],
  // 關渡站
  'guandu': [
    {
      name: '台灣欒樹',
      lat: 25.16058,
      lng: 121.430311
    }
  ],
  // 奇岩站
  'qiyan': [
    {
      name: '美人樹',
      lat: 25.12704,
      lng: 121.503206
    },
    {
      name: '落羽松',
      lat: 25.12283,
      lng: 121.495895
    },
    {
      name: '梅花',
      lat: 25.12704,
      lng: 121.503206
    }
  ],
  // 江子翠站
  'jiangzicui': [
    {
      name: '美人樹',
      lat: 25.02776,
      lng: 121.479786
    },
    {
      name: '音樂公園',
      lat: 25.02776,
      lng: 121.479786
    }
  ],
  // 中山站
  'zhongshan': [
    {
      name: '美人樹',
      lat: 25.05186,
      lng: 121.525727
    }
  ],
  // 小南門站
  'xiaonanmen': [
    {
      name: '台灣欒樹',
      lat: 25.03105,
      lng: 121.510452
    },
    {
      name: '風鈴木',
      lat: 25.03105,
      lng: 121.510452
    }
  ],
  // 永安市場站
  'yongan': [
    {
      name: '台灣欒樹',
      lat: 25.00345,
      lng: 121.513509
    },
    {
      name: '佳和公園',
      lat: 25.0049,
      lng: 121.503203
    }
  ],
  // 昆陽站
  'kunyang': [
    {
      name: '台灣欒樹',
      lat: 25.04577,
      lng: 121.591241
    },
    {
      name: '南港公園',
      lat: 25.04577,
      lng: 121.591241
    },
    {
      name: '新新公園',
      lat: 25.05174,
      lng: 121.590519
    }
  ],
  // 大湖公園站
  'da-hu-park': [
    {
      name: '落羽松',
      lat: 25.08283,
      lng: 121.603982
    }
  ],
  // 龍山寺站
  'longshan-temple': [
    {
      name: '梅花',
      lat: 25.02208,
      lng: 121.506975
    }
  ],
  // 台北車站
  'taipei-main-station': [
    {
      name: '梅花',
      lat: 25.04766,
      lng: 121.520106
    }
  ],
  // 行天宮站
  'xingtian': [
    {
      name: '梅花',
      lat: 25.06214,
      lng: 121.537921
    }
  ],
  // 十四張站
  'shisizhang': [
    {
      name: '陽光運動公園櫻花步道',
      lat: 24.97564,
      lng: 121.519909
    }
  ],
  // 景安站
  'jingan': [
    {
      name: '錦和運動公園',
      lat: 24.99259,
      lng: 121.490405
    }
  ],
  // 菜寮站
  'cailiao': [
    {
      name: '大智公園',
      lat: 25.06373,
      lng: 121.494891
    }
  ],
  // 新莊站
  'xinzhuang': [
    {
      name: '新莊體育園區遊戲場(網球場側/棒壘球場側/田徑場側)',
      lat: 25.0405,
      lng: 121.451989
    }
  ],
  // 三重國小站
  'sanchong-guoxiao': [
    {
      name: '三德公園',
      lat: 25.07512,
      lng: 121.501136
    },
    {
      name: '龍濱公園',
      lat: 25.0729,
      lng: 121.502292
    },
    {
      name: '厚德公園',
      lat: 25.07262,
      lng: 121.491406
    },
    {
      name: '六合公園',
      lat: 25.06942,
      lng: 121.488349
    }
  ],
  // 三和國中站
  'sanhe-junior': [
    {
      name: '永盛公園',
      lat: 25.07573,
      lng: 121.484838
    },
    {
      name: '228和平公園',
      lat: 25.07151,
      lng: 121.485966
    },
    {
      name: '後竹圍公園',
      lat: 25.07264,
      lng: 121.485967
    }
  ],
  // 徐匯中學站
  'xuzhouzai': [
    {
      name: '慈愛公園',
      lat: 25.08068,
      lng: 121.485111
    },
    {
      name: '九三親子公園',
      lat: 25.08331,
      lng: 121.478977
    }
  ],
  // 蘆洲站
  'luzhou': [
    {
      name: '環河公園',
      lat: 25.09692,
      lng: 121.461558
    },
    {
      name: '永康公園',
      lat: 25.08427,
      lng: 121.458547
    }
  ],
  // 海山站
  'haishan': [
    {
      name: '裕民廣場',
      lat: 24.98516,
      lng: 121.453414
    }
  ],
  // 板橋站
  'banqiao': [
    {
      name: '海山路遊戲場',
      lat: 25.01059,
      lng: 121.469292
    }
  ],
  // 新埔站
  'xinpu': [
    {
      name: '莊敬公園',
      lat: 25.01971,
      lng: 121.470778
    }
  ],
  // 後山埤站
  'houshanpi': [
    {
      name: '玉成公園',
      lat: 25.04186,
      lng: 121.58575
    },
    {
      name: '百福公園',
      lat: 25.03897,
      lng: 121.58847
    }
  ],
  // 芝山站
  'zhishan': [
    {
      name: '天母夢想樂園',
      lat: 25.11355,
      lng: 121.532816
    }
  ],
  // 紅樹林站
  'hongshulin': [
    {
      name: '溜溜帽遊樂場',
      lat: 25.1821,
      lng: 121.41549
    }
  ],
  // 新店區公所站
  'xindian-district-office': [
    {
      name: '馬公公園',
      lat: 24.96814,
      lng: 121.542372
    },
    {
      name: '?公公園',
      lat: 24.96993,
      lng: 121.542486
    }
  ],
  // 古亭站
  'guting': [
    {
      name: '牯嶺公園',
      lat: 25.02306,
      lng: 121.519148
    }
  ],
  // 北門站
  'beimen': [
    {
      name: '大稻埕公園',
      lat: 25.05832,
      lng: 121.510733
    }
  ]
};

// 選擇狀態
let selectedExit = null;
let selectedAttraction = null;

// 多語言字典
const i18nDict = {
  zh: {
    title: "低暴露導航系統 <span class=\"beta-text\">(雙北測試版)</span>",
    startLabel: "🟢 起點地址",
    endLabel: "🔴 終點地址", 
    startPlaceholderWithIcon: "🟢 輸入起點地址 / 地標",
    endPlaceholderWithIcon: "🔴 輸入終點地址 / 地標",
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
    modeNavigation: "導航模式",
    modeMetro: "捷運模式",
    helpBtn: "關於我們 | 說明",
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
    // 按鈕翻譯
    locate: "定位",
        startPoint: "起點",
        endPoint: "終點",
        improvementBenefit: "改善效益",
        distanceIncrease: "距離增加",
    // 使用說明翻譯
    helpTitle: "關於我們 | 使用說明",
    navigationFunctionOverview: "🎯 功能概述",
    navigationFunctionDesc: "導航模式可以為您規劃兩條路徑：最短路徑和低暴露路徑，幫助您在時間和健康之間做出最佳選擇。",
    navigationSetPoints: "📍 設定起終點",
    navigationMethod1: "方法一：",
    navigationMethod1Desc: "在地圖上點擊設定起點和終點",
    navigationMethod2: "方法二：",
    navigationMethod2Desc: "在輸入框中輸入地址，系統會自動定位",
    navigationTransportMode: "🚗 選擇交通方式",
    navigationTransportDesc: "支援機車、腳踏車、步行三種交通方式，系統會根據不同方式計算相應的通行時間。",
    navigationDistanceLimit: "📏 距離限制功能",
    navigationDistanceLimitDesc: "開啟後可設定低暴露路徑的最大額外距離，避免繞路過遠。",
    navigationResultInterpretation: "📊 結果解讀",
    navigationShortestPath: "最短路徑：",
    navigationShortestPathDesc: "距離最短的路線（藍色實線）",
    navigationLowExposurePath: "低暴露路徑：",
    navigationLowExposurePathDesc: "空氣污染暴露最低的路線（綠色虛線）",
    navigationExposureReduction: "暴露減少：",
    navigationExposureReductionDesc: "相比最短路徑減少的污染暴露量",
    navigationImprovementRate: "改善率：",
    navigationImprovementRateDesc: "空氣品質改善的百分比",
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
    startPlaceholderWithIcon: "🟢 Enter start address / landmark",
    endPlaceholderWithIcon: "🔴 Enter end address / landmark",
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
    modeNavigation: "Navigation Mode",
    modeMetro: "Metro Mode",
    helpBtn: "About Us | Help",
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
    // Button translations
    locate: "Locate",
        startPoint: "Start",
        endPoint: "End",
        improvementBenefit: "Improvement Benefit",
        distanceIncrease: "Distance Increase",
    // Help content translations
    helpTitle: "About Us | Usage Instructions",
    navigationFunctionOverview: "🎯 Function Overview",
    navigationFunctionDesc: "Navigation mode plans two routes for you: shortest path and low exposure path, helping you make the best choice between time and health.",
    navigationSetPoints: "📍 Set Start/End Points",
    navigationMethod1: "Method 1:",
    navigationMethod1Desc: "Click on the map to set start and end points",
    navigationMethod2: "Method 2:",
    navigationMethod2Desc: "Enter addresses in input boxes, the system will automatically locate them",
    navigationTransportMode: "🚗 Select Transport Mode",
    navigationTransportDesc: "Supports motorcycle, bicycle, and walking modes. The system calculates corresponding travel time based on the selected mode.",
    navigationDistanceLimit: "📏 Distance Limit Feature",
    navigationDistanceLimitDesc: "When enabled, you can set the maximum additional distance for the low exposure path to avoid excessive detours.",
    navigationResultInterpretation: "📊 Result Interpretation",
    navigationShortestPath: "Shortest Path:",
    navigationShortestPathDesc: "The shortest distance route (blue solid line)",
    navigationLowExposurePath: "Low Exposure Path:",
    navigationLowExposurePathDesc: "The route with lowest air pollution exposure (green dashed line)",
    navigationExposureReduction: "Exposure Reduction:",
    navigationExposureReductionDesc: "Reduced pollution exposure compared to the shortest path",
    navigationImprovementRate: "Improvement Rate:",
    navigationImprovementRateDesc: "Percentage of air quality improvement",
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
    metroRoutePlanningDesc: "The system calculates shortest path and low exposure path from the selected exit to attractions, providing detailed distance, time, and air quality analysis.",
    // About Us modal content
    navigationHelpBtn: "Navigation Mode Instructions",
    metroHelpBtn: "Metro Mode Instructions",
    developmentTeam: "Development Team",
    developmentTeamDesc: "© 2025 Hsu Chia-Wei, Lin Yu-Ju | National Cheng Kung University, Department of Geomatics | Advisor: Professor Wu Chih-Ta",
    contactEmail: "📧 Contact: p68111509@gs.ncku.edu.tw",
    dataSource: "Data Source",
    dataSourceDesc: "Some air pollution spatial information refers to public data from the Ministry of Environment",
    copyright: "Copyright Statement",
    copyrightDesc1: "This system is for demonstration and research purposes only. Unauthorized downloading, modification, or commercial use is prohibited.",
    copyrightDesc2: "All source code, data, and interface design are the intellectual property of the authors, all rights reserved."
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
  
  // 嘗試根據 URL 參數自動啟動捷運模式並解算
  try {
    handleDeepLinkNavigation();
  } catch (e) {
    console.warn('[deeplink] failed to handle deep link:', e);
  }
  
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
  const fullscreenMap = document.getElementById('map');
  const routeComparisonBtn = document.getElementById('routeComparisonBtn');
  
  // 左側面板初始收起
  // leftPanel.classList.add('expanded');
  
  // 路徑比較按鈕初始禁用
  routeComparisonBtn.classList.add('disabled');
  
  // 設置地圖初始位置（面板收起狀態）
  if (fullscreenMap) {
    fullscreenMap.style.top = '120px'; // 80px (header) + 40px (handle)
  }
  
  // 更新路徑比較按鈕狀態
  updateRouteComparisonBtnState(false);
}

// 更新路徑比較按鈕狀態
function updateRouteComparisonBtnState(hasResults) {
  const routeComparisonBtn = document.getElementById('routeComparisonBtn');
  
  if (hasResults) {
    routeComparisonBtn.classList.remove('disabled');
    routeComparisonBtn.classList.add('available');
  } else {
    routeComparisonBtn.classList.add('disabled');
    routeComparisonBtn.classList.remove('available');
  }
}

// 路徑比較彈窗控制
function toggleRouteComparisonModal() {
  const routeComparisonBtn = document.getElementById('routeComparisonBtn');
  const modal = document.getElementById('routeComparisonModal');
  
  // 如果按鈕被禁用，不執行任何操作
  if (routeComparisonBtn.classList.contains('disabled')) {
    return;
  }
  
  const isShowing = modal.classList.contains('show');
  modal.classList.toggle('show');
  
  // 如果彈窗正在顯示，禁用導航設定和Header按鈕
  if (!isShowing) {
    disableNavigationSettings();
    disableHeaderButtons();
  } else {
    enableNavigationSettings();
    enableHeaderButtons();
  }
}

function closeRouteComparisonModal() {
  const modal = document.getElementById('routeComparisonModal');
  modal.classList.remove('show');
  enableNavigationSettings();
  enableHeaderButtons();
}

// 禁用導航設定
function disableNavigationSettings() {
  // 禁用輸入框
  const inputs = ['input-start', 'input-end', 'input-start-desktop', 'input-end-desktop'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.disabled = true;
      input.style.opacity = '0.5';
      input.style.cursor = 'not-allowed';
    }
  });
  
  // 禁用定位按鈕
  const locationBtns = document.querySelectorAll('.location-btn');
  locationBtns.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });
  
  // 禁用規劃路徑按鈕
  const planBtn = document.getElementById('planBtn');
  if (planBtn) {
    planBtn.disabled = true;
    planBtn.style.opacity = '0.5';
    planBtn.style.cursor = 'not-allowed';
  }
}

// 啟用導航設定
function enableNavigationSettings() {
  // 啟用輸入框
  const inputs = ['input-start', 'input-end', 'input-start-desktop', 'input-end-desktop'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.disabled = false;
      input.style.opacity = '1';
      input.style.cursor = 'text';
    }
  });
  
  // 啟用定位按鈕
  const locationBtns = document.querySelectorAll('.location-btn');
  locationBtns.forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  });
  
  // 啟用規劃路徑按鈕
  const planBtn = document.getElementById('planBtn');
  if (planBtn) {
    planBtn.disabled = false;
    planBtn.style.opacity = '1';
    planBtn.style.cursor = 'pointer';
  }
}

// 定位地址功能
function locateAddress(inputType) {
  let inputElement;
  
  // 根據輸入框類型選擇對應的元素
  switch(inputType) {
    case 'start':
      inputElement = document.getElementById('input-start');
      break;
    case 'end':
      inputElement = document.getElementById('input-end');
      break;
    case 'start-desktop':
      inputElement = document.getElementById('input-start-desktop');
      break;
    case 'end-desktop':
      inputElement = document.getElementById('input-end-desktop');
      break;
    default:
      console.error('Invalid input type:', inputType);
      return;
  }
  
  const address = inputElement.value.trim();
  
  if (!address) {
    showError('請先輸入地址');
    return;
  }
  
  // 顯示載入狀態
  const button = inputElement.nextElementSibling;
  const originalContent = button.innerHTML;
  button.innerHTML = '⏳';
  button.disabled = true;
  
  // 調用地理編碼API
  geocodeAddress(address)
    .then(result => {
      if (result && result.lat && result.lng) {
        // 在地圖上標記位置
        const latlng = [result.lat, result.lng];
        
        // 清除現有標記
        if (inputType === 'start' || inputType === 'start-desktop') {
          if (window.startMarker) {
            map.removeLayer(window.startMarker);
          }
          // 創建新的起點標記
          window.startMarker = L.marker(latlng, {
            icon: L.divIcon({
              className: 'custom-marker',
              html: '<div class="marker-icon start-marker">🟢</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            })
          }).addTo(map);
          
          // 更新起點坐標
          window.startCoords = latlng;
          nextPointIsStart = false; // 下一個點是終點
        } else {
          if (window.endMarker) {
            map.removeLayer(window.endMarker);
          }
          // 創建新的終點標記
          window.endMarker = L.marker(latlng, {
            icon: L.divIcon({
              className: 'custom-marker',
              html: '<div class="marker-icon end-marker">🔴</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            })
          }).addTo(map);
          
          // 更新終點坐標
          window.endCoords = latlng;
          nextPointIsStart = true; // 下一個點是起點
        }
        
        // 移動地圖視野到標記位置
        map.setView(latlng, Math.max(map.getZoom(), 15));
        
        // 更新坐標顯示
        updateCoordsDisplay();
        
        showSuccess(`地址定位成功：${result.formatted_address || address}`);
      } else {
        showError('無法找到該地址，請檢查地址是否正確');
      }
    })
    .catch(error => {
      console.error('Geocoding error:', error);
      showError('地址定位失敗，請稍後再試');
    })
    .finally(() => {
      // 恢復按鈕狀態
      button.innerHTML = originalContent;
      button.disabled = false;
    });
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
          if (window.map && typeof window.map.invalidateSize === 'function') {
          window.map.invalidateSize();
        }
        }, 300);
      }
    }
  });
  
  // 路徑比較彈窗事件綁定已通過HTML的onclick處理
  
  // 規劃路徑按鈕（浮動按鈕）
  const planBtnFloating = document.getElementById('plan-btn-floating');
  if (planBtnFloating) planBtnFloating.addEventListener('click', planRoutes);
  
  // 重製按鈕（浮動按鈕）
  const resetBtnFloating = document.getElementById('reset-btn-floating');
  if (resetBtnFloating) resetBtnFloating.addEventListener('click', resetAll);
  
  // 交通方式選擇（Radio 按鈕）
  const transportRadios = document.querySelectorAll('input[name="transport-mode"]');
  const transportRadiosDesktop = document.querySelectorAll('input[name="transport-mode-desktop"]');
  
  [...transportRadios, ...transportRadiosDesktop].forEach(radio => {
    radio.addEventListener('change', () => {
      if (window.lastRouteData) {
        renderTable(window.lastRouteData);
      }
    });
  });

  // 距離限制功能已移除
  
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
  bindCarbonStepsHelpEvents();
  
  // 改善率說明按鈕
  bindImprovementHelpEvents();
  
  
  // 捷運站事件
  bindMetroStationEvents();
  
  // 綁定身高滑桿即時更新
  const dashHeightSlider = document.getElementById('dashHeightSlider');
  if (dashHeightSlider) {
    dashHeightSlider.addEventListener('input', () => {
      if (window.lastRouteData) {
        const baseDistanceKm = (window.lastRouteData.data.lowest?.distance_km || window.lastRouteData.data.shortest?.distance_km || 0);
        updateStepsCard('dash', baseDistanceKm, getSliderValue('dashHeightSlider', 170));
      }
    });
  }
  const resultHeightSlider = document.getElementById('resultHeightSlider');
  if (resultHeightSlider) {
    resultHeightSlider.addEventListener('input', () => {
      if (window.lastRouteData) {
        const lr = window.lastRouteData;
        const d = lr?.data || lr; // 兼容兩種結構：{data,...} 或直接 data
        const baseDistanceKm = (d?.lowest?.distance_km || d?.shortest?.distance_km || 0);
        updateStepsCard('resultDash', baseDistanceKm, getSliderValue('resultHeightSlider', 170));
      }
    });
  }
  
  // 阻止地圖元件點擊事件傳播到地圖
  preventMapElementClickPropagation();
}

// 阻止地圖元件點擊事件傳播到地圖
function preventMapElementClickPropagation() {
  // 底圖樣式選單
  const tileSelector = document.querySelector('.map-tile-selector');
  if (tileSelector) {
    tileSelector.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  
  // 圖例
  const mapLegend = document.querySelector('.map-legend');
  if (mapLegend) {
    mapLegend.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  
  // 疊加圖層選擇器
  const overlaySelector = document.querySelector('.map-overlay-selector');
  if (overlaySelector) {
    overlaySelector.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

// 綁定輸入框事件
function bindInputEvents() {
  // 手機版輸入框
  const startInput = document.getElementById('input-start');
  const endInput = document.getElementById('input-end');
  
  // 桌面版輸入框
  const startInputDesktop = document.getElementById('input-start-desktop');
  const endInputDesktop = document.getElementById('input-end-desktop');
  
  // 綁定手機版輸入框事件
  if (startInput) {
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
  }
  
  if (endInput) {
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
  
  // 綁定桌面版輸入框事件
  if (startInputDesktop) {
    startInputDesktop.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        geocodeAndSetMarker(this.value, 'start');
      }
    });
    
    startInputDesktop.addEventListener('blur', function() {
      if (this.value.trim()) {
        geocodeAndSetMarker(this.value, 'start');
      }
    });
  }
  
  if (endInputDesktop) {
    endInputDesktop.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        geocodeAndSetMarker(this.value, 'end');
      }
    });
    
    endInputDesktop.addEventListener('blur', function() {
      if (this.value.trim()) {
        geocodeAndSetMarker(this.value, 'end');
      }
    });
  }
}

// 綁定語言事件
function bindLanguageEvents() {
  document.getElementById('btn-lang-zh').addEventListener('click', () => switchLanguage('zh'));
  document.getElementById('btn-lang-en').addEventListener('click', () => switchLanguage('en'));
}

// 綁定模式切換事件
function bindModeEvents() {
  document.getElementById('mode-navigation').addEventListener('click', () => {
    console.log('[debug] Navigation mode button clicked');
    switchMode('navigation');
  });
  document.getElementById('mode-metro').addEventListener('click', () => {
    console.log('[debug] Metro mode button clicked');
    switchMode('metro');
  });
}

// 模式切換
function switchMode(mode) {
  console.log(`[debug] switchMode called with mode: ${mode}`);
  
  const navigationBtn = document.getElementById('mode-navigation');
  const metroBtn = document.getElementById('mode-metro');
  const indicator = document.querySelector('.mode-indicator');
  const metroPanel = document.getElementById('metro-panel');
  const leftPanel = document.querySelector('.left-panel');
  const fullscreenMap = document.getElementById('map');
  
  console.log('[debug] Elements found:', {
    navigationBtn: !!navigationBtn,
    metroBtn: !!metroBtn,
    indicator: !!indicator,
    metroPanel: !!metroPanel,
    leftPanel: !!leftPanel,
    fullscreenMap: !!fullscreenMap
  });
  
  if (mode === 'navigation') {
    // 切換到導航模式
    navigationBtn.classList.add('active');
    metroBtn.classList.remove('active');
    indicator.style.transform = 'translateX(0)';
    
    // 顯示導航模式界面
    if (fullscreenMap) fullscreenMap.style.display = 'block';
    if (leftPanel) leftPanel.style.display = 'block';
    if (metroPanel) {
      metroPanel.style.display = 'none';
      metroPanel.classList.remove('active');
    }
    
    // 顯示導航模式的浮動按鈕
    const navButtonsGroup = document.querySelector('.nav-buttons-group');
    const routeComparisonBtn = document.getElementById('routeComparisonBtn');
    if (navButtonsGroup) navButtonsGroup.style.display = 'flex';
    if (routeComparisonBtn) routeComparisonBtn.style.display = 'flex';
    
    // 重新初始化地圖（如果需要）
    if (window.map) {
      setTimeout(() => {
        if (window.map && typeof window.map.invalidateSize === 'function') {
        window.map.invalidateSize();
        }
      }, 300);
    }
    
    console.log('[debug] Navigation mode activated');
    
  } else if (mode === 'metro') {
    // 切換到捷運模式
    metroBtn.classList.add('active');
    navigationBtn.classList.remove('active');
    indicator.style.transform = 'translateX(100%)';
    
    // 隱藏導航模式界面，顯示捷運模式
    if (fullscreenMap) fullscreenMap.style.display = 'none';
    if (leftPanel) leftPanel.style.display = 'none';
    if (metroPanel) {
      metroPanel.classList.add('active');
      metroPanel.style.display = 'block';
      console.log('[debug] Metro panel classes:', metroPanel.classList.toString());
      console.log('[debug] Metro panel style.display:', metroPanel.style.display);
      console.log('[debug] Metro panel computed style:', window.getComputedStyle(metroPanel).display);
    }
    
    // 隱藏導航模式的浮動按鈕
    const navButtonsGroup = document.querySelector('.nav-buttons-group');
    const routeComparisonBtn = document.getElementById('routeComparisonBtn');
    if (navButtonsGroup) navButtonsGroup.style.display = 'none';
    if (routeComparisonBtn) routeComparisonBtn.style.display = 'none';
    
    // 關閉路徑比較彈窗
    closeRouteComparisonModal();
    
    // 清除導航模式的數據（但不影響捷運模式）
    // resetAll();
    
    // 重新初始化捷運卡片（因為可能在面板隱藏時沒有綁定成功）
    setTimeout(() => {
      initMetroList();
    }, 100);
    
    console.log('[debug] Switched to metro mode, metro panel should be visible');
    
    // 顯示捷運模式提示彈窗
    showMetroModeInfo();
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
  console.log('bindOverlayEvents called');
  
  const overlayInputs = document.querySelectorAll('input[name="overlay"]');
  console.log('Found overlay inputs:', overlayInputs.length);
  
  if (overlayInputs.length === 0) {
    console.error('No overlay inputs found! Check HTML structure.');
    return;
  }
  
  overlayInputs.forEach((input, index) => {
    console.log(`Input ${index}:`, {
      value: input.value,
      checked: input.checked,
      element: input
    });
    
    input.addEventListener('change', function() {
      console.log('Overlay input changed:', this.value, 'checked:', this.checked);
      if (this.checked) {
        updateOverlay(this.value);
      }
    });
  });
  
  console.log('Overlay events bound successfully');
}

// 綁定幫助事件
function bindHelpEvents() {
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const closeBtn = document.getElementById('close-help');
  
  console.log('[debug] Help button elements:', { helpBtn, helpModal, closeBtn });
  
  // 使用說明按鈕事件
  if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => {
      console.log('[debug] Help button clicked');
      updateHelpContent();
      helpModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // 禁用模式切換按鈕和Header按鈕
      disableModeSwitching();
      disableHeaderButtons();
    });
  }
  
  
  if (closeBtn && helpModal) {
    closeBtn.addEventListener('click', () => {
      console.log('[debug] Help modal closed');
      helpModal.style.display = 'none';
      document.body.style.overflow = 'auto';
      
      // 重新啟用模式切換按鈕和Header按鈕
      enableModeSwitching();
      enableHeaderButtons();
    });
  }
  
  // 導航模式使用說明按鈕
  const navigationHelpBtn = document.getElementById('navigation-help-btn');
  if (navigationHelpBtn) {
    navigationHelpBtn.addEventListener('click', () => {
      console.log('[debug] Navigation help button clicked');
      showNavigationHelp();
    });
  }
  
  // 捷運模式使用說明按鈕
  const metroHelpBtn = document.getElementById('metro-help-btn');
  if (metroHelpBtn) {
    metroHelpBtn.addEventListener('click', () => {
      console.log('[debug] Metro help button clicked');
      showMetroHelp();
    });
  }
  
  // 導航模式使用說明彈窗關閉按鈕
  const closeNavigationHelpBtn = document.getElementById('close-navigation-help');
  const navigationHelpModal = document.getElementById('navigation-help-modal');
  if (closeNavigationHelpBtn && navigationHelpModal) {
    closeNavigationHelpBtn.addEventListener('click', () => {
      navigationHelpModal.style.display = 'none';
      document.body.style.overflow = 'auto';
      enableHeaderButtons();
    });
    
    navigationHelpModal.addEventListener('click', (e) => {
      if (e.target === navigationHelpModal) {
        navigationHelpModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        enableHeaderButtons();
      }
    });
  }
  
  // 捷運模式使用說明彈窗關閉按鈕
  const closeMetroHelpBtn = document.getElementById('close-metro-help');
  const metroHelpModal = document.getElementById('metro-help-modal');
  if (closeMetroHelpBtn && metroHelpModal) {
    closeMetroHelpBtn.addEventListener('click', () => {
      metroHelpModal.style.display = 'none';
      document.body.style.overflow = 'auto';
      enableHeaderButtons();
    });
    
    metroHelpModal.addEventListener('click', (e) => {
      if (e.target === metroHelpModal) {
        metroHelpModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        enableHeaderButtons();
      }
    });
  }
  
  // 捷運模式中的導航模式使用說明按鈕
  const navigationHelpBtnMetro = document.getElementById('navigation-help-btn-metro');
  if (navigationHelpBtnMetro) {
    navigationHelpBtnMetro.addEventListener('click', () => {
      console.log('[debug] Navigation help button clicked from metro mode');
      showNavigationHelp();
    });
  }
  
  // 捷運模式中的捷運模式使用說明按鈕
  const metroHelpBtnMetro = document.getElementById('metro-help-btn-metro');
  if (metroHelpBtnMetro) {
    metroHelpBtnMetro.addEventListener('click', () => {
      console.log('[debug] Metro help button clicked from metro mode');
      showMetroHelp();
    });
  }
  
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        console.log('[debug] Help modal closed by background click');
        helpModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // 重新啟用模式切換按鈕和Header按鈕
        enableModeSwitching();
        enableHeaderButtons();
      }
    });
  }
}

// 綁定負碳存摺與步數說明彈窗
function bindCarbonStepsHelpEvents() {
  const carbonBtn = document.getElementById('carbonHelpBtn');
  const resultCarbonBtn = document.getElementById('resultCarbonHelpBtn');
  const stepsBtn = document.getElementById('stepsHelpBtn');
  const resultStepsBtn = document.getElementById('resultStepsHelpBtn');

  const carbonModal = document.getElementById('carbon-help-modal');
  const stepsModal = document.getElementById('steps-help-modal');
  const closeCarbon = document.getElementById('closeCarbonHelp');
  const closeSteps = document.getElementById('closeStepsHelp');

  function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    disableHeaderButtons();
    disableModeSwitching();
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    enableHeaderButtons();
    enableModeSwitching();
  }

  if (carbonBtn) carbonBtn.addEventListener('click', () => openModal(carbonModal));
  if (resultCarbonBtn) resultCarbonBtn.addEventListener('click', () => openModal(carbonModal));
  if (stepsBtn) stepsBtn.addEventListener('click', () => openModal(stepsModal));
  if (resultStepsBtn) resultStepsBtn.addEventListener('click', () => openModal(stepsModal));

  if (closeCarbon) closeCarbon.addEventListener('click', () => closeModal(carbonModal));
  if (closeSteps) closeSteps.addEventListener('click', () => closeModal(stepsModal));
}

// 綁定改善率說明事件
function bindImprovementHelpEvents() {
  const improvementHelpBtn = document.getElementById('improvementHelpBtn');
  const resultImprovementHelpBtn = document.getElementById('resultImprovementHelpBtn');
  const improvementHelpModal = document.getElementById('improvement-help-modal');
  const closeImprovementHelpBtn = document.getElementById('closeImprovementHelp');
  
  // 導航模式改善率Help按鈕
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
  disableHeaderButtons();
    document.body.style.overflow = 'hidden';
    disableHeaderButtons();
    console.log('[improvement-help] Improvement help modal opened');
  }
}

// 關閉改善率說明彈窗
function closeImprovementHelpModal() {
  const modal = document.getElementById('improvement-help-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    enableHeaderButtons();
    console.log('[improvement-help] Improvement help modal closed');
  }
}

// 更新幫助內容
function updateHelpContent() {
  const navigationContent = document.getElementById('help-content-navigation');
  const metroContent = document.getElementById('help-content-metro');
  const metroPanel = document.getElementById('metro-panel');
  const helpModalTitle = document.getElementById('help-modal-title');
  
  // 檢查當前是否為捷運模式
  const isMetroMode = metroPanel && metroPanel.style.display !== 'none' && metroPanel.classList.contains('active');
  
  if (isMetroMode) {
    // 顯示捷運模式說明
    navigationContent.style.display = 'none';
    metroContent.style.display = 'block';
    if (helpModalTitle) {
      helpModalTitle.textContent = i18nDict[currentLang].helpTitle;
    }
  } else {
    // 顯示導航模式說明
    navigationContent.style.display = 'block';
    metroContent.style.display = 'none';
    if (helpModalTitle) {
      helpModalTitle.textContent = i18nDict[currentLang].helpTitle;
    }
  }
}

// 顯示導航模式使用說明
function showNavigationHelp() {
  const navigationHelpModal = document.getElementById('navigation-help-modal');
  if (navigationHelpModal) {
    navigationHelpModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    disableHeaderButtons();
  }
}

// 顯示捷運模式使用說明
function showMetroHelp() {
  const metroHelpModal = document.getElementById('metro-help-modal');
  if (metroHelpModal) {
    metroHelpModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    disableHeaderButtons();
  }
}

// 禁用模式切換
function disableModeSwitching() {
  const navigationBtn = document.getElementById('mode-navigation');
  const metroBtn = document.getElementById('mode-metro');
  
  if (navigationBtn) {
    navigationBtn.style.pointerEvents = 'none';
    navigationBtn.style.opacity = '0.5';
    navigationBtn.disabled = true;
  }
  
  if (metroBtn) {
    metroBtn.style.pointerEvents = 'none';
    metroBtn.style.opacity = '0.5';
    metroBtn.disabled = true;
  }
}

// 啟用模式切換
function enableModeSwitching() {
  const navigationBtn = document.getElementById('mode-navigation');
  const metroBtn = document.getElementById('mode-metro');
  
  if (navigationBtn) {
    navigationBtn.style.pointerEvents = 'auto';
    navigationBtn.style.opacity = '1';
    navigationBtn.disabled = false;
  }
  
  if (metroBtn) {
    metroBtn.style.pointerEvents = 'auto';
    metroBtn.style.opacity = '1';
    metroBtn.disabled = false;
  }
}

// 禁用Header選項按鈕（當彈窗顯示時）
function disableHeaderButtons() {
  const helpBtn = document.getElementById('help-btn');
  const langZhBtn = document.getElementById('btn-lang-zh');
  const langEnBtn = document.getElementById('btn-lang-en');
  const navigationBtn = document.getElementById('mode-navigation');
  const metroBtn = document.getElementById('mode-metro');
  
  // 禁用所有Header按鈕
  [helpBtn, langZhBtn, langEnBtn, navigationBtn, metroBtn].forEach(btn => {
    if (btn) {
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
      btn.disabled = true;
    }
  });
  
  console.log('[header] Header buttons disabled due to modal display');
}

// 啟用Header選項按鈕（當彈窗關閉時）
function enableHeaderButtons() {
  const helpBtn = document.getElementById('help-btn');
  const langZhBtn = document.getElementById('btn-lang-zh');
  const langEnBtn = document.getElementById('btn-lang-en');
  const navigationBtn = document.getElementById('mode-navigation');
  const metroBtn = document.getElementById('mode-metro');
  
  // 啟用所有Header按鈕
  [helpBtn, langZhBtn, langEnBtn, navigationBtn, metroBtn].forEach(btn => {
    if (btn) {
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
      btn.disabled = false;
    }
  });
  
  console.log('[header] Header buttons enabled after modal closed');
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
  
  // 更新座標顯示（如果元素存在）
  const coordsStart = document.getElementById('coords-start');
  if (coordsStart) {
    coordsStart.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
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
  
  // 更新座標顯示（如果元素存在）
  const coordsEnd = document.getElementById('coords-end');
  if (coordsEnd) {
    coordsEnd.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// 更新規劃按鈕狀態
function updatePlanButtonState() {
  const planBtnFloating = document.getElementById('plan-btn-floating');
  const startInput = document.getElementById('input-start') || document.getElementById('input-start-desktop');
  const endInput = document.getElementById('input-end') || document.getElementById('input-end-desktop');
  const hasStart = !!startMarker || (startInput && startInput.value.trim());
  const hasEnd = !!endMarker || (endInput && endInput.value.trim());
  
  if (planBtnFloating) {
    planBtnFloating.disabled = !(hasStart && hasEnd);
  }
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
    const value = data.label || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // 更新手機版和桌面版輸入框
    const mobileInputId = type === 'start' ? 'input-start' : 'input-end';
    const desktopInputId = type === 'start' ? 'input-start-desktop' : 'input-end-desktop';
    
    const mobileInput = document.getElementById(mobileInputId);
    const desktopInput = document.getElementById(desktopInputId);
    
    if (mobileInput) mobileInput.value = value;
    if (desktopInput) desktopInput.value = value;
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // 如果反向地理編碼失敗，使用座標
    const value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    const mobileInputId = type === 'start' ? 'input-start' : 'input-end';
    const desktopInputId = type === 'start' ? 'input-start-desktop' : 'input-end-desktop';
    
    const mobileInput = document.getElementById(mobileInputId);
    const desktopInput = document.getElementById(desktopInputId);
    
    if (mobileInput) mobileInput.value = value;
    if (desktopInput) desktopInput.value = value;
  }
}

// 規劃路徑
async function planRoutes() {
  hideError();
  
  const startInput = document.getElementById('input-start') || document.getElementById('input-start-desktop');
  const endInput = document.getElementById('input-end') || document.getElementById('input-end-desktop');
  const hasStart = !!startMarker || (startInput && startInput.value.trim());
  const hasEnd = !!endMarker || (endInput && endInput.value.trim());
  
  if (!hasStart || !hasEnd) {
    console.log('[debug] planRoutes called but no start/end points, skipping');
    return;
  }
  
  try {
    // 顯示載入狀態
    const planBtnFloating = document.getElementById('plan-btn-floating');
    const originalText = planBtnFloating ? planBtnFloating.textContent : '';
    if (planBtnFloating) {
      planBtnFloating.textContent = '計算中...';
      planBtnFloating.disabled = true;
    }
    
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
      // 使用輸入框地址（手機版和桌面版）
      const startInput = document.getElementById('input-start') || document.getElementById('input-start-desktop');
      const endInput = document.getElementById('input-end') || document.getElementById('input-end-desktop');
      
      payload = {
        start_address: startInput ? startInput.value.trim() : '',
        end_address: endInput ? endInput.value.trim() : ''
      };
    }
    
    // 添加其他參數
    // 獲取選中的交通方式（手機版和桌面版）
    const selectedTransport = document.querySelector('input[name="transport-mode"]:checked') || 
                             document.querySelector('input[name="transport-mode-desktop"]:checked');
    payload.mode = selectedTransport ? selectedTransport.value : 'bicycle';
    
    // 距離限制功能已移除
      payload.max_distance_increase = null;
    
    console.log('[debug] planRoutes called, sending payload:', payload);
    
    // 調用 API
    const response = await fetch(`${API_BASE}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('[debug] Response status:', response.status);
    console.log('[debug] Response headers:', response.headers);
    
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
          if (window.map && typeof window.map.invalidateSize === 'function') {
          window.map.invalidateSize();
        }
        }, 300);
      }
    }
    
    // 啟用路徑比較按鈕
    updateRouteComparisonBtnState(true);
    
  } catch (error) {
    console.error('Route planning error:', error);
    showError(`路徑計算失敗：${error.message}`);
  } finally {
    // 恢復按鈕狀態
    const planBtnFloating = document.getElementById('plan-btn-floating');
    if (planBtnFloating) {
      planBtnFloating.textContent = '🔍 規劃路徑';
      planBtnFloating.disabled = false;
    }
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
      color: '#3C3C9A',
      weight: 8,
      opacity: 0.8
    }).addTo(map);
  }
  
  // 渲染最低暴露路徑
  if (data.lowest?.geometry) {
    lowestLine = L.polyline(data.lowest.geometry, {
      color: '#2BB1AA',
      weight: 8,
      opacity: 0.8,
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
  
  // 計算導航時間
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

  // 保持距離與時間各自卡片顯示（不在距離後加時間）

  // 暴露減少已移除

  // 更新距離增加
  const distanceIncreaseEl = document.getElementById('dashDistanceIncrease');
  const distanceUnitEl = document.getElementById('dashDistanceUnit');
  if (distanceIncreaseEl && distanceUnitEl) {
    const distanceIncrease = computeExtraDistance(data.shortest, data.lowest);
    if (distanceIncrease >= 1000) {
      distanceIncreaseEl.textContent = (distanceIncrease / 1000).toFixed(1);
      distanceUnitEl.textContent = '公里';
    } else {
      distanceIncreaseEl.textContent = Math.round(distanceIncrease);
      distanceUnitEl.textContent = '公尺';
    }
  }

  // 更新改善率大數字動畫
  updateImprovementProgress(null, 'dashImprovementRate', improvementRate);

  // 新增：負碳存摺與步數（以低暴露距離為主）
  const baseDistanceKm = (data.lowest?.distance_km || data.shortest?.distance_km || 0);
  updateCarbonCard('dash', baseDistanceKm);
  const dashHeight = getSliderValue('dashHeightSlider', 170);
  updateStepsCard('dash', baseDistanceKm, dashHeight);
}

// 更新儀表板進度條
function updateDashboardBar(barId, valueId, value, maxValue, unit) {
  const bar = document.getElementById(barId);
  const valueEl = document.getElementById(valueId);
  
  if (bar && valueEl) {
    const percentage = maxValue > 0 ? Math.max(5, (value / maxValue) * 100) : 0;
    
    // 動畫更新進度條（水平方向）
    setTimeout(() => {
      bar.style.width = `${percentage}%`;
    }, 100);
    
    // 更新數值（加上單位）
    valueEl.textContent = formatNumber(value, 1) + (unit ? ` ${unit}` : '');
  }
}

// 更新改善率大數字動畫（支援水平進度條）
function updateImprovementProgress(progressId, textId, percentage) {
  const textEl = document.getElementById(textId);
  const progressBar = document.getElementById('improvementProgressBar');
  const progressGlow = document.getElementById('improvementProgressGlow');
  
  if (textEl) {
    const validPercentage = Math.max(0, Math.min(100, percentage || 0));
    
    // 檢查是否為水平進度條模式（導航模式）
    if (progressBar && progressGlow) {
      // 水平進度條模式
      updateHorizontalProgressDisplay(textEl, progressBar, progressGlow, validPercentage);
    } else {
      // 傳統模式（捷運模式）
      updateTraditionalProgress(textEl, validPercentage);
    }
  }
}

// 更新水平進度條顯示
function updateHorizontalProgressDisplay(textEl, progressBar, progressGlow, percentage) {
  // 重置為0
  textEl.textContent = '0%';
  textEl.style.transform = 'scale(0.8)';
  textEl.style.opacity = '0.7';
  
  // 重置進度條
  progressBar.style.width = '0%';
  progressGlow.style.width = '0%';
  progressGlow.style.opacity = '0';
  
  // 延遲後開始動畫
  setTimeout(() => {
    // 數字動畫
    textEl.style.transition = 'all 0.3s ease-out';
    textEl.style.transform = 'scale(1)';
    textEl.style.opacity = '1';
    
    // 添加脈衝動畫
    textEl.classList.add('animating');
    setTimeout(() => textEl.classList.remove('animating'), 800);
    
    // 動畫從0跑到實際值
    animateNumber(textEl, 0, percentage, 2000, '%');
    
    // 進度條動畫
    progressBar.classList.add('animating');
    progressGlow.classList.add('animating');
    
    // 設置進度條寬度
    setTimeout(() => {
      progressBar.style.width = `${percentage}%`;
      progressGlow.style.width = `${percentage}%`;
      progressGlow.style.opacity = '1';
    }, 200);
    
    // 移除動畫類別
    setTimeout(() => {
      progressBar.classList.remove('animating');
      progressGlow.classList.remove('animating');
    }, 2200);
    
  }, 100);
}

// 更新傳統進度顯示
function updateTraditionalProgress(textEl, percentage) {
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
    animateNumber(textEl, 0, percentage, 2000, '%');
    }, 100);
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
  // 清除輸入框（手機版和桌面版）
  const startInput = document.getElementById('input-start');
  const endInput = document.getElementById('input-end');
  const startInputDesktop = document.getElementById('input-start-desktop');
  const endInputDesktop = document.getElementById('input-end-desktop');
  
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
  if (startInputDesktop) startInputDesktop.value = '';
  if (endInputDesktop) endInputDesktop.value = '';
  
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
  
  // 清除座標顯示（如果元素存在）
  const coordsStart = document.getElementById('coords-start');
  const coordsEnd = document.getElementById('coords-end');
  const coordsStartDesktop = document.getElementById('coords-start-desktop');
  const coordsEndDesktop = document.getElementById('coords-end-desktop');
  
  if (coordsStart) coordsStart.textContent = '-';
  if (coordsEnd) coordsEnd.textContent = '-';
  if (coordsStartDesktop) coordsStartDesktop.textContent = '-';
  if (coordsEndDesktop) coordsEndDesktop.textContent = '-';
  
  // 退出規劃模式
  isPlanningMode = false;
  console.log('[debug] exited planning mode, start/end points unlocked');
  
  // 啟用輸入框
  if (startInput) startInput.disabled = false;
  if (endInput) endInput.disabled = false;
  if (startInputDesktop) startInputDesktop.disabled = false;
  if (endInputDesktop) endInputDesktop.disabled = false;
  
  // 重置交通方式選擇
  const transportRadios = document.querySelectorAll('input[name="transport-mode"]');
  const transportRadiosDesktop = document.querySelectorAll('input[name="transport-mode-desktop"]');
  
  [...transportRadios, ...transportRadiosDesktop].forEach(radio => {
    if (radio.value === 'bicycle') {
      radio.checked = true;
    } else {
      radio.checked = false;
    }
  });
  
  // 距離限制功能已移除
  
  // 收起左側面板
  const leftPanel = document.getElementById('leftPanel');
  if (leftPanel) {
    leftPanel.classList.remove('expanded');
  }
  
  // 調整地圖位置（面板收起時）
  const fullscreenMap = document.getElementById('map');
  if (fullscreenMap) {
    fullscreenMap.style.top = '120px'; // 80px (header) + 40px (handle)
    
    // 重新調整地圖大小
    if (window.map) {
  setTimeout(() => {
        if (window.map && typeof window.map.invalidateSize === 'function') {
        window.map.invalidateSize();
    }
      }, 300);
    }
  }
  
  // 禁用路徑比較按鈕
  updateRouteComparisonBtnState(false);
  closeRouteComparisonModal();
  
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
      // 特殊處理標題，因為它包含 HTML 標籤
      if (key === 'title') {
        el.innerHTML = dict[key];
      } else {
      el.textContent = dict[key];
      }
    }
  });
  
  // 手機版語言切換特殊處理
  if (window.innerWidth <= 768) {
    const zhBtn = document.getElementById('btn-lang-zh');
    if (zhBtn && currentLang === 'zh') {
      zhBtn.textContent = '中';
    }
  }
  
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
  
  // 更新導航模式Dashboard
  updateDashboard(data, newShortestTime, newLowestTime, improvementRate, extraDistance);
  
  // 更新捷運模式結果Dashboard（如果存在）
  updateResultDashboard(data, newShortestTime, newLowestTime, improvementRate, extraDistance);
}

// 覆蓋層更新
function updateOverlay(overlayType) {
  console.log('updateOverlay called with:', overlayType);
  
  // 移除現有覆蓋層
  if (overlayLayer) {
    map.removeLayer(overlayLayer);
    overlayLayer = null;
  }
  
  // 隱藏PM2.5顏色圖例
  hidePM25ColorLegend();
  
  currentOverlay = overlayType;
  
  if (overlayType === 'none') {
    console.log('Overlay set to none, removing overlay');
    return;
  }
  
  // 如果是PM2.5，顯示載入中狀態
  if (overlayType === 'pm25') {
    showOverlayLoadingState('pm25');
  }
  
  // 使用 API 獲取疊加圖層資訊
  loadOverlayFromAPI(overlayType);
}

// 顯示疊加圖層載入中狀態
function showOverlayLoadingState(overlayType) {
  const overlayInputs = document.querySelectorAll('input[name="overlay"]');
  overlayInputs.forEach(input => {
    if (input.value === overlayType) {
      const label = input.closest('label');
      const span = label.querySelector('span');
      if (span) {
        span.textContent = '計算中...';
        span.style.color = '#666';
        span.style.fontStyle = 'italic';
      }
    }
  });
}

// 恢復疊加圖層正常狀態
function restoreOverlayNormalState(overlayType) {
  const overlayInputs = document.querySelectorAll('input[name="overlay"]');
  overlayInputs.forEach(input => {
    if (input.value === overlayType) {
      const label = input.closest('label');
      const span = label.querySelector('span');
      if (span) {
        // 恢復原始文字
        switch(overlayType) {
          case 'pm25':
            span.textContent = 'PM₂.₅';
            break;
          case 'no2':
            span.textContent = 'NO₂';
            break;
          case 'wbgt':
            span.textContent = '氣溫';
            break;
        }
        // 恢復正常樣式
        span.style.color = '';
        span.style.fontStyle = '';
      }
    }
  });
}

// 顯示PM2.5顏色圖例
function showPM25ColorLegend() {
  const legend = document.getElementById('pm25ColorLegend');
  if (legend) {
    legend.style.display = 'block';
    console.log('PM2.5 color legend shown');
  }
}

// 隱藏PM2.5顏色圖例
function hidePM25ColorLegend() {
  const legend = document.getElementById('pm25ColorLegend');
  if (legend) {
    legend.style.display = 'none';
    console.log('PM2.5 color legend hidden');
  }
}

// 設置疊加圖層為"無"狀態
function setOverlayToNone() {
  console.log('Setting overlay to none due to error');
  
  // 恢復所有疊加圖層選項的正常狀態
  restoreOverlayNormalState('pm25');
  restoreOverlayNormalState('no2');
  restoreOverlayNormalState('wbgt');
  
  // 找到所有疊加圖層輸入框
  const overlayInputs = document.querySelectorAll('input[name="overlay"]');
  
  // 將"無"選項設為選中
  overlayInputs.forEach(input => {
    if (input.value === 'none') {
      input.checked = true;
    } else {
      input.checked = false;
    }
  });
  
  // 移除現有的疊加圖層
  if (overlayLayer) {
    map.removeLayer(overlayLayer);
    overlayLayer = null;
  }
  
  // 更新當前疊加圖層狀態
  currentOverlay = 'none';
}

// 載入自定義顏色範圍的PM2.5疊加圖層
function loadCustomPM25Overlay(colorMin = 10, colorMax = 15, opacity = 0.7) {
  console.log(`Loading custom PM2.5 overlay: ${colorMin}-${colorMax}, opacity: ${opacity}`);
  
  // 直接調用API載入
  loadOverlayFromAPI('pm25');
}

// 從 API 載入疊加圖層
function loadOverlayFromAPI(overlayType) {
  console.log(`Loading overlay from API: ${overlayType}`);
  
  fetch(`${API_BASE}/api/overlay/${overlayType}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Overlay data received:', data);
      // 使用 base64 圖片數據，不需要 HTTP 服務器
      if (data.image_data && data.bounds) {
        console.log('Loading overlay with geographic bounds:', data.bounds);
        loadPngOverlayFromData(data.image_data, overlayType, data.bounds, data.opacity);
        
        // 疊加圖層載入成功，恢復正常狀態
        restoreOverlayNormalState(overlayType);
        
        // 如果是PM2.5，顯示額外的調試信息
        if (overlayType === 'pm25' && data.data_range) {
          console.log('PM2.5 data range:', data.data_range);
          console.log('PM2.5 color range:', data.color_range);
        }
      } else {
        console.error('Invalid overlay data received:', data);
        showError('疊加圖層數據格式錯誤');
        setOverlayToNone();
        // 載入失敗，恢復正常狀態
        restoreOverlayNormalState(overlayType);
      }
    })
    .catch(error => {
      console.error('Error loading overlay from API:', error);
      // 對於PM2.5，如果API失敗，顯示錯誤訊息並切換回"無"狀態
      if (overlayType === 'pm25') {
        showError('無法載入PM2.5疊加圖層：API服務器未運行或TIFF文件處理失敗');
        // 自動切換回"無"疊加圖層狀態
        setOverlayToNone();
        // 恢復正常狀態
        restoreOverlayNormalState(overlayType);
        return;
      }
      // 對於其他疊加圖層，回退到直接載入
      loadPngOverlayDirect(overlayType);
      // 恢復正常狀態
      restoreOverlayNormalState(overlayType);
    });
}

// 直接載入疊加圖層（回退方案）
function loadPngOverlayDirect(overlayType) {
  let imagePath;
  
  switch (overlayType) {
    case 'pm25':
      // PM2.5暫時無法載入，顯示錯誤並切換回"無"狀態
      console.log('PM2.5 overlay failed, switching to none');
      showError('PM2.5疊加圖層暫時無法載入：需要安裝Pillow庫來處理TIFF文件');
      setOverlayToNone();
      return;
    case 'no2':
      imagePath = '/static/data/AirPollution/NO2_全台.png';
      break;
    case 'wbgt':
      imagePath = '/static/data/AirPollution/WBGT_全台.png';
      break;
    default:
      return;
  }
  
  const bounds = [[21.9, 120.1], [25.3, 122.0]];
  loadPngOverlay(imagePath, overlayType, bounds, 0.5);
}

// 載入 PNG 疊加層（從 base64 數據）
function loadPngOverlayFromData(imageData, overlayType, bounds = null, opacity = 0.5) {
  console.log(`Loading PNG overlay from base64 data: ${overlayType}`);
  
  // 使用提供的邊界或預設邊界
  if (!bounds) {
    bounds = [
    [21.9, 120.1],  // 西南角
    [25.3, 122.0]   // 東北角
  ];
  }
  
  console.log('Image bounds:', bounds);
  console.log('Image opacity:', opacity);
  
  // 創建圖片疊加層（使用 base64 數據）
  overlayLayer = L.imageOverlay(imageData, bounds, {
    opacity: opacity,
    interactive: false
  });
  
  console.log('Created overlay layer:', overlayLayer);
  
  overlayLayer.addTo(map);
  console.log(`Switching to PNG overlay: ${overlayType}`);
  
  // 如果是PM2.5疊加圖層，顯示顏色圖例
  if (overlayType === 'pm25') {
    showPM25ColorLegend();
  }
  
  // 檢查圖片是否載入成功
  overlayLayer.on('load', function() {
    console.log('PNG overlay loaded successfully from base64 data');
  });
  
    overlayLayer.on('error', function(e) {
    console.error('PNG overlay failed to load from base64 data:', e);
  });
}

// 載入 PNG 疊加層（從 URL 路徑）
function loadPngOverlay(imagePath, overlayType, bounds = null, opacity = 0.5) {
  console.log(`Loading PNG overlay: ${imagePath}`);
  
  // 使用提供的邊界或預設邊界
  if (!bounds) {
    bounds = [
      [21.9, 120.1],  // 西南角
      [25.3, 122.0]   // 東北角
    ];
  }
  
  console.log('Image bounds:', bounds);
  console.log('Image opacity:', opacity);
  
  // 創建圖片疊加層
  overlayLayer = L.imageOverlay(imagePath, bounds, {
    opacity: opacity,
    interactive: false
  });
  
  console.log('Created overlay layer:', overlayLayer);
  
  overlayLayer.addTo(map);
  console.log(`Switching to PNG overlay: ${overlayType}`);
  
  // 檢查圖片是否載入成功
  overlayLayer.on('load', function() {
    console.log('PNG overlay loaded successfully');
  });
  
  overlayLayer.on('error', function(e) {
    console.error('PNG overlay failed to load:', e);
  });
}

// 載入 TIF 疊加層
function loadTifOverlay(imagePath, overlayType) {
  console.log(`Loading TIF overlay: ${imagePath}`);
  
  // 由於瀏覽器不直接支援 TIF，我們需要先檢查檔案是否存在
  // 如果 TIF 載入失敗，則回退到 PNG
  const pngFallback = '/static/data/AirPollution/PM25_全台.png';
  
  // 嘗試載入 TIF 檔案
  fetch(imagePath)
    .then(response => {
      if (response.ok) {
        console.log('TIF file found, but browser cannot display TIF directly');
        // 顯示提示訊息
        showError('TIF 檔案格式不支援直接在地圖上顯示，自動切換到 PNG 格式');
        // 回退到 PNG
        loadPngOverlay(pngFallback, overlayType);
      } else {
        console.log('TIF file not found, using PNG fallback');
        loadPngOverlay(pngFallback, overlayType);
      }
    })
    .catch(error => {
      console.log('Error loading TIF file:', error);
      console.log('Using PNG fallback');
      loadPngOverlay(pngFallback, overlayType);
    });
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
    
    // 檢查是否啟用
    const isEnabled = station.enabled !== false;
    if (!isEnabled) {
      stationCard.classList.add('disabled');
    }
    
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
      if (isEnabled) {
      codeElement.style.backgroundColor = lineData.color;
      codeElement.style.color = 'white';
      } else {
        codeElement.style.backgroundColor = '#ccc';
        codeElement.style.color = '#666';
      }
      console.log('[metro] Set station code color to:', lineData.color);
    }
    
    // 添加點擊事件（只有啟用的站點才能點擊）
    if (isEnabled) {
    stationCard.addEventListener('click', function() {
      const stationId = this.getAttribute('data-station');
      const stationName = METRO_STATIONS[stationId];
      if (stationName && STATION_EXITS[stationId]) {
        hideStationsModal();
        showExitModal(stationName, stationId);
      }
    });
    }
    
    stationsGrid.appendChild(stationCard);
  });
  
  // 顯示彈出層
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  disableHeaderButtons();
}

// 隱藏站點彈出層
function hideStationsModal() {
  const overlay = document.getElementById('stations-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    enableHeaderButtons();
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
  
  // 使用本地出口資料
  generateExitButtonsFromLocal(stationId);
  
  // 生成景點按鈕
  generateAttractionButtons(stationId);
  
  // 更新導航按鈕狀態
  updateNavigationButton();
  
  modal.style.display = 'flex';
  disableHeaderButtons();
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

// 從本地資料生成出口按鈕
function generateExitButtonsFromLocal(stationId) {
  console.log(`[Local] Loading exits for station ID: ${stationId}`);
  
  const exits = STATION_EXITS[stationId];
  
  if (exits && exits.length > 0) {
    console.log(`[Local] Found ${exits.length} exits for ${stationId}`);
    
    // 轉換格式以符合 generateExitButtons 函數
    const formattedExits = exits.map(exit => ({
      exit_name: `出口${exit.exit}`,
      exit_number: exit.exit,
      longitude: exit.lng,
      latitude: exit.lat,
      accessible: exit.accessible
    }));
    
    generateExitButtons(formattedExits);
  } else {
    console.log(`[Local] No exits found for ${stationId}, using default`);
    // 如果沒有找到出口資料，顯示預設的出口按鈕
    generateDefaultExitButtons();
  }
}

// 生成出口按鈕（從 API 資料）
function generateExitButtons(exits) {
  const exitContainer = document.getElementById('exitButtons');
  exitContainer.innerHTML = '';
  
  exits.forEach((exit, index) => {
    const btn = document.createElement('button');
    btn.className = 'exit-btn';
    btn.setAttribute('data-exit', exit.exit_number);
    btn.setAttribute('data-lat', exit.latitude);
    btn.setAttribute('data-lng', exit.longitude);
    
    // 建立按鈕文字，包含無障礙資訊
    let buttonText = `出口${exit.exit_number}`;
    if (exit.accessible) {
      buttonText += ' ♿';
    }
    
    btn.innerHTML = buttonText;
    btn.onclick = () => selectExit(exit.exit_number, exit.latitude, exit.longitude);
    
    exitContainer.appendChild(btn);
  });
  
  console.log(`[UI] Generated ${exits.length} exit buttons`);
}

// 生成預設出口按鈕（當 API 失敗時）
function generateDefaultExitButtons() {
  const exitContainer = document.getElementById('exitButtons');
  exitContainer.innerHTML = '';
  
  // 檢查是否有預設的出口資料
  const stationId = window.currentSelectedStationId;
  const defaultExits = STATION_EXITS[stationId];
  
  if (defaultExits && defaultExits.length > 0) {
    // 使用預設資料
    defaultExits.forEach(exit => {
      const btn = document.createElement('button');
      btn.className = 'exit-btn';
      btn.setAttribute('data-exit', exit.exit);
      btn.setAttribute('data-lat', exit.lat);
      btn.setAttribute('data-lng', exit.lng);
      btn.textContent = `出口${exit.exit}`;
      btn.onclick = () => selectExit(exit.exit, exit.lat, exit.lng);
      exitContainer.appendChild(btn);
    });
  } else {
    // 顯示預設的 3 個出口
    for (let i = 1; i <= 3; i++) {
      const btn = document.createElement('button');
      btn.className = 'exit-btn';
      btn.setAttribute('data-exit', i);
      btn.textContent = `出口${i}`;
      btn.onclick = () => selectExit(i);
      exitContainer.appendChild(btn);
    }
  }
  
  console.log(`[UI] Generated default exit buttons`);
}

// 選擇出口
function selectExit(exitNumber, lat = null, lng = null) {
  // 清除之前的選擇
  document.querySelectorAll('.exit-btn.selected').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // 設置新選擇
  const exitBtn = document.querySelector(`[data-exit="${exitNumber}"]`);
  if (exitBtn) {
    exitBtn.classList.add('selected');
    selectedExit = exitNumber;
    
    // 如果有提供座標，保存到全域變數
    if (lat !== null && lng !== null) {
      window.selectedExitCoords = { lat: lat, lng: lng };
      console.log(`[Exit] Selected exit ${exitNumber} at coordinates: ${lat}, ${lng}`);
    } else {
      // 從按鈕的 data 屬性獲取座標
      const btnLat = exitBtn.getAttribute('data-lat');
      const btnLng = exitBtn.getAttribute('data-lng');
      if (btnLat && btnLng) {
        window.selectedExitCoords = { lat: parseFloat(btnLat), lng: parseFloat(btnLng) };
        console.log(`[Exit] Selected exit ${exitNumber} at coordinates: ${btnLat}, ${btnLng}`);
      }
    }
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
  enableHeaderButtons();
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
  
  // 優先使用 window.selectedExitCoords，如果沒有則使用 STATION_EXITS 中的資料
  let finalExitData = exitData;
  if (window.selectedExitCoords) {
    finalExitData = {
      exit: selectedExit,
      lat: window.selectedExitCoords.lat,
      lng: window.selectedExitCoords.lng,
      accessible: exitData?.accessible || false
    };
  }
  
  if (!finalExitData || !attractionData) {
    console.error('Cannot find exit or attraction data');
    return;
  }
  
  // 關閉出口選擇彈窗
  closeExitModal();
  
  // 顯示載入狀態
  showLoadingForRouteCalculation();
  
  // 直接調用後端API計算路徑，如果失敗則使用模擬數據
  try {
    await calculateRouteForModal(finalExitData, attractionData, stationName);
  } catch (error) {
    console.log('[metro] Backend failed, falling back to mock data:', error.message);
    const mockData = generateMockRouteData(finalExitData, attractionData);
    showRouteResultModal(mockData, finalExitData, attractionData, stationName);
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
  
  try {
    const exitLabel = (exitData && (exitData.exit !== undefined && exitData.exit !== null)) ? ` (出口${exitData.exit})` : '';
    title.textContent = `${stationName}站${exitLabel} → ${attractionData.name}`;
  } catch (_) {
    title.textContent = `${stationName}站 → ${attractionData.name}`;
  }
  
  modal.style.display = 'flex';
  disableHeaderButtons();
  
  // 綁定導航方式切換事件
  bindTransportModeChangeEvents(routeData, exitData, attractionData);
  
  // 產生可回放的深連結 URL（不刷新頁面）
  try {
    pushMetroDeepLinkURL(stationName, exitData, attractionData);
  } catch (e) {
    console.warn('[deeplink] failed to push URL:', e);
  }
  
  setTimeout(() => {
    // 初始化結果地圖
    initRouteResultMap(routeData, exitData, attractionData);
    
    // 更新結果圖表
    updateRouteResultCharts(routeData);
    
    // 重新綁定改善率Help按鈕事件（因為彈窗內容是動態生成的）
    bindImprovementHelpEvents();
  }, 100);
}

// 綁定通勤方式切換事件
function bindTransportModeChangeEvents(routeData, exitData, attractionData) {
  const radioButtons = document.querySelectorAll('input[name="resultTransportMode"]');
  
  radioButtons.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.checked) {
        const selectedMode = this.value;
        console.log('[metro] Transport mode changed to:', selectedMode);
        
        // 重新計算時間並更新顯示
        updateRouteResultWithNewMode(routeData, selectedMode);
      }
    });
  });
}

// 根據新的導航方式更新結果
function updateRouteResultWithNewMode(routeData, transportMode) {
  const speed = SPEED_CONSTANTS[transportMode];
  
  // 重新計算時間
  const shortestTime = Math.round((routeData.shortest.distance_km / speed) * 60);
  const lowestTime = Math.round((routeData.lowest.distance_km / speed) * 60);
  
  // 更新時間顯示
  updateResultDashboardBar('resultDashTimeBarShortest', 'resultDashTimeShortest', shortestTime, Math.max(shortestTime, lowestTime), 'min');
  updateResultDashboardBar('resultDashTimeBarLowest', 'resultDashTimeLowest', lowestTime, Math.max(shortestTime, lowestTime), 'min');
  
  console.log(`[metro] Updated times for ${transportMode}: shortest=${shortestTime}min, lowest=${lowestTime}min`);
}

// 依站名取得站點ID（METRO_STATIONS: id -> name）
function getStationIdByName(stationName) {
  try {
    for (const [sid, name] of Object.entries(METRO_STATIONS)) {
      if (name === stationName) return sid;
    }
  } catch (_) {}
  return null;
}

// 依據站名/出口/景點推入可回放URL
function pushMetroDeepLinkURL(stationName, exitData, attractionData) {
  const sid = getStationIdByName(stationName);
  if (!sid || !exitData || !attractionData) return;
  const base = window.location.origin + window.location.pathname;
  const ex = encodeURIComponent(String(exitData.exit));
  // 找出景點索引（以名稱與座標比對，確保正確）
  let aid = null;
  const list = (STATION_ATTRACTIONS && STATION_ATTRACTIONS[sid]) || [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a && a.name === attractionData.name && Math.abs(a.lat - attractionData.lat) < 1e-6 && Math.abs(a.lng - attractionData.lng) < 1e-6) {
      aid = i;
      break;
    }
  }
  if (aid === null) aid = 0; // 後備
  const params = new URLSearchParams();
  params.set('m', 'metro');
  params.set('sid', sid);
  params.set('ex', String(ex));
  params.set('aid', String(aid));
  // 保留目前語言
  if (typeof currentLang === 'string') params.set('lang', currentLang);
  const newUrl = `${base}?${params.toString()}`;
  window.history.pushState({}, '', newUrl);
}

// 載入時處理深連結
function handleDeepLinkNavigation() {
  const qs = new URLSearchParams(window.location.search);
  const mode = qs.get('m');
  if (mode !== 'metro') return;
  const sid = qs.get('sid');
  const exParam = qs.get('ex');
  const aidParam = qs.get('aid');
  if (!sid || exParam === null || aidParam === null) return;
  const stationName = (METRO_STATIONS && METRO_STATIONS[sid]) || '';
  const exits = (STATION_EXITS && STATION_EXITS[sid]) || [];
  const exitData = exits.find(e => String(e && e.exit) === String(exParam));
  const attractions = (STATION_ATTRACTIONS && STATION_ATTRACTIONS[sid]) || [];
  const aid = Math.max(0, Math.min(attractions.length - 1, parseInt(aidParam, 10)));
  const attractionData = attractions[aid];
  if (!stationName || !exitData || !attractionData) {
    console.warn('[deeplink] invalid parameters:', { sid, exParam, aidParam });
    return;
  }
  // 切換模式為捷運
  if (typeof switchMode === 'function') {
    switchMode('metro');
  }
  // 直接呼叫既有API解算
  calculateRouteForModal(exitData, attractionData, stationName)
    .catch(err => console.warn('[deeplink] calculateRouteForModal failed:', err));
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
        color: '#3C3C9A',
        weight: 8,
        opacity: 0.8
      }).addTo(resultMap);
    }
    
    if (routeData.lowest?.geometry) {
      L.polyline(routeData.lowest.geometry, {
        color: '#2BB1AA',
        weight: 8,
        opacity: 0.8,
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
  // 保存到全域，供拉桿即時更新使用（相容 deeplink 進入）
  window.lastRouteData = { data, shortestTime, lowestTime, improvementRate, extraDistance };
  
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

  // 保持距離與時間各自卡片顯示（不在距離後加時間）
  
  // 更新距離增加
  const distanceIncreaseEl = document.getElementById('resultDashDistanceIncrease');
  const distanceUnitEl = document.getElementById('resultDashDistanceUnit');
  if (distanceIncreaseEl && distanceUnitEl) {
    const distanceIncrease = computeExtraDistance(data.shortest, data.lowest);
    if (distanceIncrease >= 1000) {
      distanceIncreaseEl.textContent = (distanceIncrease / 1000).toFixed(1);
      distanceUnitEl.textContent = '公里';
    } else {
      distanceIncreaseEl.textContent = Math.round(distanceIncrease);
      distanceUnitEl.textContent = '公尺';
    }
  }
  
  // 改善率大數字動畫 - 捷運模式也使用水平進度條
  const resultProgressBar = document.getElementById('resultImprovementProgressBar');
  const resultProgressGlow = document.getElementById('resultImprovementProgressGlow');
  if (resultProgressBar && resultProgressGlow) {
    // 捷運模式使用水平進度條
    updateHorizontalProgressDisplay(
      document.getElementById('resultDashImprovementRate'),
      resultProgressBar,
      resultProgressGlow,
      improvementRate
    );
    } else {
    // 傳統模式
  updateImprovementProgress(null, 'resultDashImprovementRate', improvementRate);
  }

  // 新增：負碳存摺與步數（以低暴露距離為主）
  const baseDistanceKm = (data.lowest?.distance_km || data.shortest?.distance_km || 0);
  updateCarbonCard('resultDash', baseDistanceKm);
  const resultHeight = getSliderValue('resultHeightSlider', 170);
  updateStepsCard('resultDash', baseDistanceKm, resultHeight);
}

// 更新結果儀表板進度條
function updateResultDashboardBar(barId, valueId, value, maxValue, unit) {
  const bar = document.getElementById(barId);
  const valueElement = document.getElementById(valueId);
  
  if (bar && valueElement) {
    const percentage = maxValue > 0 ? Math.max(5, (value / maxValue) * 100) : 0;
    
    // 動畫更新進度條（水平方向）
    setTimeout(() => {
    bar.style.width = `${percentage}%`;
    }, 100);
    
    // 更新數值（加上單位）
    valueElement.textContent = formatNumber(value, 1) + (unit ? ` ${unit}` : '');
  }
}

// ===== 新增：減碳與步數工具函數 =====
function getSliderValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseInt(el.value, 10);
  return Number.isFinite(v) ? v : fallback;
}

function estimateBaselineMode(distanceKm) {
  if (distanceKm > 5) return 'car';
  if (distanceKm < 2) return 'motorcycle';
  return 'motorcycle';
}

function emissionFactor(mode) {
  if (mode === 'car') return 0.21;
  if (mode === 'bus') return 0.08;
  return 0.11; // motorcycle default
}

function formatKg(value) {
  if (!Number.isFinite(value)) return '-';
  if (value >= 1) return `${value.toFixed(1)} kg CO₂`;
  return `${(value * 1000).toFixed(0)} g CO₂`;
}

function renderTreesIcons(containerId, treesFloat) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const active = Math.max(0, Math.min(6, Math.round(Math.min(treesFloat, 6))));
  const total = 6;
  for (let i = 0; i < total; i++) {
    const span = document.createElement('span');
    span.className = 'tree-icon' + (i < active ? '' : ' inactive');
    span.textContent = '🌲';
    container.appendChild(span);
  }
}

function renderFootprints(containerId, steps) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const icons = Math.max(0, Math.min(20, Math.round(Math.min(steps / 1000, 20))));
  for (let i = 0; i < icons; i++) {
    const span = document.createElement('span');
    span.className = 'footprint-icon';
    span.textContent = '👣';
    container.appendChild(span);
  }
}

function updateCarbonCard(prefix, distanceKm) {
  const mode = estimateBaselineMode(distanceKm);
  const factor = emissionFactor(mode);
  const savedKg = distanceKm * factor;
  const trees = savedKg * 0.5;

  const valueEl = document.getElementById(`${prefix}CarbonKg`);
  const treesEl = document.getElementById(`${prefix}CarbonTrees`);
  const modeEl = document.getElementById(`${prefix}CarbonMode`);
  if (valueEl) valueEl.textContent = formatKg(savedKg);
  if (treesEl) treesEl.textContent = trees.toFixed(1);
  if (modeEl) modeEl.textContent = (mode === 'car' ? '汽車' : '機車');

  renderTreesIcons(`${prefix}CarbonTreesVisual`, trees);
}

function updateStepsCard(prefix, distanceKm, heightCm) {
  const heightM = heightCm / 100;
  const stepLen = heightM * 0.43;
  const steps = stepLen > 0 ? Math.round((distanceKm * 1000) / stepLen) : 0;
  const kcal = Math.round((steps / 1000) * 40);
  const life = Math.round(steps * 0.004);

  const stepsEl = document.getElementById(`${prefix}Steps`);
  const kcalEl = document.getElementById(`${prefix}Kcal`);
  const lifeEl = document.getElementById(`${prefix}Life`);
  const heightValEl = document.getElementById(`${prefix === 'dash' ? 'dashHeightValue' : 'resultHeightValue'}`);

  if (stepsEl) stepsEl.textContent = steps.toLocaleString();
  if (kcalEl) kcalEl.textContent = kcal.toLocaleString();
  if (lifeEl) lifeEl.textContent = life.toLocaleString();
  if (heightValEl) heightValEl.textContent = heightCm.toString();

  renderFootprints(`${prefix}StepsVisual`, steps);
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
  enableHeaderButtons();
  
  // 清理地圖實例
  if (window.routeResultMap) {
    window.routeResultMap.remove();
    window.routeResultMap = null;
  }
}

// 顯示捷運模式提示彈窗
function showMetroModeInfo() {
  // 創建彈窗元素
  const modal = document.createElement('div');
  modal.id = 'metro-info-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: 'Microsoft JhengHei', sans-serif;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 400px;
    margin: 20px;
    animation: modalSlideIn 0.3s ease-out;
  `;
  
  content.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 15px;">🚇</div>
    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">捷運模式</h3>
    <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
      部分景點尚在更新中，敬請期待!
    </p>
    <button id="metro-info-close" style="
      background: #E3002C;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    ">我知道了</button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // 添加動畫樣式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.8) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
  
  // 綁定關閉事件
  const closeBtn = document.getElementById('metro-info-close');
  closeBtn.addEventListener('click', function() {
    modal.style.animation = 'modalSlideIn 0.3s ease-out reverse';
    setTimeout(() => {
      document.body.removeChild(modal);
      document.head.removeChild(style);
    }, 300);
  });
  
  // 點擊背景關閉
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeBtn.click();
    }
  });
}

// 錯誤關閉按鈕
document.addEventListener('DOMContentLoaded', function() {
  const errorClose = document.getElementById('error-close');
  if (errorClose) {
    errorClose.addEventListener('click', hideError);
  }
});
