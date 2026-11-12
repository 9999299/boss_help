import { Document, Packer, Paragraph, TextRun, BorderStyle } from 'docx';

const FONT = 'Microsoft YaHei';

function text(value, options = {}) {
  return new TextRun({
    text: String(value ?? ''),
    font: FONT,
    size: options.size ?? 22,
    bold: options.bold,
    color: options.color,
  });
}

function heading(value) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 },
    },
    children: [text(value, { size: 28, bold: true })],
  });
}

function paragraph(value, options = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 80 },
    children: [text(value, options)],
  });
}

function bullets(items) {
  return (items || [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .map(
      (item) =>
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [text(item, { size: 20 })],
        })
    );
}

function itemHead(primary, secondary, dates) {
  const parts = [];
  if (primary) parts.push(text(primary, { bold: true }));
  if (secondary) parts.push(text(` ${secondary}`));
  if (dates) parts.push(text(`    ${dates}`, { color: '666666' }));
  return new Paragraph({ spacing: { after: 40 }, children: parts });
}

function buildResumeDocChildren(resumeData) {
  const data = resumeData || {};
  const info = data.personalInfo || {};
  const summary = data.experienceSummary || {};
  const children = [];

  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [text(info.name || '未命名', { size: 44, bold: true })],
    })
  );

  const contact = [info.email, info.phone].filter(Boolean).join(' · ');
  if (contact) children.push(paragraph(contact, { size: 20, color: '444444' }));

  const years = [];
  if (summary.totalYears) years.push(`总工作年限：${summary.totalYears}`);
  if (summary.industryYears) {
    years.push(
      `相关行业经验：${summary.industryYears}${summary.industry ? `（${summary.industry}）` : ''}`
    );
  }
  if (years.length) {
    children.push(paragraph(years.join(' · '), { size: 20, color: '444444' }));
  }

  if (info.summary) {
    children.push(heading('个人简介'));
    children.push(paragraph(info.summary));
  }

  if ((data.skills || []).length) {
    children.push(heading('技能'));
    children.push(paragraph(data.skills.join(' · ')));
  }

  if ((data.experience || []).length) {
    children.push(heading('工作经历'));
    data.experience.forEach((item) => {
      children.push(
        itemHead(
          item.company || '未命名公司',
          item.title ? `· ${item.title}` : '',
          item.dates
        )
      );
      if (item.location) {
        children.push(
          paragraph(item.location, {
            size: 18,
            color: '8A5A00',
          })
        );
      }
      if (item.description) children.push(paragraph(item.description));
      if ((item.responsibilities || []).length) {
        children.push(paragraph('主要职责', { size: 20, color: '555555' }));
        children.push(...bullets(item.responsibilities));
      }
      if ((item.achievements || []).length) {
        children.push(paragraph('工作成果', { size: 20, color: '555555' }));
        children.push(...bullets(item.achievements));
      }
    });
  }

  if ((data.projects || []).length) {
    children.push(heading('项目经历'));
    data.projects.forEach((item) => {
      children.push(
        itemHead(item.name || '', item.role ? `(${item.role})` : '', item.dates)
      );
      if ((item.techStack || []).length) {
        children.push(
          paragraph(item.techStack.join(' · '), { size: 20, color: '555555' })
        );
      }
      if (item.description) children.push(paragraph(item.description));
      if ((item.achievements || []).length) {
        children.push(paragraph('项目成果', { size: 20, color: '555555' }));
        children.push(...bullets(item.achievements));
      }
    });
  }

  if ((data.companyCandidates || []).length) {
    children.push(heading('公司经历'));
    data.companyCandidates.forEach((item) => {
      children.push(
        itemHead(
          item.company || '',
          item.role ? `@ ${item.role}` : '',
          item.location
        )
      );
      if (item.industry) {
        children.push(
          paragraph(item.industry, { size: 18, color: '8A5A00' })
        );
      }
      if (item.matchReason) children.push(paragraph(item.matchReason));
      if ((item.suggestedResponsibilities || []).length) {
        children.push(paragraph('建议职责', { size: 20, color: '555555' }));
        children.push(...bullets(item.suggestedResponsibilities));
      }
    });
  }

  if ((data.strengths || []).length) {
    children.push(heading('个人优势'));
    data.strengths.forEach((item) => {
      children.push(itemHead(item.title || ''));
      if (item.description) children.push(paragraph(item.description));
      if ((item.keywords || []).length) {
        children.push(
          paragraph(item.keywords.join(' · '), { size: 20, color: '555555' })
        );
      }
      if ((item.evidenceSuggestions || []).length) {
        children.push(paragraph('证据建议', { size: 20, color: '555555' }));
        children.push(...bullets(item.evidenceSuggestions));
      }
    });
  }

  if ((data.education || []).length) {
    children.push(heading('教育经历'));
    data.education.forEach((item) => {
      const details = [item.major, item.degree].filter(Boolean).join(' · ');
      children.push(itemHead(item.school || '', details, item.dates));
    });
  }

  return children;
}

export async function buildResumeDocxBlob(resumeData) {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 } },
      },
    },
    sections: [
      { properties: {}, children: buildResumeDocChildren(resumeData) },
    ],
  });

  return Packer.toBlob(doc);
}

export { buildResumeDocChildren };
