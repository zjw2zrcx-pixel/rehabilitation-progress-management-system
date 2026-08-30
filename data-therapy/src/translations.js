const EXACT_SERVER_TEXT = {
  '请求失败，请稍后重试': 'Request failed. Please try again.',
  '用户名已存在': 'Username already exists.',
  '邮箱已被使用': 'Email address is already in use.',
  '用户名或密码错误': 'Incorrect username or password.',
  '账号已被禁用': 'This account has been disabled.',
  '权限不足（Forbidden）': 'You do not have permission to perform this action.',
  '无效或过期的凭证（Invalid token）': 'Your session is invalid or has expired.',
  '治疗师档案不存在': 'Therapist profile not found.',
  '患者不存在': 'Patient not found.',
  '无权访问该患者': 'You do not have access to this patient.',
  '只能为自己负责的患者建档': 'You can only create records for patients assigned to you.',
  '康复计划不存在': 'Rehabilitation plan not found.',
  '训练动作不存在': 'Exercise not found.',
  '评估记录不存在': 'Assessment not found.',
  '训练记录不存在': 'Training log not found.',
  '用户不存在': 'User not found.',
  '评估记录不足（至少 2 条）才能进行预测': 'At least two assessments are required to run a prediction.',
  '至少需要 2 条评估记录才能预测': 'At least two assessments are required to run a prediction.',
  '近期各评估指标未出现连续两周下降，进展正常。': 'No metric has declined for two consecutive assessments. Progress is on track.',
  '患者端打卡': 'Patient check-in',
};

const METRIC_NAMES = {
  composite_score: 'Composite Recovery Index',
  pain_score: 'Pain score',
  range_of_motion: 'Range of motion',
  muscle_strength: 'Muscle strength',
  balance_score: 'Balance',
  walking_distance: 'Walking distance',
  adl_score: 'Activities of daily living',
  training_completion: 'Training completion',
  疼痛评分: 'Pain score',
  关节活动度: 'Range of motion',
  肌力评分: 'Muscle strength',
  平衡能力: 'Balance',
  步行距离: 'Walking distance',
  日常生活能力: 'Activities of daily living',
  训练完成率: 'Training completion',
};

const DEMO_CONTENT = {
  '系统管理员': 'System Administrator',
  '王敏': 'Min Wang',
  '李强': 'Qiang Li',
  '陈静': 'Jing Chen',
  '张伟': 'Wei Zhang',
  '李娜': 'Na Li',
  '王芳': 'Fang Wang',
  '陈昊': 'Hao Chen',
  '孙洁': 'Jie Sun',
  '赵磊': 'Lei Zhao',
  '王晶': 'Jing Wang',
  '刘雷': 'Lei Liu',
  '膝骨性关节炎（全膝关节置换术后）': 'Knee osteoarthritis (post total knee arthroplasty)',
  '脑卒中（右侧偏瘫）': 'Stroke (right hemiplegia)',
  '肩袖损伤术后': 'Postoperative rotator cuff injury',
  '前交叉韧带重建术后': 'Post ACL reconstruction',
  '髋部骨折内固定术后': 'Post internal fixation of hip fracture',
  '肩关节不稳（复发性脱位）术后': 'Postoperative shoulder instability (recurrent dislocation)',
  '腰椎间盘突出症（保守治疗）': 'Lumbar disc herniation (conservative treatment)',
  '跟腱断裂修复术后': 'Post Achilles tendon repair',
  '术后3个月能独立平路步行1公里、上下楼梯各5级，无痛完成买菜、家务等日常活动': 'Within 3 months, walk 1 km independently on level ground, climb five stairs in each direction, and complete shopping and housework without pain.',
  '2周内无痛完成床边坐-站转移，室内步行200米不需助行器': 'Within 2 weeks, complete bedside sit-to-stand transfers without pain and walk 200 m indoors without a walking aid.',
  '疼痛7/10，屈曲68°，Barthel 50，Berg 42，6MWT 369m': 'Pain 7/10, flexion 68°, Barthel 50, Berg 42, 6MWT 369 m.',
  '6个月内恢复社区内独立步行，独立完成穿脱衣物、如厕、进食等日常活动': 'Within 6 months, regain independent community walking and independently complete dressing, toileting, eating, and other daily activities.',
  '2周内床边坐位平衡维持30分钟，监护下完成床-椅转移': 'Within 2 weeks, maintain bedside sitting balance for 30 minutes and complete bed-to-chair transfers with supervision.',
  'FMA上肢22，Berg 28，Barthel 45': 'FMA upper extremity 22, Berg 28, Barthel 45.',
  '3个月后无痛完成日常生活（提取2kg物品、够到衣柜上层、搓洗晾衣）': 'Within 3 months, complete daily activities without pain, including lifting 2 kg, reaching an upper shelf, washing, and hanging clothes.',
  '2周内患侧手抬过头顶、梳头无痛，夜间可侧卧': 'Within 2 weeks, raise the affected arm overhead and comb hair without pain, and sleep on the affected side.',
  '前屈90°，外展80°，疼痛5/10': 'Flexion 90°, abduction 80°, pain 5/10.',
  '9个月后恢复跑步、变向与跳跃，重返球场并完成竞技水平动作': 'Within 9 months, resume running, cutting, and jumping and return to competitive sport.',
  '2周内恢复正常步态（无跛行），可无痛下蹲': 'Within 2 weeks, restore a normal gait without limping and squat without pain.',
  '屈曲95°，肌力3/5，6MWT 420m': 'Flexion 95°, strength 3/5, 6MWT 420 m.',
  '3个月后独立下床并步行至社区小店购物，如厕、沐浴自理': 'Within 3 months, get out of bed independently, walk to a local shop, and manage toileting and bathing independently.',
  '1周内在助行器辅助下完成床边站立与床边步行50米': 'Within 1 week, stand at bedside and walk 50 m with a walking aid.',
  'Berg 38，6MWT 260m，Barthel 60': 'Berg 38, 6MWT 260 m, Barthel 60.',
  '4个月后恢复无痛、无再脱位的投掷与游泳等运动': 'Within 4 months, resume throwing and swimming without pain or recurrent dislocation.',
  '2周内患侧手臂无痛完成前屈过头与肩水平伸展': 'Within 2 weeks, flex the affected arm overhead and complete horizontal shoulder extension without pain.',
  '外展90°，疼痛4/10': 'Abduction 90°, pain 4/10.',
  '3个月后恢复久坐办公1小时、弯腰取物、驾驶与弯腰做家务无明显疼痛': 'Within 3 months, sit at work for 1 hour, bend to pick up objects, drive, and do housework without significant pain.',
  '2周内疼痛减轻至少2分，能完成10分钟无痛慢走': 'Within 2 weeks, reduce pain by at least 2 points and complete a 10-minute pain-free walk.',
  '疼痛6/10，直腿抬高60°': 'Pain 6/10, straight leg raise 60°.',
  '6个月后恢复跑步与跳跃能力，可重返球类运动': 'Within 6 months, regain running and jumping ability and return to ball sports.',
  '2周内无痛步行30分钟，双足提踵动作完成度达50%': 'Within 2 weeks, walk for 30 minutes without pain and achieve 50% completion of bilateral calf raises.',
  '踝背屈15°，疼痛3/10': 'Ankle dorsiflexion 15°, pain 3/10.',
  '膝关节置换围手术期康复计划': 'Perioperative Knee Replacement Rehabilitation Plan',
  '脑卒中早期康复计划': 'Early Stroke Rehabilitation Plan',
  '肩关节术后康复计划': 'Postoperative Shoulder Rehabilitation Plan',
  '腰椎核心康复计划': 'Lumbar Core Rehabilitation Plan',
  '跟腱术后康复计划': 'Postoperative Achilles Tendon Rehabilitation Plan',
  '基于循证指南的阶段性康复方案，每周5次，每次30-40分钟': 'A phased rehabilitation program based on evidence-based guidelines, five sessions per week, 30-40 minutes per session.',
  '训练过程中若疼痛>4/10 应暂停并及时联系治疗师': 'Pause training and contact the therapist if pain exceeds 4/10.',
  '良姿位摆放与肢体被动活动': 'Therapeutic Positioning and Passive Range of Motion',
  '仰卧位，绷紧大腿前侧肌群后缓慢抬起，膝盖伸直，空中保持2秒': 'Lie supine, tighten the front thigh muscles, slowly raise the straight leg, and hold for 2 seconds.',
  '仰卧屈膝，脚跟沿床面向臀部滑动，最大屈曲处保持5秒': 'Lie supine and slide the heel toward the buttocks, holding maximum flexion for 5 seconds.',
  '踝关节最大背屈/跖屈往复活动，促进静脉回流': 'Alternate maximum ankle dorsiflexion and plantarflexion to promote venous return.',
  '坐位，患足向后滑动尽量屈膝，恢复活动度': 'While seated, slide the affected foot backward to maximize knee flexion and restore mobility.',
  '膝下压床面使股四头肌收缩，保持5秒': 'Press the knee into the bed to contract the quadriceps and hold for 5 seconds.',
  '家属协助患侧肩、肘、腕、髋、膝各关节缓慢被动活动': 'A caregiver slowly moves the affected shoulder, elbow, wrist, hip, and knee through passive range of motion.',
  '仰卧屈膝，臀部抬离床面，训练腰腹与臀肌': 'Lie supine with knees bent and lift the hips to train the core and gluteal muscles.',
  '坐位下重心左右前后转移，保持躯干直立': 'Shift weight forward, backward, and side to side while seated, keeping the trunk upright.',
  '扶栏杆站立，逐渐减少支持，双足与单足': 'Stand using a rail, gradually reduce support, and progress from double-leg to single-leg stance.',
  '平行杠/助行器辅助步行，注意步幅与对线': 'Walk with parallel bars or a walking aid, focusing on stride length and alignment.',
  '弯腰前倾，患臂自然下垂做钟摆样摆动': 'Lean forward and let the affected arm hang naturally in a pendulum motion.',
  '手指沿墙向上爬行，逐渐增加前屈角度': 'Walk the fingers up a wall to gradually increase shoulder flexion.',
  '挺胸收背，肩胛骨向后下方滑动保持': 'Lift the chest and draw the shoulder blades back and down.',
  '肘部屈曲90°，前臂水平，弹力带抗阻外旋': 'With the elbow at 90° and forearm level, externally rotate against a resistance band.',
  '双手持棍，借助健侧引导患侧前屈上举': 'Use a cane and the unaffected arm to guide the affected arm into flexion.',
  '俯卧肘撑转手掌撑，缓慢后伸腰部': 'Progress from prone elbow support to palm support, slowly extending the lower back.',
  '俯卧位同时抬起对侧手脚，保持3秒': 'While prone, raise the opposite arm and leg and hold for 3 seconds.',
  '肘撑俯卧，身体成一直线保持30-60秒': 'Hold a straight-body prone elbow plank for 30-60 seconds.',
  '肘膝跪位，同时伸展对侧手足，保持平衡': 'From an all-fours position, extend the opposite arm and leg while maintaining balance.',
  '主动踝背屈/跖屈往复，无负重进行': 'Actively alternate ankle dorsiflexion and plantarflexion without weight bearing.',
  '扶墙站立，缓慢提踵后缓慢回落': 'Stand with wall support, slowly raise the heels, then lower them with control.',
  '单手扶墙单腿站立30秒，逐渐过渡到无支撑': 'Stand on one leg for 30 seconds with one-hand wall support, then progress to no support.',
  '坐位，弹力带助力踝背屈抗阻': 'While seated, perform resisted ankle dorsiflexion with a resistance band.',
  '联调计划': 'Integration Test Plan',
  '测试动作': 'Test Exercise',
  '打卡': 'Check-in',
  '按时完成': 'Completed on schedule',
  '未完成（疼痛/疲劳）': 'Not completed (pain/fatigue)',
};

export function translateContent(value, language) {
  if (language === 'zh' || typeof value !== 'string') return value;
  if (DEMO_CONTENT[value]) return DEMO_CONTENT[value];
  const week = value.match(/^第(\d+)周$/);
  if (week) return `Week ${week[1]}`;
  const bilingualExercise = value.match(/^.*\(([A-Za-z][A-Za-z ]+)\)$/);
  if (bilingualExercise && /[\u3400-\u9fff]/.test(value)) return bilingualExercise[1];
  return value;
}

export function translateServerText(value, language) {
  if (language === 'zh' || typeof value !== 'string') return value;
  if (EXACT_SERVER_TEXT[value]) return EXACT_SERVER_TEXT[value];

  const insight = value.match(/^(.+) 较上次(上升|下降) ([^ ]+) （([^）]+) → ([^）]+)）.*，连续下降提示进度风险。$/);
  if (insight) {
    const [, metric, direction, delta, previous, latest] = insight;
    return `${METRIC_NAMES[metric] || metric} ${direction === '上升' ? 'increased' : 'decreased'} by ${delta} (${previous} → ${latest}), indicating a progress risk.`;
  }

  const declining = value.match(/^(\w+) 连续两周(上升|下降)（Δ=([^）]+)），存在康复进展风险：建议复查训练负荷、疼痛控制与治疗依从性。$/);
  if (declining) return `${METRIC_NAMES[declining[1]] || declining[1]} has ${declining[2] === '上升' ? 'increased' : 'decreased'} for two consecutive assessments (Δ=${declining[3]}). Review training load, pain control, and adherence.`;

  const slow = value.match(/^(\w+) 改善缓慢（周斜率 ([^）]+)），注意按时执行训练。$/);
  if (slow) return `${METRIC_NAMES[slow[1]] || slow[1]} is improving slowly (weekly slope ${slow[2]}). Reinforce adherence to the training schedule.`;

  const flat = value.match(/^(\w+) 两周持平，无显著变化，建议观察下周趋势。$/);
  if (flat) return `${METRIC_NAMES[flat[1]] || flat[1]} has shown no significant change over two assessments. Continue monitoring next week.`;

  const improving = value.match(/^(\w+) 呈改善趋势（周斜率 ([^）]+)），继续当前方案。$/);
  if (improving) return `${METRIC_NAMES[improving[1]] || improving[1]} is improving (weekly slope ${improving[2]}). Continue the current plan.`;

  return value;
}
