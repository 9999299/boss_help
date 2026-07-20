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
  const experience = resumeData?.experience || [];
  const projects = resumeData?.projects || [];
  const education = resumeData?.education || [];

  const name = escapeHtml(info.name || '未命名');
  const email = escapeHtml(info.email || '');
  const phone = escapeHtml(info.phone || '');
  const summary = escapeHtml(info.summary || '');

  const contact = [email, phone].filter(Boolean).join(' · ');

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
            const desc = escapeHtml(e.description || '');
            return `<div class="item"><div class="item-head"><strong>${title}</strong> ${company ? `@ ${company}` : ''} <span class="dates">${dates}</span></div>${desc ? `<p>${desc}</p>` : ''}</div>`;
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
            return `<div class="item"><div class="item-head"><strong>${pname}</strong> ${role ? `(${role})` : ''} <span class="dates">${dates}</span></div>${tech ? `<p class="tech">${tech}</p>` : ''}${desc ? `<p>${desc}</p>` : ''}</div>`;
          })
          .join('')}</section>`
      : '';

  const eduHtml =
    education.length > 0
      ? `<section><h2>教育经历</h2>${education
          .map((e) => {
            const school = escapeHtml(e.school || '');
            const degree = escapeHtml(e.degree || '');
            const dates = escapeHtml(e.dates || '');
            return `<div class="item"><div class="item-head"><strong>${school}</strong> ${degree} <span class="dates">${dates}</span></div></div>`;
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
  @media print {
    body { padding: 0; max-width: none; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <h1>${name}</h1>
  ${contact ? `<div class="contact">${contact}</div>` : ''}
  ${summaryHtml}
  ${skillsHtml}
  ${projectsHtml}
  ${expHtml}
  ${eduHtml}
</body>
</html>`;
}
