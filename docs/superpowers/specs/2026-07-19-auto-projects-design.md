# Auto-Generate Project Experience Design

**Date:** 2026-07-19  
**Status:** Approved  

## Problem

After job analysis, resume draft has skills/summary but empty experience. Users want related personal project entries generated automatically.

## Goals

- Same AI call returns 2–3 JD-aligned personal projects
- Draft resume includes them; editor and PDF show them
- Labeled as personal projects (not fake employment)

## Non-Goals

- Fabricating real company work history
- Second AI request
- Word export

## Data

```js
// analysis result
projects: [{
  name: string,
  role: string,
  dates: string,
  techStack: string[],
  description: string
}]

// resumeData
projects: same shape
experience: [] // work history remains separate / empty for now
```

## Flow

1. `analyzeJob` prompt asks for `projects` in JSON
2. `generateResumeDraft` maps `analysis.projects` → `resumeData.projects`
3. ResumeEditor lists projects (read-only list + keep existing save; minimal edit: display)
4. `buildResumeHtml` renders「项目经历」section

## Prompt rule

Generate plausible personal/side projects matching JD tech; for candidate to edit; do not invent employer names as employment.
