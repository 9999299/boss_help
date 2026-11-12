const { newId } = require('../ids.cjs');

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function strings(value, maxItems = 20, maxLength = 500) {
  return asArray(value)
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}

function buildExampleProjectsPrompt({
  jobAnalysis = {},
  missingRequirements = [],
  experiences = [],
  jobSnapshot = {},
  maxProjects = 3,
}) {
  const gaps = missingRequirements
    .map((item) => String(item?.requirement || item || '').trim())
    .filter(Boolean);
  const evidence = experiences.map((item) => ({
    kind: item.kind,
    organization: item.organization,
    title: item.title,
    techStack: item.data?.techStack || [],
    responsibilities: item.data?.responsibilities || [],
  }));
  return `你是严谨的职业顾问。请为下面岗位中用户尚未覆盖的要求，生成 ${maxProjects} 个项目建议。项目建议只是帮助用户补充经历库的内容，绝不能声称用户真实做过，也不能绑定具体公司任职。

<untrusted_job_jd>
${String(jobSnapshot.description || '').slice(0, 12000)}
</untrusted_job_jd>

岗位要求缺口（只针对这些缺口生成）：
${gaps.join('、') || '无明确缺口'}

用户已核实经历（技术栈只能引用其中或 JD 出现过的技术）：
${JSON.stringify(evidence)}

只返回 JSON：
{
  "projects": [
    {
      "name": "项目名称",
      "role": "担任角色",
      "dates": "例如 2024.01 - 2024.06",
      "techStack": ["技术"],
      "description": "项目描述",
      "responsibilities": ["职责"],
      "achievements": ["可核实的成果"],
      "coveredRequirements": ["来自缺口的原样文本"]
    }
  ]
}

要求：
- coveredRequirements 必须来自上面的缺口列表，不得自造。
- 技术栈只能使用 JD 或已核实经历中出现的技术，不得发明新技术。
- 描述要具体、可编辑，不要使用无法验证的夸张数字。
- 不得出现具体公司任职信息，不得声称这是用户的真实经历。
- 输出文本中不要出现「示例」「草稿」「待核实」「请按实际修改」等字样。`;
}

function normalizeExampleProjects(
  parsed,
  { missingRequirements = [], maxProjects = 3 } = {}
) {
  const gaps = new Set(
    missingRequirements
      .map((item) => String(item?.requirement || item || '').trim())
      .filter(Boolean)
  );
  const limit = Math.min(Math.max(Number(maxProjects) || 3, 1), 5);
  return asArray(parsed?.projects)
    .slice(0, limit)
    .map((item) => {
      const input = item && typeof item === 'object' ? item : {};
      const coveredRequirements = strings(input.coveredRequirements, 20, 120)
        .filter((requirement) => gaps.size === 0 || gaps.has(requirement));
      return {
        id: newId('exm'),
        name: String(input.name || '').trim().slice(0, 200),
        role: String(input.role || '').trim().slice(0, 200),
        dates: String(input.dates || '').trim().slice(0, 100),
        techStack: strings(input.techStack, 20, 80),
        description: String(input.description || '').trim().slice(0, 2000),
        responsibilities: strings(input.responsibilities, 20, 500),
        achievements: strings(input.achievements, 20, 500),
        coveredRequirements,
        source: 'model',
        evidenceStatus: 'example',
        userConfirmed: false,
      };
    })
    .filter((project) => project.name);
}

module.exports = { buildExampleProjectsPrompt, normalizeExampleProjects };
