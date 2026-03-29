// ===== AI大跃进生存模拟器 v6 =====
(function(){
'use strict';

const STATE={quarter:0,selectedActions:[],phase:'start',stats:{},hidden:{},flags:{},actionHistory:[],eventLog:[],gender:'',playerName:'',playerBio:'',showTooltip:null,_eventQueue:[],_eventIndex:0,_currentMajor:null,_branchResult:null,_pendingEnding:null,_thisQuarterActions:[],_initTags:[],_initBio:'',_usedOnceEvents:{}};
const RANDOM_NAMES=['悟空','悟能','悟净','师傅','玄奘','奶龙','奥特曼','佩奇','克劳德','小扎','小马','老黄'];
function randInt(a,b){return a+Math.floor(Math.random()*(b-a+1));}

function initStats(){
  STATE.stats={work_skill:randInt(10,30),ai_skill:randInt(0,30),influence:randInt(5,30),fame:randInt(0,20),money:randInt(0,30),energy:randInt(60,100),mood:randInt(60,100)};
  STATE.hidden={positioning:0,survival:10};STATE.flags={};STATE.actionHistory=[];STATE.eventLog=[];STATE.quarter=0;STATE.selectedActions=[];
  STATE._eventQueue=[];STATE._eventIndex=0;STATE._currentMajor=null;STATE._branchResult=null;STATE._pendingEnding=null;STATE._thisQuarterActions=[];
  STATE._initTags=generateInitTags(STATE.stats);STATE._initBio='';STATE._usedOnceEvents={};
}
function generateInitTags(s){
  var tags=[];
  if(s.work_skill>=25)tags.push({label:'💼 天选打工人',desc:'你的打工基因与生俱来'});
  else if(s.work_skill<=14)tags.push({label:'😵 职场小白',desc:'PPT是什么？能吃吗？'});
  if(s.ai_skill>=25)tags.push({label:'🤖 AI原住民',desc:'你出生时手边就有ChatGPT'});
  else if(s.ai_skill<=5)tags.push({label:'🔌 AI绝缘体',desc:'你以为GPT是一种零食'});
  if(s.energy>=90)tags.push({label:'⚡ 精力怪物',desc:'你能连续开会12小时脸不红心不跳'});
  else if(s.energy<=68)tags.push({label:'😪 电量焦虑型',desc:'出门前先确认咖啡库存'});
  if(s.mood>=90)tags.push({label:'🌈 天生乐观派',desc:'被裁员也觉得是Gap Year'});
  else if(s.mood<=68)tags.push({label:'🌧️ 忧虑体质',desc:'晴天也想带把伞'});
  if(s.influence>=25)tags.push({label:'🏢 公司红人',desc:'你的名字老板叫得出来'});
  if(s.fame>=15)tags.push({label:'📢 小圈知名',desc:'至少有五十个陌生人关注你'});
  if(s.money>=25)tags.push({label:'💰 小有积蓄',desc:'至少裸辞能撑三个月'});
  else if(s.money<=8)tags.push({label:'🫗 月光战士',desc:'工资到账日就是还款日'});
  if(s.work_skill>=20&&s.ai_skill>=20)tags.push({label:'⚖️ 双修选手',desc:'两手都抓，至少不空'});
  if(s.energy>=85&&s.mood>=85)tags.push({label:'✨ 满状态出发',desc:'此刻的你是最好的你'});
  if(tags.length===0)tags.push({label:'🎯 普通但自信',desc:'没有突出特点就是你最大的特点'});
  return tags.slice(0,4);
}

const STAT_META={
  work_skill:{icon:'💼',label:'打工力',color:'#8B7EC8',tip:'基础职场能力：写文档、做汇报、带项目、搞协调。打工吃饭的本事'},
  ai_skill:{icon:'🤖',label:'AI力',color:'#FF6680',tip:'AI相关技术能力：会用工具、能做Demo、懂模型。但范式迭代可能让它贬值'},
  influence:{icon:'🏢',label:'影响力',color:'#FF8866',tip:'公司内部的话语权。不维护会自然下降，但降到一定程度就稳定了'},
  fame:{icon:'📢',label:'知名度',color:'#FFaa44',tip:'行业外部的个人品牌。不持续输出会自然衰减，但有底线'},
  money:{icon:'💰',label:'资源',color:'#66BB88',tip:'存款和抗风险能力。归零时你将失去选择的权利'},
  energy:{icon:'⚡',label:'体力',color:'#FF9944',tip:'身体和精神能量。过低时一切行动大打折扣'},
  mood:{icon:'❤️',label:'情绪',color:'#FF4466',tip:'幸福感和稳定性。受事件影响可能暴跌，过低会崩溃'},
};

const ACTIONS=[
  {id:'work',label:'💼 打工搬砖',desc:'产出常规/老板要求的工作项目，维持饭碗',effects:{money:7,work_skill:4,influence:2,energy:-4,mood:-2},hiddenFx:{survival:1},
    bonus:function(s){var b={};if(s.work_skill>=50)b.money=3;return b;}},
  {id:'learn_ai',label:'🤖 学AI',desc:'学习LLM、vibe coding等——产出AI项目的前置条件',effects:{ai_skill:9,work_skill:1,energy:-5,mood:-2},hiddenFx:{positioning:1}},
  {id:'build',label:'🔧 产出AI项目',desc:'AI力越高，产出质量越好（AI力<20时效果大减）',effects:{influence:2,fame:2,money:1,energy:-6,mood:-2},hiddenFx:{positioning:2},
    bonus:function(s){var b={};if(s.ai_skill>=20){b.ai_skill=2;b.influence=2;b.fame=1;}if(s.ai_skill>=40){b.influence=3;b.fame=2;b.money=2;}if(s.ai_skill>=60){b.fame=3;b.money=3;b.ai_skill=3;}if(s.ai_skill<20){b.influence=-1;b.fame=-1;b.mood=-3;}return b;}},
  {id:'share',label:'✍️ 输出分享',desc:'分享经验——有真东西时效果翻倍',effects:{fame:4,influence:1,energy:-3,mood:1},hiddenFx:{positioning:1},
    bonus:function(s){var b={};if(s.ai_skill>=30||s.work_skill>=35){b.fame=3;b.influence=2;}if(s.ai_skill>=50){b.fame=2;}return b;}},
  {id:'network_in',label:'🤝 社交',desc:'与同事老板搞好关系，获取内部消息和情绪支撑',effects:{influence:4,mood:5,energy:-2,money:-1},hiddenFx:{survival:1},
    bonus:function(s){var b={};if(s.influence>=40)b.money=2;return b;}},
  {id:'network_out',label:'🌐 混圈',desc:'认识AI圈朋友——找到导师和机会的关键渠道',effects:{fame:3,mood:2,energy:-3,money:-2},hiddenFx:{positioning:3},
    bonus:function(s){var b={};if(s.fame>=30){b.fame=2;b.ai_skill=2;}return b;}},
  {id:'rest',label:'🧘 运动/休息',desc:'锻炼身体、休假——低体力时唯一的自救手段',effects:{energy:15,mood:8,money:-1},hiddenFx:{survival:2}},
  {id:'think',label:'📚 学习/思考',desc:'读书、思考人生——提升生存韧性的隐藏王牌',effects:{work_skill:2,mood:5,energy:3},hiddenFx:{positioning:1,survival:5}},
];
const PERSONAL_EVENTS=[
  {id:'p1',once:true,title:'找到了自己的AI工作流',text:'不再追每个新工具，沉淀出一套稳定的方法。效率翻倍。',effects:{ai_skill:6,work_skill:3,energy:4,mood:4},tone:'positive',type:'passive',actionTrigger:['learn_ai','build'],setFlag:'has_workflow'},
  {id:'p2',title:'某个AI概念突然想通了',text:'之前死记硬背的东西，某天晚上突然贯通了。感觉像脑子里有什么东西被点亮了。',effects:{ai_skill:8,mood:6},hiddenFx:{positioning:1},tone:'positive',type:'passive',actionTrigger:['learn_ai'],condition:function(s){return s.ai_skill>=20;}},
  {id:'p3',once:true,title:'你做的AI工具在组内火了',text:'同事们开始每天用你做的提效脚本。两个之前从不搭理你的同事主动来问你是怎么做到的。',effects:{influence:7,mood:6,ai_skill:3,fame:3},tone:'positive',type:'passive',actionTrigger:['build'],setFlag:'tool_viral'},
  {id:'p4',once:true,title:'你的文章意外出圈了',text:'一篇随手写的观察被行业大佬转发。你开始理解什么叫"内容杠杆"。',effects:{fame:8,mood:6,influence:2},tone:'positive',type:'passive',actionTrigger:['share'],condition:function(s){return s.fame>=12;}},
  {id:'p5',once:true,title:'一位前辈开始带你',text:'TA不教你怎么用工具，而是教你怎么判断——什么值得做，什么是噪音。',effects:{ai_skill:5,work_skill:5,mood:8},hiddenFx:{positioning:2},tone:'positive',type:'passive',actionTrigger:['network_out','network_in'],setFlag:'has_mentor'},
  {id:'p6',title:'睡了个久违的好觉',text:'十点上床，七点醒来，一个梦都没做。早上出门时发现连路上的树都比平时好看了。',effects:{energy:12,mood:10},tone:'positive',type:'passive',actionTrigger:['rest'],condition:function(s){return s.energy<=50;}},
  {id:'p7',title:'想清楚了一件事',text:'不是AI的问题，也不是工作的问题。是关于你到底想成为什么样的人。',effects:{mood:10,work_skill:3},hiddenFx:{survival:4},tone:'positive',type:'passive',actionTrigger:['think','rest']},
  {id:'p8',title:'老板夸你方案写得好',text:'不是因为AI，是因为你逻辑清晰、表达精准。基本功被看到了。',effects:{work_skill:5,influence:5,mood:5},tone:'positive',type:'passive'},
  {id:'p9',title:'你帮同事解决了一个棘手问题',text:'不是技术问题，是沟通协调问题。TA说"你比我多数组长都懂这件事"。',effects:{work_skill:4,influence:5,mood:4},tone:'positive',type:'passive'},
  {id:'p10',once:true,title:'第一次做出完整可用Demo',text:'从想法到能跑的产品，独立完成。你给同事演示时看到TA脸上真实的惊喜。',effects:{ai_skill:6,fame:5,mood:7},tone:'positive',type:'passive',condition:function(s){return s.ai_skill>=25;}},
  {id:'p11',once:true,title:'你用AI帮老板做了一个惊艳的汇报',text:'老板在全员大会上被CEO表扬了。散会后TA单独找到你说："下次还是你来。"',effects:{influence:7,ai_skill:3,mood:5},tone:'positive',type:'passive',condition:function(s){return s.ai_skill>=20&&s.work_skill>=15;}},
  {id:'p12',once:true,title:'有人找你做AI副业',text:'一个朋友说他的公司需要AI咨询，愿意付费。对方给了一个诚意十足的报价。',tone:'positive',type:'choice',actionTrigger:['build','learn_ai'],condition:function(s){return s.ai_skill>=30;},choices:[
    {label:'接！赚外快',desc:'时间精力换真金白银',apply:function(s){if(s.energy>=50)return{effects:{money:10,ai_skill:4,energy:-7,mood:3},text:'你赚到了第一笔AI咨询费。"能靠AI技能赚钱"本身就是证明。'};return{effects:{money:8,energy:-10,mood:-3},text:'你接了，但体力不够。钱到手了，人快撑不住了。'};}},
    {label:'婉拒，专注主业',desc:'精力有限，不分心',apply:function(){return{effects:{mood:2,energy:3},text:'你拒绝了。专注才是你的护城河。'};}},
  ]},
  {id:'p13',once:true,title:'导师推荐你去AI闭门交流会',text:'只有30个名额，全是行业里真正在做事的人。去的话要请一天假。',tone:'positive',type:'choice',requireFlag:'has_mentor',choices:[
    {label:'请假去',desc:'见见真正的人',apply:function(){return{effects:{fame:7,ai_skill:5,energy:-3,money:-2},hiddenFx:{positioning:2},text:'你见到了真正在做事的人。清醒本身就是收获。'};}},
    {label:'算了，最近走不开',desc:'工作不等人',apply:function(){return{effects:{influence:2,mood:-3},text:'你留在了工位上。有点后悔。'};}},
  ]},
  {id:'p14',once:true,title:'你的工具引起了别的团队注意',text:'三个团队负责人来找你，想在他们部门推广。但你的老板对此态度暧昧。',tone:'positive',type:'choice',dilemma:true,requireFlag:'tool_viral',choices:[
    {label:'主动跨部门推广',desc:'争取最大影响力，但可能越界',apply:function(){return{effects:{influence:8,fame:5,mood:-3},text:'你在公司内火了。但也树了敌——你的老板觉得你抢了TA的风头。',setFlag:'boss_enemy'};}},
    {label:'低调，通过老板来推',desc:'给老板面子',apply:function(){return{effects:{influence:5,mood:3},text:'让老板出面推广。双赢，只是你少了独立存在感。'};}},
  ]},
  {id:'p15',once:true,title:'晋升机会，但代价是放弃AI探索',text:'老板说你有机会参与晋升评审，但需要你主导一个战略项目——意味着AI探索要暂停。',tone:'positive',type:'choice',dilemma:true,condition:function(s){return s.influence>=30&&s.work_skill>=30;},phase:'mid',choices:[
    {label:'接！晋升是硬通货',desc:'放弃AI探索，押注晋升',apply:function(s){if(s.work_skill>=45&&s.influence>=40)return{effects:{influence:12,money:8,work_skill:5,mood:3},text:'你押中了。晋升通过。AI探索暂停了——但现在有更多资源。'};return{effects:{influence:5,work_skill:3,mood:-5},text:'评审没过。晋升落空，AI方向也耽误了。两头落空。'};}},
    {label:'婉拒，坚持AI方向',desc:'押注技术深度',apply:function(){return{effects:{ai_skill:3,mood:3},hiddenFx:{positioning:2},text:'你拒绝了晋升机会。晋升可以再等，AI这波窗口期不会一直等你。'};}},
  ]},
  {id:'p16',once:true,title:'内容意外爆了',text:'你随手发的一条分享突然有了10万阅读。涌来的是评论、私信、合作邀约，还有质疑。',tone:'positive',type:'choice',condition:function(s){return s.fame>=20;},actionTrigger:['share'],choices:[
    {label:'趁热追更，保持输出',desc:'流量不能浪费',apply:function(s){if(s.energy>=50&&s.ai_skill>=35)return{effects:{fame:9,influence:3,energy:-6,mood:4},text:'你连续更了三篇，质量在线。开始理解"内容飞轮"。'};return{effects:{fame:7,energy:-9,mood:-5},text:'你强撑着追更，但质量下滑。有人说"后续比首篇差远了"。'};}},
    {label:'冷静处理，回应质疑',desc:'先把口碑做稳',apply:function(){return{effects:{fame:5,mood:3,ai_skill:2},text:'你修正了不准确的部分。失去了一些流量，但建立了"靠谱"的形象。'};}},
  ]},
  {id:'p17',title:'你意识到自己已经很久没休息了',text:'上次真正放松是什么时候？你想不起来了。每天醒来第一件事是看消息，睡前也是。',effects:{mood:-8,energy:-5},tone:'negative',type:'passive',statTrigger:{energy:'low'},condition:function(s){return s.energy<=45;}},
  {id:'p18',title:'失眠越来越严重',text:'躺在床上脑子里全是模型架构、KPI。安眠药吃到了第三盒。你开始害怕上床睡觉。',effects:{energy:-10,mood:-6},tone:'negative',type:'passive',statTrigger:{energy:'low',mood:'low'},condition:function(s){return s.energy<=40&&s.mood<=45;}},
  {id:'p19',once:true,title:'体检报告亮红灯',text:'颈椎3度，视力从1.0掉到0.6，血压偏高。医生问你"平时运动吗"，你沉默了五秒。',effects:{mood:-6,energy:-5},tone:'negative',type:'passive',statTrigger:{energy:'low'},condition:function(s){return s.energy<=45;},setFlag:'health_warning'},
  {id:'p20',once:true,title:'同事猝死的消息传来',text:'不是你认识的人，但就在隔壁楼，33岁。整个工区弥漫着一种说不出的沉默。',effects:{mood:-15,energy:-3},tone:'negative',type:'passive'},
  {id:'p21',title:'连续加班三周',text:'项目赶工期，每天凌晨才走，周末也没有。你学会了在电梯里闭眼养神三十秒。',effects:{energy:-9,mood:-7,money:3},tone:'negative',type:'passive',statTrigger:{energy:'low'}},
  {id:'p22',title:'焦虑型信息过载',text:'每天刷200条AI新闻，看到别人的产出就心悸。认识的名词越来越多，做的东西越来越少。',effects:{mood:-9,energy:-4},tone:'negative',type:'passive',actionTrigger:['learn_ai']},
  {id:'p23',title:'Demo做完了但没人用',text:'很酷的技术，零复用率。发到群里只有两个礼貌性点赞。',effects:{mood:-9,fame:-3,influence:-2},tone:'negative',type:'passive',actionTrigger:['build']},
  {id:'p24',title:'基础业务能力在退化',text:'一直在追AI，PPT不会写了，项目管理也生疏了。老板让你出方案，发现自己比三年前还差。',effects:{work_skill:-6,mood:-4},tone:'negative',type:'passive',condition:function(s){return s.ai_skill>s.work_skill+20;}},
  {id:'p25',title:'把所有问题都理解成AI问题',text:'买菜想用Agent，写周报想fine-tune。同事说："跟你沟通越来越难了，你说话都是术语。"',effects:{work_skill:-4,mood:-5,influence:-2},hiddenFx:{positioning:-1},tone:'negative',type:'passive',actionTrigger:['learn_ai']},
  {id:'p26',once:true,title:'你需要住院检查',text:'上次体检的问题恶化了。医生说如果不处理，半年内可能有更大的风险。但你手头有最关键的项目。',tone:'negative',type:'choice',dilemma:true,requireFlag:'health_warning',choices:[
    {label:'请假住院',desc:'身体是底线',apply:function(){return{effects:{energy:15,mood:5,money:-5,influence:-4},text:'你在医院待了两周。出院后感到前所未有的轻松。',setFlag:'took_rest'};}},
    {label:'先扛着，项目走不开',desc:'等忙完再说',apply:function(){return{effects:{energy:-8,mood:-10},text:'你选择了扛。但你心里知道这个决定可能在某个时刻让你付出更大代价。'};}},
  ]},
  {id:'p27',once:true,title:'和另一半大吵了一架',text:'"你心里只有工作和AI，我在你的OKR里排第几？"你没有立刻回答，因为你在想技术问题。',tone:'negative',type:'choice',dilemma:true,choices:[
    {label:'认错，请假陪TA一天',desc:'关系比什么都重要',apply:function(){return{effects:{mood:9,energy:3,influence:-2},text:'你去了很久没去的公园。发现蓝天还在，只是你很久没抬头看了。'};}},
    {label:'冷处理，先忙完再说',desc:'眼前的事更紧急',apply:function(){return{effects:{mood:-12,energy:-2},text:'你没有回应。晚上回家时对方已经睡了。你坐在客厅里，第一次觉得代价已经在发生了。'};}},
  ]},
  {id:'p28',once:true,title:'猎头来了',text:'另一个大厂开价比你高25%。对方说："我们正在组建AI战略团队，你的背景很合适。"',tone:'positive',type:'choice',dilemma:true,condition:function(s){return(s.ai_skill>=40||s.work_skill>=40)&&s.fame>=20;},phase:'mid',choices:[
    {label:'去谈谈，不一定要跳',desc:'摸清自己的价值',apply:function(){return{effects:{money:3,mood:5,ai_skill:2},text:'你去谈了，没跳，但连走路都更有底气了。'};}},
    {label:'直接拒绝，专注当前',desc:'不为钱动摇',apply:function(){return{effects:{mood:3},hiddenFx:{survival:1},text:'你拒绝了。现在需要的不是换地方，而是把当前的事做深。'};}},
    {label:'认真考虑，准备跳',desc:'25%涨幅确实诱人',apply:function(s){if(s.ai_skill>=45||s.fame>=35)return{effects:{money:8,fame:5,influence:-8},text:'你跳了。新公司待遇好，但从零开始建立信任。',setFlag:'jumped'};return{effects:{money:6,influence:-10,mood:-3},text:'你跳了，但新公司比想象中复杂。一切都得重新证明。',setFlag:'jumped'};}},
  ]},
];
const COMPANY_EVENTS=[
  {id:'c1',title:'领导把AI当效率工具，不要求表演',text:'终于来了一个务实的人。不再要求每周出AI汇报PPT了，只看有没有实际提升。',effects:{influence:5,money:4,energy:4,mood:5},tone:'positive',type:'passive',actionTrigger:['work','build']},
  {id:'c2',title:'老板开始重视真正落地的人',text:'那些只会喊口号的人被边缘化了。你的实际产出被看到了。',effects:{influence:6,money:4,mood:5},tone:'positive',type:'passive',actionTrigger:['build','work']},
  {id:'c3',once:true,title:'公司开放AI试点预算',text:'终于有钱有算力了。组里每人都可以申请API额度。',effects:{influence:5,money:7,ai_skill:4},tone:'positive',type:'passive'},
  {id:'c4',once:true,title:'直属领导愿意替你扛风险',text:'TA说："你去试，出了问题我兜着。"你第一次感到有人真正信任你。',effects:{mood:8,influence:5,energy:3},tone:'positive',type:'passive',setFlag:'boss_shield'},
  {id:'c5',once:true,title:'AI中台成立，你进核心组',text:'从边缘探索变成正式编制。公司在认真走AI这条路了。',effects:{influence:7,ai_skill:4,money:5},tone:'positive',type:'passive',condition:function(s){return s.ai_skill>=30;}},
  {id:'c6',once:true,title:'年终奖超预期',text:'虽然行业整体在降，但你们组的业绩撑住了。',effects:{money:12,mood:7},tone:'positive',type:'passive'},
  {id:'c7',once:true,title:'公司给全员发了AI学习津贴',text:'每月500块买课程和工具。虽然不多，但姿态到了。',effects:{money:3,ai_skill:3,mood:4},tone:'positive',type:'passive'},
  {id:'c8',once:true,title:'老板让你主导一个新AI项目',text:'预算不多，但你有完全的自主权。问题是你手上已经有一个常规项目了。',tone:'positive',type:'choice',condition:function(s){return s.ai_skill>=25;},choices:[
    {label:'接！两个项目并行',desc:'证明自己的能力上限',apply:function(s){if(s.energy>=55)return{effects:{ai_skill:7,influence:6,energy:-9,mood:-3},text:'你开始了双线程生活。像个超频运行的CPU——发热，但还在跑。'};return{effects:{ai_skill:4,influence:3,energy:-12,mood:-6},text:'你高估了精力。两个项目都没做好，开始失眠。'};}},
    {label:'接了，但把旧项目移交',desc:'All in AI方向',apply:function(){return{effects:{ai_skill:6,influence:5,work_skill:-2},hiddenFx:{positioning:2},text:'你把常规项目交给同事。如果这个项目做不出来，退路就没了。'};}},
    {label:'婉拒，专注当前项目',desc:'贪多嚼不烂',apply:function(){return{effects:{work_skill:3,mood:2,influence:2},text:'你拒绝了。三个月后看到别人的项目汇报——有点羡慕，但你知道自己的选择是对的。'};}},
  ]},
  {id:'c9',once:true,title:'公司要提拔AI方向负责人',text:'你和另一个同事都是候选人。TA更资深，但你更懂AI。',tone:'positive',type:'choice',dilemma:true,condition:function(s){return s.influence>=25&&s.ai_skill>=30;},phase:'mid',choices:[
    {label:'主动争取，拿出方案',desc:'把规划讲清楚',apply:function(s){if(s.ai_skill>=40&&s.influence>=35)return{effects:{influence:8,money:5,mood:5,energy:-4},text:'老板被说服了——你成了AI方向负责人。',setFlag:'ai_lead'};return{effects:{influence:-4,mood:-7},text:'你争取了，但老板觉得你还不够成熟。这次输了。'};}},
    {label:'不争，默默做事',desc:'金子总会发光',apply:function(){return{effects:{mood:-3,work_skill:2},text:'你没有争。另一个人上了。你告诉自己不在意，但你在意。'};}},
  ]},
  {id:'c10',title:'公司要求全员加班赶AI showcase',text:'给高管看的，72小时极限冲刺。你的领导问你："能顶上吗？"',tone:'negative',type:'choice',dilemma:true,choices:[
    {label:'顶上！让领导看到我',desc:'被看见的机会',apply:function(s){if(s.energy>=50)return{effects:{influence:6,energy:-11,mood:-4,ai_skill:2},text:'Showcase很成功。领导在汇报里提了你的名字——虽然只有一句话，但那句话值很多。'};return{effects:{influence:3,energy:-14,mood:-8},text:'你撑上去了，但体力不支。结束后在沙发上直接睡着了。'};}},
    {label:'找理由推掉',desc:'身体比KPI重要',apply:function(){return{effects:{influence:-4,mood:2,energy:3},text:'你推掉了。错过了一次被高管看到的机会。'};}},
  ]},
  {id:'c11',title:'全员AI运动',text:'领导要求每人本月出一个AI应用，不管有没有真实场景。不参与的代价是被标记为"不配合转型"。',effects:{energy:-9,mood:-9},tone:'negative',type:'passive'},
  {id:'c12',title:'AI成了裁员借口',text:'"AI可以替代这些岗位了。"你知道其实替代不了，但这个说法很好用。',effects:{mood:-11,energy:-5,influence:-3},tone:'negative',type:'passive'},
  {id:'c13',title:'预算被砍，项目只剩PPT',text:'上季度还在扩编，这季度直接砍到底。',effects:{influence:-6,mood:-8,money:-3},tone:'negative',type:'passive'},
  {id:'c14',title:'跨部门内耗',text:'三个部门都想当AI牵头方。开了六次会，没有一次有结论。',effects:{energy:-7,influence:-4,mood:-6},tone:'negative',type:'passive'},
  {id:'c15',once:true,title:'新高管否定上轮AI方向',text:'新VP说"之前的路线全是弯路"。你的半年积累被一句话宣判无效。',effects:{mood:-9,ai_skill:-4,influence:-3},tone:'negative',type:'passive'},
  {id:'c16',title:'外包AI咨询团队入场',text:'他们比你懂得少，但PPT比你好看10倍。老板信了。',effects:{mood:-7,influence:-4},tone:'negative',type:'passive'},
  {id:'c17',once:true,title:'公司搞12小时闭门AI大赛',text:'不能离场，要求产出Demo。你最后做出来了，但你只想回家睡觉。',effects:{energy:-13,mood:-5,ai_skill:3},tone:'negative',type:'passive',actionTrigger:['build']},
  {id:'c18',once:true,title:'隔壁组全被裁了',text:'昨天还一起吃食堂，今天他们的工位已经清空了。后背发凉。',effects:{mood:-11,energy:-3,influence:-2},tone:'negative',type:'passive'},
  {id:'c19',title:'你的项目被无限期搁置',text:'不是做得不好，是公司战略又变了。',effects:{mood:-9,influence:-5},tone:'negative',type:'passive'},
  {id:'c20',title:'绩效被打了低分',text:'你觉得自己做得不错，但老板的标准和你想的不一样。',effects:{mood:-9,money:-4,influence:-5},tone:'negative',type:'passive'},
  {id:'c21',once:true,title:'你发现公司AI项目数据造假',text:'核心指标注了水，但所有人都装作不知道。你知道这件事——但你也知道说出来的代价。',tone:'negative',type:'choice',dilemma:true,phase:'mid',choices:[
    {label:'私下跟老板说',desc:'这是职业道德底线',apply:function(){if(STATE.flags.boss_shield)return{effects:{influence:6,mood:6},text:'老板说："谢谢你告诉我。这件事交给我处理。"你感到被保护着。'};return{effects:{influence:-6,mood:-5},text:'老板说"这种事大家都知道，别太认真。"你感到一阵恶心。'};}},
    {label:'装作没看到',desc:'枪打出头鸟',apply:function(){return{effects:{mood:-7},text:'你闭上了眼。但这件事像一根刺一样扎在心里。'};}},
  ]},
  {id:'c22',once:true,title:'老板开始针对你',text:'自从你在推广AI工具那件事上没给TA面子，TA开始在会议上挑你的细节。',tone:'negative',type:'choice',dilemma:true,requireFlag:'boss_enemy',choices:[
    {label:'主动认错，修复关系',desc:'低头不代表认输',apply:function(){return{effects:{influence:4,mood:-4},text:'你请老板吃了饭。关系缓和了。这是职场的一部分。',setFlag:'boss_peace'};}},
    {label:'跨级汇报，走正规渠道',desc:'道理在我这边',apply:function(s){if(s.influence>=40)return{effects:{influence:-3,mood:3},text:'你找了上级。老板暂时收手了，但这场博弈还没结束。'};return{effects:{influence:-8,mood:-6},text:'你找了上级。但没有足够影响力，反而被认为是"不成熟"。'};}},
    {label:'忍着，等待时机',desc:'留得青山在',apply:function(){return{effects:{mood:-6,energy:-3},text:'你选择了忍。每天上班都需要多消耗一些精力来维持平静。'};}},
  ]},
];
const INDUSTRY_EVENTS=[
  {id:'i1',title:'开源大模型再次爆发',text:'开源模型持续突破，AI门槛降了一个量级。你上个月还需要付费的东西，今天免费了。',effects:{ai_skill:7,energy:3,mood:4},tone:'positive',type:'passive',actionTrigger:['learn_ai','build']},
  {id:'i2',title:'推理成本暴降',text:'一年前100美元的任务，现在1美元能完成。你之前搁置的三个想法都可以开始试了。',effects:{ai_skill:4,money:5,mood:4},tone:'positive',type:'passive',actionTrigger:['build']},
  {id:'i3',title:'多模态生成走向成熟',text:'文字、图像、视频、代码的壁垒正在消失。你一直在做的事，价值翻了很多倍。',effects:{ai_skill:6,fame:4,mood:4},tone:'positive',type:'passive'},
  {id:'i4',title:'Agent工具链走向成熟',text:'AI不再只回答问题，而是开始替你干活了。你花了一个周末把工作流自动化了60%。',effects:{ai_skill:6,influence:4,money:4,mood:3},tone:'positive',type:'passive',actionTrigger:['build','learn_ai']},
  {id:'i5',once:true,title:'具身智能出现商用拐点',text:'机器人不再只在实验室，开始在工厂和仓库里真正干活了。物理世界的AI时代要来了。',effects:{ai_skill:5,mood:5},hiddenFx:{positioning:4},tone:'positive',type:'passive',phase:'late'},
  {id:'i6',title:'AI编程工具爆发',text:'Cursor、Windsurf、Devin……你写代码的效率翻了5倍。',effects:{ai_skill:6,work_skill:4,mood:4},tone:'positive',type:'passive',actionTrigger:['build','learn_ai']},
  {id:'i7',once:true,title:'你看好的AI创业公司融了一大笔钱',text:'他们做的方向和你研究的很像。你的判断被市场验证了。',effects:{mood:7,fame:4},hiddenFx:{positioning:2},tone:'positive',type:'passive',condition:function(s){return s.ai_skill>=35;}},
  {id:'i8',once:true,title:'一个AI创业公司邀请你加入',text:'薪资涨50%，但期权占大头。公司刚拿了A轮。"我们需要你这样懂AI又懂落地的人。"',tone:'positive',type:'choice',dilemma:true,condition:function(s){return s.ai_skill>=40||s.fame>=35;},phase:'mid',choices:[
    {label:'跳！搏一把',desc:'大厂待着也是温水煮青蛙',apply:function(s){if(s.ai_skill>=50||s.fame>=45)return{effects:{money:6,fame:8,influence:-10,energy:-5,mood:6},hiddenFx:{positioning:3},text:'你跳了。从螺丝钉变成多面手。混乱但每天都在学新东西。',setFlag:'joined_startup'};return{effects:{money:4,fame:5,influence:-8,energy:-6,mood:3},text:'你跳了，但没想象中的爽——创业公司要求的东西你有一部分还没准备好。',setFlag:'joined_startup'};}},
    {label:'谢谢，我还想在大厂积累',desc:'创业风险太大',apply:function(){return{effects:{mood:-2},text:'你拒绝了。半年后那家公司的产品上了行业媒体头条。'};}},
  ]},
  {id:'i9',once:true,title:'AI行业会议邀请你去分享',text:'但你最近没什么拿得出手的成果，硬讲怕翻车。',tone:'positive',type:'choice',condition:function(s){return s.fame>=20;},choices:[
    {label:'接了，现做准备',desc:'曝光机会不能浪费',apply:function(s){if(s.ai_skill>=40)return{effects:{fame:10,energy:-5,ai_skill:2},text:'你花了三个晚上准备。分享很成功，会后有五个人来问你合作。'};return{effects:{fame:4,mood:-7,energy:-6},text:'你上台了，但内容没撑住。Q&A被问住了两次。'};}},
    {label:'推掉，没准备好就不上',desc:'口碑比流量重要',apply:function(){return{effects:{fame:-2,mood:2,energy:2},text:'你推掉了。面子不重要，做好了再说。'};}},
  ]},
  {id:'i10',title:'范式迭代：你学的AI技能贬值了',text:'上个月掌握的技巧，这个月模型已经自动处理了。你的AI知识突然过时了一大半。',effects:{ai_skill:-9,mood:-7},tone:'negative',type:'passive',actionTrigger:['learn_ai']},
  {id:'i11',title:'行业叙事又切换了',text:'上季度是Agent，这季度是Embodied AI。你永远在追最新的词，但你开始怀疑追词本身是不是一个陷阱。',effects:{mood:-8,ai_skill:-3,fame:-2},tone:'negative',type:'passive'},
  {id:'i12',once:true,title:'巨头发布一体化AI平台',text:'大厂把你能做的全做了，还免费开放。你花三个月做的东西，今天变成了别人产品的一个功能。',effects:{mood:-7,money:-4,ai_skill:-2},tone:'negative',type:'passive',actionTrigger:['build']},
  {id:'i13',once:true,title:'AI泡沫过热，质疑声出现',text:'投资人开始问"你的AI项目有多少真实用户"。',effects:{fame:3,mood:-6},tone:'negative',type:'passive',phase:'mid'},
  {id:'i14',title:'人才向头部极端集中',text:'最强的人都去了头部公司，开的价格是普通市场的3倍。中腰部越来越难。',effects:{mood:-6,fame:-3,influence:-2},tone:'negative',type:'passive'},
  {id:'i15',title:'监管收紧',text:'新AI管理办法要求所有模型备案，实验性项目全部暂停审查。',effects:{influence:-4,fame:-4,mood:-5},tone:'negative',type:'passive'},
  {id:'i16',title:'AI生成内容泛滥',text:'到处都是AI写的文章和视频。你的真实思考淹没在海量的"看起来不错"里。',effects:{fame:-6,mood:-5},tone:'negative',type:'passive',phase:'mid',actionTrigger:['share']},
  {id:'i17',once:true,title:'一个知名AI公司上市失败',text:'估值从高峰砍了70%。行业信心又被打了一击。',effects:{mood:-7,money:-3},tone:'negative',type:'passive',phase:'late'},
  {id:'i18',once:true,title:'你被误认为AI专家，受邀出席高规格活动',text:'对方说"我们听说你在AI领域很有建树"——但你知道自己还差得远。如果露馅了……',tone:'negative',type:'choice',dilemma:true,condition:function(s){return s.ai_skill>=30&&s.fame>=20;},phase:'mid',choices:[
    {label:'硬着头皮去',desc:'机会来了就要抓',apply:function(s){if(s.ai_skill>=50&&s.fame>=35)return{effects:{fame:8,influence:4,ai_skill:4,mood:5},text:'你去了。积累比你以为的多。会后有人主动加你微信。'};return{effects:{fame:-5,mood:-12,energy:-8},text:'你露馅了。一个真正的专家问了一个你答不上来的问题。那天晚上你删掉了社交媒体简介。'};}},
    {label:'坦诚婉拒',desc:'诚实是最难的选择',apply:function(){return{effects:{mood:7,fame:-2},hiddenFx:{survival:2},text:'你实话实说了。虽然没参加活动，但你对自己的边界更清楚了。'};}},
  ]},
];

const SOCIAL_EVENTS=[
  {id:'s1',once:true,title:'国家推动AI新基建',text:'算力中心、数据立法、AI教育补贴——政策红利来了。',effects:{money:5,influence:4,ai_skill:3},tone:'positive',type:'passive'},
  {id:'s2',once:true,title:'能源突破降低算力成本',text:'新能源进展让算力不再是瓶颈。',effects:{ai_skill:3,money:4,mood:3},tone:'positive',type:'passive'},
  {id:'s3',once:true,title:'全民AI教育普及',text:'你妈都会用AI了。门槛降低意味着应用层市场炸了。',effects:{fame:3,ai_skill:3,work_skill:2},tone:'positive',type:'passive'},
  {id:'s4',once:true,title:'AI相关立法正式通过',text:'政府出台了AI行业的法律框架。规则明确了，但合规成本也上来了。',effects:{ai_skill:2,money:-2,mood:2},tone:'positive',type:'passive'},
  {id:'s5',once:true,title:'全球经济收缩',text:'创新预算在所有公司被优先砍掉。"先活下来再说。"',effects:{money:-6,mood:-5,influence:-3},tone:'negative',type:'passive'},
  {id:'s6',title:'社会AI恐慌蔓延',text:'"AI会不会取代我？"从专业讨论变成社会焦虑。',effects:{mood:-7,fame:-3},tone:'negative',type:'passive'},
  {id:'s7',once:true,title:'科技股暴跌',text:'你买的AI概念股跌了40%。账面浮亏让你心疼。',effects:{money:-8,mood:-6},tone:'negative',type:'passive'},
  {id:'s8',title:'AI替代岗位讨论登上热搜',text:'亲戚朋友开始频繁问你"AI会不会让你失业"。你不知道怎么回答。',effects:{mood:-5},tone:'negative',type:'passive'},
  {id:'s9',once:true,title:'房租大幅上涨',text:'房东说下个月起涨20%。你要么接受，要么搬家。',tone:'negative',type:'choice',dilemma:true,choices:[
    {label:'咬牙接受',desc:'稳定压倒一切',apply:function(){return{effects:{money:-6,mood:-3},text:'你续了约。每个月多出来的钱让你开始认真看储蓄余额。'};}},
    {label:'搬到更远更便宜的地方',desc:'通勤时间翻倍',apply:function(){return{effects:{money:3,energy:-4,mood:-2,ai_skill:2},text:'你搬了。每天多出一小时在地铁上，你开始听AI播客——也许是意外的收获。'};}},
  ]},
  {id:'s10',title:'父母催你回老家',text:'你妈打电话说："隔壁家孩子考公务员了，稳定。你天天加班什么时候是个头？"',tone:'negative',type:'choice',choices:[
    {label:'耐心解释，安抚他们',desc:'需要时间让他们理解',apply:function(){return{effects:{mood:-3,energy:-2},text:'你讲了两个小时。你妈最后说："你自己清楚就好。"'};}},
    {label:'答应回去看看，但心里没打算',desc:'避免正面冲突',apply:function(){return{effects:{mood:-5},text:'你敷衍了一下。挂了电话你有点内疚。'};}},
  ]},
];
const MAJOR_EVENTS={
  company_collapse:{title:'💀 公司现金流断裂，宣布倒闭',text:'融资没到账，客户在流失。上周五还在加班做Q4规划，周一就收到了全员信。\n\n你的工卡明天就失效了。',category:'company',minQuarter:5,condition:function(){return true;},applyPassive:function(){STATE.flags.companycollapsed=true;},branches:[
    {label:'立刻找工作',desc:'简历能不能打？',apply:function(s){if(s.work_skill>=35||s.ai_skill>=40||s.fame>=40||s.influence>=40)return{effects:{money:-5,mood:-4},text:'凭借积累的能力和名声，你两周内拿到了新offer。',directEnding:'phoenix'};return{effects:{money:-10,mood:-12,energy:-8},text:'简历石沉大海。离开了公司抬头，自己好像什么都不是。',directEnding:'org_victim'};}},
    {label:'借机单干',desc:'需要存款和名声',apply:function(s){if(s.money>=40&&(s.fame>=45||s.ai_skill>=55))return{effects:{money:-15,mood:5,energy:-5},text:'你终于做了一直想做的事——自己干。',directEnding:'phoenix'};return{effects:{money:-20,mood:-10,energy:-10},text:'没有足够积蓄和人脉，单干变成了硬撑。',directEnding:'org_victim'};}},
    {label:'先停下来，想清楚',desc:'修整自己',apply:function(){return{effects:{mood:4,energy:6,money:-5},hiddenFx:{survival:4},text:'你做了反直觉的决定：不着急。花时间想清楚自己到底要什么。'};}},
  ]},
  ai_winter:{title:'🧊 AI行业进入深度调整期',text:'所有人都发现AI很好，但没有人知道怎么赚钱。\n\n投资放缓、项目缩编、AI工程师开始投非AI岗位。',category:'industry',minQuarter:5,condition:function(){return !STATE.flags.aiindustryfrozen;},applyPassive:function(){STATE.flags.aiindustryfrozen=true;STATE.flags.ai_skill_nerf=true;},branches:[
    {label:'坚守AI，等复苏',desc:'冬天总会过去',apply:function(){return{effects:{money:-5,mood:-4},hiddenFx:{positioning:3},text:'你选择留下来。冬天离开的人，春天回不来了。'};}},
    {label:'转向AI+传统行业',desc:'AI是工具，行业是根基',apply:function(){if(STATE.hidden.survival>=30)return{effects:{money:4,mood:2},text:'医疗、教育、制造对AI的需求才刚开始。不够性感，但足够真实。',directEnding:'cross_cycle'};return{effects:{mood:-5,money:-3},text:'你想转，但除了AI什么行业都不懂。',directEnding:'ai_stuck'};}},
    {label:'回炉学第二技能',desc:'不把鸡蛋放一个篮子',apply:function(){return{effects:{money:-4,work_skill:4},hiddenFx:{survival:8},text:'你开始认真学AI以外的东西。学会了不把自己绑在一条线上。'};}},
  ]},
  war:{title:'🔥 地缘冲突升级，局势急剧紧张',text:'先是制裁，然后断供，然后某个海峡的新闻占满了所有屏幕。\n\n你的日常、行业、计划——突然都不重要了。',category:'social',minQuarter:4,condition:function(){return !STATE.flags.warstarted&&Math.random()<0.35;},applyPassive:function(){STATE.flags.warstarted=true;STATE.flags.work_nerf=true;},branches:[
    {label:'进入国家体系',desc:'个人命运汇入集体命运',apply:function(s){if(s.energy>=25)return{effects:{energy:-8,mood:-4},flag:'joinedwar',text:'你报了名。',directEnding:'war_hero'};return{effects:{energy:-8,mood:-4},flag:'joinedwar',text:'你报了名，但体力已经透支……',directEnding:'war_drifter'};}},
    {label:'撤到安全区域',desc:'活着就是胜利',apply:function(){return{effects:{money:-8,mood:-6},hiddenFx:{survival:2},text:'你变卖了一些东西，离开了。',directEnding:'war_drifter'};}},
    {label:'转入后方技术支援',desc:'用技能服务更大的事',apply:function(s){if(STATE.hidden.survival>=25||s.ai_skill>=50||s.work_skill>=40)return{effects:{influence:4,money:3},flag:'joinedsupport',text:'你的能力在后方反而更被需要。',directEnding:'war_support'};return{effects:{mood:-5},text:'你想帮忙，但能力太窄了。',directEnding:'war_drifter'};}},
  ]},
  resource_crisis:{title:'⛽ 全球资源危机',text:'芯片断供、电价暴涨、数据中心限电。\n\nAI最依赖的算力，突然变成了奢侈品。',category:'social',minQuarter:4,condition:function(){return !STATE.flags.resourcecollapse&&Math.random()<0.4;},applyPassive:function(){STATE.flags.resourcecollapse=true;},branches:[
    {label:'缩减欲望，保基本盘',desc:'断舍离',apply:function(){return{effects:{money:-2,mood:1},text:'退掉算力订阅，取消一半SaaS。你发现很多东西你根本不需要。'};}},
    {label:'用储蓄换时间',desc:'烧钱撑过去',apply:function(){return{effects:{money:-8,mood:2},text:'你相信这是暂时的。但如果不是呢？'};}},
    {label:'学习非AI生存技能',desc:'不用电的能力就是武器',apply:function(){return{effects:{mood:-2},hiddenFx:{survival:6},text:'如果AI不可用了，你还能靠什么活？这个问题比AI更难回答。'};}},
  ]},
  talent_earthquake:{title:'🌊 竞对核心团队集体出走',text:'竞对CTO带着核心人员跳槽了。猎头正在打你的电话。',category:'company',minQuarter:3,condition:function(){return !STATE.flags.talent_quake;},applyPassive:function(){STATE.flags.talent_quake=true;},branches:[
    {label:'留下来补位',desc:'混乱中找机会',apply:function(){return{effects:{influence:9,energy:-6},text:'你没跟风。混乱中接手了更多项目——机会和消耗并存。'};}},
    {label:'跳槽去竞对',desc:'薪资+40%',apply:function(){return{effects:{money:10,fame:4,influence:-9},text:'薪资涨了，但在新公司是nobody。',flag:'jumped'};}},
    {label:'保持观望',desc:'等局势明朗',apply:function(){return{effects:{mood:-3},text:'你既没走，也没趁机争取什么。'};}},
  ]},
  gpt_moment:{title:'🚀 新一代模型颠覆认知',text:'新模型发布了。不是渐进提升，是代际飞跃。\n\n它能自主完成整个软件项目。你上个月的技能突然像打字机一样过时了。',category:'industry',minQuarter:3,condition:function(){return !STATE.flags.gpt_moment;},applyPassive:function(){STATE.flags.gpt_moment=true;STATE.flags.build_changed=true;},branches:[
    {label:'ALL IN 新范式',desc:'扔掉旧的，全力拥抱',apply:function(s){if(s.ai_skill>=40)return{effects:{ai_skill:9,mood:5,energy:-8},hiddenFx:{positioning:3},text:'有足够基础来快速迁移。焦虑是有的，但你知道怎么学。'};return{effects:{ai_skill:3,mood:-6,energy:-10},text:'你想跟上，但基础不够。焦虑翻倍。'};}},
    {label:'观察，不急着跟',desc:'看看是不是三个月热度',apply:function(){return{effects:{mood:-3},hiddenFx:{survival:2},text:'你选择先看看。但这次……好像真的不一样。'};}},
    {label:'反思自己的护城河',desc:'什么能力不会被替代？',apply:function(){return{effects:{mood:3,work_skill:4},hiddenFx:{survival:3,positioning:1},text:'如果AI能做我做的事，我还剩下什么？答案比想象中多。'};}},
  ]},
};
var MAJOR_EVENT_SCHEDULE=[{q:3,ids:['talent_earthquake','gpt_moment']},{q:4,ids:['talent_earthquake','gpt_moment','resource_crisis','war']},{q:5,ids:['company_collapse','ai_winter','resource_crisis','war']},{q:6,ids:['company_collapse','ai_winter','resource_crisis','war']},{q:7,ids:['ai_winter','war','resource_crisis']},{q:8,ids:['war']}];
var ENDINGS=[
  {id:'burnout',priority:0,condition:function(s){return s.energy<=10;},title:'🔋 过载熄火',text:'你的身体替你做了一个大脑不肯做的决定：停下来。\n\n不是不想卷——是卷不动了。心悸、失眠、胸闷，你终于去看了医生。\n\n医生说："你上一次休息是什么时候？"\n\n你答不上来。',tags:['过载型','身体透支','系统崩溃']},
  {id:'hollow',priority:0,condition:function(s){return s.mood<=10;},title:'🫥 空心追风者',text:'从外面看你也许还行。但你自己知道，很久没有因为做成什么而真正开心了。\n\n你在追的不是AI——你在追一种"不被抛下"的安全感。追得越急，跑得越远。',tags:['空心型','意义缺失','情绪崩溃']},
  {id:'broke',priority:0,condition:function(s){return s.money<=5;},title:'💸 弹尽粮绝',text:'信用卡账单越来越长，房租越来越难凑。\n\n你曾以为AI时代最重要的是技能和认知。但当银行卡归零时，最基本的安全感来自你能不能付得起下个月的房租。',tags:['资源耗尽','生存危机','现实主义']},
  {id:'war_hero',priority:1,condition:function(s){return STATE.flags.warstarted&&STATE.flags.joinedwar&&s.energy>=25;},title:'🎖️ 战时功勋者',text:'当世界进入极端状态时，你没有退到旁观席。\n\n你失去了原来的身份，获得了另一种无法写在简历上的东西。',tags:['时代亲历者','非常规路径']},
  {id:'war_support',priority:1,condition:function(s){return STATE.flags.warstarted&&STATE.flags.joinedsupport;},title:'🔧 后方建设者',text:'战争切断了你原本的节奏。但你的技能在另一个系统里重新有了意义。\n\n你曾觉得这些"不够前沿"。现在你知道了：前沿和基础，从来不是一个维度。',tags:['通用生存力','第二技能']},
  {id:'war_drifter',priority:1,condition:function(s){return STATE.flags.warstarted;},title:'🌊 时代洪流中的漂流者',text:'战争来得太快，来不及准备第二种活法。\n\n你不是失败者。只是你准备应对的那个世界，和最终到来的这个世界，不是同一个。',tags:['宏观冲击','被动转型']},
  {id:'cross_cycle',priority:2,condition:function(s){return(STATE.flags.aiindustryfrozen||STATE.flags.resourcecollapse)&&STATE.hidden.survival>=35&&s.mood>=35;},title:'🔄 跨周期生存者',text:'当很多人还在等AI行业恢复时，你已经在另一个领域站住了脚。\n\n押注行业和押注自己，是两回事。',tags:['多线程生存者','跨周期能力']},
  {id:'ai_stuck',priority:2,condition:function(s){return STATE.flags.aiindustryfrozen&&s.ai_skill>=50&&STATE.hidden.survival<25;},title:'❄️ 行业停滞受困者',text:'你曾非常适配这个时代。可当行业停下时，你发现会的所有东西都系在同一根绳上。\n\n最讽刺的是，你的技能曲线完美匹配了一个已经暂停的行业。',tags:['单一押注者','行业依赖型']},
  {id:'phoenix',priority:3,condition:function(s){return STATE.flags.companycollapsed&&(s.ai_skill>=50||s.work_skill>=40||s.fame>=45);},title:'🔥 废墟中的重启者',text:'公司倒了，但你没跟着沉。\n\n真正的职业安全感从来不来自公司。它来自你离开任何公司后，还能被需要。',tags:['抗脆弱','能力可迁移']},
  {id:'org_victim',priority:3,condition:function(s){return STATE.flags.companycollapsed;},title:'🏚️ 组织瓦解后的失速者',text:'你过于相信组织会一直存在。\n\n时代确实优先淘汰了只有一个支点的人。',tags:['组织依赖型','低冗余']},
  {id:'wave_rider',priority:4,condition:function(s){return s.ai_skill>=65&&s.fame>=50&&STATE.hidden.positioning>=10;},title:'🏄 浪潮驾驭者',text:'你没有被每次技术更新牵着鼻子走。\n\n你不是风口的游客，而是少数真正理解风为什么吹、会吹向哪里的人。',tags:['技术深耕','长期主义者']},
  {id:'org_alchemist',priority:4,condition:function(s){return s.influence>=60&&s.work_skill>=45&&s.ai_skill>=40&&!STATE.flags.companycollapsed;},title:'⚗️ 组织炼金术士',text:'很多人会说AI，少数人会做AI，而你——你能把AI变成组织里真正能用的东西。',tags:['组织生存型','技术落地']},
  {id:'creator',priority:4,condition:function(s){return s.fame>=65&&s.ai_skill>=45&&s.mood>=40;},title:'🎨 AI时代独立创作者',text:'你把AI当创作杠杆，而不是身份标签。\n\n持续输出、持续做东西，最终在组织之外长出了自己的生态位。',tags:['独立生态位','创作者经济']},
  {id:'human_ai',priority:4,condition:function(s){return(s.ai_skill+s.work_skill)>=80&&s.mood>=50;},title:'🤝 人机协作者',text:'你没把AI当焦虑源，也没当装饰。\n\n最后它没有吞掉你，而是放大了你。',tags:['人机协作','工具理性']},
  {id:'hermit',priority:4,condition:function(s){return s.mood>=70&&s.energy>=65;},title:'🏔️ 赛博隐士',text:'你主动退出了最吵闹的地方。\n\n你没成为最亮的人，但成为了少数没把自己弄丢的人。',tags:['节奏守护型','内在驱动']},
  {id:'speculator',priority:4,condition:function(s){return s.fame>=50&&s.money>=40&&s.ai_skill<40;},title:'🎰 一波流投机家',text:'你踩中过热点，从泡沫中赚到过真金白银。\n\n但热度退去后的问题不是你能不能讲故事——是你讲的故事有没有下一章。',tags:['泡沫穿行者','短期变现']},
  {id:'trad_master',priority:4,condition:function(s){return s.work_skill>=60&&s.ai_skill<30&&s.influence>=40;},title:'🏛️ 传统技能坚守者',text:'你没有追AI的风，但你把自己的基本功打磨到了极致。\n\n潮水退去后，你依然站在那里。',tags:['基本功','不可替代','反潮流']},
  {id:'skipped',priority:5,condition:function(s){return s.ai_skill<=15&&s.work_skill<=20&&s.fame<=15;},title:'👤 被时代跳过的人',text:'不是你不努力，是始终没找到切入点。\n\n最终时代跳过了你。不是恶意的，只是……它太快了。',tags:['被动者','时代摩擦']},
  {id:'survivor',priority:99,condition:function(){return true;},title:'🌱 稳态生存者',text:'你没成为时代样板，也没彻底掉队。\n\n在一年变三次的行业里，"稳稳地活着"就是被低估的胜利。',tags:['稳态型','真实主义']},
];

var QUARTER_NARRATIONS=['','2026年Q1。AI的发展速度超过了所有人的预期。每家公司都在谈AI转型，但大多数人还在摸索。\n\n你是一名大厂打工人，老板说"每个人都要用起来"，但没人告诉你用来做什么。','2026年Q2。"AI转型"出现在了每周OKR里。有人升职了因为做了个AI demo，有人被优化了因为"岗位可以被AI替代"。\n\n恐惧和机会同时弥漫。','2026年Q3。行业开始分化。有人卷技术深度，有人卷个人品牌，有人卷创业。你隐约感到：选择比努力重要。','2026年Q4。年底了。年终总结里不可避免地要写"AI相关成果"。真的有成果吗？还是只是……一直在跟着跑？','2027年Q1。新的一年。去年的"前沿"已变成"入门"。你感到新压力：不是不努力，而是方向可能从一开始就不对。','2027年Q2。泡沫论和革命论同时存在。有人因AI财务自由，也有人被裁员。\n\n唯一确定的是：不确定性本身，才是唯一的确定。','2027年Q3。你开始问自己非AI的问题：我到底想要什么样的生活？如果明天AI行业消失了，我还能做什么？','2027年Q4。最后一个季度。不管之前做了什么选择，这都是为自己的故事写结尾的时刻。'];
var $app=document.getElementById('app');
function render(){STATE.showTooltip=null;({start:renderStart,profile:renderProfile,intro:renderIntro,action:renderAction,event_show:renderEventShow,event_choice:renderEventChoice,major_event:renderMajorEvent,branch:renderBranch,summary:renderSummary,ending:renderEnding})[STATE.phase]();}
function getAvatar(){return STATE.gender==='female'?'👩':'👨';}
function renderTooltipHTML(){if(!STATE.showTooltip)return'';var t=STATE.showTooltip;return'<div class="tooltip-overlay" onclick="G.closeTooltip()"><div class="tooltip-box" onclick="event.stopPropagation()"><div class="tip-icon">'+t.icon+'</div><div class="tip-label">'+t.label+'</div><div class="tip-text">'+t.tip+'</div><button class="close-tip" onclick="G.closeTooltip()">知道了</button></div></div>';}
function renderStart(){$app.innerHTML='<div class="start-screen"><h1>AI大跃进<br>生存模拟器</h1><p class="subtitle">2026-2027，AI大跃进时代。<br>你是一名大厂打工人。<br>8个季度，每季度最多3次行动。<br>你以为自己在规划职业，<br>最后发现你在穿越一个时代。</p><button class="start-btn" onclick="G.startGame()">开始模拟</button><div class="ship-container"><div class="ship-flag">🚩</div><div class="ship-sail">    /|\\\n   / | \\\n  /  |  \\\n /   |   \\</div><div class="ship-body">  __|___|__\n /         \\\n/___________\\</div><div class="ship-wave">~~ ≈ ~~ ≈ ~~ ≈ ~~ ≈ ~~\n  ≈ ~~ ≈ ~~ ≈ ~~ ≈ ~~</div></div></div>';}
function renderProfile(){var mSel=STATE.gender==='male'?' selected':'',fSel=STATE.gender==='female'?' selected':'',canGo=STATE.gender&&STATE.playerName.trim();var tagHtml='';if(STATE._initTags.length>0){tagHtml='<div style="margin-top:16px;padding:12px;background:#FFF5F7;border-radius:12px;border:1px solid #FFE0E6"><div style="font-size:13px;color:#FF2442;font-weight:600;margin-bottom:8px">🏷️ 你的起始天赋</div>';for(var i=0;i<STATE._initTags.length;i++){var t=STATE._initTags[i];tagHtml+='<div style="margin-bottom:4px"><span style="font-size:14px;font-weight:600">'+t.label+'</span> <span style="font-size:12px;color:#888">'+t.desc+'</span></div>';}tagHtml+='</div>';}$app.innerHTML='<div class="profile-screen"><h2>创建你的角色</h2><div class="gender-select"><button class="gender-btn'+fSel+'" onclick="G.setGender(\'female\')">👩</button><button class="gender-btn'+mSel+'" onclick="G.setGender(\'male\')">👨</button></div><div class="profile-field"><label>你的名字</label><div class="input-row"><input id="nameInput" type="text" placeholder="输入姓名" maxlength="12" value="'+esc(STATE.playerName)+'" oninput="G.updateName(this.value)"><button class="dice-btn" onclick="G.randomName()">🎲</button></div></div><div class="profile-field"><label>一句话简介（选填）</label><input id="bioInput" type="text" placeholder="例如：大厂搬砖三年的运营" maxlength="30" value="'+esc(STATE.playerBio)+'" oninput="G.updateBio(this.value)"></div>'+tagHtml+'<button class="btn btn-primary '+(canGo?'':'btn-disabled')+'" onclick="G.confirmProfile()" style="margin-top:24px">进入游戏 →</button></div>';}
function renderTopBar(){var q=STATE.quarter,year=q<=4?'2026':'2027',qLabel='Q'+(((q-1)%4)+1);var rows='';for(var key in STAT_META){if(!STAT_META.hasOwnProperty(key))continue;var meta=STAT_META[key];var val=clamp(STATE.stats[key],0,100);var bc=val<=20?'#ef4444':meta.color;rows+='<div class="stat-row"><span class="stat-icon">'+meta.icon+'</span><span class="stat-label">'+meta.label+'</span><button class="stat-info-btn" onclick="event.stopPropagation();G.showTip(\''+key+'\')">i</button><div class="stat-bar-bg"><div class="stat-bar" style="width:'+val+'%;background:'+bc+'"></div></div><span class="stat-val">'+val+'</span></div>';}return'<div class="top-bar"><div class="user-info-bar"><div class="user-avatar">'+getAvatar()+'</div><div class="user-details"><div class="user-name">'+(esc(STATE.playerName)||'玩家')+'</div><div class="user-bio">'+(esc(STATE._initBio)||esc(STATE.playerBio)||'大厂打工人')+'</div></div><span class="quarter-badge">'+year+' '+qLabel+'</span></div><div class="stats-list">'+rows+'</div><div class="progress-bar"><div class="progress-fill" style="width:'+(q/8*100)+'%"></div></div></div>'+renderTooltipHTML();}
function renderIntro(){$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card narration-card"><div class="card-title">📅 第'+STATE.quarter+'季度</div><div class="card-body"><p>'+QUARTER_NARRATIONS[STATE.quarter].replace(/\n/g,'<br>')+'</p></div></div><button class="btn btn-primary" onclick="G.toAction()">选择行动 →</button></div>';}
function renderAction(){var sel=STATE.selectedActions;var btns='';for(var i=0;i<ACTIONS.length;i++){var a=ACTIONS[i];var isSel=sel.indexOf(a.id)>=0;var pv='';var combined={};for(var k in a.effects){if(a.effects.hasOwnProperty(k))combined[k]=a.effects[k];}if(a.bonus){var bn=a.bonus(STATE.stats);for(var bk in bn){if(bn.hasOwnProperty(bk))combined[bk]=(combined[bk]||0)+bn[bk];}}for(var ck in combined){if(!combined.hasOwnProperty(ck))continue;var m=STAT_META[ck];if(m)pv+=m.icon+(combined[ck]>0?'+':'')+combined[ck]+' ';}if(STATE.flags.ai_skill_nerf&&a.id==='learn_ai')pv+=' ⚠️';if(STATE.flags.work_nerf&&a.id==='work')pv+=' ⚠️';btns+='<button class="'+(isSel?'btn btn-selected':'btn')+'" onclick="G.toggleAction(\''+a.id+'\')"><div class="btn-label">'+a.label+(isSel?' ✓':'')+'</div><div class="btn-desc">'+a.desc+'</div><div class="btn-fx">'+pv+'</div></button>';}var qNar=QUARTER_NARRATIONS[STATE.quarter]||'';var shortNar=qNar.split('\n')[0];var narCard=shortNar?'<div style="background:#FFF5F7;border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:13px;color:#666;border-left:3px solid #FF2442"><span style="color:#FF2442;font-weight:600">📅 本季度：</span>'+shortNar+'</div>':'';$app.innerHTML=renderTopBar()+'<div class="main-area" id="actionArea">'+narCard+'<div class="action-header"><div class="action-counter">已选 <span>'+sel.length+'</span> / 3 个行动</div><button class="btn-secondary" onclick="G.backToIntro()">← 返回</button></div><div class="btn-grid">'+btns+'</div><button class="btn btn-primary '+(sel.length>=1?'':'btn-disabled')+'" onclick="G.confirmActions()" style="margin-top:8px">确认行动 →</button></div>';}
function renderEventShow(){var ev=STATE._eventQueue[STATE._eventIndex];if(!ev){processPostEvents();return;}var fxText='';if(ev.effects){for(var k in ev.effects){if(!ev.effects.hasOwnProperty(k))continue;var m=STAT_META[k];if(m)fxText+='<span style="color:'+(ev.effects[k]>0?'#16a34a':'#dc2626')+';font-weight:600">'+m.icon+(ev.effects[k]>0?'+':'')+ev.effects[k]+'</span> ';}}var dtag=ev.dilemma?'<span style="background:#FFE4D6;color:#B85C38;padding:2px 8px;border-radius:10px;font-size:11px">🎭 两难</span> ':'';$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card event-card"><div class="card-title">'+(ev.tone==='positive'?'📈 好消息':'📉 坏消息')+'</div><div class="card-body"><p style="font-weight:600;font-size:16px;color:#1a1a2e;margin-bottom:8px">'+dtag+ev.title+'</p><p>'+ev.text.replace(/\n/g,'<br>')+'</p>'+(fxText?'<p style="margin-top:8px">'+fxText+'</p>':'')+'</div></div><div style="text-align:center;font-size:12px;color:#999;margin-top:4px">'+(STATE._eventIndex+1)+' / '+STATE._eventQueue.length+' 个事件</div><button class="btn btn-primary" onclick="G.nextEvent()">继续 →</button></div>';}
function renderEventChoice(){var ev=STATE._eventQueue[STATE._eventIndex];var dtag=ev.dilemma?'<span style="background:#FFF0F0;color:#FF2442;padding:3px 10px;border-radius:12px;font-size:12px;margin-bottom:12px;display:inline-block">⚡ 两难抉择 — 每个选项都有代价</span>':'';var btns='';for(var i=0;i<ev.choices.length;i++){btns+='<button class="btn" onclick="G.chooseEvent('+i+')"><div class="btn-label">'+ev.choices[i].label+'</div><div class="btn-desc">'+ev.choices[i].desc+'</div></button>';}$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card event-card" style="border-color:#FFB080;background:linear-gradient(135deg,#FFF8F0,#FFEED8)"><div class="card-title">🤔 你需要做个决定</div><div class="card-body">'+dtag+'<p style="font-weight:600;font-size:16px;color:#1a1a2e;margin-bottom:8px">'+ev.title+'</p><p>'+ev.text.replace(/\n/g,'<br>')+'</p></div></div><div style="text-align:center;font-size:12px;color:#999;margin-top:4px">'+(STATE._eventIndex+1)+' / '+STATE._eventQueue.length+' 个事件</div><div class="btn-group">'+btns+'</div></div>';}
function renderMajorEvent(){var ev=STATE._currentMajor;$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card event-card major"><div class="card-title">⚡ 重大事件</div><div class="card-body"><p style="font-weight:600;font-size:16px;color:#1a1a2e;margin-bottom:8px">'+ev.title+'</p><p>'+ev.text.replace(/\n/g,'<br>')+'</p></div></div><button class="btn btn-primary" onclick="G.toBranch()">面对抉择 →</button></div>';}
function renderBranch(){var ev=STATE._currentMajor;var btns='';for(var i=0;i<ev.branches.length;i++){btns+='<button class="btn" onclick="G.chooseBranch('+i+')"><div class="btn-label">'+ev.branches[i].label+'</div><div class="btn-desc">'+ev.branches[i].desc+'</div></button>';}$app.innerHTML=renderTopBar()+'<div class="main-area"><div class="card event-card major"><div class="card-title">⚡ '+ev.title+'</div><div class="card-body"><p>你必须做出选择：</p></div></div><div class="btn-group">'+btns+'</div></div>';}
function renderSummary(){var goEnd=STATE._pendingEnding||checkCriticalEnding()||STATE.quarter>=8;$app.innerHTML=renderTopBar()+'<div class="main-area">'+(STATE._branchResult?'<div class="card"><div class="card-body"><p>'+STATE._branchResult.replace(/\n/g,'<br>')+'</p></div></div>':'')+'<button class="btn btn-primary" onclick="'+(goEnd?'G.toEnding()':'G.nextQuarter()')+'">'+(goEnd?'查看结局 →':'进入下一季度 →')+'</button></div>';}
function renderEnding(){var ending=STATE._pendingEnding?(ENDINGS.find(function(e){return e.id===STATE._pendingEnding;})||determineEnding()):determineEnding();var s=STATE.stats;var sh='';for(var k in STAT_META){if(!STAT_META.hasOwnProperty(k))continue;var m=STAT_META[k];var v=clamp(s[k],0,100);sh+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:12px;min-width:50px">'+m.icon+m.label+'</span><div style="flex:1;height:6px;background:#FFF0F3;border-radius:3px;overflow:hidden"><div style="width:'+v+'%;height:100%;background:'+m.color+';border-radius:3px"></div></div><span style="font-size:11px;color:#999;min-width:22px;text-align:right">'+v+'</span></div>';}var mj=STATE.eventLog.filter(function(e){return e.major;});var tl=mj.length?'<div style="margin-top:12px;padding-top:12px;border-top:1px solid #FFF0F3"><div style="font-size:13px;color:#888;margin-bottom:6px">📜 经历的重大事件</div>'+mj.map(function(e){return'<div style="font-size:13px;color:#666;margin-bottom:3px">Q'+e.q+' · '+e.title+'</div>';}).join('')+'</div>':'';var ac={};STATE.actionHistory.forEach(function(a){ac[a]=(ac[a]||0)+1;});var top=Object.entries(ac).sort(function(a,b){return b[1]-a[1];}).slice(0,3).map(function(x){var a=ACTIONS.find(function(aa){return aa.id===x[0];});return a?a.label+'×'+x[1]:'';}).filter(Boolean).join('、');$app.innerHTML='<div class="main-area" style="padding-top:24px"><div class="card ending-card"><div style="font-size:36px;margin-bottom:8px">'+getAvatar()+'</div><div style="font-size:14px;color:#888;margin-bottom:4px">'+esc(STATE.playerName)+' 的结局</div><div class="ending-title">'+ending.title+'</div><div class="ending-text">'+ending.text.replace(/\n/g,'<br>')+'</div><div class="ending-tags">'+(ending.tags||[]).map(function(t){return'<span class="ending-tag">#'+t+'</span>';}).join('')+'</div></div><div class="card" style="margin-top:8px"><div class="card-title">📊 最终状态</div><div class="card-body">'+sh+(top?'<div style="margin-top:8px;font-size:13px;color:#888">最常做的事：'+top+'</div>':'')+tl+'</div></div><div style="margin-top:12px"><button class="btn btn-primary" onclick="G.restart()" style="width:100%">再来一次</button></div></div>';}
function startGame(){initStats();STATE.gender='';STATE.playerName='';STATE.playerBio='';STATE.phase='profile';render();}
function setGender(g){STATE.gender=g;document.querySelectorAll('.gender-btn').forEach(function(b){b.classList.remove('selected');});if(event&&event.currentTarget)event.currentTarget.classList.add('selected');updateProfileBtn();}
function updateProfileBtn(){var btn=document.querySelector('.btn-primary');if(btn){if(STATE.gender&&STATE.playerName.trim())btn.classList.remove('btn-disabled');else btn.classList.add('btn-disabled');}}
function updateName(v){STATE.playerName=v;updateProfileBtn();}
function updateBio(v){STATE.playerBio=v;}
function randomName(){STATE.playerName=RANDOM_NAMES[Math.floor(Math.random()*RANDOM_NAMES.length)];var inp=document.getElementById('nameInput');if(inp)inp.value=STATE.playerName;updateProfileBtn();}
function confirmProfile(){if(!STATE.gender||!STATE.playerName.trim())return;STATE._initBio=STATE.playerBio||'大厂打工人';STATE.quarter=1;STATE.phase='intro';render();}
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
    if(STATE.flags.ai_skill_nerf&&aid==='learn_ai')fx.ai_skill=Math.round((fx.ai_skill||0)*0.5);
    if(STATE.flags.work_nerf&&aid==='work')fx.money=Math.round((fx.money||0)*0.6);
    if(STATE.flags.build_changed&&aid==='build')fx.fame=Math.round((fx.fame||0)*0.7);
    applyEffects(fx);if(action.hiddenFx)applyHidden(action.hiddenFx);STATE.actionHistory.push(aid);
  }
  STATE.stats.energy=clamp(STATE.stats.energy+5,0,100);
  var didInfluence=STATE.selectedActions.indexOf('network_in')>=0||STATE.selectedActions.indexOf('work')>=0;
  var didFame=STATE.selectedActions.indexOf('share')>=0||STATE.selectedActions.indexOf('network_out')>=0;
  if(!didInfluence)STATE.stats.influence=Math.max(5,STATE.stats.influence-(STATE.stats.influence>=60?4:STATE.stats.influence>=40?3:2));
  if(!didFame)STATE.stats.fame=Math.max(3,STATE.stats.fame-(STATE.stats.fame>=50?4:STATE.stats.fame>=30?3:2));
  if(didInfluence&&STATE.stats.influence>=70)STATE.stats.influence=Math.max(5,STATE.stats.influence-1);
  if(didFame&&STATE.stats.fame>=60)STATE.stats.fame=Math.max(3,STATE.stats.fame-1);
  if(checkCriticalEnding()){STATE.phase='ending';render();return;}
  var numEv=1+Math.floor(Math.random()*3);
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
  STATE._eventQueue[STATE._eventIndex]={title:ev.title,text:result.text,effects:result.effects,tone:ev.tone,type:'passive',_alreadyApplied:true};
  STATE.phase='event_show';render();
}
function processPostEvents(){if(checkCriticalEnding()){STATE.phase='ending';render();return;}if(STATE._currentMajor){STATE.phase='major_event';render();return;}toNextOrEnding();}
function toNextOrEnding(){if(STATE.quarter>=8){STATE.phase='ending';}else{STATE.quarter++;STATE._eventQueue=[];STATE._eventIndex=0;STATE._currentMajor=null;STATE._branchResult=null;STATE._pendingEnding=null;STATE._thisQuarterActions=[];STATE.phase='intro';}render();}
function toBranch(){STATE.phase='branch';render();}
function chooseBranch(idx){
  var ev=STATE._currentMajor,branch=ev.branches[idx];if(ev.applyPassive)ev.applyPassive();
  var result=branch.apply(STATE.stats);if(result.effects)applyEffects(result.effects);if(result.hiddenFx)applyHidden(result.hiddenFx);if(result.flag)STATE.flags[result.flag]=true;
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
  var r=Math.random()*totalWeight;
  for(var ci2=0;ci2<candidates.length;ci2++){r-=candidates[ci2].weight;if(r<=0)return candidates[ci2].ev;}
  return candidates[candidates.length-1].ev;
}
function pickMajorEvent(){
  var q=STATE.quarter,slot=MAJOR_EVENT_SCHEDULE.find(function(s){return s.q===q;});if(!slot)return null;
  var chance=q<=4?0.18:(q<=6?0.28:0.35);if(Math.random()>=chance)return null;
  var candidates=shuffle(slot.ids.slice());
  for(var i=0;i<candidates.length;i++){var me=MAJOR_EVENTS[candidates[i]];if(!me)continue;if(me.category==='social'&&q<4)continue;if(me.condition()){var copy={};for(var mk in me){if(me.hasOwnProperty(mk))copy[mk]=me[mk];}copy._isMajor=true;return copy;}}
  return null;
}
function getEventWeights(q){if(q<=2)return{personal:0.38,company:0.40,industry:0.22,social:0};if(q<=5)return{personal:0.28,company:0.30,industry:0.35,social:0.07};return{personal:0.22,company:0.25,industry:0.40,social:0.13};}
function checkCriticalEnding(){var s=STATE.stats;return s.energy<=10||s.mood<=10||s.money<=5;}
function determineEnding(){var sorted=ENDINGS.slice().sort(function(a,b){return a.priority-b.priority;});for(var i=0;i<sorted.length;i++){if(sorted[i].condition(STATE.stats))return sorted[i];}return sorted[sorted.length-1];}
function applyEffects(fx){for(var k in fx){if(fx.hasOwnProperty(k)&&STATE.stats[k]!==undefined)STATE.stats[k]=clamp(STATE.stats[k]+fx[k],0,100);}}
function applyHidden(fx){for(var k in fx){if(fx.hasOwnProperty(k)&&STATE.hidden[k]!==undefined)STATE.hidden[k]+=fx[k];}}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function shuffle(arr){for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=arr[i];arr[i]=arr[j];arr[j]=t;}return arr;}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

window.G={startGame:startGame,setGender:setGender,updateName:updateName,updateBio:updateBio,randomName:randomName,confirmProfile:confirmProfile,toAction:toAction,backToIntro:backToIntro,toggleAction:toggleAction,confirmActions:confirmActions,nextEvent:nextEvent,chooseEvent:chooseEvent,toBranch:toBranch,chooseBranch:chooseBranch,nextQuarter:nextQuarter,toEnding:toEnding,restart:restart,showTip:showTip,closeTooltip:closeTooltip};
render();
})();
