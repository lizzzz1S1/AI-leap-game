// ===== AI大跃进生存模拟器 v2 =====
(function(){
'use strict';

// ===== GAME STATE =====
const STATE = {
  quarter: 0,
  selectedActions: [],
  phase: 'start', // start, profile, intro, action, event, branch, summary, ending
  stats: {},
  hidden: {},
  flags: {},
  history: [],
  actionHistory: [],
  eventLog: [],
  // Player profile
  gender: '', // 'male' | 'female'
  playerName: '',
  playerBio: '',
  // Tooltip
  showTooltip: null,
  // Previous narration for back button
  _currentNarration: '',
};

function initStats() {
  STATE.stats = { skill:20, influence:20, fame:10, money:30, energy:70, mood:60 };
  STATE.hidden = { positioning:0, survival:10 };
  STATE.flags = {};
  STATE.history = [];
  STATE.actionHistory = [];
  STATE.eventLog = [];
  STATE.quarter = 0;
  STATE.selectedActions = [];
}

// ===== STAT CONFIG =====
const STAT_META = {
  skill:     { icon:'🧠', label:'技能',   color:'#8b5cf6', tip:'AI、产品、技术的综合能力水平' },
  influence: { icon:'🏢', label:'影响力', color:'#3b82f6', tip:'你在公司内部的话语权和不可替代性' },
  fame:      { icon:'📢', label:'知名度', color:'#f59e0b', tip:'你在行业外部的个人品牌和曝光度' },
  money:     { icon:'💰', label:'资源',   color:'#10b981', tip:'存款和抗风险能力，决定你能否主动选择' },
  energy:    { icon:'⚡', label:'体力',   color:'#f97316', tip:'身体和精神能量，过低会严重影响行动' },
  mood:      { icon:'❤️', label:'情绪',   color:'#ec4899', tip:'幸福感和心理稳定性，影响长期判断力' },
};

// ===== ACTIONS (adjusted energy costs) =====
const ACTIONS = [
  { id:'work', label:'💼 打工搬砖', desc:'稳定收入', effects:{money:8, influence:5, energy:-3, mood:-3}, hiddenFx:{survival:1} },
  { id:'learn_ai', label:'🤖 学AI', desc:'押注AI主线', effects:{skill:10, energy:-5, mood:-2}, hiddenFx:{positioning:1} },
  { id:'build', label:'🔧 产出项目', desc:'做可见成果', effects:{influence:6, fame:4, money:3, energy:-7, mood:-2}, hiddenFx:{positioning:2},
    bonus: s => {
      const b = {};
      if(s.skill>=40){ b.skill=3; b.influence=3; }
      if(s.skill>=60){ b.fame=4; b.money=3; }
      return b;
    }
  },
  { id:'share', label:'✍️ 输出分享', desc:'建个人品牌', effects:{fame:8, influence:3, energy:-3, mood:1}, hiddenFx:{positioning:1} },
  { id:'network_in', label:'🤝 公司社交', desc:'组织可见度', effects:{influence:8, mood:2, energy:-2}, hiddenFx:{} },
  { id:'network_out', label:'🌐 行业社交', desc:'外部机会', effects:{fame:6, mood:3, energy:-3, money:-3}, hiddenFx:{positioning:1} },
  { id:'rest', label:'🧘 休息运动', desc:'恢复精力', effects:{energy:15, mood:8, money:-2}, hiddenFx:{survival:1} },
  { id:'think', label:'📚 学习思考', desc:'通用能力', effects:{skill:4, mood:6, energy:3, fame:-1}, hiddenFx:{positioning:1, survival:4} },
];

// ===== RANDOM EVENTS =====
const PERSONAL_EVENTS = [
  { title:'你的AI小工具在组内火了', text:'同事们开始每天用你做的提效脚本，你感到久违的成就感。', effects:{influence:10, mood:6, skill:3}, tone:'positive' },
  { title:'形成了自己的AI工作流', text:'不再追每个新工具，而是沉淀出一套稳定的工作方法。', effects:{skill:6, energy:6, influence:4}, tone:'positive' },
  { title:'一位前辈开始带你', text:'TA不教你怎么用工具，而是教你怎么判断——什么值得做，什么是噪音。', effects:{skill:8, mood:8}, hiddenFx:{positioning:2}, tone:'positive' },
  { title:'第一次做出完整可用Demo', text:'从想法到产品，独立完成。这种掌控感让你确信自己不只是时代的旁观者。', effects:{skill:8, fame:5, mood:5}, tone:'positive' },
  { title:'想清楚了一个长期困扰的问题', text:'不是AI的问题，是关于自己到底想成为什么样的人。', effects:{mood:10, skill:4}, hiddenFx:{survival:3}, tone:'positive' },
  { title:'学了一堆新概念但没有自己的方法论', text:'RAG、Agent、MoE…你能说出所有术语，却说不清自己到底会什么。', effects:{mood:-8, skill:-2, fame:2}, tone:'negative' },
  { title:'Demo做完了但没人用', text:'很酷的技术，零复用率。你开始怀疑"做东西"和"做有用的东西"之间的距离。', effects:{mood:-9, fame:3, influence:-2}, tone:'negative' },
  { title:'把所有问题都理解成AI问题', text:'买菜想用Agent，写周报想fine-tune。你已经分不清锤子和钉子了。', effects:{skill:-3, mood:-6}, hiddenFx:{positioning:-1}, tone:'negative' },
  { title:'焦虑型信息过载', text:'每天刷200条AI新闻，看到别人的产出就心悸。你很久没有安静地想过事了。', effects:{mood:-8, energy:-4}, tone:'negative' },
  { title:'你很久没有认真生活了', text:'上一次不看手机地吃完一顿饭是什么时候？你记不清了。', effects:{mood:-12, energy:-5}, tone:'negative' },
];

const COMPANY_EVENTS = [
  { title:'领导把AI当效率工具而非表演', text:'终于来了一个务实的老板。不再要求每周出AI汇报PPT了。', effects:{influence:8, money:5, energy:4}, tone:'positive' },
  { title:'老板开始重视真正落地的人', text:'那些只会喊口号的人被边缘化了，你的实际产出被看到。', effects:{influence:10, money:4}, tone:'positive' },
  { title:'公司开放AI试点预算', text:'终于有钱有算力了。虽然预算不多，但至少能做真实的东西了。', effects:{influence:6, money:6, skill:3}, tone:'positive' },
  { title:'直属领导愿意替你扛风险', text:'TA说"你去试，出了问题我兜着。"这在大厂是极稀缺的东西。', effects:{mood:8, influence:6}, tone:'positive', flag:'boss_shield' },
  { title:'AI中台成立，你是核心成员', text:'从边缘探索变成正式编制。你的方向终于从"个人爱好"变成了"公司战略"。', effects:{influence:12, skill:5, money:5}, tone:'positive' },
  { title:'全员AI运动', text:'领导要求每个人本月必须出一个AI应用，不管有没有场景。形式主义入侵了创新。', effects:{energy:-8, mood:-8}, tone:'negative' },
  { title:'AI成为裁员借口', text:'"AI可以替代这些岗位了。"你知道其实替代不了，但这个说法很好用。', effects:{mood:-10, energy:-6}, tone:'negative',
    bonus: s => (s.skill>=60||s.influence>=50)?{money:3}:{}
  },
  { title:'预算被砍，项目只剩PPT', text:'上个季度还在招人扩编，这个季度直接砍到底。你的Demo变成了归档文件。', effects:{influence:-5, mood:-7, money:-2}, tone:'negative' },
  { title:'跨部门内耗', text:'三个部门都想当AI的牵头方。最后谁也没做出来，但工时全花在了对齐上。', effects:{energy:-7, influence:-4, mood:-5}, tone:'negative' },
  { title:'新高管否定上轮AI方向', text:'新来的VP说"之前的路线全是弯路"。你的半年积累被宣判无效。', effects:{mood:-8, skill:-2}, tone:'negative' },
  { title:'外包AI咨询团队入场', text:'他们比你懂得少，但PPT比你好看10倍。老板信了。', effects:{mood:-6, influence:-2}, tone:'negative' },
];

const INDUSTRY_EVENTS = [
  { title:'开源大模型爆发', text:'开源模型持续突破。AI的门槛一夜之间降了一个量级。', effects:{skill:8, energy:3}, tone:'positive' },
  { title:'推理成本暴降', text:'一年前100美元跑一次的任务，现在1美元。应用层的大门真正打开了。', effects:{skill:4, money:4}, tone:'positive' },
  { title:'多模态生成走向成熟', text:'文字、图像、视频、代码的壁垒正在消失。"全栈创作者"成为可能。', effects:{skill:6, fame:6}, tone:'positive' },
  { title:'Agent工具链成熟', text:'AI不再只是回答问题，而是开始替你干活了。', effects:{skill:7, influence:5, money:3}, tone:'positive' },
  { title:'具身智能出现商用拐点', text:'机器人不再只在实验室里。工厂、仓储、配送——物理世界的AI时代要来了。', effects:{skill:5, mood:5}, hiddenFx:{positioning:4}, tone:'positive' },
  { title:'你学的技能贬值了', text:'上个月花两周掌握的技巧，这个月模型已经不需要了。', effects:{mood:-7, skill:-3}, tone:'negative' },
  { title:'行业叙事又切换了', text:'上季度是Agent，这季度是Embodied AI。你永远在追最新的那个词。', effects:{mood:-8, fame:-2}, tone:'negative' },
  { title:'巨头发布一体化平台', text:'独立工具创业者一夜归零。大厂把你能做的全部做了，还免费。', effects:{mood:-6, money:-4}, tone:'negative' },
  { title:'AI泡沫过热', text:'投资人开始问"你的AI项目有多少真实用户？"答案让整个行业尴尬。', effects:{fame:4, mood:-5}, tone:'negative' },
  { title:'人才向头部极端集中', text:'最强的人都去了头部公司。中腰部的AI团队越来越难招人。', effects:{mood:-8, fame:-3}, tone:'negative' },
  { title:'监管收紧', text:'新出的AI管理办法要求所有模型备案。你的实验性项目全部暂停审批。', effects:{influence:-4, fame:-4, mood:-5}, tone:'negative' },
];

const SOCIAL_EVENTS = [
  { title:'国家推动AI新基建', text:'算力中心、数据立法、AI教育补贴——政策红利来了。', effects:{money:6, influence:5, skill:3}, tone:'positive' },
  { title:'能源突破降低算力成本', text:'新能源的进展让算力不再是瓶颈。AI的天花板又高了一点。', effects:{skill:4, money:4}, tone:'positive' },
  { title:'全民AI教育普及', text:'你妈都会用AI了。门槛降低意味着应用层的市场炸了。', effects:{fame:3, skill:4}, tone:'positive' },
  { title:'全球经济收缩', text:'创新预算在所有公司被优先砍掉。"先活下来再说。"', effects:{money:-5, mood:-5}, tone:'negative' },
  { title:'社会AI恐慌', text:'"AI会不会取代我？"从专业讨论变成社会焦虑。你被亲戚问了20遍。', effects:{mood:-7, fame:-3}, tone:'negative',
    bonus: s => (s.skill>=60)?{influence:3}:{}
  },
];

// ===== MAJOR EVENTS =====
const MAJOR_EVENTS = {
  company_collapse: {
    title:'💀 公司现金流断裂，宣布倒闭',
    text:'融资没到账，客户在流失，上周五大家还在加班做Q4规划，周一就收到了全员信。\n\n你的工卡明天就失效了。',
    category:'company', minQuarter: 5,
    condition: () => true,
    applyPassive: () => { STATE.flags.companycollapsed = true; },
    branches: [
      { label:'立刻找工作', desc:'简历能不能打？',
        apply: s => {
          if(s.skill>=50||s.fame>=40||s.influence>=40)
            return { effects:{money:-5,mood:-4}, text:'凭借积累的能力和名声，你两周内拿到了新offer。虽然薪资打了折，但至少船没沉。' };
          return { effects:{money:-10,mood:-12,energy:-8}, text:'简历石沉大海。你发现离开了公司抬头，自己好像什么都不是。', flag:'unemployed' };
        }
      },
      { label:'借机单干', desc:'需要存款和名声',
        apply: s => {
          if(s.money>=40&&(s.fame>=45||s.skill>=55))
            return { effects:{money:-15,mood:5,energy:-5}, text:'你终于做了一直想做的事——自己干。储蓄在烧，但每天醒来是为自己工作的感觉太好了。', flag:'solo' };
          return { effects:{money:-20,mood:-10,energy:-10}, text:'没有足够的积蓄和人脉，单干变成了硬撑。三个月后你还是得去找工作。' };
        }
      },
      { label:'先停下来，想清楚', desc:'修整自己，准备好再出发',
        apply: () => ({ effects:{mood:4,energy:6,money:-5}, hiddenFx:{survival:4}, text:'你做了一个反直觉的决定：不着急。花时间想清楚自己到底要什么。' })
      },
    ]
  },

  ai_winter: {
    title:'🧊 AI行业进入深度调整期',
    text:'不是泡沫破裂，而是更微妙的事情：所有人都发现AI很好，但没有人知道怎么赚钱。\n\n投资放缓、项目缩编、AI工程师开始投非AI岗位。',
    category:'industry', minQuarter: 5,
    condition: () => !STATE.flags.aiindustryfrozen,
    applyPassive: () => { STATE.flags.aiindustryfrozen = true; STATE.flags.ai_skill_nerf = true; },
    branches: [
      { label:'坚守AI，等待复苏', desc:'冬天总会过去的',
        apply: () => ({ effects:{money:-5,mood:-4}, hiddenFx:{positioning:3}, text:'你选择留下来。很多同行离开了，但你知道——冬天离开的人，春天回不来了。' })
      },
      { label:'转向AI+传统行业', desc:'AI是工具，行业是根基',
        apply: s => {
          if(STATE.hidden.survival>=30)
            return { effects:{money:4,mood:2}, text:'你发现医疗、教育、制造这些领域对AI的需求才刚开始。不够性感，但足够真实。' };
          return { effects:{mood:-5,money:-3}, text:'你想转，但发现自己除了AI什么行业都不懂。' };
        }
      },
      { label:'回炉学习第二技能', desc:'不把鸡蛋放在一个篮子里',
        apply: () => ({ effects:{money:-4,skill:2}, hiddenFx:{survival:8}, text:'你开始认真学习AI以外的东西。不是因为不相信AI了，而是学会了不把自己绑在一条线上。' })
      },
    ]
  },

  war: {
    title:'🔥 地缘冲突升级，局势急剧紧张',
    text:'先是制裁，然后是断供，然后是某个海峡的新闻占满了所有屏幕。\n\n你的日常、你的行业、你的计划——突然都不重要了。',
    category:'social', minQuarter: 4, // Q4 2026 = quarter 4
    condition: () => !STATE.flags.warstarted && Math.random() < 0.35,
    applyPassive: () => { STATE.flags.warstarted = true; STATE.flags.work_nerf = true; },
    branches: [
      { label:'进入国家体系', desc:'个人命运汇入集体命运',
        apply: () => ({ effects:{energy:-8,mood:-4}, flag:'joinedwar', text:'你报了名。你不知道前面是什么，但在这种时刻，个人的选择空间本来就很小。' })
      },
      { label:'撤到安全区域', desc:'活着就是最大的胜利',
        apply: () => ({ effects:{money:-8,mood:-6}, hiddenFx:{survival:2}, text:'你变卖了一些东西，离开了。你没有勇气留下，但你有活下去的本能。' })
      },
      { label:'转入后方技术支援', desc:'用技能服务更大的事',
        apply: s => {
          if(STATE.hidden.survival>=25||s.skill>=50)
            return { effects:{influence:4,money:3}, flag:'joinedsupport', text:'你的技术能力在这里反而更被需要。和平时期看不上的技能，战时就是关键。' };
          return { effects:{mood:-5}, text:'你想帮忙，但发现自己的能力太窄了。' };
        }
      },
    ]
  },

  resource_crisis: {
    title:'⛽ 全球资源危机',
    text:'芯片断供、电价暴涨、数据中心限电。\n\nAI行业最依赖的东西——算力——突然变成了奢侈品。',
    category:'social', minQuarter: 4,
    condition: () => !STATE.flags.resourcecollapse && Math.random() < 0.4,
    applyPassive: () => { STATE.flags.resourcecollapse = true; },
    branches: [
      { label:'缩减欲望，保住基本盘', desc:'断舍离',
        apply: () => ({ effects:{money:-2,mood:1}, text:'你退掉了算力订阅，取消了一半的SaaS。突然发现很多东西本来就不需要。' })
      },
      { label:'用储蓄换时间', desc:'烧钱撑过去',
        apply: () => ({ effects:{money:-8,mood:2}, text:'你相信这是暂时的。但银行卡余额让你越来越焦虑。' })
      },
      { label:'学习非AI生存技能', desc:'不用电的能力就是武器',
        apply: () => ({ effects:{mood:-2}, hiddenFx:{survival:6}, text:'你开始认真思考：如果AI不可用了，你还能靠什么活？' })
      },
    ]
  },

  talent_earthquake: {
    title:'🌊 竞对核心团队集体出走',
    text:'竞对公司CTO带着核心人员跳槽了。整个行业都在招人——猎头正在打你的电话。',
    category:'company', minQuarter: 3,
    condition: () => !STATE.flags.talent_quake,
    applyPassive: () => { STATE.flags.talent_quake = true; },
    branches: [
      { label:'留下来补位', desc:'别人走了就是你的机会',
        apply: () => ({ effects:{influence:8,energy:-6}, text:'你没有跟风。反而在混乱中接手了更多项目，老板开始记住你了。' })
      },
      { label:'跳槽去竞对', desc:'薪资+40%的诱惑',
        apply: () => ({ effects:{money:10,fame:4,influence:-8}, text:'你去了。薪资确实涨了，但在新公司是nobody，一切重新开始。', flag:'jumped' })
      },
      { label:'保持观望', desc:'等局势明朗',
        apply: () => ({ effects:{mood:-2}, text:'你既没有走，也没有趁机争取什么。窗口期就这样过去了。' })
      },
    ]
  },

  gpt_moment: {
    title:'🚀 新一代模型颠覆认知',
    text:'新模型发布了。不是渐进提升，是代际飞跃。\n\n它能自主完成整个软件项目。你上个月引以为傲的技能，突然像打字机一样过时了。',
    category:'industry', minQuarter: 3,
    condition: () => !STATE.flags.gpt_moment,
    applyPassive: () => { STATE.flags.gpt_moment = true; STATE.flags.build_changed = true; },
    branches: [
      { label:'ALL IN 新范式', desc:'扔掉旧的，全力拥抱',
        apply: s => {
          if(s.skill>=40)
            return { effects:{skill:8,mood:5,energy:-8}, hiddenFx:{positioning:3}, text:'你有足够的基础来快速迁移。两周内已经在新范式上跑通了第一个项目。' };
          return { effects:{skill:3,mood:-5,energy:-10}, text:'你想跟上，但基础不够扎实。焦虑翻倍。' };
        }
      },
      { label:'观察，不急着跟', desc:'看看是不是又一个三个月热度',
        apply: () => ({ effects:{mood:-3}, hiddenFx:{survival:2}, text:'你选择先看看。但这次…好像真的不一样。' })
      },
      { label:'反思自己的护城河', desc:'什么能力不会被替代？',
        apply: () => ({ effects:{mood:3,skill:4}, hiddenFx:{survival:3,positioning:1}, text:'你问了自己一个重要的问题：如果AI能做我做的事，我还剩下什么？答案比想象中多。' })
      },
    ]
  },
};

const MAJOR_EVENT_SCHEDULE = [
  { q:3, ids:['talent_earthquake','gpt_moment'] },
  { q:4, ids:['talent_earthquake','gpt_moment','resource_crisis','war'] },
  { q:5, ids:['company_collapse','ai_winter','resource_crisis','war'] },
  { q:6, ids:['company_collapse','ai_winter','resource_crisis','war'] },
  { q:7, ids:['ai_winter','war','resource_crisis'] },
  { q:8, ids:['war'] },
];

// ===== ENDINGS =====
const ENDINGS = [
  // Critical stat failures - highest priority
  { id:'burnout', priority:0,
    condition: s => s.energy <= 10,
    title:'🔋 过载熄火',
    text:'你的身体替你做了一个大脑不肯做的决定：停下来。\n\n不是不想卷了——是卷不动了。心悸、失眠、胸闷，你终于去看了医生。\n\n医生说的第一句话是："你上一次休息是什么时候？"\n\n你答不上来。',
    tags:['过载型','身体透支','系统崩溃']
  },
  { id:'hollow', priority:0,
    condition: s => s.mood <= 10,
    title:'🫥 空心追风者',
    text:'从外面看，你也许还行。但你自己知道，你已经很久没有因为做成了什么而真正开心了。\n\n你在追的不是AI，不是事业——你在追一种"不被抛下"的安全感。而这种安全感，追得越急，跑得越远。',
    tags:['空心型','意义缺失','情绪崩溃']
  },
  { id:'broke', priority:0,
    condition: s => s.money <= 5,
    title:'💸 弹尽粮绝',
    text:'信用卡账单越来越长，房租越来越难凑。\n\n你曾经以为在AI时代最重要的是技能和认知。但当银行卡余额归零的时候，你才发现：最基本的安全感来自你能不能付得起下个月的房租。\n\n你需要暂停一切宏大叙事，先解决生存问题。',
    tags:['资源耗尽','生存危机','现实主义']
  },
  // War endings
  { id:'war_hero', priority:1,
    condition: s => STATE.flags.warstarted && STATE.flags.joinedwar && s.energy>=25,
    title:'🎖️ 战时功勋者',
    text:'当世界进入极端状态时，你没有退到旁观席。\n\n你失去了程序员/分析师的身份，获得了另一种无法写在简历上的东西。\n\n二十年后有人问起AI大跃进那几年，你的故事和大多数人不同。',
    tags:['宏观冲击承受者','非常规路径','时代亲历者']
  },
  { id:'war_support', priority:1,
    condition: s => STATE.flags.warstarted && STATE.flags.joinedsupport,
    title:'🔧 后方建设者',
    text:'战争切断了你原本的工作和节奏。\n\n但你发现自己的技能在另一个系统里重新有了意义——不是训练模型，而是保障通信、优化后勤、维护基础设施。\n\n你曾经觉得这些事情"不够前沿"。现在你知道了：前沿和基础，从来不是一个维度的竞争。',
    tags:['通用生存力','系统贡献者','第二技能持有者']
  },
  { id:'war_drifter', priority:1,
    condition: s => STATE.flags.warstarted && s.money<30 && STATE.hidden.survival<25,
    title:'🌊 时代洪流中的漂流者',
    text:'战争来得太快，快到你来不及准备第二种活法。\n\n原本的工作、行业、计划全部失效。你在更大的洪流中被迫迁移、适应、忍受。\n\n你不是失败者。只是你准备应对的那个世界，和最终到来的这个世界，不是同一个。',
    tags:['宏观冲击承受者','单一押注者','被动转型']
  },
  // Industry freeze
  { id:'cross_cycle', priority:2,
    condition: s => (STATE.flags.aiindustryfrozen||STATE.flags.resourcecollapse) && STATE.hidden.survival>=35 && s.mood>=35,
    title:'🔄 跨周期生存者',
    text:'当很多人还在等AI行业恢复时，你已经在另一个领域站住了脚。\n\n不是因为你不相信AI，而是因为你很早就想清楚了：押注一个行业和押注自己，是两回事。\n\n风口来的时候你在上面，风口走的时候你还在。这不是运气，这是结构性的生存能力。',
    tags:['多线程生存者','跨周期能力','第二技能持有者']
  },
  { id:'ai_stuck', priority:2,
    condition: s => STATE.flags.aiindustryfrozen && s.skill>=50 && STATE.hidden.survival<25 && s.money<40,
    title:'❄️ 行业停滞受困者',
    text:'你曾经非常适配这个时代。\n\n可当行业本身停下来的时候，你突然发现自己会的所有东西都系在同一根绳上。\n\n你不是没有能力——你是把能力押得太单一了。\n\n最讽刺的是，你的技能曲线完美匹配了一个已经暂停的行业。',
    tags:['单一押注者','高技能低冗余','行业依赖型']
  },
  // Company collapse
  { id:'phoenix', priority:3,
    condition: s => STATE.flags.companycollapsed && (s.skill>=55||s.fame>=45),
    title:'🔥 废墟中的重启者',
    text:'公司倒了，但你没有跟着一起沉下去。\n\n你带着能力和作品切换到下一艘船——或者自己造了一艘。\n\n你终于明白了一件事：真正的职业安全感从来不来自公司。它来自你离开任何一家公司后，还能被需要。',
    tags:['抗脆弱','能力可迁移','独立价值']
  },
  { id:'org_victim', priority:3,
    condition: s => STATE.flags.companycollapsed && s.money<25 && STATE.hidden.survival<25,
    title:'🏚️ 组织瓦解后的失速者',
    text:'你过于相信组织会一直存在。\n\n当公司突然倒下时，你才发现自己的履历、关系和能力都没有独立的根基。\n\n时代没有专门针对你。但它确实优先淘汰了那些只有一个支点的人。',
    tags:['组织依赖型','单一押注者','低冗余']
  },
  // Normal endings
  { id:'wave_rider', priority:4,
    condition: s => s.skill>=70 && s.fame>=50 && STATE.hidden.positioning>=10,
    title:'🏄 浪潮驾驭者',
    text:'你没有被每一次技术更新牵着鼻子走。\n\n在所有人追新闻的时候，你在追结构；在所有人追工具的时候，你在追问题。\n\n你不是风口的游客，而是少数真正理解风为什么吹、会吹向哪里的人。',
    tags:['技术深耕型','长期主义者','趋势判断力']
  },
  { id:'org_alchemist', priority:4,
    condition: s => s.influence>=65 && s.skill>=60 && !STATE.flags.companycollapsed,
    title:'⚗️ 组织炼金术士',
    text:'很多人会说AI，少数人会做AI，而你——你能把AI变成组织里真正能用的东西。\n\n你穿过了口号、汇报、预算和内耗，最后把自己做成了组织离不开的接口。',
    tags:['组织生存型','技术落地','不可替代']
  },
  { id:'creator', priority:4,
    condition: s => s.fame>=70 && s.skill>=50 && s.mood>=40,
    title:'🎨 AI时代的独立创作者',
    text:'你把AI当作创作杠杆，而不是身份标签。\n\n你持续输出、持续做东西，最终在组织之外长出了自己的小型生态位。\n\n你的收入不一定最高，但你的自由度和意义感在同龄人中是顶格的。',
    tags:['外部表达型','独立生态位','创作者经济']
  },
  { id:'human_ai', priority:4,
    condition: s => s.skill>=55 && s.mood>=50,
    title:'🤝 人机协作者',
    text:'你没有把AI当成焦虑源，也没有把它当成装饰。\n\n你把它接入了自己的工作流、表达和决策系统。最后它没有吞掉你，而是放大了你。\n\n在一个人人都在问"AI会不会取代我"的时代，你找到了"AI怎么让我变强"的答案。',
    tags:['人机协作','工具理性','稳态增长']
  },
  { id:'hermit', priority:4,
    condition: s => s.mood>=70 && s.energy>=65,
    title:'🏔️ 赛博隐士',
    text:'你主动退出了最吵闹的地方。\n\n不再让每一轮叙事更新决定自己的生活节奏。你错过了一些机会，但保住了一些更重要的东西。\n\n你没有成为最亮的那个人，但你成为了少数没有把自己弄丢的人。',
    tags:['节奏守护型','长期主义者','内在驱动']
  },
  { id:'speculator', priority:4,
    condition: s => s.fame>=55 && s.money>=40 && s.skill<45,
    title:'🎰 一波流投机家',
    text:'你踩中过热点，从泡沫中赚到过真金白银。\n\n但热度退去后的问题不是你能不能讲故事——是你讲的故事有没有下一章。',
    tags:['泡沫穿行者','高知名高波动','短期变现']
  },
  { id:'skipped', priority:5,
    condition: s => s.skill<=25 && s.fame<=20,
    title:'👤 被时代跳过的人',
    text:'不是你不努力，是你始终没有找到切入点。\n\n每次你准备好的时候，规则已经变了。最终时代跳过了你。不是恶意的，只是…它太快了。',
    tags:['被动者','跟不上节奏','时代摩擦']
  },
  // Default
  { id:'survivor', priority:99,
    condition: () => true,
    title:'🌱 稳态生存者',
    text:'你没有成为时代样板，也没有彻底掉队。\n\n你在变化中勉强站稳，在焦虑中维持前进。\n\n这不够传奇。但在一个一年变三次的行业里，"稳稳地活着"本身就已经是一种被低估的胜利。',
    tags:['稳态型','中位数人生','真实主义']
  },
];

// ===== QUARTER NARRATIONS (starting from 2026) =====
const QUARTER_NARRATIONS = [
  '',
  '2026年Q1。AI的发展速度超过了所有人的预期。每个公司都在谈AI转型，但大多数人还在摸索。\n\n你是一名大厂打工人，你的老板说"每个人都要用起来"，但没有人告诉你用来做什么。\n\n你有最多3次行动机会。',
  '2026年Q2。公司里"AI转型"出现在了每周OKR里。有人升职了因为做了一个AI demo，有人被优化了因为"岗位可以被AI替代"。\n\n恐惧和机会同时弥漫。',
  '2026年Q3。行业开始分化。有人在卷技术深度，有人在卷个人品牌，有人在卷创业。你开始隐约感到：选择比努力重要，但你不知道该选什么。',
  '2026年Q4。年底了。你的年终总结里不可避免地要写"AI相关成果"。真的有成果吗？还是说你只是……一直在跟着跑？',
  '2027年Q1。新的一年。去年的"前沿"已经变成了"入门"。你开始感到一种新的压力：不是不努力，而是努力的方向可能从一开始就不对。',
  '2027年Q2。行业叙事进入深水区。泡沫论和革命论同时存在。你身边有人因为AI实现了财务自由，也有人因为"AI替代"而被裁员。\n\n唯一确定的是：不确定性本身，才是这个时代唯一的确定。',
  '2027年Q3。你开始更频繁地问自己一些非AI的问题：我到底想要什么样的生活？如果明天AI行业消失了，我还能做什么？',
  '2027年Q4。最后一个季度。不管之前做了什么选择，这都是你为自己的故事写结尾的时刻。\n\n回头看这两年，什么变了？什么没变？什么是你真正留下的？',
];

// ===== RENDERING =====
const $app = document.getElementById('app');

function render() {
  // Close tooltip when switching phase
  STATE.showTooltip = null;
  switch(STATE.phase) {
    case 'start': renderStart(); break;
    case 'profile': renderProfile(); break;
    case 'intro': renderIntro(); break;
    case 'action': renderAction(); break;
    case 'event': renderEvent(); break;
    case 'branch': renderBranch(); break;
    case 'summary': renderSummary(); break;
    case 'ending': renderEnding(); break;
  }
}

function getAvatar() {
  return STATE.gender === 'female' ? '👩' : '👨';
}

function renderTooltipHTML() {
  if(!STATE.showTooltip) return '';
  return `<div class="tooltip-overlay" onclick="G.closeTooltip()">
    <div class="tooltip-box" onclick="event.stopPropagation()">
      <div style="font-size:20px;margin-bottom:6px">${STATE.showTooltip.icon}</div>
      <div style="font-weight:600;margin-bottom:4px">${STATE.showTooltip.label}</div>
      <div>${STATE.showTooltip.tip}</div>
      <button class="close-tip" onclick="G.closeTooltip()">知道了</button>
    </div>
  </div>`;
}

// Ship ASCII art
const SHIP_ART = `
         ⛵
      __|__
     |     |
   __|_____|__
  /            \\
 /              \\
~~~~~~~~~~~~~~~~~
  ≈ ≈ ≈ ≈ ≈ ≈ ≈ ≈
    ≈ ≈ ≈ ≈ ≈ ≈
`;

function renderStart() {
  $app.innerHTML = `
    <div class="start-screen">
      <h1>AI大跃进<br>生存模拟器</h1>
      <p class="subtitle">
        2026-2027，AI大跃进时代。<br>
        你是一名大厂打工人。<br>
        8个季度，每季度最多3次行动。<br>
        你以为自己在规划职业，<br>
        最后发现你在穿越一个时代。
      </p>
      <button class="start-btn" onclick="G.startGame()">开始模拟</button>
      <div class="ship-art">${SHIP_ART}</div>
    </div>
  `;
}

function renderProfile() {
  const mSel = STATE.gender==='male' ? ' selected' : '';
  const fSel = STATE.gender==='female' ? ' selected' : '';
  const canGo = STATE.gender && STATE.playerName.trim();
  $app.innerHTML = `
    <div class="profile-screen">
      <h2>创建你的角色</h2>
      <div class="gender-select">
        <button class="gender-btn${fSel}" onclick="G.setGender('female')">👩</button>
        <button class="gender-btn${mSel}" onclick="G.setGender('male')">👨</button>
      </div>
      <div class="profile-field">
        <label>你的名字</label>
        <input id="nameInput" type="text" placeholder="输入姓名" maxlength="12" value="${STATE.playerName}" oninput="G.setName(this.value)">
      </div>
      <div class="profile-field">
        <label>一句话简介（选填）</label>
        <input id="bioInput" type="text" placeholder="e.g. 大厂搬砖三年的运营" maxlength="30" value="${STATE.playerBio}" oninput="G.setBio(this.value)">
      </div>
      <button class="btn btn-primary ${canGo?'':'btn-disabled'}" onclick="G.confirmProfile()" style="margin-top:24px">进入游戏 →</button>
    </div>
  `;
}

function renderTopBar() {
  const q = STATE.quarter;
  const year = q <= 4 ? '2026' : '2027';
  const qLabel = `Q${((q-1)%4)+1}`;
  const progress = (q / 8) * 100;
  
  let statsRows = '';
  for(const [key,meta] of Object.entries(STAT_META)) {
    const val = Math.max(0, Math.min(100, STATE.stats[key]));
    const barColor = val <= 20 ? '#ef4444' : meta.color;
    statsRows += `
      <div class="stat-row">
        <span class="stat-icon">${meta.icon}</span>
        <span class="stat-label">${meta.label}</span>
        <button class="stat-info-btn" onclick="event.stopPropagation();G.showTip('${key}')">i</button>
        <div class="stat-bar-bg"><div class="stat-bar" style="width:${val}%;background:${barColor}"></div></div>
        <span class="stat-val">${val}</span>
      </div>
    `;
  }
  return `
    <div class="top-bar">
      <div class="user-info-bar">
        <span class="user-avatar">${getAvatar()}</span>
        <div class="user-details">
          <div class="user-name">${STATE.playerName||'玩家'}</div>
          <div class="user-bio">${STATE.playerBio||'大厂打工人'}</div>
        </div>
        <span class="quarter-badge">${year} ${qLabel}</span>
      </div>
      <div class="stats-list">${statsRows}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
    </div>
    ${renderTooltipHTML()}
  `;
}

function renderIntro() {
  const narration = QUARTER_NARRATIONS[STATE.quarter];
  STATE._currentNarration = narration;
  $app.innerHTML = `
    ${renderTopBar()}
    <div class="main-area">
      <div class="card narration-card">
        <div class="card-title">📅 第${STATE.quarter}季度</div>
        <div class="card-body"><p>${narration.replace(/\n/g,'<br>')}</p></div>
      </div>
      <button class="btn btn-primary" onclick="G.toAction()">选择行动 →</button>
    </div>
  `;
}

function renderAction() {
  const selected = STATE.selectedActions;
  const count = selected.length;
  
  let btns = '';
  for(const a of ACTIONS) {
    const isSel = selected.includes(a.id);
    const cls = isSel ? 'btn btn-selected' : 'btn';
    let preview = Object.entries(a.effects).map(([k,v])=>{
      const m = STAT_META[k]; if(!m) return '';
      return `${m.icon}${v>0?'+':''}${v}`;
    }).filter(Boolean).join(' ');
    if(STATE.flags.ai_skill_nerf && a.id==='learn_ai') preview += ' ⚠️衰减';
    if(STATE.flags.work_nerf && a.id==='work') preview += ' ⚠️衰减';
    btns += `<button class="${cls}" onclick="G.toggleAction('${a.id}')">
      <div class="btn-label">${a.label}${isSel?' ✓':''}</div>
      <div class="btn-desc">${a.desc}</div>
      <div class="btn-fx">${preview}</div>
    </button>`;
  }
  const canConfirm = count >= 1;
  $app.innerHTML = `
    ${renderTopBar()}
    <div class="main-area">
      <div class="action-header">
        <div class="action-counter">已选 <span>${count}</span> / 3 个行动</div>
        <button class="btn-secondary" style="padding:4px 12px;font-size:12px;border-radius:8px" onclick="G.backToIntro()">← 返回</button>
      </div>
      <div class="btn-grid">${btns}</div>
      <button class="btn btn-primary ${canConfirm?'':'btn-disabled'}" onclick="G.confirmActions()" style="margin-top:8px">
        确认行动 →
      </button>
    </div>
  `;
}

function renderEvent() {
  const ev = STATE._currentEvent;
  if(!ev) { G.toSummary(); return; }
  const isMajor = ev._isMajor;
  const cls = isMajor ? 'card event-card major' : 'card event-card';
  let fxText = '';
  if(ev.effects && !isMajor) {
    fxText = Object.entries(ev.effects).map(([k,v])=>{
      const m = STAT_META[k]; if(!m) return '';
      return `<span style="color:${v>0?'#16a34a':'#dc2626'};font-weight:600">${m.icon}${v>0?'+':''}${v}</span>`;
    }).filter(Boolean).join(' ');
  }
  const nextLabel = isMajor ? '面对抉择 →' : '继续 →';
  const nextFn = isMajor ? 'G.toBranch()' : 'G.afterEvent()';
  $app.innerHTML = `
    ${renderTopBar()}
    <div class="main-area">
      <div class="${cls}">
        <div class="card-title">${isMajor?'⚡ 重大事件':'📰 本季事件'}</div>
        <div class="card-body">
          <p style="font-weight:600;font-size:16px;color:#1a1a2e;margin-bottom:8px">${ev.title}</p>
          <p>${ev.text.replace(/\n/g,'<br>')}</p>
          ${fxText?`<p style="margin-top:8px">${fxText}</p>`:''}
        </div>
      </div>
      <button class="btn btn-primary" onclick="${nextFn}">${nextLabel}</button>
    </div>
  `;
}

function renderBranch() {
  const ev = STATE._currentEvent;
  let btns = '';
  ev.branches.forEach((b,i) => {
    btns += `<button class="btn" onclick="G.chooseBranch(${i})">
      <div class="btn-label">${b.label}</div>
      <div class="btn-desc">${b.desc}</div>
    </button>`;
  });
  $app.innerHTML = `
    ${renderTopBar()}
    <div class="main-area">
      <div class="card event-card major">
        <div class="card-title">⚡ ${ev.title}</div>
        <div class="card-body"><p>你必须做出选择：</p></div>
      </div>
      <div class="btn-group">${btns}</div>
    </div>
  `;
}

function renderSummary() {
  const s = STATE.stats;
  let warnings = [];
  if(s.energy<=20) warnings.push('⚠️ 体力过低！下季度行动收益-30%');
  if(s.mood<=20) warnings.push('⚠️ 情绪危险！可能触发崩溃事件');
  if(s.money<=10) warnings.push('⚠️ 资源见底！抗风险能力极弱');
  let warnHtml = warnings.map(w=>`<p style="color:#dc2626;font-size:14px">${w}</p>`).join('');
  
  // Check critical stat failure → immediate ending
  const criticalEnding = checkCriticalEnding();
  const isLast = STATE.quarter >= 8;
  const goEnding = criticalEnding || isLast;
  
  let endingHint = '';
  if(criticalEnding && !isLast) {
    endingHint = `<p style="color:#dc2626;font-weight:600;margin-top:8px">💀 你的状态已经无法继续支撑…</p>`;
  }
  
  $app.innerHTML = `
    ${renderTopBar()}
    <div class="main-area">
      <div class="card">
        <div class="card-title">📊 第${STATE.quarter}季度总结</div>
        <div class="card-body">
          ${warnHtml}
          ${endingHint}
          ${STATE._branchResult?`<p style="margin-top:6px;color:#444">${STATE._branchResult.replace(/\n/g,'<br>')}</p>`:''}
        </div>
      </div>
      <button class="btn btn-primary" onclick="${goEnding?'G.toEnding()':'G.nextQuarter()'}">${goEnding?'查看结局 →':'进入下一季度 →'}</button>
    </div>
  `;
}

function renderEnding() {
  const ending = determineEnding();
  const tagsHtml = (ending.tags||[]).map(t=>`<span class="ending-tag">#${t}</span>`).join('');
  const s = STATE.stats;
  
  let statsHtml = Object.entries(STAT_META).map(([k,m])=>{
    const v = s[k];
    const barW = Math.max(0,Math.min(100,v));
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="font-size:12px;min-width:50px">${m.icon}${m.label}</span>
      <div style="flex:1;height:6px;background:#f0f0f3;border-radius:3px;overflow:hidden">
        <div style="width:${barW}%;height:100%;background:${m.color};border-radius:3px"></div>
      </div>
      <span style="font-size:11px;color:#999;min-width:22px;text-align:right">${v}</span>
    </div>`;
  }).join('');
  
  const majorEvents = STATE.eventLog.filter(e=>e.major);
  let timelineHtml = '';
  if(majorEvents.length) {
    timelineHtml = `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0f0f0">
      <div style="font-size:13px;color:#888;margin-bottom:6px">📜 你经历的重大事件</div>
      ${majorEvents.map(e=>`<div style="font-size:13px;color:#666;margin-bottom:3px">Q${e.q} · ${e.title}</div>`).join('')}
    </div>`;
  }
  
  const actionCounts = {};
  STATE.actionHistory.forEach(a => { actionCounts[a] = (actionCounts[a]||0)+1; });
  const topActions = Object.entries(actionCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const topActHtml = topActions.map(([id,count])=>{
    const a = ACTIONS.find(x=>x.id===id);
    return a ? `${a.label}×${count}` : '';
  }).filter(Boolean).join('、');
  
  $app.innerHTML = `
    <div class="main-area" style="padding-top:24px">
      <div class="card ending-card">
        <div style="font-size:32px;margin-bottom:8px">${getAvatar()}</div>
        <div style="font-size:14px;color:#888;margin-bottom:4px">${STATE.playerName} 的结局</div>
        <div class="ending-title">${ending.title}</div>
        <div class="ending-text">${ending.text.replace(/\n/g,'<br>')}</div>
        <div class="ending-tags">${tagsHtml}</div>
      </div>
      <div class="card" style="margin-top:8px">
        <div class="card-title">📊 最终状态</div>
        <div class="card-body">
          ${statsHtml}
          ${topActHtml?`<div style="margin-top:8px;font-size:13px;color:#888">最常做的事：${topActHtml}</div>`:''}
          ${timelineHtml}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary" onclick="G.restart()" style="flex:1">再来一次</button>
        <button class="share-btn" onclick="G.share()" style="flex:1;margin-top:0">分享结局</button>
      </div>
    </div>
  `;
}

// ===== GAME LOGIC =====
function startGame() {
  initStats();
  STATE.gender = '';
  STATE.playerName = '';
  STATE.playerBio = '';
  STATE.phase = 'profile';
  render();
}

function setGender(g) {
  STATE.gender = g;
  render();
}
function setName(v) { STATE.playerName = v; }
function setBio(v) { STATE.playerBio = v; }

function confirmProfile() {
  if(!STATE.gender || !STATE.playerName.trim()) return;
  STATE.quarter = 1;
  STATE.phase = 'intro';
  render();
}

function toAction() {
  STATE.phase = 'action';
  STATE.selectedActions = [];
  render();
}

function backToIntro() {
  STATE.phase = 'intro';
  render();
}

function toggleAction(id) {
  const idx = STATE.selectedActions.indexOf(id);
  if(idx>=0) {
    STATE.selectedActions.splice(idx,1);
  } else if(STATE.selectedActions.length<3) {
    STATE.selectedActions.push(id);
  }
  // Re-render without scrolling to top
  const mainArea = $app.querySelector('.main-area');
  const scrollTop = mainArea ? mainArea.scrollTop : 0;
  render();
  const newMain = $app.querySelector('.main-area');
  if(newMain) newMain.scrollTop = scrollTop;
}

function confirmActions() {
  if(STATE.selectedActions.length < 1) return;
  const lowEnergy = STATE.stats.energy <= 20;
  
  for(const aid of STATE.selectedActions) {
    const action = ACTIONS.find(a=>a.id===aid);
    let fx = {...action.effects};
    if(action.bonus) {
      const b = action.bonus(STATE.stats);
      for(const [k,v] of Object.entries(b)) fx[k] = (fx[k]||0)+v;
    }
    if(lowEnergy) {
      for(const k of Object.keys(fx)) {
        if(fx[k]>0 && k!=='energy' && k!=='mood') fx[k] = Math.round(fx[k]*0.7);
      }
    }
    if(STATE.flags.ai_skill_nerf && aid==='learn_ai') fx.skill = Math.round((fx.skill||0)*0.5);
    if(STATE.flags.work_nerf && aid==='work') fx.money = Math.round((fx.money||0)*0.6);
    if(STATE.flags.build_changed && aid==='build') fx.fame = Math.round((fx.fame||0)*0.7);
    applyEffects(fx);
    if(action.hiddenFx) applyHidden(action.hiddenFx);
    STATE.actionHistory.push(aid);
  }
  
  // Natural energy recovery each quarter
  STATE.stats.energy = clamp(STATE.stats.energy + 5, 0, 100);
  
  // Skip action result page, go directly to event
  toEvent();
}

function toEvent() {
  const ev = pickEvent();
  STATE._currentEvent = ev;
  if(ev) {
    if(!ev._isMajor && ev.effects) {
      applyEffects(ev.effects);
      if(ev.hiddenFx) applyHidden(ev.hiddenFx);
      if(ev.bonus) { applyEffects(ev.bonus(STATE.stats)); }
    }
    STATE.eventLog.push({ q:STATE.quarter, title:ev.title, major:!!ev._isMajor });
    STATE.phase = 'event';
  } else {
    STATE.phase = 'summary';
  }
  render();
}

function afterEvent() {
  STATE._branchResult = null;
  STATE.phase = 'summary';
  render();
}

function toBranch() {
  STATE.phase = 'branch';
  render();
}

function chooseBranch(idx) {
  const ev = STATE._currentEvent;
  const branch = ev.branches[idx];
  if(ev.applyPassive) ev.applyPassive();
  const result = branch.apply(STATE.stats);
  if(result.effects) applyEffects(result.effects);
  if(result.hiddenFx) applyHidden(result.hiddenFx);
  if(result.flag) STATE.flags[result.flag] = true;
  if(ev.flag) STATE.flags[ev.flag] = true;
  STATE._branchResult = result.text || '';
  STATE.phase = 'summary';
  render();
}

function toSummary() {
  STATE.phase = 'summary';
  render();
}

function nextQuarter() {
  STATE.quarter++;
  STATE._currentEvent = null;
  STATE._branchResult = null;
  STATE.phase = 'intro';
  render();
}

function toEnding() {
  STATE.phase = 'ending';
  render();
}

function restart() {
  STATE.phase = 'start';
  render();
}

function showTip(key) {
  const m = STAT_META[key];
  if(m) { STATE.showTooltip = m; render(); }
}
function closeTooltip() {
  STATE.showTooltip = null;
  render();
}

function share() {
  const ending = determineEnding();
  const text = `【AI大跃进生存模拟器】\n${STATE.playerName}的结局：${ending.title}\n${(ending.tags||[]).map(t=>'#'+t).join(' ')}\n\n来测测你在AI时代会走向什么结局？`;
  if(navigator.share) {
    navigator.share({ title:'AI大跃进生存模拟器', text }).catch(()=>{});
  } else if(navigator.clipboard) {
    navigator.clipboard.writeText(text).then(()=>alert('结局已复制到剪贴板！'));
  } else {
    alert(text);
  }
}

// ===== EVENT PICKING =====
function pickEvent() {
  const q = STATE.quarter;
  // Major events
  const majorSlot = MAJOR_EVENT_SCHEDULE.find(s => s.q === q);
  if(majorSlot) {
    const majorChance = q <= 4 ? 0.25 : (q <= 6 ? 0.4 : 0.5);
    if(Math.random() < majorChance) {
      const candidates = shuffle([...majorSlot.ids]);
      for(const id of candidates) {
        const me = MAJOR_EVENTS[id];
        // Social events only Q4 2026 (q4) onwards
        if(me && me.category === 'social' && q < 4) continue;
        if(me && me.condition()) {
          return { ...me, _isMajor:true };
        }
      }
    }
  }
  // Normal events — no social events before Q4
  const weights = getEventWeights(q);
  const roll = Math.random();
  let pool;
  if(q < 4) {
    // No social events before Q4
    const total = weights.personal + weights.company + weights.industry;
    const r = Math.random() * total;
    if(r < weights.personal) pool = PERSONAL_EVENTS;
    else if(r < weights.personal + weights.company) pool = COMPANY_EVENTS;
    else pool = INDUSTRY_EVENTS;
  } else {
    if(roll < weights.personal) pool = PERSONAL_EVENTS;
    else if(roll < weights.personal + weights.company) pool = COMPANY_EVENTS;
    else if(roll < weights.personal + weights.company + weights.industry) pool = INDUSTRY_EVENTS;
    else pool = SOCIAL_EVENTS;
  }
  return pool[Math.floor(Math.random()*pool.length)];
}

function getEventWeights(q) {
  if(q<=2) return { personal:0.38, company:0.40, industry:0.20, social:0.02 };
  if(q<=5) return { personal:0.28, company:0.30, industry:0.35, social:0.07 };
  return { personal:0.22, company:0.25, industry:0.40, social:0.13 };
}

// ===== ENDING DETERMINATION =====
function checkCriticalEnding() {
  const s = STATE.stats;
  if(s.energy <= 10 || s.mood <= 10 || s.money <= 5) return true;
  return false;
}

function determineEnding() {
  const sorted = [...ENDINGS].sort((a,b) => a.priority - b.priority);
  for(const e of sorted) {
    if(e.condition(STATE.stats)) return e;
  }
  return sorted[sorted.length-1];
}

// ===== UTILITIES =====
function applyEffects(fx) {
  for(const [k,v] of Object.entries(fx)) {
    if(STATE.stats[k] !== undefined) {
      STATE.stats[k] = clamp(STATE.stats[k] + v, 0, 100);
    }
  }
}

function applyHidden(fx) {
  for(const [k,v] of Object.entries(fx)) {
    if(STATE.hidden[k] !== undefined) STATE.hidden[k] += v;
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function shuffle(arr) {
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// ===== EXPOSE & INIT =====
window.G = { startGame, setGender, setName, setBio, confirmProfile, toAction, backToIntro, toggleAction, confirmActions, toEvent, afterEvent, toBranch, chooseBranch, toSummary, nextQuarter, toEnding, restart, share, showTip, closeTooltip };

render();

})();
