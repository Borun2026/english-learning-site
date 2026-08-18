/** 语法树三页签(CEFR / Murphy / 时态)的中文引导与讲解数据 */

/** Murphy 三册中文引导 */
export const MURPHY_GUIDE: Record<string, { book: string; levelCn: string; suggest: string }> = {
  EL: {
    book: '《Essential Grammar in Use》(红书 · 初级)',
    levelCn: '覆盖 A1-A2 基础语法',
    suggest: '建议入门阶段系统学习,配合本平台 S1-S2 单元语法课逐点对照;学完一章就做对应单元真题组。',
  },
  INT: {
    book: '《English Grammar in Use》(蓝书 · 中级)',
    levelCn: '覆盖 B1-B2 语法',
    suggest: '建议备考四六级阶段使用,重点补时态对比、情态动词与被动语态;结合写作页的常见错误库自查。',
  },
  ADV: {
    book: '《Advanced Grammar in Use》(绿书 · 高级)',
    levelCn: '覆盖 C1-C2 语法',
    suggest: '建议考研/雅思阶段使用,聚焦长难句、倒装与语域;配合 S4 长难句单元与语法树 CEFR C1-C2 规则。',
  },
}

/** 12 时态中文讲解 */
export interface TenseCn {
  cn: string
  explain: string
  markersCn: string
  examplesCn: [string, string]
  unitId?: string
}

export const TENSE_CN: Record<string, TenseCn> = {
  present_simple: {
    cn: '一般现在时', explain: '表示经常性、习惯性的动作,或客观事实与普遍真理。注意第三人称单数动词加 -s/-es。',
    markersCn: 'always / usually / often / sometimes / never / every day / on Mondays 等', examplesCn: ['我每天坐公交车上学。', '他在一家医院工作。'], unitId: 's1u2',
  },
  present_continuous: {
    cn: '现在进行时', explain: '表示此刻正在发生或近期持续的动作。结构 am/is/are + doing,常与 now、look、listen 连用。',
    markersCn: 'now / at the moment / look! / listen!', examplesCn: ['她现在正在读书。', '他们正在踢足球。'], unitId: 's2u1',
  },
  past_simple: {
    cn: '一般过去时', explain: '表示过去某一时间发生并已结束的动作,动词用过去式(规则 -ed / 不规则变化)。',
    markersCn: 'yesterday / last week / … ago / in 2010', examplesCn: ['我们昨天参观了博物馆。', '他一小时前离开了。'], unitId: 's1u3',
  },
  past_continuous: {
    cn: '过去进行时', explain: '表示过去某一时刻正在进行的动作,常与 when / while 搭配,为另一动作提供背景。结构 was/were + doing。',
    markersCn: 'at that time / while / when(背景动作)', examplesCn: ['电话响的时候我正在睡觉。', '他们当时正在外面玩耍。'], unitId: 's2u1',
  },
  present_perfect: {
    cn: '现在完成时', explain: '表示过去动作对现在造成的影响,或从过去持续到现在的经历/状态。结构 have/has + 过去分词。',
    markersCn: 'already / yet / ever / never / since / for / just', examplesCn: ['我已经做完作业了。', '她自 2020 年起就住在这里。'], unitId: 's2u2',
  },
  present_perfect_continuous: {
    cn: '现在完成进行时', explain: '强调动作从过去持续到现在并可能继续,常带感情色彩(等待/抱怨)。结构 have/has been + doing。',
    markersCn: 'for + 时间段 / all day / recently', examplesCn: ['我已经等了一个小时。', '雨已经下了一整天。'],
  },
  past_perfect: {
    cn: '过去完成时', explain: '表示「过去的过去」:到过去某一时刻已经完成的动作。结构 had + 过去分词。',
    markersCn: 'before / after / by the time / when(主句动作先发生)', examplesCn: ['我们到的时候火车已经开走了。', '她中午之前就已经完成了。'], unitId: 's2u3',
  },
  past_perfect_continuous: {
    cn: '过去完成进行时', explain: '表示过去某一时刻之前一直在进行的动作,强调持续时长。结构 had been + doing。',
    markersCn: 'for + 时间段(截至过去某时)', examplesCn: ['他已经连续工作了十个小时。', '我们踢球前她一直在跑步。'],
  },
  future_will: {
    cn: '一般将来时(will)', explain: '表示预测、临时决定或承诺。结构 will + 动词原形;否定 will not = won’t。',
    markersCn: 'tomorrow / next week / soon / I think / probably', examplesCn: ['我明天会给你打电话。', '这个周末会下雨。'], unitId: 's1u4',
  },
  future_going_to: {
    cn: '一般将来时(be going to)', explain: '表示事先计划、打算,或有明显迹象将要发生的事。结构 be going to + 动词原形。',
    markersCn: '已经做好的计划 / look at those clouds 等迹象', examplesCn: ['我们打算去日本旅行。', '看那些云——要下雨了。'], unitId: 's2u11',
  },
  future_continuous: {
    cn: '将来进行时', explain: '表示将来某一时刻正在进行的动作,或按计划肯定会发生的事。结构 will be + doing。',
    markersCn: 'this time tomorrow / at 8 p.m. next Friday', examplesCn: ['明天这个时候我将飞往伦敦。', '明天下午三点我们会在开会。'],
  },
  future_perfect: {
    cn: '将来完成时', explain: '表示到将来某一时刻之前已经完成的动作。结构 will have + 过去分词,常与 by + 时间连用。',
    markersCn: 'by 2030 / by the end of / by next year', examplesCn: ['到 2030 年,我们将完成这个项目。', '到明年年底,她将已在这工作十年。'],
  },
}
