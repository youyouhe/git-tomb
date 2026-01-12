
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { DeathCause } from './types';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    "app.title": "Repo Graveyard",
    "app.subtitle": "Collect bodies. Encoffin code. Rest in peace.",
    "nav.bury": "Collect Body",
    "nav.connect": "Scavenge",
    "nav.kin": "Find Kin",
    "nav.leaderboard": "Guild",
    "stats.buried": "Coffins",
    "stats.respects": "Tears",
    
    "settings.title": "Undertaker Toolkit",
    "settings.auto_refresh": "Auto Séance (30s)",
    "settings.auto_refresh_desc": "Automatically summon new spirits.",
    "settings.llm_config": "Necromancy Spell (AI)",
    "settings.provider": "Choose Your Priest",
    "settings.api_key": "Offering (API Key)",
    "settings.api_key_placeholder": "sk-...",
    "settings.save": "Bind Soul",
    "settings.saved": "Bound!",
    "settings.warning": "Your spell key is stored locally.",
    "settings.close": "Vanish",
    
    // Advanced Settings
    "settings.advanced": "Connection to the Underworld (Advanced)",
    "settings.sb_url": "Graveyard Address (Supabase URL)",
    "settings.sb_key": "Passkey (Anon Key)",
    "settings.advanced_warn": "Changing this will refresh the page. Only for private graveyards.",
    "settings.reset": "Reset to Official Graveyard",

    // Identity ID Card
    "identity.card_title": "Undertaker License",
    "identity.card_org": "Bureau of Digital Afterlife",
    "identity.stat_buried": "Bodies Buried",
    "identity.stat_next": "To Next Rank",
    "identity.desc": "Bind your GitHub account to claim your kills on the leaderboard.",
    "identity.logout": "Revoke License (Logout)",
    "identity.connect_btn": "Link GitHub",
    "identity.anon_hint": "Playing as Ghost",
    "identity.reroll": "Re-roll Alias",

    // Ranks
    "rank.intern": "Grave Digger Intern",
    "rank.keeper": "Crypt Keeper",
    "rank.coroner": "Code Coroner",
    "rank.ferryman": "Soul Ferryman",
    "rank.reaper": "Grim Reaper",
    "rank.entropy": "Lord of Entropy",

    // Priest Personas
    "priest.gemini": "Father Flash (Gemini)",
    "priest.gemini.desc": "Speedrunner of Rites. Fast, free, occasionally hallucinates angels.",
    "priest.openai": "Bishop GPT (OpenAI)",
    "priest.openai.desc": "The High Priest. Expensive, ceremonial, requires heavy tithes.",
    
    // The Great Selfless One
    "priest.openrouter": "Saint of Open Source (Free)",
    "priest.openrouter.desc": "The Benevolent Sage. Asks for no tribute, gives everything. The patron saint of broken wallets.",
    
    // Restored DeepSeek
    "priest.deepseek": "Taoist DeepSeek (Official)",
    "priest.deepseek.desc": "The Eastern Sage. Deep wisdom, extremely cost-effective, but requires your own incense (Key).",
    
    // Priest Leaderboard
    "priest.board.title": "Clergy Ratings",
    "priest.board.busy": "Rites Performed",
    "priest.board.likes": "Blessings",
    "priest.board.action": "Bless",

    "scanner.title": "👻 Corpse Scavenger",
    "scanner.desc": "Enter a GitHub username to find bodies rotting for over 6 months.",
    "scanner.placeholder": "Target GitHub User",
    "scanner.btn": "HUNT",
    "scanner.scanning": "Hunting...",
    "scanner.empty": "No bodies found. This dev is annoyingly alive.",
    "scanner.found": "Found {count} rotting carcasses",
    "scanner.last_push": "💀 Flatline: {date} ({days} days cold)",
    "scanner.bury_it": "⚰️ BAG IT",
    "scanner.error.user_not_found": "Target not found.",
    "scanner.error.rate_limit": "The spirits are tired (Rate Limit).",
    "scanner.error.generic": "Hunt failed.",

    "kin.title": "🕯️ Ancestry Records",
    "kin.desc": "Find where your previous failures are buried.",
    "kin.placeholder": "GitHub Username",
    "kin.btn": "Consult Tome",
    "kin.searching": "Consulting...",
    "kin.empty": "No records. Maybe they were cremated?",
    "kin.found": "Found {count} marked graves.",

    "leaderboard.title": "☠️ Undertaker's Guild",
    "leaderboard.desc": "Top body collectors in the digital afterlife.",
    "leaderboard.rank": "Rank",
    "leaderboard.undertaker": "Undertaker ID",
    "leaderboard.count": "Bodies Collected",
    "leaderboard.you": " (YOU)",
    "leaderboard.empty": "The guild hall is empty.",
    "leaderboard.share": "SHARE RANK",
    "leaderboard.share_msg_rank": "☠️ I am the #{rank} Ranked Undertaker on Repo Graveyard! I have buried {count} dead projects. \n\nBury your dead code here: ",
    "leaderboard.share_msg_generic": "☠️ I just buried a dead project on Repo Graveyard. \n\nMay it rest in peace: ",

    "form.step1": "Step 1: Tag the Toe",
    "form.step2": "Step 2: Autopsy Report",
    "form.url_label": "Repository Link",
    "form.url_placeholder": "https://github.com/...",
    "form.digging": "Digging Hole...",
    "form.next": "Proceed >",
    "form.cause_label": "Clinical Cause of Death",
    "form.epitaph_label": "Epitaph (Optional)",
    "form.epitaph_placeholder": "Last famous words?",
    "form.bury_btn": "⚰️ NAIL THE COFFIN",
    "form.back": "< Abort",
    "form.loading.title": "{priest} is chanting...",
    "form.loading.desc": "Performing final rites. Preparing the holy water...",
    "form.error.repo_not_found": "Body not found. Is it private?",
    "form.error.already_buried": "Already 6 feet under.",
    "form.error.alive": "⚠️ Pulse detected! Updated < 6 months ago. No live burials allowed.",
    "form.error.no_key": "No Mana! Configure AI settings first.",
    "form.btn_visit": "Visit Grave",

    "tomb.rip": "R.I.P",
    "tomb.language": "DNA",
    "tomb.cause": "Fatal Error",
    "tomb.last_words": "Last Output",
    "tomb.glory": "Glory", 
    
    // RITUALS
    "tomb.ritual_btn": "Perform Ritual",
    "tomb.pay_respects": "Respects Paid",
    "tomb.total_respects": "Tears: {count}",
    "tomb.score": "Soul Power",
    "tomb.share_btn": "Share Obituary", // NEW
    "share.obituary": "Here lies {name}. Died of {cause}. It was a good project. R.I.P.", // NEW

    "ritual.candle": "Lighting Candle (+1)",
    "ritual.coffee": "Pouring Coffee (+2)",
    "ritual.bug": "Squashing Bugs (+3)",
    "ritual.fire": "Purging Code (+5)",
    "ritual.salute": "Pressing F (+1)",
    "ritual.waifu": "Deploying Waifu (+10)",
    
    // Restrictions
    "restriction.daily_limit": "⚠️ Soul Fading: Daily limit (5/5). Login for more power.",
    "restriction.auth_required": "🔒 Login required for this ritual.",
    "restriction.waifu_locked": "🔒 Login Required: Ghosts cannot summon Waifus.",
    "restriction.already_paid": "⏳ You have already paid respects here. Return in 1 year to pay respects again.",

    // Tiers
    "tier.gold": "LEGENDARY CORPSE",
    "tier.silver": "NOBLE REMAINS",
    "tier.bronze": "COMMON BONES",
    "tier.iron": "RUSTY SCRAP",
    "tier.wood": "ROTTING LOG",
    "tier.rotten": "DUST",

    "list.empty": "Fresh ground. No graves yet.",
    "list.suspicious": "Silence...",
    "list.load_more": "Summon More...",
    "list.no_more": "End of the crypt.",
    "detail.back": "← Back to Crypt",
    "home.cta_bury": "⚰️ Collect Body",
    "home.cta_sub": "Submit a dead project",

    "footer.toolmaker": "Head Undertaker: Tom He",
    "ad.sponsored": "SPONSORED BY",
    "ad.desc": "The ultimate tool for personal creative writing.",

    // Sorting
    "sort.label": "Sort By",
    "sort.newest": "Fresh Graves",
    "sort.stars": "Past Glory",
    "sort.respects": "Tears Shed",

    "preset.machine": "It works on my machine.",
    "preset.todo": "TODO: Fix this later.",
    "preset.rust": "I'll rewrite it in Rust.",
    "preset.weekend": "Just a weekend project.",
    "preset.console": "Console.log('Goodbye');",
    "preset.coffee": "Ran out of coffee.",
    "preset.docs": "Documentation is loading...",
    "preset.404": "404: Motivation Not Found"
  },
  zh: {
    "app.title": "代码乱葬岗",
    "app.subtitle": "给逝去的项目收个全尸。",
    "nav.bury": "我要收尸",
    "nav.connect": "替人收尸",
    "nav.kin": "查户口",
    "nav.leaderboard": "互助帮",
    "stats.buried": "入殓数",
    "stats.respects": "眼泪",

    "settings.title": "赶尸工具箱",
    "settings.auto_refresh": "自动招魂 (30秒)",
    "settings.auto_refresh_desc": "自动寻找新入土的倒霉蛋。",
    "settings.llm_config": "AI 符咒配置",
    "settings.provider": "请法师",
    "settings.api_key": "香火钱 (API Key)",
    "settings.api_key_placeholder": "sk-...",
    "settings.save": "画符生效",
    "settings.saved": "已生效!",
    "settings.warning": "秘钥仅存在本地，虽然这是个阴间App，但我们很安全。",
    "settings.close": "退下",

    // Advanced Settings
    "settings.advanced": "连接阴曹地府 (高级)",
    "settings.sb_url": "地府地址 (Supabase URL)",
    "settings.sb_key": "通行证 (Anon Key)",
    "settings.advanced_warn": "修改此项将刷新页面。仅用于连接你自己的私有地府。",
    "settings.reset": "重置为官方地府",

    // Identity ID Card
    "identity.card_title": "赶尸人执照",
    "identity.card_org": "赛博阴曹地府办事处",
    "identity.stat_buried": "已收尸",
    "identity.stat_next": "距离升级还需",
    "identity.desc": "绑定 GitHub 账号以激活排行榜。或者保持匿名。",
    "identity.logout": "吊销执照 (退出)",
    "identity.connect_btn": "绑定 GitHub",
    "identity.anon_hint": "幽灵模式",
    "identity.reroll": "重置代号",

    // Ranks
    "rank.intern": "实习铲尸官",
    "rank.keeper": "守墓人",
    "rank.coroner": "代码验尸官",
    "rank.ferryman": "灵魂摆渡人",
    "rank.reaper": "死神代理人",
    "rank.entropy": "熵增之主",

    // Priest Personas
    "priest.gemini": "闪电神父 (Gemini)",
    "priest.gemini.desc": "超度速通王。语速极快，免费，偶尔会把经念歪。",
    "priest.openai": "氪金主教 (GPT-4)",
    "priest.openai.desc": "红衣大主教。仪式感拉满，法力高强，但是很烧钱。",
    
    // The Great Selfless One
    "priest.openrouter": "开源圣徒 (Mistral 免费)",
    "priest.openrouter.desc": "大公无私的赛博活菩萨。分文不取，普渡众生。贫穷开发者的守护神。",

    // Restored DeepSeek
    "priest.deepseek": "DeepSeek 道长 (官方)",
    "priest.deepseek.desc": "东方玄学大师。法力高深，物美价廉，但需自备香火 (Key)。",

    // Priest Leaderboard
    "priest.board.title": "法师排行榜",
    "priest.board.busy": "超度次数",
    "priest.board.likes": "功德(赞)",
    "priest.board.action": "随喜赞叹",

    "scanner.title": "👻 尸体探测仪",
    "scanner.desc": "输入 GitHub ID，扫描那些已经凉了半年以上的尸体。",
    "scanner.placeholder": "目标 GitHub ID",
    "scanner.btn": "搜寻尸体",
    "scanner.scanning": "探测中...",
    "scanner.empty": "没发现尸体。这人命真硬（还在维护）。",
    "scanner.found": "发现 {count} 具高度腐烂的尸体",
    "scanner.last_push": "💀 死亡时间: {date} (凉了 {days} 天)",
    "scanner.bury_it": "⚰️ 装进尸袋",
    "scanner.error.user_not_found": "查无此人。",
    "scanner.error.rate_limit": "阴阳路堵车了 (Rate Limit)。",
    "scanner.error.generic": "探测失败。",

    "kin.title": "🕯️ 验尸房档案",
    "kin.desc": "输入 GitHub ID，看看他在这里埋了多少个。",
    "kin.placeholder": "GitHub ID",
    "kin.btn": "调取档案",
    "kin.searching": "翻阅生死簿...",
    "kin.empty": "生死簿上没名字，可能是个假开发者。",
    "kin.found": "找到 {count} 个灵位。",

    "leaderboard.title": "☠️ 赶尸英雄榜",
    "leaderboard.desc": "全网最强收尸人排行。积阴德，攒福报。",
    "leaderboard.rank": "排名",
    "leaderboard.undertaker": "赶尸人代号",
    "leaderboard.count": "收尸数量",
    "leaderboard.you": " (你自己)",
    "leaderboard.empty": "榜单空空如也，快去收尸冲榜！",
    "leaderboard.share": "我要炫耀",
    "leaderboard.share_msg_rank": "☠️ 我是 Repo Graveyard 排名第 #{rank} 的金牌赶尸人！我已经超度了 {count} 个死去的项目。\n\n来这里埋葬你的代码：",
    "leaderboard.share_msg_generic": "☠️ 我刚刚在 Repo Graveyard 埋葬了一个死去的项目。\n\n愿它安息：",


    "form.step1": "第一步：确认死者",
    "form.step2": "第二步：验尸报告",
    "form.url_label": "仓库地址",
    "form.url_placeholder": "https://github.com/...",
    "form.digging": "挖坑中...",
    "form.next": "下一步 >",
    "form.cause_label": "临床死因",
    "form.epitaph_label": "墓志铭 (选填)",
    "form.epitaph_placeholder": "最后一句遗言...",
    "form.bury_btn": "⚰️ 钉死棺材板",
    "form.back": "< 算了",
    "form.loading.title": "{priest} 正在做法...",
    "form.loading.desc": "正在燃烧显卡... 正在计算功德...",
    "form.error.repo_not_found": "找不到尸体。是私有仓库吗？",
    "form.error.already_buried": "这尸体早就入土了，别挖了。",
    "form.error.alive": "⚠️ 还有气儿！最后更新不足半年。禁止活埋！",
    "form.error.no_key": "法力不足！请去设置里配置 Key。",
    "form.btn_visit": "去上坟",

    "tomb.rip": "R.I.P",
    "tomb.language": "基因",
    "tomb.cause": "死因",
    "tomb.last_words": "遗言",
    "tomb.glory": "荣耀", 
    
    // RITUALS
    "tomb.ritual_btn": "选择祭奠仪式",
    "tomb.pay_respects": "已完成祭奠",
    "tomb.total_respects": "纸钱: {count}",
    "tomb.score": "阴德值",
    "tomb.share_btn": "分享讣告", // NEW
    "share.obituary": "这里躺着 {name}。死于 {cause}。这是一个很好的项目。R.I.P.", // NEW

    "ritual.candle": "点亮心灯 (+1)",
    "ritual.coffee": "倒杯咖啡 (+2)",
    "ritual.bug": "清除Bug (+3)",
    "ritual.fire": "火化超度 (+5)",
    "ritual.salute": "按下F键 (+1)",
    "ritual.waifu": "烧个老婆 (+10)",

    // Restrictions
    "restriction.daily_limit": "⚠️ 灵力耗尽：今日限制 (5/5)。登录后解锁无限火力。",
    "restriction.auth_required": "🔒 需要登录才能进行此仪式。",
    "restriction.waifu_locked": "🔒 权限不足：游魂不配烧二次元老婆。请先登录。",
    "restriction.already_paid": "⏳ 你已祭奠过此墓。请一年后再来扫墓。",

    // Tiers
    "tier.gold": "金身舍利",
    "tier.silver": "白银棺椁",
    "tier.bronze": "青铜尸首",
    "tier.iron": "铁皮盒子",
    "tier.wood": "烂木头",
    "tier.rotten": "骨灰渣",

    "list.empty": "这里很干净，还没有尸体。",
    "list.suspicious": "安静得可怕...",
    "list.load_more": "召唤更多...",
    "list.no_more": "到底了，别挖了。",
    "detail.back": "← 回乱葬岗",
    "home.cta_bury": "⚰️ 我要收尸",
    "home.cta_sub": "埋葬一个死去的项目",

    "footer.toolmaker": "首席赶尸人: Tom He",
    "ad.sponsored": "特别赞助",
    "ad.desc": "方便个人创意写作的得力助手。",

    // Sorting
    "sort.label": "排列",
    "sort.newest": "刚断气的",
    "sort.stars": "生前显赫",
    "sort.respects": "哭声最大",

    "preset.machine": "在我机器上能跑。",
    "preset.todo": "TODO: 以后再修。",
    "preset.rust": "下个版本用 Rust 重写。",
    "preset.weekend": "只是个周末项目。",
    "preset.console": "Console.log('再见');",
    "preset.coffee": "咖啡喝光了。",
    "preset.docs": "文档加载中...",
    "preset.404": "404: 动力未找到"
  }
};

const CAUSE_TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    [DeathCause.LOST_INTEREST]: "Lost Interest (3-Minute Passion)",
    [DeathCause.NO_MARKET]: "Zero Users / No Market",
    [DeathCause.LIFE_HAPPENED]: "Life Happened (Touched Grass)",
    [DeathCause.TECH_DEBT]: "Suffocated by Spaghetti Code",
    [DeathCause.DEPENDENCY_HELL]: "Crushed by node_modules",
    [DeathCause.WORKS_ON_MACHINE]: "Works on My Machine (Only)",
    [DeathCause.SHINY_OBJECT]: "Distracted by New Framework",
    [DeathCause.PERFECTIONISM]: "Refactored Until It Died",
    [DeathCause.BURNOUT]: "Developer Evaporated (Burnout)",
    [DeathCause.FEATURE_CREEP]: "Bloated to Death (Feature Creep)",
    [DeathCause.KILLED_BY_COMPETITOR]: "Killed by Competitor",
    [DeathCause.AI_REPLACED]: "Obsoleted by AI",
    [DeathCause.DOMAIN_EXPIRED]: "Forgot to Renew Domain",
    [DeathCause.FLOPPED]: "Shipped but Flopped"
  },
  zh: {
    [DeathCause.LOST_INTEREST]: "三分钟热度 (Lost Interest)",
    [DeathCause.NO_MARKET]: "伪需求 (Zero Users)",
    [DeathCause.LIFE_HAPPENED]: "生活所迫 (Life Happened)",
    [DeathCause.TECH_DEBT]: "屎山塌方 (Tech Debt)",
    [DeathCause.DEPENDENCY_HELL]: "依赖地狱 (Dependency Hell)",
    [DeathCause.WORKS_ON_MACHINE]: "在我机器上能跑 (Works on My Machine)",
    [DeathCause.SHINY_OBJECT]: "乱用新框架 (Shiny Object Syndrome)",
    [DeathCause.PERFECTIONISM]: "过度重构 (Perfectionism)",
    [DeathCause.BURNOUT]: "开发者跑路 (Burnout)",
    [DeathCause.FEATURE_CREEP]: "需求膨胀 (Feature Creep)",
    [DeathCause.KILLED_BY_COMPETITOR]: "被竞品卷死 (Killed by Competitor)",
    [DeathCause.AI_REPLACED]: "被AI取代 (Obsoleted by AI)",
    [DeathCause.DOMAIN_EXPIRED]: "域名过期 (Domain Expired)",
    [DeathCause.FLOPPED]: "发布即暴死 (Flopped)"
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('graveyard_lang');
    if (saved === 'en' || saved === 'zh') {
        setLanguage(saved);
    }
  }, []);

  // Save to local storage
  const handleSetLanguage = (lang: Language) => {
      setLanguage(lang);
      localStorage.setItem('graveyard_lang', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

export const useCauseTranslation = (cause: DeathCause) => {
    const { language } = useTranslation();
    return CAUSE_TRANSLATIONS[language][cause] || cause;
}

export { CAUSE_TRANSLATIONS };
