import { sortByDateDesc } from './resumeSchema.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildResumeHtml(resumeData) {
  const info = resumeData?.personalInfo || {};
  const skills = resumeData?.skills || [];
  const experienceSummary = resumeData?.experienceSummary || {};
  const experience = sortByDateDesc(resumeData?.experience || []);
  const projects = resumeData?.projects || [];
  const companyCandidates = resumeData?.companyCandidates || [];
  const strengths = resumeData?.strengths || [];
  const education = resumeData?.education || [];

  const name = escapeHtml(info.name || '未命名');
  const email = escapeHtml(info.email || '');
  const phone = escapeHtml(info.phone || '');
  const summary = escapeHtml(info.summary || '');

  const contact = [email, phone].filter(Boolean).join(' · ');

  const totalYears = escapeHtml(experienceSummary.totalYears || '');
  const industryYears = escapeHtml(experienceSummary.industryYears || '');
  const industry = escapeHtml(experienceSummary.industry || '');
  const yearParts = [];
  if (totalYears) yearParts.push(`总工作年限：${totalYears}`);
  if (industryYears) {
    yearParts.push(
      `相关行业经验：${industryYears}${industry ? `（${industry}）` : ''}`
    );
  }
  const yearsHtml = yearParts.length
    ? `<div class="contact years">${yearParts.join(' · ')}</div>`
    : '';

  const skillsHtml =
    skills.length > 0
      ? `<section><h2>技能</h2><p>${skills.map(escapeHtml).join(' · ')}</p></section>`
      : '';

  const summaryHtml = summary
    ? `<section><h2>个人简介</h2><p>${summary}</p></section>`
    : '';

  const expHtml =
    experience.length > 0
      ? `<section><h2>工作经历</h2>${experience
          .map((e) => {
            const title = escapeHtml(e.title || '');
            const company = escapeHtml(e.company || '');
            const dates = escapeHtml(e.dates || '');
            const location = escapeHtml(e.location || '');
            const desc = escapeHtml(e.description || '');
            const responsibilities = (e.responsibilities || [])
              .map(escapeHtml)
              .filter(Boolean)
              .map((responsibility) => `<li>${responsibility}</li>`)
              .join('');
            const achievements = (e.achievements || [])
              .map(escapeHtml)
              .filter(Boolean)
              .map((achievement) => `<li>${achievement}</li>`)
              .join('');
            return `<div class="item"><div class="item-head"><strong>${company || '未命名公司'}</strong>${title ? ` · ${title}` : ''} <span class="dates">${dates}</span></div>${location ? `<p class="evidence-label">${location}</p>` : ''}${desc ? `<p>${desc}</p>` : ''}${responsibilities ? `<p class="tech">主要职责</p><ul>${responsibilities}</ul>` : ''}${achievements ? `<p class="tech">工作成果</p><ul>${achievements}</ul>` : ''}</div>`;
          })
          .join('')}</section>`
      : '';

  const projectsHtml =
    projects.length > 0
      ? `<section><h2>项目经历</h2>${projects
          .map((p) => {
            const pname = escapeHtml(p.name || '');
            const role = escapeHtml(p.role || '');
            const dates = escapeHtml(p.dates || '');
            const tech = (p.techStack || []).map(escapeHtml).join(' · ');
            const desc = escapeHtml(p.description || '');
            const achievements = (p.achievements || [])
              .map(escapeHtml)
              .filter(Boolean)
              .map((achievement) => `<li>${achievement}</li>`)
              .join('');
            return `<div class="item"><div class="item-head"><strong>${pname}</strong> ${role ? `(${role})` : ''} <span class="dates">${dates}</span></div>${tech ? `<p class="tech">${tech}</p>` : ''}${desc ? `<p>${desc}</p>` : ''}${achievements ? `<p class="tech">项目成果</p><ul>${achievements}</ul>` : ''}</div>`;
          })
          .join('')}</section>`
      : '';

  const companyCandidatesHtml =
    companyCandidates.length > 0
      ? `<section><h2>公司经历</h2>${companyCandidates
          .map((candidate) => {
            const company = escapeHtml(candidate.company || '');
            const role = escapeHtml(candidate.role || '');
            const industry = escapeHtml(candidate.industry || '');
            const location = escapeHtml(candidate.location || '');
            const reason = escapeHtml(candidate.matchReason || '');
            const responsibilities = (candidate.suggestedResponsibilities || [])
              .map(escapeHtml)
              .filter(Boolean)
              .map((responsibility) => `<li>${responsibility}</li>`)
              .join('');
            return `<div class="item"><div class="item-head"><strong>${company}</strong> ${role ? `@ ${role}` : ''}<span class="dates">${location}</span></div>${industry ? `<p class="evidence-label">${industry}</p>` : ''}${reason ? `<p>${reason}</p>` : ''}${responsibilities ? `<p class="tech">建议职责</p><ul>${responsibilities}</ul>` : ''}</div>`;
          })
          .join('')}</section>`
      : '';

  const strengthsHtml =
    strengths.length > 0
      ? `<section><h2>个人优势</h2>${strengths
          .map((strength) => {
            const title = escapeHtml(strength.title || '');
            const description = escapeHtml(strength.description || '');
            const suggestions = (strength.evidenceSuggestions || [])
              .map(escapeHtml)
              .filter(Boolean)
              .map((suggestion) => `<li>${suggestion}</li>`)
              .join('');
            const keywords = (strength.keywords || [])
              .map(escapeHtml)
              .join(' · ');
            return `<div class="item"><div class="item-head"><strong>${title}</strong></div>${description ? `<p>${description}</p>` : ''}${keywords ? `<p class="tech">${keywords}</p>` : ''}${suggestions ? `<p class="tech">证据建议</p><ul>${suggestions}</ul>` : ''}</div>`;
          })
          .join('')}</section>`
      : '';

  const eduHtml =
    education.length > 0
      ? `<section><h2>教育经历</h2>${education
          .map((e) => {
            const school = escapeHtml(e.school || '');
            const major = escapeHtml(e.major || '');
            const degree = escapeHtml(e.degree || '');
            const dates = escapeHtml(e.dates || '');
            const details = [major, degree].filter(Boolean).join(' · ');
            return `<div class="item"><div class="item-head"><strong>${school}</strong> ${details} <span class="dates">${dates}</span></div></div>`;
          })
          .join('')}</section>`
      : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${name} - 简历</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
    color: #111;
    background: #fff;
    margin: 0;
    padding: 24px;
    max-width: 700px;
  }
  h1 { font-size: 28px; margin: 0 0 8px; }
  .contact { color: #444; margin-bottom: 20px; font-size: 14px; }
  .years { margin-top: -14px; }
  h2 {
    font-size: 16px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    margin: 20px 0 10px;
  }
  p { margin: 0 0 8px; line-height: 1.6; font-size: 14px; }
  .item { margin-bottom: 12px; }
  .item-head { font-size: 14px; margin-bottom: 4px; overflow: hidden; }
  .dates { color: #666; float: right; font-weight: normal; }
  .tech { color: #555; font-size: 13px; }
  .evidence-label, .notice { color: #8a5a00; font-size: 12px; }
  ul { margin: 4px 0 8px 18px; padding: 0; font-size: 13px; line-height: 1.5; }
  @media print {
    body { padding: 0; max-width: none; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <h1>${name}</h1>
  ${contact ? `<div class="contact">${contact}</div>` : ''}
  ${yearsHtml}
  ${summaryHtml}
  ${eduHtml}
  ${skillsHtml}
  ${expHtml}
  ${projectsHtml}
  ${companyCandidatesHtml}
  ${strengthsHtml}
</body>
</html>`;
}
