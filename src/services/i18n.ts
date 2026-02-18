import { reactive, computed } from 'vue';

export type Language = 'EN' | 'RU' | 'CN';

const state = reactive({
  currentLang: 'RU' as Language
});

export const setLanguage = (lang: Language) => {
  state.currentLang = lang;
};

export const currentLang = computed(() => state.currentLang);

const translations: Record<Language, Record<string, string>> = {
  EN: {
    // Header
    'header.subtitle': 'NETWORK INTERFACE // POE-CLUSTER-04',
    'header.net': 'NET',
    'header.online': 'ONLINE',
    'header.ping': 'PING',

    // RobotStatus
    'status.title': 'ROBOT STATE',
    'status.connected': 'CONNECTED',
    'status.offline': 'OFFLINE',
    'status.cartesian': 'CARTESIAN [mm]',
    'status.joints': 'JOINTS [deg]',
    'status.temp': 'TEMP',
    'status.load': 'LOAD',
    'status.time': 'UPTIME',
    'status.auto': 'AUTO',

    // CameraFeed
    'camera.name': 'CAM-FEED_01',
    'camera.signal': 'SIGNAL LOCKED',
    'camera.no_signal': 'NO SIGNAL',
    'camera.connection_lost': 'CONNECTION LOST',
    'camera.retrying': 'SEARCHING LINK...',
    'camera.mode': 'MODE',
    'camera.targets': 'TARGETS',
    'camera.latency': 'LATENCY',
    'camera.assist': 'AI-ASSIST',

    // ControlPanel
    'control.system': 'SYSTEM',
    'control.standby': 'STANDBY',
    'control.mode': 'OPERATION MODE',
    'control.manual': 'MANUAL',
    'control.auto': 'AUTO',
    'control.speed': 'SPEED',
    'control.servo': 'SERVO ON',
    'control.reset': 'RESET',
    'control.home': 'HOME',
    'control.manualdata': 'MANUAL CONTROL',
    'control.aipilot': 'AI AUTO-PILOT',
    'control.stop': 'STOP',
    'control.demo_start': 'START DEMO',
    'control.demo_stop': 'STOP DEMO',

    // Console
    'log.title': 'SYSTEM LOGS',
    'log.init': 'System initialized',
    'log.connecting': 'Connecting to Camera...',
    'log.waiting': 'Waiting for robot handshake...',
    'log.connected': 'Robot handshake successful',
    'log.address': 'ADDRESS',
    'log.port': 'PORT',
    'log.protocol': 'PROTOCOL',
    'log.sending': 'SENDING',
    'log.received': 'RECEIVED',
    'log.no_connection': 'OFFLINE: WAITING FOR LINK',
    'log.show': 'SHOW LOGS',
    'log.hide': 'HIDE LOGS',
    'log.clear': 'CLEAR',
    'log.paused': 'Paused',
    'log.resumed': 'Resume',
  },
  RU: {
    'header.subtitle': 'СЕТЕВОЙ ИНТЕРФЕЙС // POE-КЛАСТЕР-04',
    'header.net': 'СЕТЬ',
    'header.online': 'ОНЛАЙН',
    'header.ping': 'ПИНГ',

    'status.title': 'СОСТОЯНИЕ РОБОТА',
    'status.connected': 'ПОДКЛЮЧЕНО',
    'status.offline': 'ОФФЛАЙН',
    'status.cartesian': 'ДЕКАРТОВЫ [мм]',
    'status.joints': 'ОСИ / СУСТАВЫ [град]',
    'status.temp': 'ТЕМП',
    'status.load': 'НАГРУЗКА',
    'status.time': 'ВРЕМЯ',
    'status.auto': 'АВТО',

    'camera.name': 'КАМЕРА-01',
    'camera.signal': 'СИГНАЛ',
    'camera.no_signal': 'НЕТ СИГНАЛА',
    'camera.connection_lost': 'СВЯЗЬ ПОТЕРЯНА',
    'camera.retrying': 'ПОИСК СЕТИ...',
    'camera.mode': 'РЕЖИМ',
    'camera.targets': 'ЦЕЛИ',
    'camera.latency': 'ЗАДЕРЖКА',
    'camera.assist': 'ИИ-АССИСТЕНТ',

    'control.system': 'СИСТЕМА',
    'control.standby': 'ОЖИДАНИЕ',
    'control.mode': 'РЕЖИМ РАБОТЫ',
    'control.manual': 'РУЧНОЙ',
    'control.auto': 'АВТО',
    'control.speed': 'СКОРОСТЬ',
    'control.servo': 'СЕРВО ВКЛ',
    'control.reset': 'СБРОС',
    'control.home': 'ДОМОЙ',
    'control.manualdata': 'РУЧНОЕ УПРАВЛЕНИЕ',
    'control.aipilot': 'ИИ АВТО-ПИЛОТ',
    'control.stop': 'СТОП',
    'control.demo_start': 'СТАРТ ДЕМО',
    'control.demo_stop': 'СТОП ДЕМО',

    'log.title': 'СИСТЕМНЫЙ ЖУРНАЛ',
    'log.init': 'Система инициализирована',
    'log.connecting': 'Подключение к камере (PoE)...',
    'log.waiting': 'Ожидание связи с контроллером...',
    'log.connected': 'Связь с роботом установлена',
    'log.address': 'АДРЕС',
    'log.port': 'ПОРТ',
    'log.protocol': 'ПРОТОКОЛ',
    'log.sending': 'ОТПРАВКА',
    'log.received': 'ПРИЕМ',
    'log.no_connection': 'ОФФЛАЙН: ОЖИДАНИЕ СВЯЗИ',
    'log.show': 'ПОКАЗАТЬ',
    'log.hide': 'СКРЫТЬ',
    'log.clear': 'ОЧИСТИТЬ',
    'log.paused': 'Пауза',
    'log.resumed': 'Продолжить',
  },
  CN: {
    'header.subtitle': '网络接口 // POE-集群 -04',
    'header.net': '网络',
    'header.online': '在线',
    'header.ping': '延迟',

    'status.title': '机器人状态',
    'status.connected': '已连接',
    'status.offline': '离线',
    'status.cartesian': '笛卡尔坐标 [mm]',
    'status.joints': '关节角度 [deg]',
    'status.temp': '温度',
    'status.load': '负载',
    'status.time': '运行时间',
    'status.auto': '自动',

    'camera.name': '摄像头 -01',
    'camera.signal': '信号锁定',
    'camera.no_signal': '无信号',
    'camera.connection_lost': '连接丢失',
    'camera.retrying': '正在搜索网络...',
    'camera.mode': '模式',
    'camera.targets': '目标',
    'camera.latency': '延迟',
    'camera.assist': 'AI 辅助',

    'control.system': '系统控制',
    'control.standby': '待机',
    'control.mode': '操作模式',
    'control.manual': '手动',
    'control.auto': '自动',
    'control.speed': '速度',
    'control.servo': '伺服开启',
    'control.reset': '复位',
    'control.home': '回零',
    'control.manualdata': '手动控制',
    'control.aipilot': 'AI 自动驾驶',
    'control.stop': '停止',
    'control.demo_start': '演示开始',
    'control.demo_stop': '演示停止',

    'log.title': '系统日志',
    'log.init': '系统初始化',
    'log.connecting': '连接相机...',
    'log.waiting': '等待机器人握手...',
    'log.connected': '机器人连接成功',
    'log.address': '地址',
    'log.port': '端口',
    'log.protocol': '协议',
    'log.sending': '发送',
    'log.received': '接收',
    'log.no_connection': '离线：等待连接',
    'log.paused': '已暂停',
    'log.resumed': '继续',
  }
};

export const t = (key: string): string => {
  return translations[state.currentLang][key] || key;
};
