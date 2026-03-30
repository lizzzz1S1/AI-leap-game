// ===== AI大时代生存模拟器 v9 =====
(function(){
'use strict';

const STATE={quarter:0,selectedActions:[],phase:'start',stats:{},hidden:{},flags:{},actionHistory:[],eventLog:[],avatar:'',playerName:'',playerBio:'',showTooltip:null,_eventQueue:[],_eventIndex:0,_currentMajor:null,_branchResult:null,_pendingEnding:null,_thisQuarterActions:[],_initTags:[],_initBio:'',_usedOnceEvents:{}};
const AVATARS=['👨','👩','💩','🤖','👽','🐶','🐱','🦊','🐸','🐷','🤡','👻','💀','🎃','🧠','🫠','🥸','🦄','🐔','🐧','🤠','😈','🫡','🥷'];
const RANDOM_NAMES=['悟空','悟能','悟净','师傅','玄奘','奶龙','奥特曼','佩奇','克劳德','小扎','小马','老黄','山姆偶特慢','达里奥暗色比','杰弗里心疼','伊利亚死次鸡窝','马斯不可','黄人勋','李开不复','吴恩不达','贾扬不清','林纳丝','比尔该死','安德鲁嗯急','马化不腾','张一不鸣','王小串','李彦红了','雷不军','周鸿不祎','刘庆不峰','苏华','赛博牛马','提示词工程师','AI搬砖侠','Prompt Boy','Token燃烧者','梯度下降者','大模型陪跑员','幻觉制造者','AGI等待者'];
function trueRand(n){if(typeof crypto!=='undefined'&&crypto.getRandomValues){var a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n;}return Math.floor(_mathRand()*n);}
var _mathRand=Math.random.bind(Math);
function randInt(a,b){return a+trueRand(b-a+1);}

// ===== 5个核心指标 =====
// 职场力 = 打工能力+公司影响力(合并)
// AI力 = AI技能+行业知名度(合并)
// 资源 = 存款和抗风险能力
// 体力 = 身体精神状态
// 心态 = 情绪稳定性+幸福感
function initStats(){
  var age=randInt(22,40);
  STATE.playerAge=age;
  // 体力和心态基于年龄：年龄越大基础越低，同时有随机波动
  var energyBase,moodBase;
  if(age<=25){energyBase=randInt(50,75);}
  else if(age<=30){energyBase=randInt(42,65);}
  else if(age<=35){energyBase=randInt(35,55);}
  else{energyBase=randInt(28,48);}
  if(age<=25){moodBase=randInt(48,72);}
  else if(age<=30){moodBase=randInt(42,65);}
  else if(age<=35){moodBase=randInt(38,58);}
  else{moodBase=randInt(32,52);}
  // 在基础值上再加一个随机波动 ±5
  var energyFinal=clamp(energyBase+randInt(-5,5),20,80);
  var moodFinal=clamp(moodBase+randInt(-5,5),20,80);
  STATE.stats={career:randInt(15,35),ai:randInt(5,30),money:randInt(5,30),energy:energyFinal,mood:moodFinal};
  STATE.hidden={positioning:0,survival:10};STATE.flags={};STATE.actionHistory=[];STATE.eventLog=[];STATE.quarter=0;STATE.selectedActions=[];
  STATE._eventQueue=[];STATE._eventIndex=0;STATE._currentMajor=null;STATE._branchResult=null;STATE._pendingEnding=null;STATE._thisQuarterActions=[];
  STATE._initTags=generateInitTags(STATE.stats);STATE._initBio='';STATE._usedOnceEvents={};
}
function generateInitTags(s){
  var tags=[];
  if(s.career>=30)tags.push({label:'💼 天选打工人',desc:'职场基因与生俱来',reason:'初始职场力'+s.career});
  else if(s.career<=18)tags.push({label:'😵 职场小白',desc:'一切从零开始学习',reason:'初始职场力仅'+s.career});
  if(s.ai>=25)tags.push({label:'🤖 AI原住民',desc:'出生时手边就有ChatGPT',reason:'初始AI力'+s.ai});
  else if(s.ai<=8)tags.push({label:'🔌 AI绝缘体',desc:'以为GPT是一种零食',reason:'初始AI力仅'+s.ai});
  if(s.energy>=90)tags.push({label:'⚡ 精力怪物',desc:'能连续开会12小时不累',reason:'初始体力'+s.energy});
  else if(s.energy<=68)tags.push({label:'😪 电量焦虑',desc:'出门先确认咖啡库存',reason:'初始体力仅'+s.energy});
  if(s.mood>=90)tags.push({label:'🌈 天生乐观',desc:'什么都打不倒的乐天派',reason:'初始心态'+s.mood});
  else if(s.mood<=68)tags.push({label:'🌧️ 忧虑体质',desc:'晴天也想带把伞',reason:'初始心态仅'+s.mood});
  if(s.money>=25)tags.push({label:'💰 小有积蓄',desc:'裸辞能撑三个月',reason:'初始资源'+s.money});
  else if(s.money<=10)tags.push({label:'🫗 月光战士',desc:'工资到账就是还款日',reason:'初始资源仅'+s.money});
  if(s.career>=25&&s.ai>=20)tags.push({label:'⚖️ 双修选手',desc:'两手都抓，至少不空',reason:'职场'+s.career+'+AI'+s.ai});
  if(s.energy>=85&&s.mood>=85)tags.push({label:'✨ 满状态出发',desc:'此刻的你是最好的你',reason:'体力'+s.energy+'+心态'+s.mood});
  if(tags.length===0)tags.push({label:'🎯 普通但自信',desc:'没有突出特点就是最大特点',reason:'各项中规中矩'});
  return tags.slice(0,4);
}

const STAT_META={
  career:{icon:'💼',label:'职场力',color:'#8B7EC8',tip:'职场综合实力：工作能力+公司影响力。决定你在组织中的位置'},
  ai:{icon:'🤖',label:'AI力',color:'#FF6680',tip:'AI综合实力：技术能力+行业影响力。决定你在AI浪潮中的位置'},
  money:{icon:'💰',label:'资源',color:'#66BB88',tip:'存款和抗风险能力。归零=游戏结束'},
  energy:{icon:'⚡',label:'体力',color:'#FF9944',tip:'身体和精神能量。归零=游戏结束。每季度自然回复+5'},
  mood:{icon:'❤️',label:'心态',color:'#FF4466',tip:'情绪稳定性。归零=游戏结束。社交和休息是主要恢复手段'},
};

// ===== 5个行动，每个都有独特价值 =====
const ACTIONS=[
  {id:'work',label:'💼 打工搬砖',desc:'赚钱+职场力 → 走向「组织王者」',effects:{money:8,career:5,energy:-4,mood:-2},hiddenFx:{survival:1},
    bonus:function(s){var b={};if(s.career>=50)b.money=3;return b;}},
  {id:'ai',label:'🤖 AI探索',desc:'学习+实践+产出，AI力唯一来源',effects:{ai:6,career:1,money:1,energy:-6,mood:-2},hiddenFx:{positioning:1},
    bonus:function(s){var b={};if(s.ai>=40){b.career=2;b.money=1;}if(s.ai>=60){b.career=1;b.money=2;}return b;}},
  {id:'social',label:'🤝 社交经营',desc:'心态恢复+职场力 → 保持好心态',effects:{career:3,mood:6,energy:-2,money:-1},hiddenFx:{survival:1,positioning:1}},
  {id:'rest',label:'🧘 休息充电',desc:'体力恢复主要手段 → 防止体力归零',effects:{energy:15,mood:6,money:-1},hiddenFx:{survival:2}},
  {id:'think',label:'📚 学习思考',desc:'多维成长+心态 → 影响最终结局评判',effects:{career:2,ai:2,mood:4,energy:3},hiddenFx:{positioning:1,survival:5}},
];
// ===== 随机事件（精简版，适配5指标） =====
const PERSONAL_EVENTS=[
  {id:'p1',once:true,title:'找到了自己的AI工作流',text:'不再追每个新工具，沉淀出一套稳定的方法。效率翻倍。',effects:{ai:6,career:3,mood:4},tone:'positive',type:'passive',actionTrigger:['ai'],setFlag:'has_workflow'},
  {id:'p2',title:'某个AI概念突然想通了',text:'之前死记硬背的东西，某天晚上突然贯通了。',effects:{ai:8,mood:5},hiddenFx:{positioning:1},tone:'positive',type:'passive',actionTrigger:['ai'],condition:function(s){return s.ai>=20;}},
  {id:'p3',once:true,title:'你做的AI工具在组内火了',text:'同事们开始每天用你做的提效脚本。',effects:{career:7,mood:5,ai:3},tone:'positive',type:'passive',actionTrigger:['ai'],setFlag:'tool_viral'},
  {id:'p4',once:true,title:'你的文章意外出圈了',text:'一篇随手写的观察被行业大佬转发。',effects:{ai:5,career:3,mood:5},tone:'positive',type:'passive',condition:function(s){return s.ai>=25;}},
  {id:'p5',once:true,title:'一位前辈开始带你',text:'TA教你怎么判断——什么值得做，什么是噪音。',effects:{ai:4,career:4,mood:6},hiddenFx:{positioning:2},tone:'positive',type:'passive',actionTrigger:['social'],setFlag:'has_mentor'},
  {id:'p6',title:'睡了个久违的好觉',text:'十点上床，七点醒来。早上出门时连路上的树都比平时好看了。',effects:{energy:10,mood:8},tone:'positive',type:'passive',actionTrigger:['rest'],condition:function(s){return s.energy<=50;}},
  {id:'p7',title:'想清楚了一件事',text:'不是AI的问题，也不是工作的问题。是关于你到底想成为什么样的人。',effects:{mood:8,career:2},hiddenFx:{survival:4},tone:'positive',type:'passive',actionTrigger:['think','rest']},
  {id:'p8',title:'老板夸你方案写得好',text:'不是因为AI，是因为你逻辑清晰、表达精准。基本功被看到了。',effects:{career:5,mood:4},tone:'positive',type:'passive',condition:function(s){return s.career>=25;},actionTrigger:['work']},
  {id:'p9',once:true,title:'第一次做出完整可用Demo',text:'从想法到能跑的产品，独立完成。',effects:{ai:6,mood:6,career:3},tone:'positive',type:'passive',condition:function(s){return s.ai>=25;}},
  {id:'p10',once:true,title:'有人找你做AI副业',text:'朋友的公司需要AI咨询，愿意付费。但你知道公司有严格的竞业和外部咨询禁令。',tone:'positive',type:'choice',actionTrigger:['ai'],condition:function(s){return s.ai>=30;},choices:[
    {label:'接！赚外快',desc:'应该不会被发现吧…',apply:function(){return{effects:{},text:'两周后，公司合规部门找你谈话。外部咨询属于严重违规，直接解除劳动合同。',setFlag:'fired_compliance',directEnding:'fired'};}},
    {label:'婉拒，专注主业',desc:'合规红线不能碰',apply:function(){return{effects:{mood:4,energy:3},text:'你拒绝了诱惑。专注和自律才是你的护城河。'};}},
  ]},
  {id:'p11',once:true,title:'晋升机会 vs AI探索',text:'老板说你有机会晋升，但需要暂停AI探索，主导一个战略项目。',tone:'positive',type:'choice',dilemma:true,condition:function(s){return s.career>=35;},phase:'mid',choices:[
    {label:'接！晋升是硬通货',desc:'放弃AI，押注晋升',apply:function(s){if(s.career>=45)return{effects:{career:10,money:6,mood:3},text:'晋升通过了。'};return{effects:{career:3,mood:-5},text:'评审没过。两头落空。'};}},
    {label:'婉拒，坚持AI方向',desc:'押注技术深度',apply:function(){return{effects:{ai:5,mood:3},hiddenFx:{positioning:2},text:'晋升可以再等，AI窗口期不等人。'};}},
  ]},
  {id:'p12',title:'你意识到自己已经很久没休息了',text:'上次真正放松是什么时候？你想不起来了。',effects:{mood:-8,energy:-5},tone:'negative',type:'passive',statTrigger:{energy:'low'},condition:function(s){return s.energy<=45;}},
  {id:'p13',title:'失眠越来越严重',text:'躺在床上脑子里全是模型架构、KPI。',effects:{energy:-10,mood:-6},tone:'negative',type:'passive',statTrigger:{energy:'low',mood:'low'},condition:function(s){return s.energy<=40&&s.mood<=45;}},
  {id:'p14',once:true,title:'体检报告亮红灯',text:'颈椎3度，视力下降，血压偏高。医生问你"平时运动吗"。',effects:{mood:-6,energy:-5},tone:'negative',type:'passive',condition:function(s){return s.energy<=45;},setFlag:'health_warning'},
  {id:'p15',once:true,title:'同事因健康问题住院了',text:'才30出头，之前看起来很健康。大家都在反思自己的工作节奏。',effects:{mood:-8,energy:-3},tone:'negative',type:'passive'},
  {id:'p16',title:'连续加班三周',text:'项目赶工期，每天凌晨才走。',effects:{energy:-9,mood:-6,money:3},tone:'negative',type:'passive',statTrigger:{energy:'low'}},
  {id:'p17',title:'焦虑型信息过载',text:'每天刷200条AI新闻，看到别人的产出就心悸。',effects:{mood:-8,energy:-4},tone:'negative',type:'passive',actionTrigger:['ai']},
  {id:'p18',title:'Demo做完了但没人用',text:'很酷的技术，零复用率。',effects:{mood:-8,ai:-2},tone:'negative',type:'passive',actionTrigger:['ai']},
  {id:'p19',once:true,title:'你需要住院检查',text:'体检指标需要进一步检查。但手头的项目正在关键节点。',tone:'negative',type:'choice',dilemma:true,requireFlag:'health_warning',choices:[
    {label:'请假住院',desc:'身体是底线',apply:function(){return{effects:{energy:15,mood:5,money:-5,career:-3},text:'出院后感到前所未有的轻松。'};}},
    {label:'先扛着',desc:'等忙完再说',apply:function(){return{effects:{energy:-8,mood:-10},text:'你心里知道这个决定可能让你付出更大代价。'};}},
  ]},
  {id:'p20',once:true,title:'和另一半产生了分歧',text:'"最近感觉你一直在忙，我们好久没好好聊聊了。"',tone:'negative',type:'choice',dilemma:true,choices:[
    {label:'认错，请假陪TA',desc:'关系比什么都重要',apply:function(){return{effects:{mood:8,energy:3,career:-2},text:'你去了很久没去的公园。蓝天还在。'};}},
    {label:'冷处理',desc:'眼前的事更紧急',apply:function(){return{effects:{mood:-12,energy:-2},text:'晚上回家时对方已经睡了。'};}},
  ]},
  {id:'p21',once:true,title:'猎头来了',text:'另一个大厂开价比你高25%。',tone:'positive',type:'choice',dilemma:true,condition:function(s){return s.ai>=40||s.career>=40;},phase:'mid',choices:[
    {label:'去谈谈',desc:'摸清自己的价值',apply:function(){return{effects:{money:3,mood:5},text:'你去谈了，没跳，但走路更有底气了。'};}},
    {label:'拒绝，专注当前',desc:'不为钱动摇',apply:function(){return{effects:{mood:3},hiddenFx:{survival:1},text:'现在需要的不是换地方。'};}},
    {label:'认真考虑跳槽',desc:'25%涨幅诱人',apply:function(s){if(s.ai>=45||s.career>=45)return{effects:{money:8,career:-5,mood:3},text:'你跳了。新公司待遇好，但一切从头证明。',setFlag:'jumped'};return{effects:{money:6,career:-8,mood:-3},text:'你跳了，但新公司比想象中复杂。',setFlag:'jumped'};}},
  ]},
];
const COMPANY_EVENTS=[
  {id:'c1',title:'领导注重AI实际落地效果',text:'团队开始关注AI工具的真实产出，而不是形式上的展示。',effects:{career:5,money:3,mood:4},tone:'positive',type:'passive',actionTrigger:['work','ai']},
  {id:'c2',title:'老板开始重视真正落地的人',text:'能把AI真正用到业务里的人越来越受认可。',effects:{career:6,mood:4},tone:'positive',type:'passive',actionTrigger:['ai','work']},
  {id:'c3',once:true,title:'公司开放AI试点预算',text:'终于有钱有算力了。组里每人都可以申请API额度。',effects:{ai:4,money:5,mood:3},tone:'positive',type:'passive'},
  {id:'c4',once:true,title:'直属领导愿意替你扛风险',text:'TA说："你去试，出了问题我兜着。"',effects:{mood:7,career:4,energy:3},tone:'positive',type:'passive',setFlag:'boss_shield'},
  {id:'c5',once:true,title:'年终奖超预期',text:'虽然行业整体在降，但你们组的业绩撑住了。',effects:{money:12,mood:6},tone:'positive',type:'passive'},
  {id:'c6',once:true,title:'老板让你主导一个新AI项目',text:'预算不多但有完全自主权。问题是你手上已有项目了。',tone:'positive',type:'choice',condition:function(s){return s.ai>=25;},choices:[
    {label:'接！双线并行',desc:'证明自己',apply:function(s){if(s.energy>=55)return{effects:{ai:6,career:6,energy:-9,mood:-3},text:'像个超频CPU——发热，但还在跑。'};return{effects:{ai:3,career:3,energy:-12,mood:-5},text:'两个项目都没做好。'};}},
    {label:'婉拒，专注当前',desc:'贪多嚼不烂',apply:function(){return{effects:{career:2,mood:2},text:'三个月后看到别人的汇报——有点羡慕。'};}},
  ]},
  {id:'c7',once:true,title:'公司要提拔AI方向负责人',text:'你和另一个同事都是候选人。TA更资深但你更懂AI。',tone:'positive',type:'choice',dilemma:true,condition:function(s){return s.career>=30&&s.ai>=30;},phase:'mid',choices:[
    {label:'主动争取',desc:'拿出方案说服老板',apply:function(s){if(s.ai>=40&&s.career>=35)return{effects:{career:8,money:4,mood:4},text:'你成了AI方向负责人。',setFlag:'ai_lead'};return{effects:{career:-3,mood:-6},text:'老板觉得你还不够成熟。'};}},
    {label:'不争，默默做事',desc:'金子总会发光',apply:function(){return{effects:{mood:-3,career:2},text:'另一个人上了。你告诉自己不在意。'};}},
  ]},
  {id:'c8',once:true,title:'公司发起全员AI行动',text:'公司鼓励每个团队探索AI应用场景，资源和培训同步跟上。你感到组织在认真推动这件事。',effects:{ai:4,career:3,mood:3,energy:-3},tone:'positive',type:'passive'},
  {id:'c9',title:'公司启动AI驱动的组织优化',text:'一些岗位被重新定义，团队结构在调整。每个人都在思考自己的定位。',effects:{mood:-8,energy:-4,career:-2},tone:'negative',type:'passive'},
  {id:'c10',title:'项目预算收紧',text:'公司进入降本增效阶段，部分项目需要用更少的资源证明价值。',effects:{career:-5,mood:-7,money:-3},tone:'negative',type:'passive'},
  {id:'c11',title:'跨部门协调挑战',text:'多个部门都在布局AI方向，如何协同成了需要解决的问题。',effects:{energy:-6,career:-3,mood:-5},tone:'negative',type:'passive'},
  {id:'c12',once:true,title:'公司AI战略方向调整',text:'管理层重新评估了AI方向，部分项目需要重新规划。之前的积累需要找到新的落点。',effects:{mood:-8,ai:-4,career:-3},tone:'negative',type:'passive'},
  {id:'c13',once:true,title:'公司举办AI创新挑战赛',text:'一整天的高强度产出，但氛围很好，大家互相学习。你最后交付了一个完整的Demo，获得了不少关注。',effects:{ai:5,career:3,mood:3,energy:-6},tone:'positive',type:'passive',actionTrigger:['ai']},
  {id:'c14',once:true,title:'隔壁团队整体调整',text:'组织架构调整，一些团队被合并或重组。变化来得很突然。',effects:{mood:-10,energy:-3,career:-2},tone:'negative',type:'passive'},
  {id:'c15',title:'绩效结果低于预期',text:'你觉得自己做得不错，但评价标准和你理解的不完全一致。',effects:{mood:-8,money:-3,career:-4},tone:'negative',type:'passive'},
  {id:'c16',once:true,title:'你发现AI项目的数据有质量问题',text:'核心指标的统计口径可能有偏差，需要有人指出来。',tone:'negative',type:'choice',dilemma:true,phase:'mid',choices:[
    {label:'私下跟老板说',desc:'职业道德底线',apply:function(){if(STATE.flags.boss_shield)return{effects:{career:5,mood:5},text:'老板说："谢谢你告诉我。"'};return{effects:{career:-5,mood:-5},text:'老板说"我们会重新梳理。"虽然没有立即改变，但至少有人知道了。'};}},
    {label:'先观察一下',desc:'也许有更好的时机',apply:function(){return{effects:{mood:-6},text:'你决定先观察，但心里一直在想这件事。'};}},
  ]},
];
const INDUSTRY_EVENTS=[
  {id:'i1',title:'开源大模型再次爆发',text:'开源模型持续突破，AI门槛又降了一个量级。',effects:{ai:6,mood:4},tone:'positive',type:'passive',actionTrigger:['ai']},
  {id:'i2',title:'推理成本暴降',text:'一年前100美元的任务，现在1美元能完成。',effects:{ai:4,money:4,mood:3},tone:'positive',type:'passive',actionTrigger:['ai']},
  {id:'i3',title:'多模态生成走向成熟',text:'文字、图像、视频、代码的壁垒正在消失。',effects:{ai:5,mood:4},tone:'positive',type:'passive'},
  {id:'i4',once:true,title:'具身智能出现商用拐点',text:'机器人在工厂和仓库里真正干活了。物理世界的AI时代要来了。',effects:{ai:4,mood:5},hiddenFx:{positioning:4},tone:'positive',type:'passive',phase:'late'},
  {id:'i5',once:true,title:'你看好的AI创业公司融了大钱',text:'他们做的方向和你研究的很像。你的判断被市场验证了。',effects:{mood:6,ai:3},hiddenFx:{positioning:2},tone:'positive',type:'passive',condition:function(s){return s.ai>=35;}},
  {id:'i6',once:true,title:'AI创业公司邀请你加入',text:'薪资涨50%，但期权占大头。公司刚拿了A轮。',tone:'positive',type:'choice',dilemma:true,condition:function(s){return s.ai>=40;},phase:'mid',choices:[
    {label:'跳！搏一把',desc:'在更小的团队里成长更快',apply:function(s){if(s.ai>=50)return{effects:{money:5,ai:6,career:-8,mood:5},hiddenFx:{positioning:3},text:'角色变多了，视野也开阔了。',setFlag:'joined_startup'};return{effects:{money:3,ai:4,career:-6,mood:2},text:'创业公司的要求你还没完全准备好。',setFlag:'joined_startup'};}},
    {label:'谢谢，大厂继续积累',desc:'创业风险太大',apply:function(){return{effects:{mood:-2},text:'半年后那家公司上了行业头条。'};}},
  ]},
  {id:'i7',title:'范式迭代：你学的AI技能贬值了',text:'上个月掌握的技巧，这个月模型已经自动处理了。',effects:{ai:-8,mood:-6},tone:'negative',type:'passive',actionTrigger:['ai']},
  {id:'i8',title:'行业叙事又切换了',text:'上季度是Agent，这季度是Embodied AI。你在追词但开始怀疑追词本身。',effects:{mood:-7,ai:-3},tone:'negative',type:'passive'},
  {id:'i9',once:true,title:'巨头发布一体化AI平台',text:'大厂把你能做的全做了还免费。你三个月的东西变成了别人的一个功能。',effects:{mood:-7,money:-3,ai:-2},tone:'negative',type:'passive',actionTrigger:['ai']},
  {id:'i10',once:true,title:'AI泡沫质疑声出现',text:'投资人开始问"你的AI项目有多少真实用户"。',effects:{mood:-5,ai:2},tone:'negative',type:'passive',phase:'mid'},
  {id:'i11',title:'人才向头部极端集中',text:'最强的人都去了头部公司，中腰部越来越难。',effects:{mood:-5,career:-2},tone:'negative',type:'passive'},
  {id:'i12',once:true,title:'监管收紧',text:'新AI管理办法要求所有模型备案，实验性项目全部暂停审查。',effects:{career:-3,ai:-3,mood:-4},tone:'negative',type:'passive'},
  {id:'i13',title:'AI生成内容泛滥',text:'到处都是AI写的文章。你的真实思考淹没在海量的"看起来不错"里。',effects:{ai:-4,mood:-4},tone:'negative',type:'passive',phase:'mid'},
  {id:'i14',once:true,title:'一家AI公司IPO估值大幅调整',text:'市场对AI行业的预期变得更加理性，估值回归成为趋势。',effects:{mood:-6,money:-3},tone:'negative',type:'passive',phase:'late'},
];

const SOCIAL_EVENTS=[
  {id:'s1',once:true,title:'国家推动AI新基建',text:'算力中心、数据立法、AI教育补贴——政策红利来了。',effects:{money:4,ai:3,career:2},tone:'positive',type:'passive'},
  {id:'s2',once:true,title:'能源突破降低算力成本',text:'新能源进展让算力不再是瓶颈。',effects:{ai:3,money:3,mood:3},tone:'positive',type:'passive'},
  {id:'s3',once:true,title:'全球经济进入调整期',text:'各行业创新预算趋于保守，务实和效率成为关键词。',effects:{money:-6,mood:-5,career:-3},tone:'negative',type:'passive'},
  {id:'s4',once:true,title:'科技板块大幅波动',text:'AI相关投资市场出现明显回调，短期波动加剧。',effects:{money:-7,mood:-5},tone:'negative',type:'passive'},
  {id:'s5',title:'AI话题引发广泛讨论',text:'"AI会如何改变工作？"成为全社会关注的热门话题。',effects:{mood:-6},tone:'negative',type:'passive'},
  {id:'s6',title:'AI与职业发展成为热议话题',text:'身边的人开始关心AI对各行各业的影响，经常找你聊这个话题。',effects:{mood:-4},tone:'negative',type:'passive'},
  {id:'s7',once:true,title:'房租大幅上涨',text:'房东说下个月起涨20%。',tone:'negative',type:'choice',dilemma:true,choices:[
    {label:'咬牙接受',desc:'稳定压倒一切',apply:function(){return{effects:{money:-6,mood:-3},text:'每个月多出来的钱让你认真看储蓄余额。'};}},
    {label:'搬到更远的地方',desc:'通勤时间翻倍',apply:function(){return{effects:{money:3,energy:-4,mood:-2},text:'每天多出一小时在地铁上。'};}},
  ]},
  {id:'s8',title:'家人关心你的发展方向',text:'家人打电话关心你的工作状况，希望你找一个更稳定的方向。',tone:'negative',type:'choice',choices:[
    {label:'耐心解释',desc:'需要时间让他们理解',apply:function(){return{effects:{mood:-3,energy:-2},text:'家人最后说："你自己清楚就好，我们支持你。"'};}},
    {label:'敷衍一下',desc:'避免正面冲突',apply:function(){return{effects:{mood:-4},text:'挂了电话你有点内疚。'};}},
  ]},
];
const MAJOR_EVENTS={
  company_collapse:{title:'💀 公司面临重大经营危机',text:'融资进展不及预期，客户在流失。管理层发出了全员信。\n\n你需要为自己的未来做出选择。',category:'company',minQuarter:5,condition:function(){return true;},applyPassive:function(){STATE.flags.companycollapsed=true;},branches:[
    {label:'立刻找工作',desc:'简历能不能打？',apply:function(s){if(s.career>=35||s.ai>=40)return{effects:{money:-5,mood:-4},text:'凭借积累，两周内拿到了新offer。',directEnding:'phoenix'};return{effects:{money:-10,mood:-10,energy:-8},text:'求职过程比想象中困难，需要从头建立个人品牌。',directEnding:'org_victim'};}},
    {label:'借机单干',desc:'需要存款和能力',apply:function(s){if(s.money>=40&&s.ai>=45)return{effects:{money:-15,mood:5},text:'你终于做了一直想做的事。',directEnding:'phoenix'};return{effects:{money:-15,mood:-10},text:'资金储备不足，独立发展的压力超出预期。',directEnding:'org_victim'};}},
    {label:'先停下来想清楚',desc:'修整自己',apply:function(){return{effects:{mood:4,energy:6,money:-5},hiddenFx:{survival:4},text:'你花时间想清楚自己到底要什么。'};}},
  ]},
  ai_winter:{title:'🧊 AI行业进入深度调整期',text:'所有人都发现AI很好，但没有人知道怎么赚钱。\n\n投资放缓、项目缩编。',category:'industry',minQuarter:5,condition:function(){return !STATE.flags.aiindustryfrozen;},applyPassive:function(){STATE.flags.aiindustryfrozen=true;STATE.flags.ai_skill_nerf=true;},branches:[
    {label:'坚守AI等复苏',desc:'冬天总会过去',apply:function(){return{effects:{money:-5,mood:-4},hiddenFx:{positioning:3},text:'冬天离开的人，春天回不来了。'};}},
    {label:'转向AI+传统行业',desc:'AI是工具，行业是根基',apply:function(){if(STATE.hidden.survival>=30)return{effects:{money:4,mood:2},text:'医疗、教育对AI的需求才刚开始。',directEnding:'cross_cycle'};return{effects:{mood:-5,money:-3},text:'跨行业需要时间积累，转型之路比预想的更长。',directEnding:'ai_stuck'};}},
    {label:'回炉学第二技能',desc:'不把鸡蛋放一个篮子',apply:function(){return{effects:{money:-4,career:4},hiddenFx:{survival:8},text:'你开始认真学AI以外的东西。'};}},
  ]},
  war:{title:'🔥 地缘冲突升级，局势急剧紧张',text:'国际局势突然紧张，供应链受到冲击，不确定性陡增。\n\n你的日常、行业、计划——突然都不重要了。',category:'social',minQuarter:4,condition:function(){return !STATE.flags.warstarted&&trueRand(100)<35;},applyPassive:function(){STATE.flags.warstarted=true;STATE.flags.work_nerf=true;},branches:[
    {label:'进入国家体系',desc:'个人命运汇入集体',apply:function(s){if(s.energy>=25)return{effects:{energy:-8,mood:-4},text:'你报了名。',directEnding:'war_hero',setFlag:'joinedwar'};return{effects:{energy:-8,mood:-4},text:'你报了名，但体力已经透支……',directEnding:'war_drifter',setFlag:'joinedwar'};}},
    {label:'撤到安全区域',desc:'活着就是胜利',apply:function(){return{effects:{money:-8,mood:-6},hiddenFx:{survival:2},text:'你变卖了一些东西，离开了。',directEnding:'war_drifter'};}},
    {label:'后方技术支援',desc:'用技能服务更大的事',apply:function(s){if(STATE.hidden.survival>=25||s.ai>=50||s.career>=40)return{effects:{career:4,money:3},text:'你的能力在后方反而更被需要。',directEnding:'war_support',setFlag:'joinedsupport'};return{effects:{mood:-5},text:'你想帮忙，但能力太窄了。',directEnding:'war_drifter'};}},
  ]},
  resource_crisis:{title:'⛽ 全球资源危机',text:'芯片断供、电价暴涨、数据中心限电。\n\nAI最依赖的算力，突然变成了奢侈品。',category:'social',minQuarter:4,condition:function(){return !STATE.flags.resourcecollapse&&trueRand(100)<40;},applyPassive:function(){STATE.flags.resourcecollapse=true;},branches:[
    {label:'缩减欲望，保基本盘',desc:'断舍离',apply:function(){return{effects:{money:-2,mood:1},text:'你发现很多东西你根本不需要。'};}},
    {label:'用储蓄换时间',desc:'烧钱撑过去',apply:function(){return{effects:{money:-8,mood:2},text:'你相信这是暂时的。'};}},
    {label:'学习非AI生存技能',desc:'不用电的能力就是武器',apply:function(){return{effects:{mood:-2},hiddenFx:{survival:6},text:'如果AI不可用了，你还能靠什么活？'};}},
  ]},
  talent_earthquake:{title:'🌊 竞对核心团队集体出走',text:'竞对CTO带着核心人员跳槽了。猎头正在打你的电话。',category:'company',minQuarter:3,condition:function(){return !STATE.flags.talent_quake;},applyPassive:function(){STATE.flags.talent_quake=true;},branches:[
    {label:'留下来补位',desc:'变化中找机会',apply:function(){return{effects:{career:8,energy:-5},text:'变化中接手了更多项目，快速成长。'};}},
    {label:'跳槽去竞对',desc:'薪资+40%',apply:function(){return{effects:{money:10,career:-7},text:'薪资提升了，但需要在新环境重新建立信任和影响力。',setFlag:'jumped'};}},
    {label:'保持观望',desc:'等局势明朗',apply:function(){return{effects:{mood:-3},text:'你既没走也没趁机争取什么。'};}},
  ]},
  gpt_moment:{title:'🚀 新一代模型颠覆认知',text:'新模型发布了。不是渐进提升，是代际飞跃。\n\n你上个月的技能突然像打字机一样过时了。',category:'industry',minQuarter:3,condition:function(){return !STATE.flags.gpt_moment;},applyPassive:function(){STATE.flags.gpt_moment=true;STATE.flags.build_changed=true;},branches:[
    {label:'ALL IN新范式',desc:'扔掉旧的，全力拥抱',apply:function(s){if(s.ai>=40)return{effects:{ai:8,mood:5,energy:-8},hiddenFx:{positioning:3},text:'有足够基础来快速迁移。'};return{effects:{ai:3,mood:-6,energy:-10},text:'基础不够，焦虑翻倍。'};}},
    {label:'观察，不急着跟',desc:'看看是不是三个月热度',apply:function(){return{effects:{mood:-3},hiddenFx:{survival:2},text:'你选择先看看。'};}},
    {label:'反思自己的护城河',desc:'什么能力不会被替代？',apply:function(){return{effects:{mood:3,career:4},hiddenFx:{survival:3,positioning:1},text:'如果AI能做我做的事，我还剩下什么？答案比想象中多。'};}},
  ]},
};
MAJOR_EVENTS.space_age={title:'🚀 人类成功进入太空时代',text:'可控核聚变突破+AI自主科研加速，人类在月球建立了第一个永久基地。\n\n太空经济不再是科幻，而是真实的产业革命。你正在见证文明的跃迁。',category:'social',minQuarter:8,condition:function(){return !STATE.flags.space_age_triggered&&trueRand(100)<12;},applyPassive:function(){STATE.flags.space_age_triggered=true;},branches:[
    {label:'投身太空产业',desc:'这是下一个百年机会',apply:function(s){if(s.ai>=45)return{effects:{ai:10,career:8,mood:10},hiddenFx:{positioning:5},text:'你的AI能力在太空工程中找到了全新的用武之地。星辰大海，不再只是口号。'};return{effects:{mood:10,career:4},text:'虽然技术储备不够直接参与核心工作，但你成为了太空时代的第一批建设者。'};}},
    {label:'记录这个时代',desc:'见证历史本身就是一种参与',apply:function(){return{effects:{mood:12,ai:3},hiddenFx:{positioning:2},text:'你用文字和影像记录下了人类文明的关键时刻。后人会感谢你的。'};}},
    {label:'回归地球生活',desc:'仰望星空，脚踏实地',apply:function(){return{effects:{mood:8},hiddenFx:{survival:3},text:'太空很远，生活很近。你选择过好眼前的每一天。'};}},
  ]};
MAJOR_EVENTS.ai_communism={title:'☭ AI解放生产力，社会迈向新阶段',text:'当AI接管了大部分重复性劳动，生产力极大丰富。\n\n一些国家开始试行全民基本收入（UBI），工作从"谋生手段"变成了"自我实现的选择"。\n\n有人说，这就是教科书里写的那个未来。',category:'social',minQuarter:8,condition:function(){return !STATE.flags.ai_communism_triggered&&trueRand(100)<10;},applyPassive:function(){STATE.flags.ai_communism_triggered=true;},branches:[
    {label:'投入新社会建设',desc:'参与规则制定',apply:function(s){if(s.career>=40||s.ai>=50)return{effects:{career:8,mood:12,ai:5},hiddenFx:{positioning:4},text:'你的经验和能力在新秩序中找到了新的位置。从打工人变成了社会架构师。'};return{effects:{mood:10,career:3},text:'你积极参与社区建设，虽然影响力有限，但每一份贡献都有意义。'};}},
    {label:'享受自由，探索自我',desc:'终于可以做自己想做的事了',apply:function(){return{effects:{mood:15,energy:10},hiddenFx:{survival:3},text:'不用为生存焦虑的日子里，你发现了很多以前没时间做的事。原来你一直想学画画。'};}},
    {label:'保持警惕，观察变化',desc:'乌托邦来得太快，需要冷静',apply:function(){return{effects:{mood:5},hiddenFx:{survival:5,positioning:2},text:'历史告诉你，剧变之后总有震荡。你选择做那个保持清醒的人。'};}},
  ]};
var MAJOR_EVENT_SCHEDULE=[{q:3,ids:['talent_earthquake','gpt_moment']},{q:4,ids:['talent_earthquake','gpt_moment','resource_crisis','war']},{q:5,ids:['company_collapse','ai_winter','resource_crisis','war']},{q:6,ids:['company_collapse','ai_winter','resource_crisis','war']},{q:7,ids:['ai_winter','war','resource_crisis']},{q:8,ids:['war','space_age','ai_communism']}];
// ===== 结局系统（精简判定，适配5指标）=====
var ENDINGS=[
  {id:'fired',priority:0,condition:function(s){return STATE.flags.fired_compliance||(s.career<=8&&STATE.quarter>=4)||(s.career<=12&&s.money<=10&&STATE.quarter>=5);},title:'📦 被公司开除',getText:function(){if(STATE.flags.fired_compliance)return'外部咨询违反公司合规红线，HR直接下了解除通知。\n\n有些底线，碰了就没有回头路。';return'连续多个季度绩效不达标，能力评估未通过。\n\nHR约你谈话时，你其实已经预感到了。收拾工位的时候，你想起第一天入职时的兴奋。';},text:'',tags:['合规红线','绩效淘汰'],hint:'职场力太低会被开除！'},
  {id:'burnout',priority:0,condition:function(s){return s.energy<=10;},title:'🔋 过载熄火',text:'你的身体替你做了一个大脑不肯做的决定：停下来。\n\n医生说："你上一次休息是什么时候？"\n你答不上来。',tags:['过载型','身体透支'],hint:'体力见底了！快去休息！'},
  {id:'hollow',priority:0,condition:function(s){return s.mood<=10;},title:'🫥 需要停下来的追风者',text:'跑得太快的时候，最需要的可能不是更快的速度，而是停下来想想为什么出发。',tags:['需要休整','重新出发'],hint:'心态快崩了！需要社交或休息'},
  {id:'broke',priority:0,condition:function(s){return s.money<=5;},title:'💸 资源告急',text:'当资源不足时，最重要的是重新规划优先级，把有限的精力放在最关键的事情上。',tags:['资源管理','重新规划'],hint:'资源快没了！需要打工赚钱'},
  {id:'war_hero',priority:1,condition:function(s){return STATE.flags.warstarted&&STATE.flags.joinedwar&&s.energy>=25;},title:'🎖️ 战时功勋者',text:'当世界进入极端状态时，你没有退到旁观席。',tags:['时代亲历者']},
  {id:'war_support',priority:1,condition:function(s){return STATE.flags.warstarted&&STATE.flags.joinedsupport;},title:'🔧 后方建设者',text:'你的技能在另一个系统里重新有了意义。',tags:['通用生存力']},
  {id:'war_drifter',priority:1,condition:function(s){return STATE.flags.warstarted;},title:'🌊 时代洪流中的漂流者',text:'你准备应对的那个世界，和最终到来的这个世界，不是同一个。',tags:['宏观冲击']},
  {id:'cross_cycle',priority:2,condition:function(s){return(STATE.flags.aiindustryfrozen||STATE.flags.resourcecollapse)&&STATE.hidden.survival>=35&&s.mood>=35;},title:'🔄 跨周期生存者',text:'押注行业和押注自己，是两回事。',tags:['多线程生存者']},
  {id:'ai_stuck',priority:2,condition:function(s){return STATE.flags.aiindustryfrozen&&s.ai>=50&&STATE.hidden.survival<25;},title:'❄️ 等待春天的深耕者',text:'行业周期是客观规律，冬天积累的人往往在春天收获最多。',tags:['行业周期','蓄势待发']},
  {id:'phoenix',priority:3,condition:function(s){return STATE.flags.companycollapsed&&(s.ai>=50||s.career>=40);},title:'🔥 逆境中的重启者',text:'变化中最有价值的能力，是在任何环境下都能找到自己的位置。',tags:['抗脆弱']},
  {id:'org_victim',priority:3,condition:function(s){return STATE.flags.companycollapsed;},title:'🏚️ 寻找新支点的人',text:'当外部环境剧烈变化时，多一个支撑点就多一份从容。',tags:['多元发展']},
  {id:'wave_rider',priority:4,condition:function(s){return s.ai>=75&&STATE.hidden.positioning>=20;},title:'🏄 浪潮驾驭者',text:'你不是风口的游客，而是少数真正理解风为什么吹、会吹向哪里的人。',tags:['技术深耕','长期主义'],hint:'AI力很高！继续深耕'},
  {id:'org_king',priority:4,condition:function(s){return s.career>=70&&s.ai>=25&&!STATE.flags.companycollapsed;},title:'⚗️ 组织王者',text:'你不是最懂AI的人，但你是最懂怎么让AI在组织里跑起来的人。\n\n推动预算、搞定老板、协调团队、落地项目——这些事情AI替代不了，而你做得比谁都好。',tags:['组织推动者','业务落地'],hint:'职场力超强！'},
  {id:'creator',priority:4,condition:function(s){return s.ai>=65&&s.mood>=50;},title:'🎨 AI时代独立创作者',text:'你把AI当创作杠杆，在组织之外长出了自己的生态位。',tags:['独立生态位'],hint:'AI力+好心态！'},
  {id:'human_ai',priority:4,condition:function(s){return s.ai>=50&&s.career>=40&&s.mood>=45;},title:'🤝 人机协作者',text:'你和AI形成了一种默契——你提供判断力、创造力和同理心，AI提供速度、精度和规模。\n\n你的产出质量是纯人类或纯AI都达不到的。这不是替代，是共生。',tags:['人机共生','深度融合'],hint:'AI力+职场力+好心态！'},
  {id:'hermit',priority:4,condition:function(s){return s.mood>=75&&s.energy>=70;},title:'🏔️ 赛博隐士',text:'你没成为最亮的人，但成为了少数没把自己弄丢的人。',tags:['节奏守护型'],hint:'心态和体力都很棒！'},
  {id:'trad_master',priority:4,condition:function(s){return s.career>=65&&s.ai<25;},title:'🏛️ 传统技能坚守者',text:'潮水退去后，你依然站在那里。',tags:['基本功','反潮流'],hint:'职场力超强但AI力低'},
  {id:'skipped',priority:5,condition:function(s){return s.ai<=15&&s.career<=20;},title:'👤 还在寻找方向的人',text:'每个人都有自己的节奏，找到方向比跑得快更重要。',tags:['探索中']},
  {id:'survivor',priority:99,condition:function(){return true;},title:'🌱 稳态生存者',text:'在一年变三次的行业里，"稳稳地活着"就是被低估的胜利。',tags:['稳态型']},
];

var QUARTER_NARRATIONS=['','2026年Q1。AI的发展速度超过了所有人的预期。每家公司都在谈AI转型。\n\n你是一名大厂打工人，老板说"每个人都要用起来"。','2026年Q2。有人因为AI项目脱颖而出，有人在思考自己的定位。\n\n变化和机会并存。','2026年Q3。行业开始分化。有人卷技术，有人卷品牌，有人卷创业。\n\n选择比努力重要。','2026年Q4。年终总结里要写"AI相关成果"。真的有成果吗？','2027年Q1。去年的"前沿"已变成"入门"。技术迭代的速度超出所有人的预期。你开始思考：什么能力是不会随技术迭代而贬值的？','2027年Q2。行业进入深水区。理性与热情交织，方向感变得更加重要。','2027年Q3。技术和时代都在发生巨变。','2027年Q4。最后一个季度。为自己的故事写结尾。'];

// ===== 结局预测函数 =====
function predictEnding(){
  var s=STATE.stats,h=STATE.hidden;
  // 危险预警优先
  if(s.energy<=25) return{icon:'⚠️',text:'体力危险！再不休息就要过载熄火了',color:'#dc2626'};
  if(s.mood<=25) return{icon:'⚠️',text:'心态危险！需要社交或休息来恢复',color:'#dc2626'};
  if(s.money<=12) return{icon:'⚠️',text:'资源告急！需要打工赚钱',color:'#dc2626'};
  // 正面预测
  if(s.ai>=55&&h.positioning>=12) return{icon:'🏄',text:'你正在走向「浪潮驾驭者」— 继续深耕AI！',color:'#FF2442'};
  if(s.career>=55&&s.ai>=20) return{icon:'⚗️',text:'你正在走向「组织王者」— 组织推动力拉满！',color:'#8B7EC8'};
  if(s.ai>=50&&s.mood>=50) return{icon:'🎨',text:'你正在走向「独立创作者」— AI力+好心态！',color:'#FF6680'};
  if(s.mood>=65&&s.energy>=60) return{icon:'🏔️',text:'你正在走向「赛博隐士」— 内心平静是最大的奢侈',color:'#66BB88'};
  if(s.career>=50&&s.ai<20) return{icon:'🏛️',text:'你正在走向「传统坚守者」— 要不要学点AI？',color:'#FFaa44'};
  if(s.ai>=40&&s.career>=30&&s.mood>=45) return{icon:'🤝',text:'你正在走向「人机协作者」— AI力+职场力+好心态的黄金三角！',color:'#FF8866'};
  if(h.survival>=20) return{icon:'🔄',text:'生存韧性在积累 — 思考和学习在默默发力',color:'#66BB88'};
  // 中性
  return{icon:'🌱',text:'继续探索，你的故事还在展开…',color:'#999'};
}
var $app=document.getElementById('app');
function render(){STATE.showTooltip=null;({start:renderStart,profile:renderProfile,intro:renderIntro,action:renderAction,event_show:renderEventShow,event_choice:renderEventChoice,major_event:renderMajorEvent,branch:renderBranch,summary:renderSummary,ending:renderEnding})[STATE.phase]();}
function getAvatar(){return STATE.avatar||'👨';}
function renderTooltipHTML(){if(!STATE.showTooltip)return'';var t=STATE.showTooltip;return'<div class="tooltip-overlay" onclick="G.closeTooltip()"><div class="tooltip-box" onclick="event.stopPropagation()"><div class="tip-icon">'+t.icon+'</div><div class="tip-label">'+t.label+'</div><div class="tip-text">'+t.tip+'</div><button class="close-tip" onclick="G.closeTooltip()">知道了</button></div></div>';}
function renderStart(){$app.innerHTML='<div class="start-screen"><h1>AI大时代<br>生存模拟器</h1><p class="subtitle">2026-2027，AI大时代。<br>你是一名大厂打工人。<br>8个季度，每季度最多3次行动。<br>你的选择决定你的结局。<br><br><span style="color:#FF2442;font-weight:600">🎯 '+ENDINGS.length+'种结局等你解锁</span></p><button class="start-btn" onclick="G.startGame()">开始模拟</button><div class="ship-container"><div class="ship-flag">🚩</div><div class="ship-sail">    /|\\\n   / | \\\n  /  |  \\\n /   |   \\</div><div class="ship-body">  __|___|__\n /         \\\n/___________\\</div><div class="ship-wave">~~ ≈ ~~ ≈ ~~ ≈ ~~ ≈ ~~\n  ≈ ~~ ≈ ~~ ≈ ~~ ≈ ~~</div></div></div>';}
function renderProfile(){var canGo=STATE.avatar&&STATE.playerName.trim();var quickAvatars=['👨','👩'];var curIsQuick=quickAvatars.indexOf(STATE.avatar)>=0;var showCur=STATE.avatar&&!curIsQuick?STATE.avatar:'❓';var avGrid='';for(var ai=0;ai<quickAvatars.length;ai++){var av=quickAvatars[ai];var sel=STATE.avatar===av?' selected':'';avGrid+='<button class="avatar-btn'+sel+'" onclick="G.setAvatar(\''+av+'\')">'+av+'</button>';}avGrid+='<button class="avatar-btn'+(STATE.avatar&&!curIsQuick?' selected':'')+'" onclick="G.randomAvatar()">'+showCur+'</button>';var ageHtml='<div style="margin-top:12px;padding:10px;background:#F0F4FF;border-radius:12px;border:1px solid #D0DAEF"><div style="font-size:13px;color:#4A6FA5;font-weight:600;margin-bottom:4px">🎂 随机年龄</div><div style="font-size:22px;font-weight:700;color:#2B4C7E">'+STATE.playerAge+' 岁</div><div style="font-size:11px;color:#888;margin-top:2px">年龄影响初始体力和心态，年轻体力好、年长心态稳</div></div>';var tagHtml='';if(STATE._initTags.length>0){tagHtml='<div style="margin-top:12px;padding:10px;background:#FFF5F7;border-radius:12px;border:1px solid #FFE0E6"><div style="font-size:13px;color:#FF2442;font-weight:600;margin-bottom:6px">🏷️ 你的起始天赋</div>';for(var i=0;i<STATE._initTags.length;i++){var t=STATE._initTags[i];tagHtml+='<div style="margin-bottom:5px"><div><span style="font-size:14px;font-weight:600">'+t.label+'</span> <span style="font-size:12px;color:#888">'+t.desc+'</span></div><div style="font-size:11px;color:#BB6677;margin-top:1px;padding-left:2px">↳ '+t.reason+'</div></div>';}tagHtml+='</div>';}$app.innerHTML='<div class="profile-screen" style="overflow-y:auto;max-height:100vh;padding-bottom:40px"><h2>创建你的角色</h2><div class="profile-field"><label>选择头像 <span style="font-size:12px;color:#aaa">（点❓随机惊喜）</span></label><div class="avatar-grid">'+avGrid+'</div></div><div class="profile-field"><label>你的名字</label><div class="input-row"><input id="nameInput" type="text" placeholder="输入姓名" maxlength="12" value="'+esc(STATE.playerName)+'" oninput="G.updateName(this.value)"><button class="dice-btn" onclick="G.randomName()">🎲</button></div></div><div class="profile-field"><label>一句话简介（选填）</label><input id="bioInput" type="text" placeholder="例如：大厂搬砖三年的运营" maxlength="30" value="'+esc(STATE.playerBio)+'" oninput="G.updateBio(this.value)"></div>'+ageHtml+tagHtml+'<button class="btn btn-primary '+(canGo?'':'btn-disabled')+'" onclick="G.confirmProfile()" style="margin-top:16px">进入游戏 →</button></div>';}
function renderTopBar(){var q=STATE.quarter,year=q<=4?'2026':'2027',qLabel='Q'+(((q-1)%4)+1);var rows='';for(var key in STAT_META){if(!STAT_META.hasOwnProperty(key))continue;var meta=STAT_META[key];var val=clamp(STATE.stats[key],0,100);var bc=val<=20?'#ef4444':meta.color;rows+='<div class="stat-row"><span class="stat-icon">'+meta.icon+'</span><span class="stat-label">'+meta.label+'</span><button class="stat-info-btn" onclick="event.stopPropagation();G.showTip(\''+key+'\')">i</button><div class="stat-bar-bg"><div class="stat-bar" style="width:'+val+'%;background:'+bc+'"></div></div><span class="stat-val">'+val+'</span></div>';}var tagLine='';if(STATE._initTags.length>0){tagLine='<div class="topbar-tags">';for(var ti=0;ti<STATE._initTags.length;ti++){tagLine+='<span class="topbar-tag">'+STATE._initTags[ti].label+'</span>';}tagLine+='</div>';}return'<div class="top-bar"><div class="user-info-bar"><div class="user-avatar">'+getAvatar()+'</div><div class="user-details"><div class="user-name">'+(esc(STATE.playerName)||'玩家')+' <span style="font-size:11px;color:#4A6FA5;font-weight:400">'+(STATE.playerAge||'?')+'岁</span></div><div class="user-bio">'+(esc(STATE._initBio)||esc(STATE.playerBio)||'大厂打工人')+'</div></div><span class="quarter-badge">'+year+' '+qLabel+'</span></div>'+tagLine+'<div class="stats-list">'+rows+'</div><div class="progress-bar"><div class="progress-fill" style="width:'+(q/8*100)+'%"></div></div></div>'+renderTooltipHTML();}
function renderIntro(){var pred=predictEnding();$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card narration-card"><div class="card-title">📅 第'+STATE.quarter+'季度</div><div class="card-body"><p>'+QUARTER_NARRATIONS[STATE.quarter].replace(/\n/g,'<br>')+'</p></div></div>'+(STATE.quarter>1?'<div style="background:linear-gradient(135deg,#FFF5F7,#FFE8EC);border-radius:10px;padding:10px 12px;margin-bottom:10px;border-left:3px solid '+pred.color+'"><span style="font-size:16px">'+pred.icon+'</span> <span style="font-size:13px;color:#333">'+pred.text+'</span></div>':'')+'<button class="btn btn-primary" onclick="G.toAction()">选择行动 →</button></div>';}
function renderAction(){var sel=STATE.selectedActions;var btns='';for(var i=0;i<ACTIONS.length;i++){var a=ACTIONS[i];var isSel=sel.indexOf(a.id)>=0;var combined={};for(var k in a.effects){if(a.effects.hasOwnProperty(k))combined[k]=a.effects[k];}if(a.bonus){var bn=a.bonus(STATE.stats);for(var bk in bn){if(bn.hasOwnProperty(bk))combined[bk]=(combined[bk]||0)+bn[bk];}}var pv='';for(var ck in combined){if(!combined.hasOwnProperty(ck))continue;var m=STAT_META[ck];if(m)pv+=m.icon+(combined[ck]>0?'+':'')+combined[ck]+' ';}if(STATE.flags.ai_skill_nerf&&a.id==='ai')pv+=' ⚠️';if(STATE.flags.work_nerf&&a.id==='work')pv+=' ⚠️';btns+='<button class="'+(isSel?'btn btn-selected':'btn')+'" onclick="G.toggleAction(\''+a.id+'\')"><div class="btn-label">'+a.label+(isSel?' ✓':'')+'</div><div class="btn-desc">'+a.desc+'</div><div class="btn-fx">'+pv+'</div></button>';}var qNar=QUARTER_NARRATIONS[STATE.quarter]||'';var shortNar=qNar.split('\n')[0];var narCard=shortNar?'<div style="background:#FFF5F7;border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:13px;color:#666;border-left:3px solid #FF2442"><span style="color:#FF2442;font-weight:600">📅 本季度：</span>'+shortNar+'</div>':'';$app.innerHTML=renderTopBar()+'<div class="main-area" id="actionArea">'+narCard+'<div class="action-header"><div class="action-counter">已选 <span>'+sel.length+'</span> / 3 个行动</div><button class="btn-secondary" onclick="G.backToIntro()">← 返回</button></div><div class="btn-grid">'+btns+'</div><button class="btn btn-primary '+(sel.length>=1?'':'btn-disabled')+'" onclick="G.confirmActions()" style="margin-top:8px">确认行动 →</button></div>';}
function renderEventShow(){var ev=STATE._eventQueue[STATE._eventIndex];if(!ev){processPostEvents();return;}var fxText='';if(ev.effects){for(var k in ev.effects){if(!ev.effects.hasOwnProperty(k))continue;var m=STAT_META[k];if(m)fxText+='<span style="color:'+(ev.effects[k]>0?'#16a34a':'#dc2626')+';font-weight:600">'+m.icon+(ev.effects[k]>0?'+':'')+ev.effects[k]+'</span> ';}}var dtag=ev.dilemma?'<span style="background:#FFE4D6;color:#B85C38;padding:2px 8px;border-radius:10px;font-size:11px">🎭 两难</span> ':'';$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card event-card"><div class="card-title">'+(ev.tone==='positive'?'📈 好消息':'📉 坏消息')+'</div><div class="card-body"><p style="font-weight:600;font-size:16px;color:#1a1a2e;margin-bottom:8px">'+dtag+ev.title+'</p><p>'+ev.text.replace(/\n/g,'<br>')+'</p>'+(fxText?'<p style="margin-top:8px">'+fxText+'</p>':'')+'</div></div><div style="text-align:center;font-size:12px;color:#999;margin-top:4px">'+(STATE._eventIndex+1)+' / '+STATE._eventQueue.length+' 个事件</div><button class="btn btn-primary" onclick="G.nextEvent()">继续 →</button></div>';}
function renderEventChoice(){var ev=STATE._eventQueue[STATE._eventIndex];var dtag=ev.dilemma?'<span style="background:#FFF0F0;color:#FF2442;padding:3px 10px;border-radius:12px;font-size:12px;margin-bottom:12px;display:inline-block">⚡ 两难抉择</span>':'';var btns='';for(var i=0;i<ev.choices.length;i++){btns+='<button class="btn" onclick="G.chooseEvent('+i+')"><div class="btn-label">'+ev.choices[i].label+'</div><div class="btn-desc">'+ev.choices[i].desc+'</div></button>';}$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card event-card" style="border-color:#FFB080;background:linear-gradient(135deg,#FFF8F0,#FFEED8)"><div class="card-title">🤔 你需要做个决定</div><div class="card-body">'+dtag+'<p style="font-weight:600;font-size:16px;color:#1a1a2e;margin-bottom:8px">'+ev.title+'</p><p>'+ev.text.replace(/\n/g,'<br>')+'</p></div></div><div class="btn-group">'+btns+'</div></div>';}
function renderMajorEvent(){var ev=STATE._currentMajor;$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card event-card major"><div class="card-title">⚡ 重大事件</div><div class="card-body"><p style="font-weight:600;font-size:16px;color:#1a1a2e;margin-bottom:8px">'+ev.title+'</p><p>'+ev.text.replace(/\n/g,'<br>')+'</p></div></div><button class="btn btn-primary" onclick="G.toBranch()">面对抉择 →</button></div>';}
function renderBranch(){var ev=STATE._currentMajor;var btns='';for(var i=0;i<ev.branches.length;i++){btns+='<button class="btn" onclick="G.chooseBranch('+i+')"><div class="btn-label">'+ev.branches[i].label+'</div><div class="btn-desc">'+ev.branches[i].desc+'</div></button>';}$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card event-card major"><div class="card-title">⚡ '+ev.title+'</div><div class="card-body"><p>你必须做出选择：</p></div></div><div class="btn-group">'+btns+'</div></div>';}
function renderSummary(){var goEnd=STATE._pendingEnding||checkCriticalEnding()||STATE.quarter>=8;$app.innerHTML=renderTopBar()+'<div class="main-area">'+(STATE._branchResult?'<div class="card"><div class="card-body"><p>'+STATE._branchResult.replace(/\n/g,'<br>')+'</p></div></div>':'')+'<button class="btn btn-primary" onclick="'+(goEnd?'G.toEnding()':'G.nextQuarter()')+'">'+(goEnd?'查看结局 →':'进入下一季度 →')+'</button></div>';}
function renderEnding(){var ending=STATE._pendingEnding?(ENDINGS.find(function(e){return e.id===STATE._pendingEnding;})||determineEnding()):determineEnding();if(ending.getText)ending.text=ending.getText();var s=STATE.stats;var sh='';for(var k in STAT_META){if(!STAT_META.hasOwnProperty(k))continue;var m=STAT_META[k];var v=clamp(s[k],0,100);sh+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:12px;min-width:50px">'+m.icon+m.label+'</span><div style="flex:1;height:6px;background:#FFF0F3;border-radius:3px;overflow:hidden"><div style="width:'+v+'%;height:100%;background:'+m.color+';border-radius:3px"></div></div><span style="font-size:11px;color:#999;min-width:22px;text-align:right">'+v+'</span></div>';}var mj=STATE.eventLog.filter(function(e){return e.major;});var tl=mj.length?'<div style="margin-top:12px;padding-top:12px;border-top:1px solid #FFF0F3"><div style="font-size:13px;color:#888;margin-bottom:6px">📜 经历的重大事件</div>'+mj.map(function(e){return'<div style="font-size:13px;color:#666;margin-bottom:3px">Q'+e.q+' · '+e.title+'</div>';}).join('')+'</div>':'';var ac={};STATE.actionHistory.forEach(function(a){ac[a]=(ac[a]||0)+1;});var top=Object.entries(ac).sort(function(a,b){return b[1]-a[1];}).slice(0,3).map(function(x){var a=ACTIONS.find(function(aa){return aa.id===x[0];});return a?a.label+'×'+x[1]:'';}).filter(Boolean).join('、');$app.innerHTML='<div class="main-area" style="padding-top:24px"><div class="card ending-card"><div style="font-size:36px;margin-bottom:8px">'+getAvatar()+'</div><div style="font-size:14px;color:#888;margin-bottom:4px">'+esc(STATE.playerName)+' 的结局</div><div class="ending-title">'+ending.title+'</div><div class="ending-text">'+ending.text.replace(/\n/g,'<br>')+'</div><div class="ending-tags">'+(ending.tags||[]).map(function(t){return'<span class="ending-tag">#'+t+'</span>';}).join('')+'</div></div><div class="card" style="margin-top:8px"><div class="card-title">📊 最终状态</div><div class="card-body">'+sh+(top?'<div style="margin-top:8px;font-size:13px;color:#888">最常做的事：'+top+'</div>':'')+tl+'</div></div><div style="margin-top:12px"><button class="btn btn-primary" onclick="G.restart()" style="width:100%">再来一次（'+ENDINGS.length+'种结局，你解锁了几种？）</button></div></div>';}
function startGame(){initStats();STATE.avatar='';STATE.playerName='';STATE.playerBio='';STATE.phase='profile';render();}
function setAvatar(a){STATE.avatar=a;document.querySelectorAll('.avatar-btn').forEach(function(b){b.classList.remove('selected');});if(event&&event.currentTarget)event.currentTarget.classList.add('selected');updateProfileBtn();}
function randomAvatar(){STATE.avatar=AVATARS[trueRand(AVATARS.length)];render();}
function updateProfileBtn(){var btn=document.querySelector('.btn-primary');if(btn){if(STATE.avatar&&STATE.playerName.trim())btn.classList.remove('btn-disabled');else btn.classList.add('btn-disabled');}}
function updateName(v){STATE.playerName=v;updateProfileBtn();}
function updateBio(v){STATE.playerBio=v;}
function randomName(){STATE.playerName=RANDOM_NAMES[trueRand(RANDOM_NAMES.length)];var inp=document.getElementById('nameInput');if(inp)inp.value=STATE.playerName;updateProfileBtn();}
function confirmProfile(){if(!STATE.avatar||!STATE.playerName.trim())return;STATE._initBio=STATE.playerBio||'大厂打工人';STATE.quarter=1;STATE.phase='intro';render();}
function toAction(){STATE.selectedActions=[];STATE.phase='action';render();}
function backToIntro(){STATE.phase='intro';render();}
function toggleAction(id){var idx=STATE.selectedActions.indexOf(id);if(idx>=0)STATE.selectedActions.splice(idx,1);else if(STATE.selectedActions.length<3)STATE.selectedActions.push(id);var area=document.getElementById('actionArea');var st=area?area.scrollTop:0;renderAction();var a2=document.getElementById('actionArea');if(a2)a2.scrollTop=st;}
function confirmActions(){
  if(STATE.selectedActions.length<1)return;
  STATE._thisQuarterActions=STATE.selectedActions.slice();
  var lowE=STATE.stats.energy<=20;
  for(var j=0;j<STATE.selectedActions.length;j++){
    var aid=STATE.selectedActions[j];
    var action=ACTIONS.find(function(a){return a.id===aid;});
    var fx={};for(var k in action.effects){if(action.effects.hasOwnProperty(k))fx[k]=action.effects[k];}
    if(action.bonus){var b=action.bonus(STATE.stats);for(var bk in b){if(b.hasOwnProperty(bk))fx[bk]=(fx[bk]||0)+b[bk];}}
    if(lowE){for(var fk in fx){if(fx.hasOwnProperty(fk)&&fx[fk]>0&&fk!=='energy'&&fk!=='mood')fx[fk]=Math.round(fx[fk]*0.7);}}
    if(STATE.flags.ai_skill_nerf&&aid==='ai')fx.ai=Math.round((fx.ai||0)*0.5);
    if(STATE.flags.work_nerf&&aid==='work')fx.money=Math.round((fx.money||0)*0.6);
    if(STATE.flags.build_changed&&aid==='ai'){if(fx.career)fx.career=Math.round(fx.career*0.7);}
    applyEffects(fx);if(action.hiddenFx)applyHidden(action.hiddenFx);STATE.actionHistory.push(aid);
  }
  STATE.stats.energy=clamp(STATE.stats.energy+5,0,100);
  // 职场力自然衰减(不做work/social时)
  var didCareer=STATE.selectedActions.indexOf('work')>=0||STATE.selectedActions.indexOf('social')>=0;
  if(!didCareer)STATE.stats.career=Math.max(5,STATE.stats.career-(STATE.stats.career>=50?3:2));
  // AI力自然衰减(不做learn_ai/build时)
  var didAI=STATE.selectedActions.indexOf('ai')>=0;
  if(!didAI)STATE.stats.ai=Math.max(3,STATE.stats.ai-(STATE.stats.ai>=50?4:STATE.stats.ai>=30?3:1));
  if(checkCriticalEnding()){STATE.phase='ending';render();return;}
  var numEv=1+trueRand(3);
  var queue=[],usedThisQ={};for(var ei=0;ei<numEv;ei++){var ev=pickNormalEvent(usedThisQ);if(ev){queue.push(ev);usedThisQ[ev.id]=true;if(ev.once)STATE._usedOnceEvents[ev.id]=true;}}
  STATE._eventQueue=queue;STATE._eventIndex=0;
  STATE._currentMajor=pickMajorEvent();
  if(STATE._currentMajor)STATE.eventLog.push({q:STATE.quarter,title:STATE._currentMajor.title,major:true});
  showCurrentEvent();
}
function showCurrentEvent(){
  if(STATE._eventIndex>=STATE._eventQueue.length){processPostEvents();return;}
  var ev=STATE._eventQueue[STATE._eventIndex];
  if(ev.type==='passive'){
    if(ev.effects)applyEffects(ev.effects);if(ev.hiddenFx)applyHidden(ev.hiddenFx);if(ev.setFlag)STATE.flags[ev.setFlag]=true;
    STATE.eventLog.push({q:STATE.quarter,title:ev.title,major:false});STATE.phase='event_show';
  }else{STATE.eventLog.push({q:STATE.quarter,title:ev.title,major:false});STATE.phase='event_choice';}
  render();
}
function nextEvent(){if(checkCriticalEnding()){STATE.phase='ending';render();return;}STATE._eventIndex++;showCurrentEvent();}
function chooseEvent(idx){
  var ev=STATE._eventQueue[STATE._eventIndex];var choice=ev.choices[idx];
  var result=typeof choice.apply==='function'?choice.apply(STATE.stats):choice.apply;
  if(result.effects)applyEffects(result.effects);if(result.hiddenFx)applyHidden(result.hiddenFx);
  if(result.setFlag)STATE.flags[result.setFlag]=true;if(ev.setFlag)STATE.flags[ev.setFlag]=true;
  if(result.directEnding){STATE._pendingEnding=result.directEnding;STATE._eventQueue[STATE._eventIndex]={title:ev.title,text:result.text,effects:result.effects,tone:ev.tone,type:'passive',_alreadyApplied:true};STATE.phase='event_show';render();return;}
  STATE._eventQueue[STATE._eventIndex]={title:ev.title,text:result.text,effects:result.effects,tone:ev.tone,type:'passive',_alreadyApplied:true};
  STATE.phase='event_show';render();
}
function processPostEvents(){if(checkCriticalEnding()){STATE.phase='ending';render();return;}if(STATE._currentMajor){STATE.phase='major_event';render();return;}toNextOrEnding();}
function toNextOrEnding(){if(STATE.quarter>=8){STATE.phase='ending';}else{STATE.quarter++;STATE._eventQueue=[];STATE._eventIndex=0;STATE._currentMajor=null;STATE._branchResult=null;STATE._pendingEnding=null;STATE._thisQuarterActions=[];STATE.phase='intro';}render();}
function toBranch(){STATE.phase='branch';render();}
function chooseBranch(idx){
  var ev=STATE._currentMajor,branch=ev.branches[idx];if(ev.applyPassive)ev.applyPassive();
  var result=branch.apply(STATE.stats);if(result.effects)applyEffects(result.effects);if(result.hiddenFx)applyHidden(result.hiddenFx);if(result.flag)STATE.flags[result.flag]=true;if(result.setFlag)STATE.flags[result.setFlag]=true;
  STATE._branchResult=result.text||'';
  if(result.directEnding){STATE._pendingEnding=result.directEnding;STATE.phase='summary';render();return;}
  if(checkCriticalEnding()){STATE.phase='ending';render();return;}
  STATE.phase='summary';render();
}
function nextQuarter(){STATE.quarter++;STATE._eventQueue=[];STATE._eventIndex=0;STATE._currentMajor=null;STATE._branchResult=null;STATE._pendingEnding=null;STATE._thisQuarterActions=[];STATE.phase='intro';render();}
function toEnding(){STATE.phase='ending';render();}
function restart(){STATE.phase='start';render();}
function showTip(key){var m=STAT_META[key];if(!m)return;STATE.showTooltip=m;var old=document.querySelector('.tooltip-overlay');if(old)old.remove();var div=document.createElement('div');div.innerHTML=renderTooltipHTML();if(div.firstElementChild)document.body.appendChild(div.firstElementChild);}
function closeTooltip(){STATE.showTooltip=null;var el=document.querySelector('.tooltip-overlay');if(el)el.remove();}

function pickNormalEvent(usedThisQuarter){
  var q=STATE.quarter,s=STATE.stats,w=getEventWeights(q),phase=q<=2?'early':(q<=5?'mid':'late');
  var allPools=q<4?[PERSONAL_EVENTS,COMPANY_EVENTS,INDUSTRY_EVENTS]:[PERSONAL_EVENTS,COMPANY_EVENTS,INDUSTRY_EVENTS,SOCIAL_EVENTS];
  var poolWeights=q<4?[w.personal,w.company,w.industry]:[w.personal,w.company,w.industry,w.social];
  var candidates=[];
  for(var pi=0;pi<allPools.length;pi++){
    var pool=allPools[pi];var pw=poolWeights[pi];
    for(var ei=0;ei<pool.length;ei++){
      var ev=pool[ei];
      if(usedThisQuarter[ev.id])continue;
      if(ev.once&&STATE._usedOnceEvents[ev.id])continue;
      if(ev.condition&&!ev.condition(s))continue;
      if(ev.requireFlag&&!STATE.flags[ev.requireFlag])continue;
      if(ev.phase&&ev.phase!==phase)continue;
      var weight=pw;
      if(ev.actionTrigger){for(var ai=0;ai<ev.actionTrigger.length;ai++){if(STATE._thisQuarterActions.indexOf(ev.actionTrigger[ai])>=0){weight*=3;break;}}}
      if(ev.statTrigger){if(ev.statTrigger.energy==='low'&&s.energy<=45)weight*=2;if(ev.statTrigger.mood==='low'&&s.mood<=45)weight*=2;}
      candidates.push({ev:ev,weight:weight});
    }
  }
  if(candidates.length===0)return null;
  var totalWeight=0;for(var ci=0;ci<candidates.length;ci++)totalWeight+=candidates[ci].weight;
  var r=trueRand(1000000)/1000000*totalWeight;
  for(var ci2=0;ci2<candidates.length;ci2++){r-=candidates[ci2].weight;if(r<=0)return candidates[ci2].ev;}
  return candidates[candidates.length-1].ev;
}
function pickMajorEvent(){
  var q=STATE.quarter,slot=MAJOR_EVENT_SCHEDULE.find(function(s){return s.q===q;});if(!slot)return null;
  var chance=q<=4?0.25:(q<=6?0.38:0.45);if(trueRand(1000000)/1000000>=chance)return null;
  var candidates=shuffle(slot.ids.slice());
  for(var i=0;i<candidates.length;i++){var me=MAJOR_EVENTS[candidates[i]];if(!me)continue;if(me.category==='social'&&q<4)continue;if(me.condition()){var copy={};for(var mk in me){if(me.hasOwnProperty(mk))copy[mk]=me[mk];}copy._isMajor=true;return copy;}}
  return null;
}
function getEventWeights(q){if(q<=2)return{personal:0.38,company:0.40,industry:0.22,social:0};if(q<=5)return{personal:0.28,company:0.30,industry:0.35,social:0.07};return{personal:0.22,company:0.25,industry:0.40,social:0.13};}
function checkCriticalEnding(){var s=STATE.stats;return s.energy<=10||s.mood<=10||s.money<=5||STATE.flags.fired_compliance||(s.career<=8&&STATE.quarter>=4)||(s.career<=12&&s.money<=10&&STATE.quarter>=5);}
function determineEnding(){var sorted=ENDINGS.slice().sort(function(a,b){return a.priority-b.priority;});for(var i=0;i<sorted.length;i++){if(sorted[i].condition(STATE.stats))return sorted[i];}return sorted[sorted.length-1];}
function applyEffects(fx){for(var k in fx){if(fx.hasOwnProperty(k)&&STATE.stats[k]!==undefined)STATE.stats[k]=clamp(STATE.stats[k]+fx[k],0,100);}}
function applyHidden(fx){for(var k in fx){if(fx.hasOwnProperty(k)&&STATE.hidden[k]!==undefined)STATE.hidden[k]+=fx[k];}}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function shuffle(arr){for(var i=arr.length-1;i>0;i--){var j=trueRand(i+1);var t=arr[i];arr[i]=arr[j];arr[j]=t;}return arr;}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

window.G={startGame:startGame,setAvatar:setAvatar,randomAvatar:randomAvatar,updateName:updateName,updateBio:updateBio,randomName:randomName,confirmProfile:confirmProfile,toAction:toAction,backToIntro:backToIntro,toggleAction:toggleAction,confirmActions:confirmActions,nextEvent:nextEvent,chooseEvent:chooseEvent,toBranch:toBranch,chooseBranch:chooseBranch,nextQuarter:nextQuarter,toEnding:toEnding,restart:restart,showTip:showTip,closeTooltip:closeTooltip};
render();
})();
